using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;

namespace Sanathanam.Api.Tenancy;

public class TenantContext
{
    public Tenant? Current { get; set; }
}

public class TenantMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, AppDbContext db, TenantContext tenantContext)
    {
        var slug = http.Request.Headers["X-Tenant"].FirstOrDefault()
                   ?? http.Request.Query["tenant"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(slug))
        {
            var key = slug.Trim().ToLowerInvariant();
            tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Slug == key);
        }
        else
        {
            var host = http.Request.Host.Value ?? "";
            tenantContext.Current = await db.Tenants.FirstOrDefaultAsync(t => t.Domain == host.ToLowerInvariant());
        }

        await next(http);
    }
}
