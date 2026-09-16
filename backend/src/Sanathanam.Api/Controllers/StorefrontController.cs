using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Controllers;

[ApiController]
[Route("api")]
public class StorefrontController(AppDbContext db, TenantContext tenantContext) : ControllerBase
{
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
            t.HeroVideoUrl
        });
    }

    [HttpGet("products")]
    public async Task<IActionResult> Products()
    {
        var t = tenantContext.Current;
        if (t is null) return NotFound(new { message = "Unknown store." });
        var products = await db.Products
            .Where(p => p.ProductTenants.Any(pt => pt.TenantId == t.Id))
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                id = p.Id,
                name = p.Name,
                price_in_inr = p.PriceInInr,
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
        var names = await db.Categories
            .Where(c => c.TenantId == t.Id)
            .OrderBy(c => c.Name)
            .Select(c => c.Name)
            .ToListAsync();
        var subs = await db.Subcategories
            .Where(s => s.TenantId == t.Id)
            .OrderBy(s => s.Name)
            .ToListAsync();
        var fromProducts = await db.Products
            .Where(p => p.ProductTenants.Any(pt => pt.TenantId == t.Id) && p.Subcategory != "")
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

    [HttpGet("health")]
    public IActionResult Health() => Ok(new { ok = true });
}
