using Microsoft.EntityFrameworkCore;
using Sanathanam.Api.Auth;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;
using Sanathanam.Api.Messaging;

namespace Sanathanam.Api.Services;

/// <param name="NewUser">No account for this number yet: the app should collect name + date of birth.</param>
/// <param name="Mode">"dob" = the OTP is the DDMM of the date of birth; "sms" = a code was sent/configured.</param>
public record OtpSendResult(bool NewUser, string Mode, string? DebugCode);

public class OtpService(AppDbContext db, MessagingService messaging, IConfiguration config, IHostEnvironment env)
{
    public async Task<OtpSendResult> SendLoginOtpAsync(string phone)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Phone == phone);
        if (user is null)
            return new OtpSendResult(true, "", null);

        // For now: a registered customer's OTP is the DDMM of their date of birth. Nothing is sent.
        // It still goes through a challenge row so the attempt and resend limits apply.
        if (user.DateOfBirth is DateOnly dob)
        {
            await EnforceResendLimitAsync(phone);
            db.OtpChallenges.Add(new OtpChallenge
            {
                Id = Guid.NewGuid(),
                Phone = phone,
                CodeHash = TokenService.HashOtp(DobCode(dob)),
                Purpose = "login",
                ExpiresAt = DateTime.UtcNow.AddMinutes(30)
            });
            await db.SaveChangesAsync();
            return new OtpSendResult(false, "dob", null);
        }

        // Accounts made before sign-up existed have no date of birth: keep the SMS/static code.
        var staticCode = config["Otp:StaticCode"]?.Trim();
        var skipSend = IsTruthy(config["Otp:SkipSend"]) || !string.IsNullOrEmpty(staticCode);

        if (string.IsNullOrEmpty(staticCode))
            await EnforceResendLimitAsync(phone);

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
        return new OtpSendResult(false, "sms",
            !string.IsNullOrEmpty(staticCode) || env.IsDevelopment() ? code : null);
    }

    /// <summary>Registers a new customer (phone + name + date of birth) and returns them, signed in.</summary>
    public async Task<User> SignUpAsync(string phone, string? name, DateOnly? dateOfBirth)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var trimmed = name?.Trim() ?? "";
        if (trimmed.Length == 0)
            throw new InvalidOperationException("Enter your name.");
        if (trimmed.Length > 100)
            throw new InvalidOperationException("Name is too long.");
        var dob = ValidateDateOfBirth(dateOfBirth);

        if (await db.Users.AnyAsync(u => u.Phone == phone))
            throw new InvalidOperationException("This number is already registered. Sign in with your OTP.");

        var user = new User { Id = Guid.NewGuid(), Phone = phone, Name = trimmed, DateOfBirth = dob };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static DateOnly ValidateDateOfBirth(DateOnly? value)
    {
        if (value is not DateOnly dob)
            throw new InvalidOperationException("Enter your date of birth.");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (dob > today || dob.Year < 1900)
            throw new InvalidOperationException("Enter a valid date of birth.");
        return dob;
    }

    /// <summary>The temporary login OTP: day and month of birth, e.g. 7 March → "0703".</summary>
    public static string DobCode(DateOnly dob) => dob.ToString("ddMM");

    private async Task EnforceResendLimitAsync(string phone)
    {
        var recent = await db.OtpChallenges.CountAsync(o =>
            o.Phone == phone && o.CreatedAt > DateTime.UtcNow.AddMinutes(-10));
        if (recent >= 3)
            throw new InvalidOperationException("Too many OTP requests. Try again in a few minutes.");
    }

    public async Task<User> VerifyLoginOtpAsync(string phone, string code)
    {
        phone = PhoneNormalizer.Normalize(phone);
        var entered = code.Trim();
        var staticCode = config["Otp:StaticCode"]?.Trim();

        var existing = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Phone == phone)
                       ?? throw new InvalidOperationException("No account for this number. Sign up first.");

        // Configured static OTP bypasses challenge lookup (useful while SMS/DB seed settle).
        // Not for customers with a date of birth: their OTP is the DDMM code.
        if (existing.DateOfBirth is null
            && !string.IsNullOrEmpty(staticCode)
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
