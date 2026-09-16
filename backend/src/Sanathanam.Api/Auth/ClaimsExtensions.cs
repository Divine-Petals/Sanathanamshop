using System.Security.Claims;

namespace Sanathanam.Api.Auth;

public static class ClaimsExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        if (sub is null || !Guid.TryParse(sub, out var id))
            throw new UnauthorizedAccessException();
        return id;
    }

    public static string GetPhone(this ClaimsPrincipal user) =>
        user.FindFirstValue("phone") ?? "";
}
