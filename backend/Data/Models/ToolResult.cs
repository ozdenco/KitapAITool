namespace KolayKobi.Api.Data.Models;

public class ToolResult
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ToolId { get; set; } = string.Empty;

    /// <summary>Short label extracted from the input (e.g. business name).</summary>
    public string InputSummary { get; set; } = string.Empty;

    /// <summary>Full JSON string returned by n8n.</summary>
    public string OutputJson { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
