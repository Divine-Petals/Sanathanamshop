using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.SupabaseClient;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Services;

public record CartLine(Guid ProductId, int Qty);
public record AddressInput(string? FullName, string? Line1, string? City, string? Pincode, string? State);

public class OrderService(
    AppDbContext db,
    TenantContext tenantContext,
    IEnumerable<SupabaseShopStore> shops)
{
    private readonly SupabaseShopStore? _shop = shops.FirstOrDefault();

    public async Task<Order> PlaceAsync(Guid userId, string phone, IReadOnlyList<CartLine> lines, Guid? addressId, AddressInput? address)
    {
        if (lines.Count == 0)
            throw new InvalidOperationException("Cart is empty.");

        var tenant = tenantContext.Current ?? throw new InvalidOperationException("Unknown store.");
        var ids = lines.Select(l => l.ProductId).Distinct().ToList();

        List<Product> products;
        if (_shop is not null)
        {
            products = await _shop.GetAvailableProductsAsync(tenant.Id, ids);
        }
        else
        {
            products = await db.Products
                .Where(p => ids.Contains(p.Id) && p.Available)
                .Where(p => p.ProductTenants.Any(pt => pt.TenantId == tenant.Id))
                .ToListAsync();
        }

        if (products.Count != ids.Count)
            throw new InvalidOperationException("One or more products are unavailable.");

        if (lines.Any(l => l.Qty < 1))
            throw new InvalidOperationException("Invalid quantity.");

        // Check stock up front so the customer gets a clear message before anything is written.
        var wanted = lines.GroupBy(l => l.ProductId).ToDictionary(g => g.Key, g => g.Sum(l => l.Qty));
        foreach (var product in products)
        {
            if (product.Stock is int left && left < wanted[product.Id])
                throw new InvalidOperationException(StockMessage(product.Name, left));
        }

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
            shipName = address.FullName?.Trim() ?? "";
            line1 = address.Line1?.Trim() ?? "";
            city = address.City?.Trim() ?? "";
            pin = address.Pincode?.Trim() ?? "";
            state = address.State?.Trim() ?? "";
        }
        else
        {
            // Address is optional: the customer can share it on WhatsApp instead.
            shipName = line1 = city = pin = state = "";
        }

        var items = new List<OrderItem>();
        decimal total = 0;
        foreach (var line in lines)
        {
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

        // Take the stock (atomically per product), then save the order; give it back if saving fails.
        await ReserveStockAsync(items);
        try
        {
            if (_shop is not null)
                order = await _shop.InsertOrderAsync(order);
            else
            {
                db.Orders.Add(order);
                await db.SaveChangesAsync();
                await db.Entry(order).Collection(o => o.Items).LoadAsync();
            }
        }
        catch
        {
            await ReleaseStockAsync(items);
            throw;
        }

        return order;
    }

    /// <summary>
    /// Reduces stock for every line of an order. All or nothing: if one product runs short
    /// (e.g. someone else bought the last one a moment ago), what was already taken is put back.
    /// </summary>
    public async Task ReserveStockAsync(IEnumerable<OrderItem> items)
    {
        var lines = items.GroupBy(i => i.ProductId)
            .Select(g => (ProductId: g.Key, Name: g.First().Name, Qty: g.Sum(i => i.Qty)))
            .ToList();
        var taken = new List<OrderItem>();
        foreach (var line in lines)
        {
            if (!await TryReserveAsync(line.ProductId, line.Qty))
            {
                await ReleaseStockAsync(taken);
                var left = await CurrentStockAsync(line.ProductId);
                throw new InvalidOperationException(StockMessage(line.Name, left ?? 0));
            }
            taken.Add(new OrderItem { ProductId = line.ProductId, Qty = line.Qty });
        }
    }

    /// <summary>Puts the order's units back in stock (failed order or cancellation).</summary>
    public async Task ReleaseStockAsync(IEnumerable<OrderItem> items)
    {
        foreach (var g in items.GroupBy(i => i.ProductId))
        {
            var qty = g.Sum(i => i.Qty);
            if (_shop is not null)
                await _shop.ReleaseStockAsync(g.Key, qty);
            else
                await db.Products
                    .Where(p => p.Id == g.Key && p.Stock != null)
                    .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock + qty));
        }
    }

    private async Task<bool> TryReserveAsync(Guid productId, int qty)
    {
        if (_shop is not null)
            return await _shop.TryReserveStockAsync(productId, qty);

        if (await db.Products.AnyAsync(p => p.Id == productId && p.Stock == null))
            return true;
        // Single conditional UPDATE, so two orders can't both take the last unit.
        var changed = await db.Products
            .Where(p => p.Id == productId && p.Stock != null && p.Stock >= qty)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Stock, p => p.Stock - qty));
        return changed == 1;
    }

    private async Task<int?> CurrentStockAsync(Guid productId)
    {
        if (_shop is not null)
            return await _shop.GetStockAsync(productId);
        return await db.Products.Where(p => p.Id == productId).Select(p => p.Stock).FirstOrDefaultAsync();
    }

    private static string StockMessage(string name, int left) =>
        left <= 0 ? $"{name} is out of stock." : $"Only {left} of {name} left in stock.";
}
