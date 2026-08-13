namespace KolayKobi.Api.Data.Models;

/// <summary>
/// Araç başına aylık fiyat. Admin panelinden düzenlenebilir.
/// ToolId, frontend'deki TOOLS dizisindeki id alanıyla eşleşir.
/// </summary>
public class ToolPrice
{
    public int Id { get; set; }

    /// <summary>Frontend araç ID'si — örn. "trend-video", "icerik-takvimi"</summary>
    public string ToolId { get; set; } = string.Empty;

    /// <summary>Araç adı (admin panelde görüntüleme amaçlı)</summary>
    public string ToolName { get; set; } = string.Empty;

    /// <summary>Aylık fiyat (TL)</summary>
    public decimal PriceMonthly { get; set; }

    /// <summary>Fiyatın aktif olup olmadığı (false ise araç satın alınamaz)</summary>
    public bool IsActive { get; set; } = true;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
