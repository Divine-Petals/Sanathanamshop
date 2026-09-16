using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Messaging;
using Sanathanam.Api.Services;
using Sanathanam.Api.Tenancy;

var builder = WebApplication.CreateBuilder(args);

// Cloud Run sets PORT; bind explicitly so the container listens correctly.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

ValidateProductionConfig(builder);

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

var msg91Key = builder.Configuration["Msg91:AuthKey"];
if (string.IsNullOrWhiteSpace(msg91Key))
{
    if (!builder.Environment.IsDevelopment())
        Console.Error.WriteLine("WARNING: Msg91:AuthKey is empty — OTP/WhatsApp use Dev loggers. Configure MSG91 before real customers.");
    builder.Services.AddSingleton<ISmsSender, DevSmsSender>();
    builder.Services.AddSingleton<IWhatsAppSender, DevWhatsAppSender>();
}
else
{
    builder.Services.AddHttpClient<ISmsSender, Msg91SmsSender>();
    builder.Services.AddHttpClient<IWhatsAppSender, Msg91WhatsAppSender>();
}

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    var postgres = builder.Configuration.GetConnectionString("Postgres");
    var sqlite = builder.Configuration.GetConnectionString("Sqlite") ?? "Data Source=sanathanam.db";
    if (builder.Configuration.GetValue<bool>("UsePostgres") && !string.IsNullOrWhiteSpace(postgres))
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
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("shops", p => p
        .WithOrigins(origins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Local SQLite only: recreate when schema changes.
    if (app.Environment.IsDevelopment() && !builder.Configuration.GetValue<bool>("UsePostgres"))
        await db.Database.EnsureDeletedAsync();
    await db.Database.EnsureCreatedAsync();
    await DbSeeder.SeedAsync(db, builder.Configuration, app.Environment);
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("shops");
// Cloud Run / reverse proxies terminate TLS; do not redirect inside the container.
if (!app.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(port))
    app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();
app.Run();

static void ValidateProductionConfig(WebApplicationBuilder builder)
{
    if (builder.Environment.IsDevelopment())
        return;

    if (!builder.Configuration.GetValue<bool>("UsePostgres"))
        throw new InvalidOperationException("Production requires UsePostgres=true (Supabase/Postgres).");

    var postgres = builder.Configuration.GetConnectionString("Postgres");
    if (string.IsNullOrWhiteSpace(postgres))
        throw new InvalidOperationException("Production requires ConnectionStrings:Postgres.");

    var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
    var weakKeys = new[]
    {
        "change-this-to-a-long-random-secret-key-32+",
        "dev-only-sanathanam-jwt-signing-key-32chars"
    };
    if (jwtKey.Length < 32 || weakKeys.Any(w => string.Equals(w, jwtKey, StringComparison.Ordinal)))
        throw new InvalidOperationException("Production requires a strong Jwt:Key (32+ random characters).");
}
