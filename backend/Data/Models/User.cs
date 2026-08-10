namespace KolayKobi.Api.Data.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── E-posta doğrulama ─────────────────────────────────────────────────────
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationExpiry { get; set; }

    // ── Şifre sıfırlama ──────────────────────────────────────────────────────
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetExpiry { get; set; }

    // ── Google OAuth ──────────────────────────────────────────────────────────
    public string? GoogleId { get; set; }

    // Navigation
    public Subscription? Subscription { get; set; }
    public ICollection<ToolUsageLog> UsageLogs { get; set; } = [];
    public ICollection<ToolPurchase> ToolPurchases { get; set; } = [];
}
