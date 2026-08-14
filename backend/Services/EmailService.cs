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

    // Uygulamadaki Logo.tsx ile aynı URL
    private const string LogoUrl =
        "https://kolaykobi.com/wp-content/uploads/2025/07/3.png";

    private static string LogoHtml => $"""
        <img src="{LogoUrl}" alt="KolayKOBİ"
             style="height:48px;width:auto;display:block;margin:0 auto;" />
        """;

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
                      {LogoHtml}
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

    // ── Şifre sıfırlama ───────────────────────────────────────────────────────
    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string token)
    {
        var appUrl = config["AppUrl"] ?? "https://app.kolaykobi.com";
        var resetUrl = $"{appUrl}/sifre-sifirla?token={Uri.EscapeDataString(token)}";

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
                      {LogoHtml}
                    </td></tr>
                    <tr><td style="padding-bottom:20px;">
                      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">
                        Merhaba {toName}, 👋
                      </h2>
                      <p style="margin:0;color:#475569;line-height:1.65;">
                        KolayKOBİ hesabınıza erişim için bir bağlantı talep edildi.
                        Aşağıdaki butona tıklayarak yeni giriş bilgilerinizi belirleyebilirsiniz.
                      </p>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 0;">
                      <a href="{resetUrl}"
                         style="display:inline-block;background:#1D9E75;color:#fff;font-weight:700;
                                font-size:16px;padding:14px 32px;border-radius:10px;
                                text-decoration:none;letter-spacing:0.01em;">
                        Hesabıma Eriş
                      </a>
                    </td></tr>
                    <tr><td style="padding-top:8px;">
                      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                        Bu bağlantı <strong>1 saat</strong> geçerlidir.<br>
                        Butona tıklayamazsanız bu bağlantıyı tarayıcınıza yapıştırın:<br>
                        <a href="{resetUrl}" style="color:#1D9E75;word-break:break-all;">{resetUrl}</a>
                      </p>
                      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
                      <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
                        Bu işlemi siz başlatmadıysanız bu e-postayı görmezden gelebilirsiniz.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        await SendAsync(toEmail, toName, "KolayKOBİ — Hesabınıza erişim bağlantısı", html);
    }

    // ── Admin tarafından oluşturulan kullanıcıya hoş geldiniz maili ──────────
    public async Task SendWelcomeEmailAsync(string toEmail, string toName, string resetToken)
    {
        var appUrl  = config["AppUrl"] ?? "https://app.kolaykobi.com";
        var resetUrl = $"{appUrl}/sifre-sifirla?token={Uri.EscapeDataString(resetToken)}";

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
                      {LogoHtml}
                    </td></tr>
                    <tr><td style="padding-bottom:20px;">
                      <h2 style="margin:0 0 12px;font-size:18px;color:#0f172a;">
                        Merhaba {toName}, 👋
                      </h2>
                      <p style="margin:0;color:#475569;line-height:1.65;">
                        KolayKOBİ hesabınız oluşturuldu! Yapay zeka araçlarımızdan yararlanmak için
                        aşağıdaki butona tıklayarak şifrenizi belirleyin ve hemen başlayın.
                      </p>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 0;">
                      <a href="{resetUrl}"
                         style="display:inline-block;background:#1D9E75;color:#fff;font-weight:700;
                                font-size:16px;padding:14px 32px;border-radius:10px;
                                text-decoration:none;letter-spacing:0.01em;">
                        🔑 Şifremi Belirle &amp; Giriş Yap
                      </a>
                    </td></tr>
                    <tr><td style="padding-top:8px;">
                      <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                        Bu bağlantı <strong>24 saat</strong> geçerlidir.<br>
                        Butona tıklayamazsanız bu bağlantıyı tarayıcınıza yapıştırın:<br>
                        <a href="{resetUrl}" style="color:#1D9E75;word-break:break-all;">{resetUrl}</a>
                      </p>
                      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
                      <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
                        Bu e-posta KolayKOBİ yöneticisi tarafından hesap oluşturulduğundan gönderilmiştir.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;

        await SendAsync(toEmail, toName, "KolayKOBİ — Hesabınız oluşturuldu, şifrenizi belirleyin", html);
    }

    // ── Otomatik yenileme başarılı maili ────────────────────────────────────
    public async Task SendRenewalSuccessEmailAsync(
        string toEmail, string toName,
        string planOrToolName, decimal amount, DateTime newExpiresAt,
        string[]? features = null)
    {
        var appUrl = config["AppUrl"] ?? "https://app.kolaykobi.com";
        var date   = newExpiresAt.ToString("dd MMMM yyyy", new System.Globalization.CultureInfo("tr-TR"));
        var featuresHtml = features is { Length: > 0 }
            ? "<ul style=\"margin:8px 0;padding-left:18px;\">" +
              string.Join("", features.Select(f => $"<li style=\"color:#475569;font-size:14px;margin-bottom:4px;\">{f}</li>")) +
              "</ul>"
            : "";

        var html = $"""
            <!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Inter',system-ui,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                         style="background:#fff;border-radius:16px;padding:40px;border:1px solid #e2e8f0;max-width:480px;">
                    <tr><td align="center" style="padding-bottom:24px;">{LogoHtml}</td></tr>
                    <tr><td>
                      <div style="background:#E6F9F2;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
                        <span style="font-size:28px;">✅</span>
                        <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#085041;">Otomatik Yenileme Başarılı</p>
                      </div>
                      <p style="margin:0 0 12px;color:#0f172a;font-size:15px;">Merhaba {toName},</p>
                      <p style="margin:0 0 16px;color:#475569;line-height:1.65;">
                        <strong>{planOrToolName}</strong> paketiniz/aboneliğiniz otomatik olarak yenilendi.
                        Ücretlendirme tutarı: <strong>₺{amount:F2}</strong>.
                      </p>
                      {(features?.Length > 0 ? $"<p style=\"margin:0 0 8px;color:#0f172a;font-weight:600;\">Paket içeriği:</p>{featuresHtml}" : "")}
                      <p style="margin:16px 0 0;color:#475569;font-size:14px;">
                        Yeni bitiş tarihi: <strong>{date}</strong>
                      </p>
                    </td></tr>
                    <tr><td align="center" style="padding:24px 0;">
                      <a href="{appUrl}/hesabim/abonelik"
                         style="display:inline-block;background:#1D9E75;color:#fff;font-weight:700;
                                font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;">
                        📦 Aboneliğimi Görüntüle
                      </a>
                    </td></tr>
                    <tr><td>
                      <hr style="border:none;border-top:1px solid #f1f5f9;margin:8px 0 16px;">
                      <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
                        Otomatik yenilemeyi kapatmak için hesabım &gt; Paket Bilgilerim sayfasını ziyaret edin.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body></html>
            """;

        await SendAsync(toEmail, toName, $"KolayKOBİ — {planOrToolName} otomatik olarak yenilendi ✅", html);
    }

    // ── Otomatik yenileme başarısız maili ───────────────────────────────────
    public async Task SendRenewalFailedEmailAsync(
        string toEmail, string toName,
        string planOrToolName, DateTime expiresAt)
    {
        var appUrl = config["AppUrl"] ?? "https://app.kolaykobi.com";
        var date   = expiresAt.ToString("dd MMMM yyyy", new System.Globalization.CultureInfo("tr-TR"));
        var renewUrl = $"{appUrl}/hesabim/paket-sec";

        var html = $"""
            <!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f4f7fb;font-family:'Inter',system-ui,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
                <tr><td align="center">
                  <table width="480" cellpadding="0" cellspacing="0"
                         style="background:#fff;border-radius:16px;padding:40px;border:1px solid #e2e8f0;max-width:480px;">
                    <tr><td align="center" style="padding-bottom:24px;">{LogoHtml}</td></tr>
                    <tr><td>
                      <div style="background:#FEF3C7;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px;">
                        <span style="font-size:28px;">⚠️</span>
                        <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#92400E;">Otomatik Yenileme Başarısız</p>
                      </div>
                      <p style="margin:0 0 12px;color:#0f172a;font-size:15px;">Merhaba {toName},</p>
                      <p style="margin:0 0 16px;color:#475569;line-height:1.65;">
                        <strong>{planOrToolName}</strong> paketiniz/aboneliğiniz otomatik yenilenemedi.
                        Kayıtlı kartınızdan ödeme alınamadı.
                      </p>
                      <p style="margin:0 0 16px;color:#475569;font-size:14px;">
                        Mevcut aboneliğiniz <strong>{date}</strong> tarihinde sona erecek.
                        Hizmet kesintisiz devam etsin diye aboneliğinizi manuel olarak yenileyebilirsiniz.
                      </p>
                    </td></tr>
                    <tr><td align="center" style="padding:16px 0 24px;">
                      <a href="{renewUrl}"
                         style="display:inline-block;background:#D97706;color:#fff;font-weight:700;
                                font-size:15px;padding:12px 28px;border-radius:10px;text-decoration:none;">
                        🔄 Aboneliğimi Yenile
                      </a>
                    </td></tr>
                    <tr><td>
                      <hr style="border:none;border-top:1px solid #f1f5f9;margin:8px 0 16px;">
                      <p style="margin:0;font-size:12px;color:#cbd5e1;text-align:center;">
                        Kartınızı güncellemek için hesabım &gt; Ödeme yöntemlerim sayfasını ziyaret edebilirsiniz.
                      </p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body></html>
            """;

        await SendAsync(toEmail, toName, $"KolayKOBİ — {planOrToolName} otomatik yenileme başarısız ⚠️", html);
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
