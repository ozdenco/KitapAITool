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

    // Navigation
    public Subscription? Subscription { get; set; }
    public ICollection<ToolUsageLog> UsageLogs { get; set; } = [];
    public ICollection<ToolPurchase> ToolPurchases { get; set; } = [];
}
