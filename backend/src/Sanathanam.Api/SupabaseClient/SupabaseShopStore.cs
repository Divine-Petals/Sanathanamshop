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

    public async Task<List<Tenant>> ListTenantsAsync()
    {
        var res = await client.From<TenantRow>().Order("name", Ordering.Ascending).Get();
        return res.Models.Select(ToTenant).ToList();
    }

    public async Task<Tenant> CreateTenantAsync(Tenant t)
    {
        var row = new TenantRow
        {
            Id = Guid.NewGuid(),
            Slug = t.Slug,
            Name = t.Name,
            Tagline = t.Tagline,
            Domain = "",
            ThemeKey = t.ThemeKey,
            OrderPrefix = t.OrderPrefix,
            WhatsAppNumber = t.WhatsAppNumber,
        };
        var inserted = await client.From<TenantRow>().Insert(row);
        return ToTenant(inserted.Models.First());
    }

    private async Task<HashSet<Guid>> ProductIdsForTenantAsync(Guid tenantId)
    {
        var links = await client.From<ProductTenantRow>()
            .Filter("tenant_id", Operator.Equals, tenantId.ToString())
            .Get();
        return links.Models.Select(x => x.ProductId).ToHashSet();
    }

    public async Task<bool> ProductBelongsToTenantAsync(Guid productId, Guid tenantId) =>
        (await ProductIdsForTenantAsync(tenantId)).Contains(productId);

    public async Task<List<object>> ListProductsForTenantAsync(Guid tenantId)
    {
        var ids = await ProductIdsForTenantAsync(tenantId);
        if (ids.Count == 0) return [];
        var products = await client.From<ProductRow>().Order("name", Ordering.Ascending).Get();
        return products.Models
            .Where(p => ids.Contains(p.Id))
            .Select(MapProduct)
            .ToList();
    }

    public async Task<object> ListCategoriesForTenantAsync(Guid tenantId)
    {
        var tid = tenantId.ToString();
        var cats = await client.From<CategoryRow>().Filter("tenant_id", Operator.Equals, tid).Get();
        var subs = await client.From<SubcategoryRow>().Filter("tenant_id", Operator.Equals, tid).Get();
        var ids = await ProductIdsForTenantAsync(tenantId);
        var storeProducts = ids.Count == 0
            ? []
            : (await client.From<ProductRow>().Get()).Models.Where(p => ids.Contains(p.Id)).ToList();

        // Categories typed on a product (admin form) count too, not just the seeded ones.
        var names = cats.Models.Select(c => c.Name)
            .Concat(storeProducts.Select(p => p.Category))
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct()
            .OrderBy(n => n);

        return names.Select(name =>
        {
            var seeded = subs.Models.Where(s => s.CategoryName == name).Select(s => s.Name);
            var productSubs = storeProducts
                .Where(p => p.Category == name && !string.IsNullOrEmpty(p.Subcategory))
                .Select(p => p.Subcategory);
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
            Mrp = body.Mrp ?? 0,
            Domain = body.Domain ?? "",
            Category = body.Category ?? "",
            Subcategory = body.Subcategory ?? "",
            Description = body.Description ?? "",
            Ingredients = ProductRow.IngredientsFrom(body.Ingredients),
            Bestseller = body.Bestseller,
            Available = body.Available,
            Stock = body.Stock,
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
            .Set(x => x.Mrp, body.Mrp ?? existing.Mrp)
            .Set(x => x.Domain!, body.Domain ?? "")
            .Set(x => x.Category!, body.Category ?? "")
            .Set(x => x.Subcategory!, body.Subcategory ?? "")
            .Set(x => x.Description!, body.Description ?? "")
            .Set(x => x.Ingredients, ProductRow.IngredientsFrom(body.Ingredients))
            .Set(x => x.Bestseller, body.Bestseller)
            .Set(x => x.Available, body.Available)
            .Set(x => x.Stock!, body.Stock)
            .Set(x => x.ImageUrl!, body.ImageUrl ?? existing.ImageUrl)
            .Update();
        return updated.Models.FirstOrDefault() is { } p ? MapProduct(p) : null;
    }

    /// <summary>Sets the offer price to the MRP for every product of the store that has an MRP.</summary>
    public async Task<int> CopyMrpToOfferPriceAsync(Guid tenantId)
    {
        var ids = await ProductIdsForTenantAsync(tenantId);
        if (ids.Count == 0) return 0;
        var products = (await client.From<ProductRow>().Get()).Models
            .Where(p => ids.Contains(p.Id) && p.Mrp > 0 && p.PriceInInr != p.Mrp)
            .ToList();
        foreach (var p in products)
        {
            await client.From<ProductRow>()
                .Filter("id", Operator.Equals, p.Id.ToString())
                .Set(x => x.PriceInInr, p.Mrp)
                .Update();
        }
        return products.Count;
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
                payment_status = ((PaymentStatus)o.PaymentStatus).ToString().ToLowerInvariant(),
                phone = o.Phone,
                shipping = new { o.ShippingName, o.ShippingLine1, o.ShippingCity, o.ShippingPincode, o.ShippingState },
                created_at = o.CreatedAt,
                items = lines.Select(i => new { name = i.Name, qty = i.Qty, price_in_inr = i.PriceInInr })
            };
        }).ToList();
    }

    public async Task UpdateTenantSettingsAsync(Tenant t)
    {
        await client.From<TenantRow>()
            .Filter("id", Operator.Equals, t.Id.ToString())
            .Set(x => x.Name, t.Name)
            .Set(x => x.WhatsAppNumber, t.WhatsAppNumber)
            .Set(x => x.Tagline, t.Tagline)
            .Set(x => x.HeroEyebrow, t.HeroEyebrow)
            .Set(x => x.HeroTitle, t.HeroTitle)
            .Set(x => x.HeroHighlight, t.HeroHighlight)
            .Set(x => x.HeroBody, t.HeroBody)
            .Set(x => x.StoryTitle, t.StoryTitle)
            .Set(x => x.StoryBody, t.StoryBody)
            .Set(x => x.LogoUrl, t.LogoUrl)
            .Set(x => x.HeroVideoUrl, t.HeroVideoUrl)
            .Update();
    }

    public async Task<string> UploadPublicFileAsync(string path, byte[] data, string contentType)
    {
        var bucket = client.Storage.From(StorageBucket);
        await bucket.Upload(data, path, new Supabase.Storage.FileOptions { ContentType = contentType, Upsert = false });
        return bucket.GetPublicUrl(path);
    }

    /// <summary>Public Storage bucket for shop assets (env SUPABASE_STORAGE_BUCKET).</summary>
    public static string StorageBucket =>
        Environment.GetEnvironmentVariable("SUPABASE_STORAGE_BUCKET") is { Length: > 0 } b ? b : "divinepetalsassessts";

    public async Task<object?> PatchOrderStatusAsync(Guid id, OrderStatus status)
    {
        var res = await client.From<OrderRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        if (res.Models.Count == 0) return null;
        var updated = await client.From<OrderRow>()
            .Filter("id", Operator.Equals, id.ToString())
            .Set(x => x.Status, (int)status)
            .Update();
        var o = updated.Models.FirstOrDefault() ?? res.Models.First();
        return new
        {
            id = o.Id,
            status = ((OrderStatus)o.Status).ToString().ToLowerInvariant(),
            payment_status = ((PaymentStatus)o.PaymentStatus).ToString().ToLowerInvariant()
        };
    }

    public async Task<object?> PatchOrderPaymentAsync(Guid id, PaymentStatus payment)
    {
        var res = await client.From<OrderRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        if (res.Models.Count == 0) return null;
        var updated = await client.From<OrderRow>()
            .Filter("id", Operator.Equals, id.ToString())
            .Set(x => x.PaymentStatus, (int)payment)
            .Update();
        var o = updated.Models.FirstOrDefault() ?? res.Models.First();
        return new
        {
            id = o.Id,
            status = ((OrderStatus)o.Status).ToString().ToLowerInvariant(),
            payment_status = ((PaymentStatus)o.PaymentStatus).ToString().ToLowerInvariant()
        };
    }

    /// <summary>
    /// Takes <paramref name="qty"/> units off a tracked product's stock. PostgREST has no atomic
    /// decrement, so this is a compare-and-set on the current value, retried on a concurrent change.
    /// Returns false when there isn't enough stock. Untracked products (stock null) always succeed.
    /// </summary>
    public async Task<bool> TryReserveStockAsync(Guid productId, int qty)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var res = await client.From<ProductRow>().Filter("id", Operator.Equals, productId.ToString()).Get();
            var row = res.Models.FirstOrDefault();
            if (row is null) return false;
            if (row.Stock is not int current) return true;
            if (current < qty) return false;
            var updated = await client.From<ProductRow>()
                .Filter("id", Operator.Equals, productId.ToString())
                .Filter("stock", Operator.Equals, current.ToString())
                .Set(x => x.Stock!, current - qty)
                .Update();
            if (updated.Models.Count > 0) return true;
        }
        return false;
    }

    public async Task<int?> GetStockAsync(Guid productId)
    {
        var res = await client.From<ProductRow>().Filter("id", Operator.Equals, productId.ToString()).Get();
        return res.Models.FirstOrDefault()?.Stock;
    }

    /// <summary>Puts units back on a tracked product's stock (failed order, cancellation).</summary>
    public async Task ReleaseStockAsync(Guid productId, int qty)
    {
        for (var attempt = 0; attempt < 5; attempt++)
        {
            var res = await client.From<ProductRow>().Filter("id", Operator.Equals, productId.ToString()).Get();
            var row = res.Models.FirstOrDefault();
            if (row?.Stock is not int current) return;
            var updated = await client.From<ProductRow>()
                .Filter("id", Operator.Equals, productId.ToString())
                .Filter("stock", Operator.Equals, current.ToString())
                .Set(x => x.Stock!, current + qty)
                .Update();
            if (updated.Models.Count > 0) return;
        }
        Console.Error.WriteLine($"WARNING could not return {qty} units to stock of product {productId}.");
    }

    /// <summary>Status and line items of one order, for stock changes on cancel/reopen.</summary>
    public async Task<Order?> GetOrderWithItemsAsync(Guid id)
    {
        var res = await client.From<OrderRow>().Filter("id", Operator.Equals, id.ToString()).Get();
        var o = res.Models.FirstOrDefault();
        if (o is null) return null;
        var items = await client.From<OrderItemRow>().Filter("order_id", Operator.Equals, id.ToString()).Get();
        return new Order
        {
            Id = o.Id,
            TenantId = o.TenantId,
            Status = (OrderStatus)o.Status,
            PaymentStatus = (PaymentStatus)o.PaymentStatus,
            Items = items.Models.Select(i => new OrderItem
            {
                Id = i.Id,
                OrderId = i.OrderId,
                ProductId = i.ProductId,
                Name = i.Name,
                Qty = i.Qty,
                PriceInInr = i.PriceInInr
            }).ToList()
        };
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
            PaymentStatus = (int)order.PaymentStatus,
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
        OrderPrefix = t.OrderPrefix,
        WhatsAppNumber = t.WhatsAppNumber ?? ""
    };

    private static Product ToProduct(ProductRow p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        PriceInInr = p.PriceInInr,
        Mrp = p.Mrp,
        Domain = p.Domain,
        Category = p.Category,
        Subcategory = p.Subcategory,
        Description = p.Description,
        Ingredients = p.GetIngredients(),
        Bestseller = p.Bestseller,
        Available = p.Available,
        Stock = p.Stock,
        ImageUrl = p.ImageUrl
    };

    private static object MapProduct(ProductRow p) => new
    {
        id = p.Id,
        name = p.Name,
        price_in_inr = p.PriceInInr,
        mrp = p.Mrp,
        domain = p.Domain,
        category = p.Category,
        subcategory = p.Subcategory,
        description = p.Description,
        ingredients = p.GetIngredients(),
        bestseller = p.Bestseller,
        available = p.Available,
        stock = p.Stock,
        image_url = p.ImageUrl
    };
}

public record ProductWriteDto(
    string Name,
    decimal PriceInInr,
    string? Category,
    string? Subcategory,
    string? Description,
    string[]? Ingredients,
    bool Bestseller,
    bool Available,
    string? ImageUrl,
    string? Domain = null,
    decimal? Mrp = null,
    int? Stock = null);
