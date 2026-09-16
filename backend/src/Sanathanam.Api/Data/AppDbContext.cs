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
        model.Entity<Tenant>(e =>
        {
            e.HasIndex(x => x.Slug).IsUnique();
            e.HasIndex(x => x.Domain);
        });

        model.Entity<User>(e =>
        {
            e.HasIndex(x => x.Phone).IsUnique();
        });

        model.Entity<Category>(e =>
        {
            e.HasIndex(x => new { x.TenantId, x.Name }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        model.Entity<Subcategory>(e =>
        {
            e.HasIndex(x => new { x.TenantId, x.CategoryName, x.Name }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
        });

        model.Entity<Product>(e =>
        {
            e.Property(x => x.PriceInInr).HasPrecision(10, 2);
            e.Property(x => x.Ingredients).HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<string[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<string>());
        });

        model.Entity<ProductTenant>(e =>
        {
            e.HasKey(x => new { x.ProductId, x.TenantId });
            e.HasOne(x => x.Product).WithMany(x => x.ProductTenants).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.Tenant).WithMany(x => x.ProductTenants).HasForeignKey(x => x.TenantId);
        });

        model.Entity<Order>(e =>
        {
            e.HasIndex(x => x.OrderNumber).IsUnique();
            e.Property(x => x.TotalPrice).HasPrecision(10, 2);
        });

        model.Entity<OrderItem>(e =>
        {
            e.Property(x => x.PriceInInr).HasPrecision(10, 2);
        });

        model.Entity<AdminUser>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
        });

        model.Entity<OtpChallenge>(e =>
        {
            e.HasIndex(x => new { x.Phone, x.CreatedAt });
        });
    }
}
