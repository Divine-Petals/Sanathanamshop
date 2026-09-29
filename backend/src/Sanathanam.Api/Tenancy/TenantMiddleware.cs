using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.SupabaseClient;

namespace Sanathanam.Api.Tenancy;

public class TenantContext
{
    public Domain.Tenant? Current { get; set; }
}

public class TenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, AppDbContext db, TenantContext tenantContext)
    {
        // Skip store resolution for probes / docs.
        var path = http.Request.Path.Value ?? "";
        if (path.Equals("/health", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase))
        {
            await next(http);
            return;
        }

        try
        {
            var shop = http.RequestServices.GetService<SupabaseShopStore>();
            var slug = http.Request.Headers["X-Tenant"].FirstOrDefault()
                       ?? http.Request.Query["tenant"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(slug))
            {
                var key = slug.Trim().ToLowerInvariant();
                if (shop is not null)
                    tenantContext.Current = await shop.FindTenantBySlugAsync(key);
                else
                    tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == key);
            }
            else
            {
                var host = (http.Request.Host.Value ?? "").ToLowerInvariant();
                if (shop is not null)
                    tenantContext.Current = await shop.FindTenantByDomainAsync(host);
                else
                    tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Domain == host);
            }
        }
        catch (Exception ex)
        {
            // Keep API up if catalog store is mid-setup (e.g. schema.sql not applied yet).
            Console.Error.WriteLine($"WARNING tenant resolve failed: {ex.Message}");
            tenantContext.Current = null;
        }

        await next(http);
    }
}
