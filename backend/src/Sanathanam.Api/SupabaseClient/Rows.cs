using System.Text.Json;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Sanathanam.Api.SupabaseClient.Rows;

[Table("tenants")]
public class TenantRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("slug")] public string Slug { get; set; } = "";
    [Column("name")] public string Name { get; set; } = "";
    [Column("tagline")] public string Tagline { get; set; } = "";
    [Column("domain")] public string Domain { get; set; } = "";
    [Column("theme_key")] public string ThemeKey { get; set; } = "";
    [Column("hero_eyebrow")] public string HeroEyebrow { get; set; } = "";
    [Column("hero_title")] public string HeroTitle { get; set; } = "";
    [Column("hero_highlight")] public string HeroHighlight { get; set; } = "";
    [Column("hero_body")] public string HeroBody { get; set; } = "";
    [Column("story_title")] public string StoryTitle { get; set; } = "";
    [Column("story_body")] public string StoryBody { get; set; } = "";
    [Column("logo_url")] public string LogoUrl { get; set; } = "";
    [Column("hero_video_url")] public string HeroVideoUrl { get; set; } = "";
    [Column("order_prefix")] public string OrderPrefix { get; set; } = "DP";
}

[Table("categories")]
public class CategoryRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("name")] public string Name { get; set; } = "";
}

[Table("subcategories")]
public class SubcategoryRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("category_name")] public string CategoryName { get; set; } = "";
    [Column("name")] public string Name { get; set; } = "";
}

[Table("products")]
public class ProductRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("name")] public string Name { get; set; } = "";
    [Column("price_in_inr")] public decimal PriceInInr { get; set; }
    [Column("domain")] public string Domain { get; set; } = "";
    [Column("category")] public string Category { get; set; } = "";
    [Column("subcategory")] public string Subcategory { get; set; } = "";
    [Column("description")] public string Description { get; set; } = "";
    [Column("ingredients")] public JsonElement Ingredients { get; set; }
    [Column("bestseller")] public bool Bestseller { get; set; }
    [Column("available")] public bool Available { get; set; } = true;
    [Column("image_url")] public string ImageUrl { get; set; } = "";

    public string[] GetIngredients()
    {
        if (Ingredients.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            return [];
        if (Ingredients.ValueKind == JsonValueKind.Array)
            return Ingredients.EnumerateArray().Select(x => x.GetString() ?? "").Where(x => x.Length > 0).ToArray();
        if (Ingredients.ValueKind == JsonValueKind.String)
            return JsonSerializer.Deserialize<string[]>(Ingredients.GetString() ?? "[]") ?? [];
        return [];
    }

    public static JsonElement IngredientsFrom(string[]? items) =>
        JsonSerializer.SerializeToElement(items ?? []);
}

[Table("product_tenants")]
public class ProductTenantRow : BaseModel
{
    [PrimaryKey("product_id", true)]
    public Guid ProductId { get; set; }
    [PrimaryKey("tenant_id", true)]
    public Guid TenantId { get; set; }
}

[Table("admin_users")]
public class AdminUserRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("email")] public string Email { get; set; } = "";
    [Column("password_hash")] public string PasswordHash { get; set; } = "";
    [Column("tenant_id")] public Guid? TenantId { get; set; }
}

[Table("orders")]
public class OrderRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("order_number")] public string OrderNumber { get; set; } = "";
    [Column("tenant_id")] public Guid TenantId { get; set; }
    [Column("user_id")] public Guid UserId { get; set; }
    [Column("total_price")] public decimal TotalPrice { get; set; }
    [Column("status")] public int Status { get; set; }
    [Column("phone")] public string Phone { get; set; } = "";
    [Column("shipping_name")] public string ShippingName { get; set; } = "";
    [Column("shipping_line1")] public string ShippingLine1 { get; set; } = "";
    [Column("shipping_city")] public string ShippingCity { get; set; } = "";
    [Column("shipping_pincode")] public string ShippingPincode { get; set; } = "";
    [Column("shipping_state")] public string ShippingState { get; set; } = "";
    [Column("created_at")] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[Table("order_items")]
public class OrderItemRow : BaseModel
{
    [PrimaryKey("id", true)]
    public Guid Id { get; set; }
    [Column("order_id")] public Guid OrderId { get; set; }
    [Column("product_id")] public Guid ProductId { get; set; }
    [Column("name")] public string Name { get; set; } = "";
    [Column("qty")] public int Qty { get; set; }
    [Column("price_in_inr")] public decimal PriceInInr { get; set; }
}
