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
        var path = http.Request.Path.Value ?? "";
        if (path.Equals("/health", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase))
        {
            await next(http);
            return;
        }

        var shop = http.RequestServices.GetService<SupabaseShopStore>();
        var slug = http.Request.Headers["X-Tenant"].FirstOrDefault()
                   ?? http.Request.Query["tenant"].FirstOrDefault();

        try
        {
            if (!string.IsNullOrWhiteSpace(slug))
            {
                var key = slug.Trim().ToLowerInvariant();
                if (shop is not null)
                {
                    try
                    {
                        tenantContext.Current = await shop.FindTenantBySlugAsync(key);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"WARNING Supabase tenant lookup failed, falling back to EF: {ex.Message}");
                        tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == key);
                    }
                }
                else
                    tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == key);
            }
            else
            {
                var host = (http.Request.Host.Value ?? "").ToLowerInvariant();
                if (shop is not null)
                {
                    try
                    {
                        tenantContext.Current = await shop.FindTenantByDomainAsync(host);
                    }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"WARNING Supabase domain lookup failed, falling back to EF: {ex.Message}");
                        tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Domain == host);
                    }
                }
                else
                    tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Domain == host);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"WARNING tenant resolve failed: {ex.Message}");
            tenantContext.Current = null;
        }

        await next(http);
    }
}
