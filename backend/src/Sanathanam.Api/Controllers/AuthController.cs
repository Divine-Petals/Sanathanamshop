using Microsoft.AspNetCore.Mvc;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Services;

namespace Sanathanam.Api.Controllers;

public record SendOtpRequest(string Phone);
public record VerifyOtpRequest(string Phone, string Code);

[ApiController]
[Route("api/auth")]
public class AuthController(OtpService otp, TokenService tokens) : ControllerBase
{
    [HttpPost("otp/send")]
    public async Task<IActionResult> Send([FromBody] SendOtpRequest body)
    {
        try
        {
            var debug = await otp.SendLoginOtpAsync(body.Phone);
            return Ok(new { sent = true, debugOtp = debug });
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
            var token = tokens.CreateAccessToken(user.Id, user.Phone, "customer");
            return Ok(new
            {
                token,
                user = new { id = user.Id, phone = user.Phone, name = user.Name }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
