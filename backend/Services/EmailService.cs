using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace KolayKobi.Api.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger)
{
    private SmtpSettings Settings => new(
        Host:     config["Smtp:Host"]     ?? "smtp.brevo.com",
        Port:     int.Parse(config["Smtp:Port"] ?? "587"),
        User:     config["Smtp:User"]     ?? "",
        Password: config["Smtp:Password"] ?? "",
        FromEmail: config["Smtp:FromEmail"] ?? "noreply@kolaykobi.com",
        FromName:  config["Smtp:FromName"]  ?? "KolayKOBİ"
    );

    private record SmtpSettings(
        string Host, int Port,
        string User, string Password,
        string FromEmail, string FromName);

    // ── E-posta doğrulama ─────────────────────────────────────────────────────
    public async Task SendVerificationEmailAsync(string toEmail, string toName, string token)
    {
        var appUrl = config["AppUrl"] ?? "https://app.kolaykobi.com";
        var verifyUrl = $"{appUrl}/e-posta-dogrula?token={Uri.EscapeDataString(token)}";

        var html = $"""
            <!DOCTYPE html>
            <html lang="tr">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Inter',system-ui,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                         style="background:#fff;border-radius:16px;padding:40px;border:1px solid #e2e8f0;max-width:480px;">
                    <tr><td align="center" style="padding-bottom:24px;">
                      <span style="font-size:40px;">🤖</span>
                      <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#0f172a;">
                        Kolay<span style="color:#1D9E75;">KOBİ</span>
                      </h1>
                    </td></tr>
                    <tr><td style="padding-bottom:20px;">
                      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">
                        Merhaba {toName}, 👋
                      </h2>
                      <p style="margin:0;color:#475569;line-height:1.65;">
                        KolayKOBİ'ye hoş geldiniz! Yapay zeka araçlarını kullanmaya başlamak için
                        e-posta adresinizi doğrulamanız gerekmektedir.
                      </p>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 0;">
                      <a href="{verifyUrl}"
                         style="display:inline-block;background:#1D9E75;color:#fff;font-weight:700;
                                font-size:16px;padding:14px 32px;border-radius:10px;
                                text-decoration:none;letter-spacing:0.01em;">
                        ✉️ E-postamı Doğrula
                      </a>
                    </td></tr>
                    <tr><td style="padding-top:8px;">
                      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                        Bu bağlantı <strong>24 saat</strong> geçerlidir.<br>
                        Butona tıklayamazsanız bu bağlantıyı tarayıcınıza yapıştırın:<br>
                        <a href="{verifyUrl}" style="color:#1D9E75;word-break:break-all;">{verifyUrl}</a>
                      </p>
                      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
                      <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
                        Bu e-postayı siz talep etmediyseniz görmezden gelebilirsiniz.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        await SendAsync(toEmail, toName, "E-posta adresinizi doğrulayın — KolayKOBİ", html);
    }

    // ── Şifre sıfırlama (ileride kullanılacak) ───────────────────────────────
    public Task SendPasswordResetEmailAsync(string toEmail, string toName, string token)
    {
        // TODO: implement when needed
        return Task.CompletedTask;
    }

    // ── Ortak SMTP gönderici ─────────────────────────────────────────────────
    private async Task SendAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        var s = Settings;
        if (string.IsNullOrEmpty(s.User))
        {
            logger.LogWarning("SMTP credentials not configured — skipping email to {Email}", toEmail);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(s.FromName, s.FromEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        try
        {
            using var smtp = new SmtpClient();
            // Port 465 → SslOnConnect, Port 587 → StartTls
            var secureOption = s.Port == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;
            await smtp.ConnectAsync(s.Host, s.Port, secureOption);
            await smtp.AuthenticateAsync(s.User, s.Password);
            await smtp.SendAsync(message);
            await smtp.DisconnectAsync(true);
            logger.LogInformation("Email sent to {Email}: {Subject}", toEmail, subject);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            throw new InvalidOperationException("E-posta gönderilemedi. Lütfen tekrar deneyin.", ex);
        }
    }
}
