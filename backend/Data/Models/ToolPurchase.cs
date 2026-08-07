namespace KolayKobi.Api.Data.Models;

public class ToolPurchase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public int UsesGranted { get; set; }
    public int UsesRemaining { get; set; }
    public decimal AmountPaid { get; set; }
    public string? IyzicoPaymentId { get; set; }
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
