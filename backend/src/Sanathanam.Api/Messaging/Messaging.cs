using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Sanathanam.Api.Data;
using Sanathanam.Api.Domain;

namespace Sanathanam.Api.Messaging;

public interface ISmsSender
{
    Task<string?> SendOtpAsync(string phone, string code, CancellationToken ct = default);
}

public interface IWhatsAppSender
{
    Task<string?> SendOrderAsync(string phone, string brand, string orderNumber, string body, CancellationToken ct = default);
}

public class DevSmsSender(ILogger<DevSmsSender> log) : ISmsSender
{
    public Task<string?> SendOtpAsync(string phone, string code, CancellationToken ct = default)
    {
        log.LogWarning("DEV SMS OTP for {Phone}: {Code}", phone, code);
        return Task.FromResult<string?>("dev");
    }
}

public class DevWhatsAppSender(ILogger<DevWhatsAppSender> log) : IWhatsAppSender
{
    public Task<string?> SendOrderAsync(string phone, string brand, string orderNumber, string body, CancellationToken ct = default)
    {
        log.LogWarning("DEV WhatsApp order {Order} to {Phone} ({Brand}): {Body}", orderNumber, phone, brand, body);
        return Task.FromResult<string?>("dev");
    }
}

public class Msg91SmsSender(HttpClient http, IConfiguration config, ILogger<Msg91SmsSender> log) : ISmsSender
{
    public async Task<string?> SendOtpAsync(string phone, string code, CancellationToken ct = default)
    {
        var authKey = config["Msg91:AuthKey"];
        var templateId = config["Msg91:OtpTemplateId"];
        if (string.IsNullOrWhiteSpace(authKey) || string.IsNullOrWhiteSpace(templateId))
            throw new InvalidOperationException("MSG91 OTP is not configured.");

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://control.msg91.com/api/v5/otp");
        req.Headers.TryAddWithoutValidation("authkey", authKey);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        var payload = new
        {
            template_id = templateId,
            mobile = "91" + phone,
            otp = code
        };
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var res = await http.SendAsync(req, ct);
        var text = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            log.LogError("MSG91 OTP failed {Status}: {Body}", (int)res.StatusCode, text);
            throw new InvalidOperationException("Could not send OTP SMS.");
        }
        return text;
    }
}

public class Msg91WhatsAppSender(HttpClient http, IConfiguration config, ILogger<Msg91WhatsAppSender> log) : IWhatsAppSender
{
    public async Task<string?> SendOrderAsync(string phone, string brand, string orderNumber, string body, CancellationToken ct = default)
    {
        var authKey = config["Msg91:AuthKey"];
        var integratedNumber = config["Msg91:WhatsAppNumber"];
        var template = config["Msg91:OrderTemplateName"] ?? "order_details";
        if (string.IsNullOrWhiteSpace(authKey) || string.IsNullOrWhiteSpace(integratedNumber))
            throw new InvalidOperationException("MSG91 WhatsApp is not configured.");

        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/");
        req.Headers.TryAddWithoutValidation("authkey", authKey);
        var payload = new
        {
            integrated_number = integratedNumber,
            content_type = "template",
            payload = new
            {
                to = "91" + phone,
                type = "template",
                template = new
                {
                    name = template,
                    language = new { code = "en" },
                    components = new object[]
                    {
                        new
                        {
                            type = "body",
                            parameters = new object[]
                            {
                                new { type = "text", text = brand },
                                new { type = "text", text = orderNumber },
                                new { type = "text", text = body }
                            }
                        }
                    }
                }
            }
        };
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        var res = await http.SendAsync(req, ct);
        var text = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            log.LogError("MSG91 WhatsApp failed {Status}: {Body}", (int)res.StatusCode, text);
            throw new InvalidOperationException("Could not send WhatsApp order message.");
        }
        return text;
    }
}

public class MessagingService(
    AppDbContext db,
    ISmsSender sms,
    IWhatsAppSender whatsApp,
    ILogger<MessagingService> log)
{
    public async Task LogAsync(Guid? orderId, string channel, string phone, string template, string status, string? providerId, string? error)
    {
        db.MessageLogs.Add(new MessageLog
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Channel = channel,
            ToPhone = phone,
            Template = template,
            Status = status,
            ProviderId = providerId,
            Error = error
        });
        await db.SaveChangesAsync();
    }

    public async Task SendOtpAsync(string phone, string code)
    {
        try
        {
            var id = await sms.SendOtpAsync(phone, code);
            await LogAsync(null, "sms", phone, "otp", "sent", id, null);
        }
        catch (Exception ex)
        {
            await LogAsync(null, "sms", phone, "otp", "failed", null, ex.Message);
            throw;
        }
    }

    public async Task SendOrderWhatsAppAsync(Order order, Tenant tenant)
    {
        var lines = string.Join(", ", order.Items.Select(i => $"{i.Name} x{i.Qty}"));
        var body = $"{lines}. Total ₹{order.TotalPrice:0.00}";
        try
        {
            var id = await whatsApp.SendOrderAsync(order.Phone, tenant.Name, order.OrderNumber, body);
            await LogAsync(order.Id, "whatsapp", order.Phone, "order_details", "sent", id, null);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "WhatsApp order send failed for {Order}", order.OrderNumber);
            await LogAsync(order.Id, "whatsapp", order.Phone, "order_details", "failed", null, ex.Message);
        }
    }
}
