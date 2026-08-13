namespace KolayKobi.Api.Data.Models;

public class ToolUsageLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; } = true;

    // ── Anlık snapshot (kayıt anındaki değerler) ──────────────────────────────
    /// <summary>Bu çalıştırmadan önce mevcut dönemde kaç kez kullanıldı.</summary>
    public int UsageCountBefore { get; set; }

    /// <summary>Çalıştırma anındaki plan başına araç limiti (null = sınırsız).</summary>
    public int? LimitAtTime { get; set; }

    /// <summary>Çalıştırma anındaki plan adı.</summary>
    public string PlanNameAtTime { get; set; } = string.Empty;

    // Navigation
    public User User { get; set; } = null!;
}
