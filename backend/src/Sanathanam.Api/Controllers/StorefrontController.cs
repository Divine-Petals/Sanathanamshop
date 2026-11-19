using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.SupabaseClient;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Controllers;

[ApiController]
[Route("api")]
public class StorefrontController(
    AppDbContext db,
    TenantContext tenantContext,
    IEnumerable<SupabaseShopStore> shops) : ControllerBase
{
    private readonly SupabaseShopStore? shop = shops.FirstOrDefault();

    [HttpGet("storefront")]
    public IActionResult Get()
    {
        var t = tenantContext.Current;
        if (t is null) return NotFound(new { message = "Unknown store. Send X-Tenant header." });
        return Ok(new
        {
            t.Id,
            t.Slug,
            t.Name,
            t.Tagline,
            t.ThemeKey,
            t.HeroEyebrow,
            t.HeroTitle,
            t.HeroHighlight,
            t.HeroBody,
            t.StoryTitle,
            t.StoryBody,
            t.LogoUrl,
            t.HeroVideoUrl,
            whatsapp_number = t.WhatsAppNumber
        });
    }

    [HttpGet("products")]
    public async Task<IActionResult> Products()
    {
        var t = tenantContext.Current;
        if (t is null) return NotFound(new { message = "Unknown store." });

        if (shop is not null)
        {
            try
            {
                return Ok(await shop.ListProductsForTenantAsync(t.Id));
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"WARNING Supabase products failed, EF fallback: {ex.Message}");
            }
        }

        var products = await db.Products
            .Where(p => p.ProductTenants.Any(pt => pt.TenantId == t.Id))
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                price_in_inr = p.PriceInInr,
                mrp = p.Mrp,
                domain = p.Domain,
                category = p.Category,
                subcategory = p.Subcategory,
                description = p.Description,
                ingredients = p.Ingredients,
                bestseller = p.Bestseller,
                available = p.Available,
                image_url = p.ImageUrl
            })
            .ToListAsync();
        return Ok(products);
    }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories()
    {
        var t = tenantContext.Current;
        if (t is null) return NotFound(new { message = "Unknown store." });

        if (shop is not null)
        {
            try
            {
                return Ok(await shop.ListCategoriesForTenantAsync(t.Id));
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"WARNING Supabase categories failed, EF fallback: {ex.Message}");
            }
        }

        var storeProducts = db.Products.Where(p => p.ProductTenants.Any(pt => pt.TenantId == t.Id));
        var names = (await db.Categories
                .Where(c => c.TenantId == t.Id)
                .Select(c => c.Name)
                .ToListAsync())
            .Concat(await storeProducts.Where(p => p.Category != "").Select(p => p.Category).ToListAsync())
            .Distinct()
            .OrderBy(n => n)
            .ToList();
        var subs = await db.Subcategories
            .Where(s => s.TenantId == t.Id)
            .OrderBy(s => s.Name)
            .ToListAsync();
        var fromProducts = await storeProducts
            .Where(p => p.Subcategory != "")
            .Select(p => new { p.Category, p.Subcategory })
            .Distinct()
            .ToListAsync();

        return Ok(names.Select(name =>
        {
            var seeded = subs.Where(s => s.CategoryName == name).Select(s => s.Name);
            var productSubs = fromProducts.Where(p => p.Category == name).Select(p => p.Subcategory);
            var subcategories = seeded.Concat(productSubs).Distinct().OrderBy(x => x).ToList();
            return new { name, subcategories };
        }));
    }

    /// <summary>All stores, for the storefront picker and the admin console. No X-Tenant needed.</summary>
    [HttpGet("stores")]
    public async Task<IActionResult> Stores()
    {
        List<Domain.Tenant> tenants;
        if (shop is not null)
            tenants = await shop.ListTenantsAsync();
        else
            tenants = await db.Tenants.OrderBy(x => x.Name).ToListAsync();
        return Ok(tenants.Select(StoreSummary));
    }

    public static object StoreSummary(Domain.Tenant t) => new
    {
        slug = t.Slug,
        name = t.Name,
        tagline = t.Tagline,
        theme_key = t.ThemeKey,
        logo_url = t.LogoUrl
    };

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { ok = true });
}
