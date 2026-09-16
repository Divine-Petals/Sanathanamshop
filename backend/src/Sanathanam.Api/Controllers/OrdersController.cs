using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Services;
using Sanathanam.Api.Tenancy;

namespace Sanathanam.Api.Controllers;

public record PlaceOrderRequest(List<CartLine> Items, Guid? AddressId, AddressInput? Address);

[ApiController]
[Authorize(Roles = "customer")]
[Route("api/orders")]
public class OrdersController(OrderService orders, AppDbContext db, TenantContext tenantContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Place([FromBody] PlaceOrderRequest body)
    {
        try
        {
            var order = await orders.PlaceAsync(User.GetUserId(), User.GetPhone(), body.Items, body.AddressId, body.Address);
            return Ok(ToDto(order));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> Mine()
    {
        var tenant = tenantContext.Current;
        var list = await db.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == User.GetUserId() && (tenant == null || o.TenantId == tenant.Id))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(list.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> One(Guid id)
    {
        var order = await db.Orders.Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == User.GetUserId());
        if (order is null) return NotFound();
        return Ok(ToDto(order));
    }

    private static object ToDto(Domain.Order o) => new
    {
        id = o.Id,
        order_number = o.OrderNumber,
        total_price = o.TotalPrice,
        status = o.Status.ToString().ToLowerInvariant(),
        phone = o.Phone,
        shipping = new { o.ShippingName, o.ShippingLine1, o.ShippingCity, o.ShippingPincode, o.ShippingState },
        created_at = o.CreatedAt,
        items = o.Items.Select(i => new { i.ProductId, name = i.Name, qty = i.Qty, price_in_inr = i.PriceInInr })
    };
}
