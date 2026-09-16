using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;

namespace Sanathanam.Api.Controllers;

public record UpdateMeRequest(string? Name);
public record AddressDto(string FullName, string Line1, string City, string Pincode, string? State, bool IsDefault);

[ApiController]
[Authorize(Roles = "customer")]
[Route("api/me")]
public class MeController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var id = User.GetUserId();
        var user = await db.Users.FindAsync(id);
        if (user is null) return Unauthorized();
        return Ok(new { id = user.Id, phone = user.Phone, name = user.Name });
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateMeRequest body)
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null) return Unauthorized();
        user.Name = body.Name?.Trim();
        await db.SaveChangesAsync();
        return Ok(new { id = user.Id, phone = user.Phone, name = user.Name });
    }

    [HttpGet("addresses")]
    public async Task<IActionResult> Addresses()
    {
        var list = await db.Addresses.Where(a => a.UserId == User.GetUserId())
            .OrderByDescending(a => a.IsDefault)
            .Select(a => new { a.Id, a.FullName, a.Line1, a.City, a.Pincode, a.State, a.IsDefault })
            .ToListAsync();
        return Ok(list);
    }

    [HttpPost("addresses")]
    public async Task<IActionResult> AddAddress([FromBody] AddressDto body)
    {
        var userId = User.GetUserId();
        if (body.IsDefault)
        {
            var existing = await db.Addresses.Where(a => a.UserId == userId).ToListAsync();
            foreach (var a in existing) a.IsDefault = false;
        }
        var addr = new Address
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FullName = body.FullName,
            Line1 = body.Line1,
            City = body.City,
            Pincode = body.Pincode,
            State = string.IsNullOrWhiteSpace(body.State) ? "Karnataka" : body.State!,
            IsDefault = body.IsDefault
        };
        db.Addresses.Add(addr);
        await db.SaveChangesAsync();
        return Ok(new { addr.Id, addr.FullName, addr.Line1, addr.City, addr.Pincode, addr.State, addr.IsDefault });
    }
}
