namespace KolayKobi.Api.Data.Models;

public class ToolUsageLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ToolId { get; set; } = string.Empty;
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;
    public bool Success { get; set; } = true;

    // Navigation
    public User User { get; set; } = null!;
}
