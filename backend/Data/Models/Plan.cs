namespace KolayKobi.Api.Data.Models;

public enum PlanType
{
    Free,
    Standard,
    Premium,
    Enterprise
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

    // Navigation
    public ICollection<Subscription> Subscriptions { get; set; } = [];
}
