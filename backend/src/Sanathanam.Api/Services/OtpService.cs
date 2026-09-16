using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.Messaging;

namespace Sanathanam.Api.Services;

public class OtpService(AppDbContext db, MessagingService messaging, IHostEnvironment env)
{
    public async Task<string?> SendLoginOtpAsync(string phone)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var recent = await db.OtpChallenges.CountAsync(o =>
            o.Phone == phone && o.CreatedAt > DateTime.UtcNow.AddMinutes(-10));
        if (recent >= 3)
            throw new InvalidOperationException("Too many OTP requests. Try again in a few minutes.");

        var code = env.IsDevelopment() ? "123456" : Random.Shared.Next(100000, 999999).ToString();
        db.OtpChallenges.Add(new OtpChallenge
        {
            Id = Guid.NewGuid(),
            Phone = phone,
            CodeHash = TokenService.HashOtp(code),
            Purpose = "login",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5)
        });
        await db.SaveChangesAsync();
        await messaging.SendOtpAsync(phone, code);
        return env.IsDevelopment() ? code : null;
    }

    public async Task<User> VerifyLoginOtpAsync(string phone, string code)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var challenge = await db.OtpChallenges
            .Where(o => o.Phone == phone && o.Purpose == "login")
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (challenge is null || challenge.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("OTP expired. Request a new one.");
        if (challenge.Attempts >= 5)
            throw new InvalidOperationException("Too many attempts. Request a new OTP.");

        challenge.Attempts++;
        if (!string.Equals(challenge.CodeHash, TokenService.HashOtp(code.Trim()), StringComparison.OrdinalIgnoreCase))
        {
            await db.SaveChangesAsync();
            throw new InvalidOperationException("Invalid OTP.");
        }

        db.OtpChallenges.Remove(challenge);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Phone == phone);
        if (user is null)
        {
            user = new User { Id = Guid.NewGuid(), Phone = phone };
            db.Users.Add(user);
        }
        await db.SaveChangesAsync();
        return user;
    }
}
