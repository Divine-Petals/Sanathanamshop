using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Controllers;

public record AdminLoginRequest(string Email, string Password);
public record ProductWrite(
    string Name,
    decimal PriceInInr,
    string Category,
    string? Subcategory,
    string? Description,
    string[]? Ingredients,
    bool Bestseller,
    bool Available,
    string? ImageUrl);
public record StatusPatch(string Status);

[ApiController]
[Route("api/admin")]
public class AdminController(AppDbContext db, TokenService tokens, TenantContext tenantContext) : ControllerBase
{
    [HttpPost("auth/login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest body)
    {
        var email = body.Email.Trim().ToLowerInvariant();
        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Email.ToLower() == email);
        if (admin is null || !BCrypt.Net.BCrypt.Verify(body.Password, admin.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });
        var token = tokens.CreateAccessToken(admin.Id, admin.Email, "admin");
        return Ok(new { token, email = admin.Email });
    }

    [Authorize(Roles = "admin")]
    [HttpPost("products")]
    public async Task<IActionResult> Create([FromBody] ProductWrite body)
    {
        var tenant = tenantContext.Current ?? throw new InvalidOperationException("Unknown store.");
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = body.Name,
            PriceInInr = body.PriceInInr,
            Category = body.Category,
            Subcategory = body.Subcategory ?? "",
            Description = body.Description ?? "",
            Ingredients = body.Ingredients ?? [],
            Bestseller = body.Bestseller,
            Available = body.Available,
            ImageUrl = body.ImageUrl ?? ""
        };
        db.Products.Add(product);
        db.ProductTenants.Add(new ProductTenant { ProductId = product.Id, TenantId = tenant.Id });
        await db.SaveChangesAsync();
        return Ok(Map(product));
    }

    [Authorize(Roles = "admin")]
    [HttpPut("products/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ProductWrite body)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        product.Name = body.Name;
        product.PriceInInr = body.PriceInInr;
        product.Category = body.Category;
        product.Subcategory = body.Subcategory ?? "";
        product.Description = body.Description ?? "";
        product.Ingredients = body.Ingredients ?? [];
        product.Bestseller = body.Bestseller;
        product.Available = body.Available;
        if (body.ImageUrl is not null) product.ImageUrl = body.ImageUrl;
        await db.SaveChangesAsync();
        return Ok(Map(product));
    }

    [Authorize(Roles = "admin")]
    [HttpDelete("products/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        db.ProductTenants.RemoveRange(db.ProductTenants.Where(pt => pt.ProductId == id));
        db.Products.Remove(product);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("products/{id:guid}/availability")]
    public async Task<IActionResult> Toggle(Guid id)
    {
        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        product.Available = !product.Available;
        await db.SaveChangesAsync();
        return Ok(Map(product));
    }

    [Authorize(Roles = "admin")]
    [HttpGet("orders")]
    public async Task<IActionResult> Orders()
    {
        var tenant = tenantContext.Current;
        var q = db.Orders.Include(o => o.Items).AsQueryable();
        if (tenant is not null)
            q = q.Where(o => o.TenantId == tenant.Id);
        var list = await q.OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(list.Select(o => new
        {
            o.Id,
            order_number = o.OrderNumber,
            total_price = o.TotalPrice,
            status = o.Status.ToString().ToLowerInvariant(),
            o.Phone,
            created_at = o.CreatedAt,
            items = o.Items.Select(i => new { name = i.Name, qty = i.Qty, price_in_inr = i.PriceInInr })
        }));
    }

    [Authorize(Roles = "admin")]
    [HttpPatch("orders/{id:guid}")]
    public async Task<IActionResult> PatchStatus(Guid id, [FromBody] StatusPatch body)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();
        if (!Enum.TryParse<OrderStatus>(body.Status, true, out var status))
            return BadRequest(new { message = "Invalid status." });
        order.Status = status;
        await db.SaveChangesAsync();
        return Ok(new { order.Id, status = order.Status.ToString().ToLowerInvariant() });
    }

    private static object Map(Product p) => new
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
    };
}
