using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Domain;

namespace Sanathanam.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Subcategory> Subcategories => Set<Subcategory>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductTenant> ProductTenants => Set<ProductTenant>();
    public DbSet<OtpChallenge> OtpChallenges => Set<OtpChallenge>();
    public DbSet<AdminUser> Admins => Set<AdminUser>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<MessageLog> MessageLogs => Set<MessageLog>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        // Snake_case tables/columns so EF matches supabase/schema.sql on Postgres.
        model.Entity<Tenant>(e =>
        {
            e.ToTable("tenants");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Slug).HasColumnName("slug");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Tagline).HasColumnName("tagline");
            e.Property(x => x.Domain).HasColumnName("domain");
            e.Property(x => x.ThemeKey).HasColumnName("theme_key");
            e.Property(x => x.HeroEyebrow).HasColumnName("hero_eyebrow");
            e.Property(x => x.HeroTitle).HasColumnName("hero_title");
            e.Property(x => x.HeroHighlight).HasColumnName("hero_highlight");
            e.Property(x => x.HeroBody).HasColumnName("hero_body");
            e.Property(x => x.StoryTitle).HasColumnName("story_title");
            e.Property(x => x.StoryBody).HasColumnName("story_body");
            e.Property(x => x.LogoUrl).HasColumnName("logo_url");
            e.Property(x => x.HeroVideoUrl).HasColumnName("hero_video_url");
            e.Property(x => x.OrderPrefix).HasColumnName("order_prefix");
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Domain);
        });

        model.Entity<User>(e =>
        {
            e.ToTable("users");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.Phone).IsUnique();
        });

        model.Entity<Address>(e =>
        {
            e.ToTable("addresses");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.FullName).HasColumnName("full_name");
            e.Property(x => x.Line1).HasColumnName("line1");
            e.Property(x => x.City).HasColumnName("city");
            e.Property(x => x.Pincode).HasColumnName("pincode");
            e.Property(x => x.State).HasColumnName("state");
            e.Property(x => x.IsDefault).HasColumnName("is_default");
        });

        model.Entity<Category>(e =>
        {
            e.ToTable("categories");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        model.Entity<Subcategory>(e =>
        {
            e.ToTable("subcategories");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.CategoryName).HasColumnName("category_name");
            e.Property(x => x.Name).HasColumnName("name");
            e.HasIndex(x => new { x.TenantId, x.CategoryName, x.Name }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        model.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.PriceInInr).HasColumnName("price_in_inr").HasPrecision(10, 2);
            e.Property(x => x.Category).HasColumnName("category");
            e.Property(x => x.Subcategory).HasColumnName("subcategory");
            e.Property(x => x.Description).HasColumnName("description");
            e.Property(x => x.Ingredients).HasColumnName("ingredients").HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<string>());
            e.Property(x => x.Bestseller).HasColumnName("bestseller");
            e.Property(x => x.Available).HasColumnName("available");
            e.Property(x => x.ImageUrl).HasColumnName("image_url");
        });

        model.Entity<ProductTenant>(e =>
        {
            e.ToTable("product_tenants");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.HasKey(x => new { x.ProductId, x.TenantId });
            e.HasOne(x => x.Product).WithMany(x => x.ProductTenants).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.Tenant).WithMany(x => x.ProductTenants).HasForeignKey(x => x.TenantId);
        });

        model.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderNumber).HasColumnName("order_number");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.Property(x => x.UserId).HasColumnName("user_id");
            e.Property(x => x.TotalPrice).HasColumnName("total_price").HasPrecision(10, 2);
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.ShippingName).HasColumnName("shipping_name");
            e.Property(x => x.ShippingLine1).HasColumnName("shipping_line1");
            e.Property(x => x.ShippingCity).HasColumnName("shipping_city");
            e.Property(x => x.ShippingPincode).HasColumnName("shipping_pincode");
            e.Property(x => x.ShippingState).HasColumnName("shipping_state");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => x.OrderNumber).IsUnique();
        });

        model.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderId).HasColumnName("order_id");
            e.Property(x => x.ProductId).HasColumnName("product_id");
            e.Property(x => x.Name).HasColumnName("name");
            e.Property(x => x.Qty).HasColumnName("qty");
            e.Property(x => x.PriceInInr).HasColumnName("price_in_inr").HasPrecision(10, 2);
        });

        model.Entity<AdminUser>(e =>
        {
            e.ToTable("admin_users");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Email).HasColumnName("email");
            e.Property(x => x.PasswordHash).HasColumnName("password_hash");
            e.Property(x => x.TenantId).HasColumnName("tenant_id");
            e.HasIndex(x => x.Email).IsUnique();
        });

        model.Entity<OtpChallenge>(e =>
        {
            e.ToTable("otp_challenges");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.Phone).HasColumnName("phone");
            e.Property(x => x.CodeHash).HasColumnName("code_hash");
            e.Property(x => x.Purpose).HasColumnName("purpose");
            e.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            e.Property(x => x.Attempts).HasColumnName("attempts");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
            e.HasIndex(x => new { x.Phone, x.CreatedAt });
        });

        model.Entity<MessageLog>(e =>
        {
            e.ToTable("message_logs");
            e.Property(x => x.Id).HasColumnName("id");
            e.Property(x => x.OrderId).HasColumnName("order_id");
            e.Property(x => x.Channel).HasColumnName("channel");
            e.Property(x => x.ToPhone).HasColumnName("to_phone");
            e.Property(x => x.Template).HasColumnName("template");
            e.Property(x => x.Status).HasColumnName("status");
            e.Property(x => x.ProviderId).HasColumnName("provider_id");
            e.Property(x => x.Error).HasColumnName("error");
            e.Property(x => x.CreatedAt).HasColumnName("created_at");
        });
    }
}
