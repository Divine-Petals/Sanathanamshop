using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Messaging;
using Sanathanam.Api.Services;
using Sanathanam.Api.SupabaseClient;
using Sanathanam.Api.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Cloud Run sets PORT; bind explicitly so the container listens correctly.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

try
{
    ValidateProductionConfig(builder);
}
catch (Exception ex)
{
    Console.Error.WriteLine($"FATAL startup config: {ex.Message}");
    throw;
}

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.SnakeCaseLower);
builder.Services.AddOpenApi();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<TenantContext>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<MessagingService>();
builder.Services.AddHttpClient();

// Official Supabase C# client (SUPABASE_URL + SUPABASE_KEY / SECRET_KEY).
await builder.Services.AddSupabaseClientAsync(builder.Configuration, builder.Environment);

var msg91Key = builder.Configuration["Msg91:AuthKey"];
var skipSms = IsTruthy(builder.Configuration["Otp:SkipSend"])
              || !string.IsNullOrWhiteSpace(builder.Configuration["Otp:StaticCode"]);
if (skipSms
    || string.IsNullOrWhiteSpace(msg91Key)
    || msg91Key.StartsWith("REPLACE_", StringComparison.OrdinalIgnoreCase))
{
    if (!builder.Environment.IsDevelopment())
        Console.Error.WriteLine(
            skipSms
                ? "WARNING: Otp:SkipSend/StaticCode set — SMS/WhatsApp use Dev loggers (no MSG91)."
                : "WARNING: Msg91:AuthKey is empty — OTP/WhatsApp use Dev loggers. Configure MSG91 before real customers.");
    builder.Services.AddSingleton<ISmsSender, DevSmsSender>();
    builder.Services.AddSingleton<IWhatsAppSender, DevWhatsAppSender>();
}
else
{
    builder.Services.AddHttpClient<ISmsSender, Msg91SmsSender>();
    builder.Services.AddHttpClient<IWhatsAppSender, Msg91WhatsAppSender>();
}

var usePostgres = IsTruthy(builder.Configuration["UsePostgres"]);
var postgres = NormalizePostgresConnection(builder.Configuration.GetConnectionString("Postgres"));

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var sqlite = builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=sanathanam.db";
    if (usePostgres && !string.IsNullOrWhiteSpace(postgres))
        opt.UseNpgsql(postgres);
    else
        opt.UseSqlite(sqlite);
});

var jwtKey = builder.Configuration["Jwt:Key"]
             ?? throw new InvalidOperationException("Jwt:Key is required.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role,
            NameClaimType = System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub
        };
    });
builder.Services.AddAuthorization();

var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
              ?? ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];
origins = origins.Where(o => !string.IsNullOrWhiteSpace(o)).Select(o => o.Trim().TrimEnd('/')).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
Console.WriteLine($"CORS origins ({origins.Length}): {string.Join(", ", origins)}");
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("shops", p => p
        .WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

Console.WriteLine($"Starting Sanathanam.Api ({app.Environment.EnvironmentName}), UsePostgres={usePostgres}, PORT={port ?? "unset"}");

var databaseReady = false;
var efReady = false;
var supabaseShop = app.Services.GetService<SupabaseShopStore>();
var supabaseCatalogReady = false;
if (supabaseShop is not null)
{
    try
    {
        await supabaseShop.EnsureSeededAsync(builder.Configuration);
        supabaseCatalogReady = true;
        databaseReady = true;
        Console.WriteLine("Supabase shop store ready (products/orders/admin).");
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"ERROR Supabase shop startup: {ex.Message}");
        Console.Error.WriteLine("Will fall back to EF Core EnsureCreated/seed until supabase/schema.sql is applied.");
    }
}

try
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (supabaseCatalogReady)
        {
            // schema.sql owns tables; verify OTP/user tables exist.
            if (!await db.Database.CanConnectAsync())
                throw new InvalidOperationException("Cannot connect to Postgres (ConnectionStrings__Postgres).");
            _ = await db.Users.CountAsync();
            efReady = true;
            Console.WriteLine("EF Core ready (users/OTP/addresses); catalog via Supabase.");
        }
        else
        {
            // No working PostgREST catalog — create/seed via EF (same snake_case tables).
            if (app.Environment.IsDevelopment() && !usePostgres)
                await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
            await DbSeeder.SeedAsync(db, builder.Configuration, app.Environment);
            efReady = true;
            databaseReady = true;
            Console.WriteLine("Database ready (EF Core fallback).");
        }
    }
}
catch (Exception ex)
{
    efReady = false;
    Console.Error.WriteLine($"ERROR database startup (API will start unhealthy): {ex.Message}");
}

if (supabaseShop is not null)
    databaseReady = databaseReady && efReady;

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

// Keep CORS headers even when controllers/middleware throw (browsers otherwise report a CORS error).
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        Console.Error.WriteLine($"ERROR request: {feature?.Error.Message}");

        // Exception re-execution can skip CORS middleware; mirror allow-list manually.
        var origin = context.Request.Headers.Origin.FirstOrDefault();
        if (!string.IsNullOrEmpty(origin)
            && origins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        {
            context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            context.Response.Headers.Append("Vary", "Origin");
        }

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            message = "Internal server error.",
            detail = app.Environment.IsDevelopment() ? feature?.Error.Message : null
        });
    });
});

app.UseCors("shops");
// Cloud Run / reverse proxies terminate TLS; do not redirect inside the container.
if (!app.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(port))
    app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();
app.MapGet("/health", (IServiceProvider sp) =>
{
    var supabaseConfigured = sp.GetService<Supabase.Client>() is not null;
    if (!databaseReady)
    {
        return Results.Json(new
        {
            status = "degraded",
            error = "database_unavailable",
            supabase = supabaseConfigured
        }, statusCode: 503);
    }

    return Results.Ok(new { status = "ok", supabase = supabaseConfigured });
});
app.MapControllers();
app.Run();

static void ValidateProductionConfig(WebApplicationBuilder builder)
{
    if (builder.Environment.IsDevelopment())
        return;

    if (!IsTruthy(builder.Configuration["UsePostgres"]))
        throw new InvalidOperationException(
            "Production requires UsePostgres=true (got '" + (builder.Configuration["UsePostgres"] ?? "") + "'). Use true/1/yes.");

    var postgres = builder.Configuration.GetConnectionString("Postgres");
    if (string.IsNullOrWhiteSpace(postgres))
        throw new InvalidOperationException("Production requires ConnectionStrings:Postgres.");

    var supabaseUrl = FirstNonEmpty(
        builder.Configuration["SUPABASE_URL"],
        builder.Configuration["Supabase:Url"],
        Environment.GetEnvironmentVariable("SUPABASE_URL"));
    var supabaseKey = FirstNonEmpty(
        builder.Configuration["SUPABASE_KEY"],
        builder.Configuration["SUPABASE_SECRET_KEY"],
        builder.Configuration["Supabase:Key"],
        Environment.GetEnvironmentVariable("SUPABASE_KEY"),
        Environment.GetEnvironmentVariable("SUPABASE_SECRET_KEY"));
    if (string.IsNullOrWhiteSpace(supabaseUrl) || string.IsNullOrWhiteSpace(supabaseKey))
        Console.Error.WriteLine(
            "WARNING: SUPABASE_URL / SUPABASE_KEY missing — catalog falls back to EF. " +
            "Set both (service_role key) and run supabase/schema.sql for PostgREST.");

    var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
    var weakKeys = new[]
    {
        "change-this-to-a-long-random-secret-key-32+",
        "dev-only-sanathanam-jwt-signing-key-32chars"
    };
    if (jwtKey.Length < 32
        || weakKeys.Any(w => string.Equals(w, jwtKey, StringComparison.Ordinal))
        || jwtKey.StartsWith("REPLACE_", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Production requires a strong Jwt:Key (32+ random characters). Set env Jwt__Key.");
}

static string? FirstNonEmpty(params string?[] values) =>
    values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

static bool IsTruthy(string? value)
{
    if (string.IsNullOrWhiteSpace(value)) return false;
    return value.Trim() is "1" or "true" or "True" or "TRUE" or "yes" or "Yes" or "YES" or "y" or "Y";
}

/// Accepts Npgsql key=value or postgresql:// URI; converts URI → key=value (Npgsql builder is not URI-safe).
static string? NormalizePostgresConnection(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw)) return raw;
    var s = raw.Trim().Trim('"').Trim();

    // A bare password (no Host= / URI) makes Npgsql throw
    // "Format of the initialization string does not conform to specification starting at index 0."
    var looksLikeConn = s.Contains('=', StringComparison.Ordinal)
                        || s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
                        || s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);
    if (!looksLikeConn)
        throw new InvalidOperationException(
            "ConnectionStrings:Postgres must be a full Npgsql string or postgres:// URI, not a password alone.");

    if (s.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || s.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        if (!Uri.TryCreate(s, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("ConnectionStrings:Postgres URI is invalid.");

        var userInfo = uri.UserInfo.Split(':', 2);
        var user = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? "postgres");
        var pass = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? "");
        var database = uri.AbsolutePath.Trim('/');
        if (string.IsNullOrWhiteSpace(database)) database = "postgres";
        var port = uri.IsDefaultPort ? 5432 : uri.Port;

        // Always require SSL for hosted Postgres (Supabase).
        // Disable GSS — aspnet slim images lack libgssapi_krb5.so.2.
        return $"Host={uri.Host};Port={port};Database={database};Username={user};Password={pass};SSL Mode=Require;Trust Server Certificate=true;GSS Encryption Mode=Disable";
    }

    if ((s.Contains("supabase.co", StringComparison.OrdinalIgnoreCase)
         || s.Contains("supabase.com", StringComparison.OrdinalIgnoreCase))
        && !s.Contains("SSL Mode=", StringComparison.OrdinalIgnoreCase)
        && !s.Contains("Ssl Mode=", StringComparison.OrdinalIgnoreCase))
    {
        s = s.TrimEnd(';') + ";SSL Mode=Require;Trust Server Certificate=true";
    }

    if ((s.Contains("supabase.co", StringComparison.OrdinalIgnoreCase)
         || s.Contains("supabase.com", StringComparison.OrdinalIgnoreCase))
        && !s.Contains("GSS Encryption Mode=", StringComparison.OrdinalIgnoreCase))
    {
        s = s.TrimEnd(';') + ";GSS Encryption Mode=Disable";
    }

    return s;
}
