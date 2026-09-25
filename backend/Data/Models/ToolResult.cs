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

    /// <summary>
    /// Kullanıcının forma girdiği bilgiler (JSON).
    ///
    /// Neden saklanıyor: Geçmiş Çıktılar'da yalnızca SONUÇ görünüyordu;
    /// kullanıcı bir takvime bakıp "bu hangi tarih için, hangi gün seçilmişti,
    /// özel gün olarak ne yazmıştım?" sorusuna cevap bulamıyordu (25 Eyl 2026).
    /// Aracı yeniden çalıştırmadan aynı girdiyi tekrar kurmak da mümkün
    /// olmuyordu.
    ///
    /// Boş bırakılabilir: eski kayıtlarda ve bu alanı göndermeyen araçlarda
    /// null kalır.
    /// </summary>
    public string? FormBilgileri { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
}
