using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.Messaging;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Services;

public record CartLine(Guid ProductId, int Qty);
public record AddressInput(string FullName, string Line1, string City, string Pincode, string? State);

public class OrderService(AppDbContext db, TenantContext tenantContext, MessagingService messaging)
{
    public async Task<Order> PlaceAsync(Guid userId, string phone, IReadOnlyList<CartLine> lines, Guid? addressId, AddressInput? address)
    {
        if (lines.Count == 0)
            throw new InvalidOperationException("Cart is empty.");

        var tenant = tenantContext.Current ?? throw new InvalidOperationException("Unknown store.");
        var ids = lines.Select(l => l.ProductId).Distinct().ToList();
        var products = await db.Products
            .Where(p => ids.Contains(p.Id) && p.Available)
            .Where(p => p.ProductTenants.Any(pt => pt.TenantId == tenant.Id))
            .ToListAsync();

        if (products.Count != ids.Count)
            throw new InvalidOperationException("One or more products are unavailable.");

        string shipName, line1, city, pin, state;
        if (addressId is Guid aid)
        {
            var saved = await db.Addresses.FirstOrDefaultAsync(a => a.Id == aid && a.UserId == userId)
                        ?? throw new InvalidOperationException("Address not found.");
            shipName = saved.FullName;
            line1 = saved.Line1;
            city = saved.City;
            pin = saved.Pincode;
            state = saved.State;
        }
        else if (address is not null)
        {
            shipName = address.FullName;
            line1 = address.Line1;
            city = address.City;
            pin = address.Pincode;
            state = string.IsNullOrWhiteSpace(address.State) ? "Karnataka" : address.State;
        }
        else
            throw new InvalidOperationException("Delivery address is required.");

        var items = new List<OrderItem>();
        decimal total = 0;
        foreach (var line in lines)
        {
            if (line.Qty < 1)
                throw new InvalidOperationException("Invalid quantity.");
            var product = products.First(p => p.Id == line.ProductId);
            items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Name = product.Name,
                Qty = line.Qty,
                PriceInInr = product.PriceInInr
            });
            total += product.PriceInInr * line.Qty;
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = $"{tenant.OrderPrefix}-{DateTime.UtcNow:yyMMddHHmmss}-{Random.Shared.Next(100, 999)}",
            TenantId = tenant.Id,
            UserId = userId,
            TotalPrice = total,
            Status = OrderStatus.Pending,
            Phone = phone,
            ShippingName = shipName,
            ShippingLine1 = line1,
            ShippingCity = city,
            ShippingPincode = pin,
            ShippingState = state,
            Items = items
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        await db.Entry(order).Collection(o => o.Items).LoadAsync();
        await messaging.SendOrderWhatsAppAsync(order, tenant);
        return order;
    }
}
