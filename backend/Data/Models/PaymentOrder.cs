namespace KolayKobi.Api.Data.Models;

public enum PaymentOrderStatus { Pending, Completed, Failed }

/// <summary>
/// PayTR ödeme siparişi. Abonelik paketi veya tekil araç satın alımı için kullanılır.
/// PlanId: set → abonelik paketi. ToolId: set → tekil araç satın alımı.
/// </summary>
public class PaymentOrder
{
    public Guid   Id             { get; set; } = Guid.NewGuid();
    public Guid   UserId         { get; set; }

    // Abonelik ödemeleri için (tekil araç alımında null)
    public int?   PlanId         { get; set; }

    // Tekil araç alımları için (abonelik ödemesinde null)
    public string? ToolId        { get; set; }

    // Toplu araç alımları için — JSON dizi, örn. '["rakip-analiz","icerik-takvimi"]'
    public string? ToolIds       { get; set; }

    // Toplu alımda seçilen kullanım miktarı (10 veya 25); null = sınırsız
    public int? UsesPerTool      { get; set; }

    public string ConversationId { get; set; } = string.Empty;  // PayTR merchant_oid
    public string IyzicoToken    { get; set; } = string.Empty;  // PayTR token

    public PaymentOrderStatus Status { get; set; } = PaymentOrderStatus.Pending;
    public decimal Amount        { get; set; }
    public string? IyzicoPaymentId { get; set; }                // ödeme başarılıysa dolar
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public User  User { get; set; } = null!;
    public Plan? Plan { get; set; }                             // nullable (araç ödemeleri için)
}
