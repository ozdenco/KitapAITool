namespace KolayKobi.Api.Data.Models;

public class ToolPurchase
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public int UsesGranted { get; set; }
    public int UsesRemaining { get; set; }

    /// <summary>
    /// Aylık kullanım limiti. null = sınırsız (eski davranış uyumu).
    /// 10 veya 25 gibi sabit değerler; her ayın başında usageLogs'tan sayılır.
    /// </summary>
    public int? MonthlyLimit { get; set; }

    public decimal AmountPaid { get; set; }
    public string? IyzicoPaymentId { get; set; }
    public DateTime PurchasedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Araç aboneliği sona erince otomatik yenileme yapılsın mı?</summary>
    public bool AutoRenew { get; set; } = true;

    // Navigation
    public User User { get; set; } = null!;
}
