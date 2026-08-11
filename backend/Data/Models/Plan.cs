namespace KolayKobi.Api.Data.Models;

public enum PlanType
{
    Free,
    Standard,
    Premium,
    Enterprise
}

public enum PeriodType
{
    Monthly  = 0,
    Daily    = 1,
    Yearly   = 2,
    DateRange = 3
}

public class Plan
{
    public int Id { get; set; }
    public PlanType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal PriceMonthly { get; set; }

    /// <summary>null means unlimited</summary>
    public int? UsagePerToolPerMonth { get; set; }

    /// <summary>For Enterprise: price per additional use</summary>
    public decimal? PricePerUse { get; set; }

    public bool IsActive { get; set; } = true;

    // ── Dönem ayarları ──────────────────────────────────────────────────────
    public PeriodType PeriodType { get; set; } = PeriodType.Monthly;

    /// <summary>Günlük dönem için gün sayısı (null = varsayılan).</summary>
    public int? PeriodDays { get; set; }

    /// <summary>DateRange dönem başlangıcı.</summary>
    public DateTime? PeriodStartDate { get; set; }

    /// <summary>DateRange dönem bitişi.</summary>
    public DateTime? PeriodEndDate { get; set; }

    // Navigation
    public ICollection<Subscription> Subscriptions { get; set; } = [];
}
