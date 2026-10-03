using Sanathanam.Api.Domain;
using Sanathanam.Api.SupabaseClient.Rows;
using static Supabase.Postgrest.Constants;

namespace Sanathanam.Api.SupabaseClient;

/// <summary>
/// Products, categories, admin users, and orders via Supabase PostgREST.
/// </summary>
public class SupabaseShopStore(Supabase.Client client)
{
    public async Task<Tenant?> FindTenantBySlugAsync(string slug)
    {
        var res = await client.From<TenantRow>()
            .Filter("slug", Operator.Equals, slug)
            .Get();
        return res.Models.FirstOrDefault() is { } row ? ToTenant(row) : null;
    }

    public async Task<Tenant?> FindTenantByDomainAsync(string domain)
    {
        var res = await client.From<TenantRow>()
            .Filter("domain", Operator.Equals, domain)
            .Get();
        return res.Models.FirstOrDefault() is { } row ? ToTenant(row) : null;
    }

    public async Task<List<object>> ListProductsForTenantAsync(Guid tenantId)
    {
        _ = tenantId;
        var links = await client.From<ProductTenantRow>().Get();
        var ids = links.Models.Select(x => x.ProductId).ToHashSet();
        // Single storefront: catalog is shared across former brand tenants.
        var products = await client.From<ProductRow>().Order("name", Ordering.Ascending).Get();
        return products.Models
            .Where(p => ids.Count == 0 || ids.Contains(p.Id))
            .Select(MapProduct)
            .ToList();
    }

    public async Task<object> ListCategoriesForTenantAsync(Guid tenantId)
    {
        _ = tenantId;
        var cats = await client.From<CategoryRow>()
            .Order("name", Ordering.Ascending)
            .Get();
        var subs = await client.From<SubcategoryRow>()
            .Order("name", Ordering.Ascending)
            .Get();
        var allProducts = (await client.From<ProductRow>().Get()).Models
            .Where(p => !string.IsNullOrEmpty(p.Subcategory))
            .Select(p => new { p.Category, p.Subcategory })
            .ToList();

        return cats.Models
            .GroupBy(c => c.Name)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var name = g.Key;
                var seeded = subs.Models.Where(s => s.CategoryName == name).Select(s => s.Name);
                var productSubs = allProducts.Where(p => p.Category == name).Select(p => p.Subcategory);
                var subcategories = seeded.Concat(productSubs).Distinct().OrderBy(x => x).ToList();
                return new { name, subcategories };
            }).ToList();
    }

    public async Task<object> CreateProductAsync(Guid tenantId, ProductWriteDto body)
    {
        var row = new ProductRow
        {
            Id = Guid.NewGuid(),
            Name = body.Name,
            PriceInInr = body.PriceInInr,
            Domain = body.Domain ?? "",
            Category = body.Category,
            Subcategory = body.Subcategory ?? "",
            Description = body.Description ?? "",
            Ingredients = ProductRow.IngredientsFrom(body.Ingredients),
            Bestseller = body.Bestseller,
            Available = body.Available,
            ImageUrl = body.ImageUrl ?? ""
        };
        var inserted = await client.From<ProductRow>().Insert(row);
        var product = inserted.Models.First();
        await client.From<ProductTenantRow>().Insert(new ProductTenantRow
        {
            ProductId = product.Id,
            TenantId = tenantId
        });
        return MapProduct(product);
    }

    public async Task<object?> UpdateProductAsync(Guid id, ProductWriteDto body)
    {
        var existingRes = await client.From<ProductRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        var existing = existingRes.Models.FirstOrDefault();
        if (existing is null) return null;

        var updated = await client.From<ProductRow>()
            .Filter("id", Operator.Equals, id.ToString())
            .Set(x => x.Name!, body.Name)
            .Set(x => x.PriceInInr, body.PriceInInr)
            .Set(x => x.Domain!, body.Domain ?? "")
            .Set(x => x.Category!, body.Category)
            .Set(x => x.Subcategory!, body.Subcategory ?? "")
            .Set(x => x.Description!, body.Description ?? "")
            .Set(x => x.Ingredients, ProductRow.IngredientsFrom(body.Ingredients))
            .Set(x => x.Bestseller, body.Bestseller)
            .Set(x => x.Available, body.Available)
            .Set(x => x.ImageUrl!, body.ImageUrl ?? existing.ImageUrl)
            .Update();
        return updated.Models.FirstOrDefault() is { } p ? MapProduct(p) : null;
    }

    public async Task<bool> DeleteProductAsync(Guid id)
    {
        var existing = await client.From<ProductRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        if (existing.Models.Count == 0) return false;
        await client.From<ProductTenantRow>().Filter("product_id", Operator.Equals, id.ToString()).Delete();
        await client.From<ProductRow>().Filter("id", Operator.Equals, id.ToString()).Delete();
        return true;
    }

    public async Task<object?> ToggleProductAsync(Guid id)
    {
        var res = await client.From<ProductRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        var existing = res.Models.FirstOrDefault();
        if (existing is null) return null;
        existing.Available = !existing.Available;
        var updated = await client.From<ProductRow>()
            .Filter("id", Operator.Equals, id.ToString())
            .Set(x => x.Available, existing.Available)
            .Update();
        return MapProduct(updated.Models.FirstOrDefault() ?? existing);
    }

    public async Task<AdminUser?> FindAdminByEmailAsync(string email)
    {
        var res = await client.From<AdminUserRow>()
            .Filter("email", Operator.Equals, email)
            .Get();
        var row = res.Models.FirstOrDefault();
        if (row is null) return null;
        return new AdminUser
        {
            Id = row.Id,
            Email = row.Email,
            PasswordHash = row.PasswordHash,
            TenantId = row.TenantId
        };
    }

    public async Task<List<object>> ListOrdersAsync(Guid? tenantId)
    {
        var query = client.From<OrderRow>().Order("created_at", Ordering.Descending);
        if (tenantId is Guid tid)
            query = query.Filter("tenant_id", Operator.Equals, tid.ToString());
        var orders = await query.Get();
        var items = await client.From<OrderItemRow>().Get();
        var byOrder = items.Models.GroupBy(i => i.OrderId).ToDictionary(g => g.Key, g => g.ToList());

        return orders.Models.Select(o =>
        {
            byOrder.TryGetValue(o.Id, out var lines);
            lines ??= [];
            return (object)new
            {
                id = o.Id,
                order_number = o.OrderNumber,
                total_price = o.TotalPrice,
                status = ((OrderStatus)o.Status).ToString().ToLowerInvariant(),
                phone = o.Phone,
                created_at = o.CreatedAt,
                items = lines.Select(i => new { name = i.Name, qty = i.Qty, price_in_inr = i.PriceInInr })
            };
        }).ToList();
    }

    public async Task<object?> PatchOrderStatusAsync(Guid id, OrderStatus status)
    {
        var res = await client.From<OrderRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        if (res.Models.Count == 0) return null;
        var updated = await client.From<OrderRow>()
            .Filter("id", Operator.Equals, id.ToString())
            .Set(x => x.Status, (int)status)
            .Update();
        var o = updated.Models.FirstOrDefault() ?? res.Models.First();
        return new { id = o.Id, status = ((OrderStatus)o.Status).ToString().ToLowerInvariant() };
    }

    public async Task<List<Product>> GetAvailableProductsAsync(Guid tenantId, IEnumerable<Guid> productIds)
    {
        var idSet = productIds.ToHashSet();
        var links = await client.From<ProductTenantRow>()
            .Filter("tenant_id", Operator.Equals, tenantId.ToString())
            .Get();
        var allowed = links.Models.Select(x => x.ProductId).Where(idSet.Contains).ToHashSet();
        var all = await client.From<ProductRow>().Get();
        return all.Models
            .Where(p => allowed.Contains(p.Id) && p.Available)
            .Select(ToProduct)
            .ToList();
    }

    public async Task<Order> InsertOrderAsync(Order order)
    {
        var orderRow = new OrderRow
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            TenantId = order.TenantId,
            UserId = order.UserId,
            TotalPrice = order.TotalPrice,
            Status = (int)order.Status,
            Phone = order.Phone,
            ShippingName = order.ShippingName,
            ShippingLine1 = order.ShippingLine1,
            ShippingCity = order.ShippingCity,
            ShippingPincode = order.ShippingPincode,
            ShippingState = order.ShippingState,
            CreatedAt = order.CreatedAt == default ? DateTime.UtcNow : order.CreatedAt
        };
        await client.From<OrderRow>().Insert(orderRow);
        var itemRows = order.Items.Select(i => new OrderItemRow
        {
            Id = i.Id == Guid.Empty ? Guid.NewGuid() : i.Id,
            OrderId = order.Id,
            ProductId = i.ProductId,
            Name = i.Name,
            Qty = i.Qty,
            PriceInInr = i.PriceInInr
        }).ToList();
        if (itemRows.Count > 0)
            await client.From<OrderItemRow>().Insert(itemRows);
        order.Items = itemRows.Select(i => new OrderItem
        {
            Id = i.Id,
            OrderId = i.OrderId,
            ProductId = i.ProductId,
            Name = i.Name,
            Qty = i.Qty,
            PriceInInr = i.PriceInInr
        }).ToList();
        return order;
    }

    public async Task EnsureSeededAsync(IConfiguration config)
    {
        var tenants = await client.From<TenantRow>().Get();
        if (tenants.Models.Count > 0) return;

        // Minimal seed: three brand tenants + admin. Catalog can be added via admin UI.
        var petals = NewTenant("divine-petals", "Divine Petals", "localhost:5173", "divine-petals", "DP");
        var jewels = NewTenant("divine-jewels", "Divine Jewels", "localhost:5174", "divine-jewels", "DJ");
        var sana = NewTenant("sanathanam", "Sanathanam", "localhost:5175", "sanathanam", "SN");
        await client.From<TenantRow>().Insert(new[] { petals, jewels, sana });

        var email = (config["Admin:Email"] ?? "admin@sanathanam.local").Trim().ToLowerInvariant();
        var password = config["Admin:Password"];
        if (string.IsNullOrWhiteSpace(password) || password == "Admin@123")
            throw new InvalidOperationException(
                "Set Admin:Password to a strong value before seeding (refusing empty/default Admin@123).");

        await client.From<AdminUserRow>().Insert(new AdminUserRow
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            TenantId = null
        });
    }

    private static TenantRow NewTenant(string slug, string name, string domain, string theme, string prefix) => new()
    {
        Id = Guid.NewGuid(),
        Slug = slug,
        Name = name,
        Tagline = name,
        Domain = domain,
        ThemeKey = theme,
        OrderPrefix = prefix,
        HeroTitle = name,
        HeroHighlight = "",
        HeroBody = "",
        StoryTitle = name,
        StoryBody = "",
        LogoUrl = "",
        HeroVideoUrl = "",
        HeroEyebrow = ""
    };

    private static Tenant ToTenant(TenantRow t) => new()
    {
        Id = t.Id,
        Slug = t.Slug,
        Name = t.Name,
        Tagline = t.Tagline,
        Domain = t.Domain,
        ThemeKey = t.ThemeKey,
        HeroEyebrow = t.HeroEyebrow,
        HeroTitle = t.HeroTitle,
        HeroHighlight = t.HeroHighlight,
        HeroBody = t.HeroBody,
        StoryTitle = t.StoryTitle,
        StoryBody = t.StoryBody,
        LogoUrl = t.LogoUrl,
        HeroVideoUrl = t.HeroVideoUrl,
        OrderPrefix = t.OrderPrefix
    };

    private static Product ToProduct(ProductRow p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        PriceInInr = p.PriceInInr,
        Domain = p.Domain,
        Category = p.Category,
        Subcategory = p.Subcategory,
        Description = p.Description,
        Ingredients = p.GetIngredients(),
        Bestseller = p.Bestseller,
        Available = p.Available,
        ImageUrl = p.ImageUrl
    };

    private static object MapProduct(ProductRow p) => new
    {
        id = p.Id,
        name = p.Name,
        price_in_inr = p.PriceInInr,
        domain = p.Domain,
        category = p.Category,
        subcategory = p.Subcategory,
        description = p.Description,
        ingredients = p.GetIngredients(),
        bestseller = p.Bestseller,
        available = p.Available,
        image_url = p.ImageUrl
    };
}

public record ProductWriteDto(
    string Name,
    decimal PriceInInr,
    string Category,
    string? Subcategory,
    string? Description,
    string[]? Ingredients,
    bool Bestseller,
    bool Available,
    string? ImageUrl,
    string? Domain = null);
