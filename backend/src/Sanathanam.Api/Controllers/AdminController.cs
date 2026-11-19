using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.SupabaseClient;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Controllers;

public record AdminLoginRequest(string Email, string Password);
public record ProductWrite(
    string Name,
    decimal PriceInInr,
    string? Category,
    string? Subcategory,
    string? Description,
    string[]? Ingredients,
    bool Bestseller,
    bool Available,
    string? ImageUrl,
    string? Domain,
    decimal? Mrp);
public record StatusPatch(string Status);
public record StoreCreate(
    string? Name,
    string? Slug,
    string? Tagline,
    string? ThemeKey,
    string? OrderPrefix,
    string? WhatsappNumber);
public record SettingsWrite(
    string? Name,
    string? WhatsappNumber,
    string? Tagline,
    string? HeroEyebrow,
    string? HeroTitle,
    string? HeroHighlight,
    string? HeroBody,
    string? StoryTitle,
    string? StoryBody,
    string? LogoUrl,
    string? HeroVideoUrl);

[ApiController]
[Route("api/admin")]
public class AdminController(
    AppDbContext db,
    TokenService tokens,
    TenantContext tenantContext,
    IEnumerable<SupabaseShopStore> shops) : ControllerBase
{
    private readonly SupabaseShopStore? shop = shops.FirstOrDefault();
    private bool UseSupabase => shop is not null;

    [HttpPost("auth/login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest body)
    {
        var email = body.Email.Trim().ToLowerInvariant();
        AdminUser? admin;
        if (UseSupabase)
            admin = await shop!.FindAdminByEmailAsync(email);
        else
            admin = await db.Admins.FirstOrDefaultAsync(a => a.Email.ToLower() == email);

        if (admin is null || !BCrypt.Net.BCrypt.Verify(body.Password, admin.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });
        var token = tokens.CreateAccessToken(admin.Id, admin.Email, "admin");
        return Ok(new { token, email = admin.Email });
    }

    [Authorize(Roles = "admin")]
    [HttpPost("products")]
    public async Task<IActionResult> Create([FromBody] ProductWrite body)
    {
        if (string.IsNullOrWhiteSpace(body.Name))
            return BadRequest(new { message = "Enter a product name." });
        if (PriceError(body) is { } createError) return BadRequest(new { message = createError });
        var tenant = tenantContext.Current ?? throw new InvalidOperationException("Unknown store.");
        if (UseSupabase)
        {
            var mapped = await shop!.CreateProductAsync(tenant.Id, ToDto(body));
            return Ok(mapped);
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = body.Name,
            PriceInInr = body.PriceInInr,
            Mrp = body.Mrp ?? 0,
            Domain = body.Domain ?? "",
            Category = body.Category ?? "",
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
        if (!await OwnsProductAsync(id)) return NotFound(new { message = "Product not found in this store." });
        if (PriceError(body) is { } updateError) return BadRequest(new { message = updateError });
        if (UseSupabase)
        {
            var mapped = await shop!.UpdateProductAsync(id, ToDto(body));
            return mapped is null ? NotFound() : Ok(mapped);
        }

        var product = await db.Products.FindAsync(id);
        if (product is null) return NotFound();
        product.Name = body.Name;
        product.PriceInInr = body.PriceInInr;
        if (body.Mrp is not null) product.Mrp = body.Mrp.Value;
        product.Domain = body.Domain ?? "";
        product.Category = body.Category ?? "";
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
        if (!await OwnsProductAsync(id)) return NotFound(new { message = "Product not found in this store." });
        if (UseSupabase)
            return await shop!.DeleteProductAsync(id) ? NoContent() : NotFound();

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
        if (!await OwnsProductAsync(id)) return NotFound(new { message = "Product not found in this store." });
        if (UseSupabase)
        {
            var mapped = await shop!.ToggleProductAsync(id);
            return mapped is null ? NotFound() : Ok(mapped);
        }

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
        if (UseSupabase)
            return Ok(await shop!.ListOrdersAsync(tenant?.Id));

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
    [HttpGet("settings")]
    public IActionResult GetSettings()
    {
        var tenant = tenantContext.Current;
        if (tenant is null) return NotFound(new { message = "Unknown store." });
        return Ok(SettingsDto(tenant));
    }

    [Authorize(Roles = "admin")]
    [HttpPut("settings")]
    public async Task<IActionResult> PutSettings([FromBody] SettingsWrite body)
    {
        var current = tenantContext.Current;
        if (current is null) return NotFound(new { message = "Unknown store." });

        Tenant? tenant = UseSupabase ? current : await db.Tenants.FindAsync(current.Id);
        if (tenant is null) return NotFound();

        if (body.WhatsappNumber is not null)
        {
            // wa.me needs the international number, digits only. A 10-digit number is treated as Indian.
            var digits = new string(body.WhatsappNumber.Where(char.IsDigit).ToArray());
            if (digits.Length == 10) digits = "91" + digits;
            if (digits.Length != 0 && (digits.Length < 11 || digits.Length > 15))
                return BadRequest(new { message = "Enter a WhatsApp number with country code, e.g. 919876543210." });
            tenant.WhatsAppNumber = digits;
        }
        if (body.Name is not null)
        {
            if (string.IsNullOrWhiteSpace(body.Name)) return BadRequest(new { message = "The store name can't be empty." });
            tenant.Name = body.Name.Trim();
        }
        // Null = leave as is. Empty string clears the field (the storefront then shows its default).
        if (body.Tagline is not null) tenant.Tagline = body.Tagline.Trim();
        if (body.HeroEyebrow is not null) tenant.HeroEyebrow = body.HeroEyebrow.Trim();
        if (body.HeroTitle is not null) tenant.HeroTitle = body.HeroTitle.Trim();
        if (body.HeroHighlight is not null) tenant.HeroHighlight = body.HeroHighlight.Trim();
        if (body.HeroBody is not null) tenant.HeroBody = body.HeroBody.Trim();
        if (body.StoryTitle is not null) tenant.StoryTitle = body.StoryTitle.Trim();
        if (body.StoryBody is not null) tenant.StoryBody = body.StoryBody.Trim();
        if (body.LogoUrl is not null) tenant.LogoUrl = body.LogoUrl.Trim();
        if (body.HeroVideoUrl is not null) tenant.HeroVideoUrl = body.HeroVideoUrl.Trim();

        if (UseSupabase)
            await shop!.UpdateTenantSettingsAsync(tenant);
        else
            await db.SaveChangesAsync();
        return Ok(SettingsDto(tenant));
    }

    private static readonly Dictionary<string, string> UploadTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
        ["image/svg+xml"] = ".svg",
        ["video/mp4"] = ".mp4",
        ["video/webm"] = ".webm",
    };

    /// <summary>Uploads a logo/hero/product file to Supabase Storage and returns its public URL.</summary>
    [Authorize(Roles = "admin")]
    [HttpPost("uploads")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 30 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile? file)
    {
        var tenant = tenantContext.Current;
        if (tenant is null) return NotFound(new { message = "Unknown store." });
        if (!UseSupabase) return BadRequest(new { message = "File uploads need Supabase Storage (SUPABASE_URL + key)." });
        if (file is null || file.Length == 0) return BadRequest(new { message = "Choose a file to upload." });
        if (!UploadTypes.TryGetValue(file.ContentType ?? "", out var ext))
            return BadRequest(new { message = "Use a JPEG, PNG, WebP, GIF, SVG, MP4 or WebM file." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var path = $"{tenant.Slug}/{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}{ext}";
        try
        {
            var url = await shop!.UploadPublicFileAsync(path, ms.ToArray(), file.ContentType!);
            return Ok(new { url });
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"ERROR storage upload: {ex.Message}");
            return BadRequest(new { message = $"Upload failed: {ex.Message}" });
        }
    }

    private static object SettingsDto(Tenant t) => new
    {
        name = t.Name,
        whatsapp_number = t.WhatsAppNumber,
        tagline = t.Tagline,
        hero_eyebrow = t.HeroEyebrow,
        hero_title = t.HeroTitle,
        hero_highlight = t.HeroHighlight,
        hero_body = t.HeroBody,
        story_title = t.StoryTitle,
        story_body = t.StoryBody,
        logo_url = t.LogoUrl,
        hero_video_url = t.HeroVideoUrl
    };

    [Authorize(Roles = "admin")]
    [HttpPatch("orders/{id:guid}")]
    public async Task<IActionResult> PatchStatus(Guid id, [FromBody] StatusPatch body)
    {
        if (!Enum.TryParse<OrderStatus>(body.Status, true, out var status))
            return BadRequest(new { message = "Invalid status." });

        if (UseSupabase)
        {
            var mapped = await shop!.PatchOrderStatusAsync(id, status);
            return mapped is null ? NotFound() : Ok(mapped);
        }

        var order = await db.Orders.FindAsync(id);
        if (order is null) return NotFound();
        order.Status = status;
        await db.SaveChangesAsync();
        return Ok(new { order.Id, status = order.Status.ToString().ToLowerInvariant() });
    }

    /// <summary>A product can only be changed from the store it belongs to (X-Tenant).</summary>
    private async Task<bool> OwnsProductAsync(Guid productId)
    {
        var tenant = tenantContext.Current;
        if (tenant is null) return false;
        if (UseSupabase) return await shop!.ProductBelongsToTenantAsync(productId, tenant.Id);
        return await db.ProductTenants.AnyAsync(pt => pt.ProductId == productId && pt.TenantId == tenant.Id);
    }

    /// <summary>Theme presets the storefront knows (src/lib/theme.js).</summary>
    private static readonly string[] ThemeKeys = ["divine-petals", "divine-jewels", "sanathanam"];

    private static readonly System.Text.RegularExpressions.Regex SlugPattern =
        new("^[a-z0-9]+(-[a-z0-9]+)*$", System.Text.RegularExpressions.RegexOptions.Compiled);

    // Root paths the storefront uses itself; a store slug can't take them.
    private static readonly string[] ReservedSlugs = ["admin", "login", "checkout", "account", "brands", "products", "api", "assets"];

    [Authorize(Roles = "admin")]
    [HttpPost("stores")]
    public async Task<IActionResult> CreateStore([FromBody] StoreCreate body)
    {
        var name = body.Name?.Trim() ?? "";
        var slug = body.Slug?.Trim().ToLowerInvariant() ?? "";
        if (name.Length == 0) return BadRequest(new { message = "Enter a store name." });
        if (!SlugPattern.IsMatch(slug) || slug.Length > 40)
            return BadRequest(new { message = "The link name can use lowercase letters, digits and dashes, e.g. divine-arts." });
        if (ReservedSlugs.Contains(slug))
            return BadRequest(new { message = $"\"{slug}\" is reserved. Choose another link name." });
        var theme = body.ThemeKey?.Trim() ?? "";
        if (!ThemeKeys.Contains(theme))
            return BadRequest(new { message = "Choose one of the theme presets." });

        var digits = new string((body.WhatsappNumber ?? "").Where(char.IsDigit).ToArray());
        if (digits.Length == 10) digits = "91" + digits;
        if (digits.Length != 0 && (digits.Length < 11 || digits.Length > 15))
            return BadRequest(new { message = "Enter a WhatsApp number with country code, e.g. 919876543210." });

        var prefix = new string((body.OrderPrefix ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0) prefix = new string(name.Where(char.IsLetter).Take(2).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0) prefix = "ST";
        if (prefix.Length > 6) prefix = prefix[..6];

        var tenant = new Tenant
        {
            Slug = slug,
            Name = name,
            Tagline = body.Tagline?.Trim() ?? "",
            ThemeKey = theme,
            OrderPrefix = prefix,
            WhatsAppNumber = digits
        };

        if (UseSupabase)
        {
            if (await shop!.FindTenantBySlugAsync(slug) is not null)
                return Conflict(new { message = "A store with that link name already exists." });
            tenant = await shop.CreateTenantAsync(tenant);
        }
        else
        {
            if (await db.Tenants.AnyAsync(t => t.Slug == slug))
                return Conflict(new { message = "A store with that link name already exists." });
            tenant.Id = Guid.NewGuid();
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
        }
        return Ok(StorefrontController.StoreSummary(tenant));
    }

    private static ProductWriteDto ToDto(ProductWrite body) => new(
        body.Name, body.PriceInInr, body.Category, body.Subcategory, body.Description,
        body.Ingredients, body.Bestseller, body.Available, body.ImageUrl, body.Domain, body.Mrp);

    private static string? PriceError(ProductWrite body)
    {
        if (body.PriceInInr <= 0) return "Enter an offer price above 0.";
        if (body.Mrp is < 0) return "MRP can't be negative.";
        if (body.Mrp is > 0 && body.PriceInInr > body.Mrp) return "The offer price can't be more than the MRP.";
        return null;
    }

    /// <summary>Bulk action: offer price = MRP for every product in the current store that has an MRP.</summary>
    [Authorize(Roles = "admin")]
    [HttpPost("products/copy-mrp-to-offer")]
    public async Task<IActionResult> CopyMrpToOffer()
    {
        var tenant = tenantContext.Current;
        if (tenant is null) return NotFound(new { message = "Unknown store." });
        if (UseSupabase)
            return Ok(new { updated = await shop!.CopyMrpToOfferPriceAsync(tenant.Id) });

        // Filter prices in memory: SQLite can't compare decimals in SQL.
        var products = (await db.Products
                .Where(p => p.ProductTenants.Any(pt => pt.TenantId == tenant.Id))
                .ToListAsync())
            .Where(p => p.Mrp > 0 && p.PriceInInr != p.Mrp)
            .ToList();
        foreach (var p in products) p.PriceInInr = p.Mrp;
        await db.SaveChangesAsync();
        return Ok(new { updated = products.Count });
    }

    private static object Map(Product p) => new
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
    };
}
