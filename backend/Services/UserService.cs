using Google.Apis.Auth;
using KolayKobi.Api.Data;
using KolayKobi.Api.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace KolayKobi.Api.Services;

public class UserService(AppDbContext db, TokenService tokens, EmailService email, IConfiguration config)
{
    // ── Kayıt ─────────────────────────────────────────────────────────────────
    public async Task<(User user, string accessToken, string refreshToken)?> RegisterAsync(
        string name, string emailAddr, string password)
    {
        if (await db.Users.AnyAsync(u => u.Email == emailAddr.ToLower()))
            return null;

        var verificationToken = Guid.NewGuid().ToString("N");

        var user = new User
        {
            Name  = name,
            Email = emailAddr.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            EmailVerified = false,
            EmailVerificationToken  = verificationToken,
            EmailVerificationExpiry = DateTime.UtcNow.AddHours(24)
        };

        await AttachFreeSubscriptionAsync(user);

        var refreshToken = tokens.GenerateRefreshToken();
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // E-posta doğrulama maili gönder (hata uygulama akışını durdurmasın)
        try { await email.SendVerificationEmailAsync(user.Email, user.Name, verificationToken); }
        catch { /* log already done in EmailService */ }

        return (user, tokens.GenerateAccessToken(user), refreshToken);
    }

    // ── Giriş ─────────────────────────────────────────────────────────────────
    public async Task<(User user, string accessToken, string refreshToken)?> LoginAsync(
        string emailAddr, string password)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == emailAddr.ToLower());
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        var refreshToken = tokens.GenerateRefreshToken();
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;
        user.UpdatedAt          = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), refreshToken);
    }

    // ── Google OAuth ──────────────────────────────────────────────────────────
    public async Task<(User user, string accessToken, string refreshToken)?> GoogleLoginAsync(
        string idToken)
    {
        var clientId = config["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId yapılandırılmamış.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
        }
        catch
        {
            return null; // geçersiz token
        }

        var googleId = payload.Subject;
        var gEmail   = payload.Email.ToLower();
        var gName    = payload.Name ?? gEmail;

        // Önce Google ID ile ara, sonra e-posta ile ara, yoksa oluştur
        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId)
                ?? await db.Users.FirstOrDefaultAsync(u => u.Email == gEmail);

        if (user is null)
        {
            user = new User
            {
                Name     = gName,
                Email    = gEmail,
                PasswordHash  = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // dummy
                GoogleId      = googleId,
                EmailVerified = true  // Google zaten doğruladı
            };
            await AttachFreeSubscriptionAsync(user);
            db.Users.Add(user);
        }
        else
        {
            // Mevcut hesaba Google ID bağla + e-postayı doğrulanmış say
            user.GoogleId      = googleId;
            user.EmailVerified = true;
            user.UpdatedAt     = DateTime.UtcNow;
        }

        var refreshToken = tokens.GenerateRefreshToken();
        user.RefreshToken       = refreshToken;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), refreshToken);
    }

    // ── E-posta doğrulama ─────────────────────────────────────────────────────
    public async Task<bool> VerifyEmailAsync(string token)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.EmailVerificationToken == token &&
            u.EmailVerificationExpiry > DateTime.UtcNow);

        if (user is null) return false;

        user.EmailVerified            = true;
        user.EmailVerificationToken   = null;
        user.EmailVerificationExpiry  = null;
        user.UpdatedAt                = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return true;
    }

    // ── Doğrulama maili yeniden gönder ───────────────────────────────────────
    public async Task<bool> ResendVerificationAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null || user.EmailVerified) return false;

        user.EmailVerificationToken   = Guid.NewGuid().ToString("N");
        user.EmailVerificationExpiry  = DateTime.UtcNow.AddHours(24);
        user.UpdatedAt                = DateTime.UtcNow;

        await db.SaveChangesAsync();

        try { await email.SendVerificationEmailAsync(user.Email, user.Name, user.EmailVerificationToken!); }
        catch { return false; }

        return true;
    }

    // ── Token yenile ──────────────────────────────────────────────────────────
    public async Task<(User user, string accessToken, string refreshToken)?> RefreshAsync(
        string accessToken, string refreshToken)
    {
        var userId = tokens.GetUserIdFromExpiredToken(accessToken);
        if (userId is null) return null;

        var user = await db.Users.FindAsync(userId);
        if (user is null
            || user.RefreshToken != refreshToken
            || user.RefreshTokenExpiry < DateTime.UtcNow)
            return null;

        var newRefresh = tokens.GenerateRefreshToken();
        user.RefreshToken       = newRefresh;
        user.RefreshTokenExpiry = tokens.RefreshTokenExpiry;
        user.UpdatedAt          = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return (user, tokens.GenerateAccessToken(user), newRefresh);
    }

    // ── Yardımcılar ───────────────────────────────────────────────────────────
    public async Task<User?> GetByIdAsync(Guid id) =>
        await db.Users.Include(u => u.Subscription)
                      .ThenInclude(s => s!.Plan)
                      .FirstOrDefaultAsync(u => u.Id == id);

    public async Task LogoutAsync(Guid userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return;
        user.RefreshToken       = null;
        user.RefreshTokenExpiry = null;
        user.UpdatedAt          = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private async Task AttachFreeSubscriptionAsync(User user)
    {
        var freePlan = await db.Plans.FirstAsync(p => p.Type == PlanType.Free);
        db.Subscriptions.Add(new Subscription
        {
            UserId = user.Id,
            PlanId = freePlan.Id,
            Status = SubscriptionStatus.Active
        });
    }
}
