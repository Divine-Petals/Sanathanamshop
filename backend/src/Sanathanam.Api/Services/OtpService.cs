using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.Messaging;

namespace Sanathanam.Api.Services;

public class OtpService(AppDbContext db, MessagingService messaging, IConfiguration config, IHostEnvironment env)
{
    public async Task<string?> SendLoginOtpAsync(string phone)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var staticCode = config["Otp:StaticCode"]?.Trim();
        var skipSend = IsTruthy(config["Otp:SkipSend"]) || !string.IsNullOrEmpty(staticCode);

        if (string.IsNullOrEmpty(staticCode))
        {
            var recent = await db.OtpChallenges.CountAsync(o =>
                o.Phone == phone && o.CreatedAt > DateTime.UtcNow.AddMinutes(-10));
            if (recent >= 3)
                throw new InvalidOperationException("Too many OTP requests. Try again in a few minutes.");
        }

        var code = !string.IsNullOrEmpty(staticCode)
            ? staticCode
            : env.IsDevelopment() ? "123456" : Random.Shared.Next(100000, 999999).ToString();

        try
        {
            db.OtpChallenges.Add(new OtpChallenge
            {
                Id = Guid.NewGuid(),
                Phone = phone,
                CodeHash = TokenService.HashOtp(code),
                Purpose = "login",
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            });
            await db.SaveChangesAsync();
        }
        catch (Exception ex) when (!string.IsNullOrEmpty(staticCode))
        {
            // Static OTP can still be verified from config even if challenge table is unavailable.
            Console.Error.WriteLine($"WARNING OTP challenge persist failed (static OTP still usable): {ex.Message}");
        }

        if (!skipSend)
            await messaging.SendOtpAsync(phone, code);
        else
            Console.WriteLine($"OTP send skipped (static/dev). Phone={phone} Code={code}");

        // Always return code when static OTP is configured so the UI can show it if needed.
        return !string.IsNullOrEmpty(staticCode) || env.IsDevelopment() ? code : null;
    }

    public async Task<User> VerifyLoginOtpAsync(string phone, string code)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var entered = code.Trim();
        var staticCode = config["Otp:StaticCode"]?.Trim();

        // Configured static OTP bypasses challenge lookup (useful while SMS/DB seed settle).
        if (!string.IsNullOrEmpty(staticCode)
            && string.Equals(entered, staticCode, StringComparison.Ordinal))
        {
            return await UpsertUserAsync(phone);
        }

        var challenge = await db.OtpChallenges
            .Where(o => o.Phone == phone && o.Purpose == "login")
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (challenge is null || challenge.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("OTP expired. Request a new one.");
        if (challenge.Attempts >= 5)
            throw new InvalidOperationException("Too many attempts. Request a new OTP.");

        challenge.Attempts++;
        if (!string.Equals(challenge.CodeHash, TokenService.HashOtp(entered), StringComparison.OrdinalIgnoreCase))
        {
            await db.SaveChangesAsync();
            throw new InvalidOperationException("Invalid OTP.");
        }

        db.OtpChallenges.Remove(challenge);
        await db.SaveChangesAsync();
        return await UpsertUserAsync(phone);
    }

    private async Task<User> UpsertUserAsync(string phone)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
        if (user is null)
        {
            user = new User { Id = Guid.NewGuid(), Phone = phone };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }
        return user;
    }

    private static bool IsTruthy(string? value) =>
        value?.Trim() is "1" or "true" or "True" or "TRUE" or "yes" or "Yes" or "YES";
}
