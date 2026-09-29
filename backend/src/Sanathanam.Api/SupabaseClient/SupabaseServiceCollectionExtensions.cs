using Supabase;

namespace Sanathanam.Api.SupabaseClient;

public static class SupabaseServiceCollectionExtensions
{
    /// <summary>
    /// Registers official Supabase C# client from SUPABASE_URL + SUPABASE_KEY
    /// (also accepts SUPABASE_SECRET_KEY / SUPABASE_PUBLISHABLE_KEY).
    /// When set, products/orders/admin/tenants use PostgREST via SupabaseShopStore.
    /// </summary>
    public static async Task<IServiceCollection> AddSupabaseClientAsync(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env)
    {
        var url = FirstNonEmpty(
            config["SUPABASE_URL"],
            config["Supabase:Url"],
            Environment.GetEnvironmentVariable("SUPABASE_URL"));

        // Prefer secret/service key on the API; fall back to publishable/anon.
        var key = FirstNonEmpty(
            config["SUPABASE_KEY"],
            config["SUPABASE_SECRET_KEY"],
            config["Supabase:Key"],
            config["Supabase:SecretKey"],
            Environment.GetEnvironmentVariable("SUPABASE_KEY"),
            Environment.GetEnvironmentVariable("SUPABASE_SECRET_KEY"),
            config["SUPABASE_PUBLISHABLE_KEY"],
            Environment.GetEnvironmentVariable("SUPABASE_PUBLISHABLE_KEY"));

        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key))
        {
            if (!env.IsDevelopment())
            {
                Console.Error.WriteLine(
                    "WARNING: SUPABASE_URL / SUPABASE_KEY not set — products/orders/admin stay on EF Core. " +
                    "Set both env vars (use the service_role key on the API) to use PostgREST.");
            }

            return services;
        }

        var options = new SupabaseOptions
        {
            AutoConnectRealtime = false,
            AutoRefreshToken = true,
        };

        var client = new Client(url, key, options);
        await client.InitializeAsync();
        services.AddSingleton(client);
        services.AddSingleton<SupabaseShopStore>();
        Console.WriteLine($"Supabase.Client + ShopStore initialized for {url}");
        return services;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
}
