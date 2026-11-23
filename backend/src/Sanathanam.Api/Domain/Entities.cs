namespace Sanathanam.Api.Domain;

public class Tenant
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = "";
    public string Name { get; set; } = "";
    public string Tagline { get; set; } = "";
    public string Domain { get; set; } = "";
    public string ThemeKey { get; set; } = "";
    public string HeroEyebrow { get; set; } = "";
    public string HeroTitle { get; set; } = "";
    public string HeroHighlight { get; set; } = "";
    public string HeroBody { get; set; } = "";
    public string StoryTitle { get; set; } = "";
    public string StoryBody { get; set; } = "";
    public string LogoUrl { get; set; } = "";
    public string HeroVideoUrl { get; set; } = "";
    public string OrderPrefix { get; set; } = "DP";
    public string WhatsAppNumber { get; set; } = "";
    public ICollection<ProductTenant> ProductTenants { get; set; } = [];
}

public class User
{
    public Guid Id { get; set; }
    public string Phone { get; set; } = "";
    public string? Name { get; set; }
    /// <summary>Collected at sign-up. For now the login OTP is its DDMM.</summary>
    public DateOnly? DateOfBirth { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Address> Addresses { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}

public class Address
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string FullName { get; set; } = "";
    public string Line1 { get; set; } = "";
    public string City { get; set; } = "";
    public string Pincode { get; set; } = "";
    public string State { get; set; } = "Karnataka";
    public bool IsDefault { get; set; }
}

public class Category
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string Name { get; set; } = "";
}

public class Subcategory
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public string CategoryName { get; set; } = "";
    public string Name { get; set; } = "";
}

public class Product
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    /// <summary>Offer price: what the customer pays.</summary>
    public decimal PriceInInr { get; set; }
    /// <summary>Maximum retail price, shown struck out when above the offer price. 0 = not set.</summary>
    public decimal Mrp { get; set; }
    public string Domain { get; set; } = "";
    public string Category { get; set; } = "";
    public string Subcategory { get; set; } = "";
    public string Description { get; set; } = "";
    public string[] Ingredients { get; set; } = [];
    public bool Bestseller { get; set; }
    public bool Available { get; set; } = true;
    /// <summary>Units in stock. Null = stock not tracked (unlimited).</summary>
    public int? Stock { get; set; }
    public string ImageUrl { get; set; } = "";
    public ICollection<ProductTenant> ProductTenants { get; set; } = [];
}

public class ProductTenant
{
    public Guid ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
}

public class OtpChallenge
{
    public Guid Id { get; set; }
    public string Phone { get; set; } = "";
    public string CodeHash { get; set; } = "";
    public string Purpose { get; set; } = "login";
    public DateTime ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AdminUser
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Guid? TenantId { get; set; }
    public Tenant? Tenant { get; set; }
}

public enum OrderStatus
{
    Pending = 0,
    Confirmed = 1,
    Packed = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5,
    /// <summary>Finished and locked: status and payment can't change until it is reopened.</summary>
    Closed = 6
}

public enum PaymentStatus
{
    Unpaid = 0,
    Paid = 1,
    Refunded = 2
}

public class Order
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public Guid TenantId { get; set; }
    public Tenant Tenant { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal TotalPrice { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string Phone { get; set; } = "";
    public string ShippingName { get; set; } = "";
    public string ShippingLine1 { get; set; } = "";
    public string ShippingCity { get; set; } = "";
    public string ShippingPincode { get; set; } = "";
    public string ShippingState { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<OrderItem> Items { get; set; } = [];
}

public class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Order Order { get; set; } = null!;
    public Guid ProductId { get; set; }
    public string Name { get; set; } = "";
    public int Qty { get; set; }
    public decimal PriceInInr { get; set; }
}

public class MessageLog
{
    public Guid Id { get; set; }
    public Guid? OrderId { get; set; }
    public string Channel { get; set; } = "";
    public string ToPhone { get; set; } = "";
    public string Template { get; set; } = "";
    public string Status { get; set; } = "";
    public string? ProviderId { get; set; }
    public string? Error { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
