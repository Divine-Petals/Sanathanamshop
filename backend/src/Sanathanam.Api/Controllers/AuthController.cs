using Microsoft.AspNetCore.Mvc;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Services;

namespace Sanathanam.Api.Controllers;

public record SendOtpRequest(string Phone);
public record VerifyOtpRequest(string Phone, string Code);
public record SignUpRequest(string Phone, string? Name, DateOnly? DateOfBirth);

[ApiController]
[Route("api/auth")]
public class AuthController(OtpService otp, TokenService tokens) : ControllerBase
{
    [HttpPost("otp/send")]
    public async Task<IActionResult> Send([FromBody] SendOtpRequest body)
    {
        try
        {
            var result = await otp.SendLoginOtpAsync(body.Phone);
            return Ok(new
            {
                sent = !result.NewUser,
                new_user = result.NewUser,
                otp_mode = result.Mode,
                debug_otp = result.DebugCode
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("otp/verify")]
    public async Task<IActionResult> Verify([FromBody] VerifyOtpRequest body)
    {
        try
        {
            var user = await otp.VerifyLoginOtpAsync(body.Phone, body.Code);
            return Ok(SignedIn(user));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>New customer: phone (from the sign-in step) + name + date of birth. Signs them in.</summary>
    [HttpPost("signup")]
    public async Task<IActionResult> SignUp([FromBody] SignUpRequest body)
    {
        try
        {
            var user = await otp.SignUpAsync(body.Phone, body.Name, body.DateOfBirth);
            return Ok(SignedIn(user));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private object SignedIn(Domain.User user) => new
    {
        token = tokens.CreateAccessToken(user.Id, user.Phone, "customer"),
        user = MeController.UserDto(user)
    };
}
