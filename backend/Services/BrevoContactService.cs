using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace KolayKobi.Api.Services;

/// <summary>
/// Brevo (eski SendinBlue) kişi/liste yönetimi.
///
/// E-posta GÖNDERİMİ ayrı bir yoldan yapılır: <see cref="EmailService"/> SMTP
/// kullanır. Bu servis ise Brevo'nun REST API'sini (v3) kullanır ve yalnızca
/// kişiyi bir listeye ekler — asıl "hoş geldin serisi" otomasyonu Brevo panelinde
/// tanımlanır ve listeye giriş anında tetiklenir.
///
/// DİKKAT: SMTP anahtarı ile API anahtarı FARKLIDIR. Bu servis
/// <c>Brevo:ApiKey</c> bekler (Brevo → SMTP &amp; API → API Keys).
///
/// Yapılandırma yoksa servis sessizce devre dışı kalır; kayıt akışı çalışmaya
/// devam eder. Pazarlama otomasyonunun kurulmamış olması kullanıcının üye
/// olmasını engellememelidir.
/// </summary>
public class BrevoContactService(
    HttpClient http,
    IConfiguration config,
    ILogger<BrevoContactService> logger)
{
    private const string API_URL = "https://api.brevo.com/v3/contacts";

    private string? ApiKey => config["Brevo:ApiKey"];
    private int?    ListId => int.TryParse(config["Brevo:WelcomeListId"], out var id) ? id : null;

    /// <summary>Yapılandırma tam mı? Değilse kişi ekleme adımı atlanır.</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey) && ListId is not null;

    /// <summary>
    /// Kullanıcıyı hoş geldin listesine ekler. Hata durumunda istisna FIRLATMAZ —
    /// kayıt akışını bozmamalıdır; yalnızca loglanır.
    /// </summary>
    public async Task AddToWelcomeListAsync(
        string email,
        string? name,
        CancellationToken ct = default)
    {
        if (!IsConfigured)
        {
            logger.LogDebug("Brevo yapılandırılmamış — kişi ekleme atlandı ({Email})", email);
            return;
        }

        try
        {
            var (ad, soyad) = AdSoyadAyikla(name);

            // Boş alanı HİÇ gönderme. UpdateEnabled=true olduğu için boş değer,
            // Brevo'da kayıtlı olanın üstüne yazıp siliyordu; kişi sonraki
            // maillerde "Merhaba ," ile karşılanıyordu (29 Ağu 2026).
            var nitelikler = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(ad))    nitelikler["FIRSTNAME"] = ad;
            if (!string.IsNullOrEmpty(soyad)) nitelikler["LASTNAME"]  = soyad;

            var istek = new BrevoContactRequest(
                Email: email,
                ListIds: [ListId!.Value],
                UpdateEnabled: true,          // kayıtlı e-posta ise hata yerine güncelle
                Attributes: nitelikler);

            using var mesaj = new HttpRequestMessage(HttpMethod.Post, API_URL)
            {
                Content = JsonContent.Create(istek),
            };
            mesaj.Headers.Add("api-key", ApiKey);
            mesaj.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var yanit = await http.SendAsync(mesaj, ct);

            if (yanit.IsSuccessStatusCode)
            {
                logger.LogInformation("Brevo hoş geldin listesine eklendi: {Email}", email);
                return;
            }

            var govde = await yanit.Content.ReadAsStringAsync(ct);
            logger.LogWarning(
                "Brevo kişi ekleme başarısız ({Status}) {Email}: {Body}",
                yanit.StatusCode, email, govde);
        }
        catch (Exception ex)
        {
            // Ağ hatası / zaman aşımı — kayıt akışı etkilenmemeli
            logger.LogError(ex, "Brevo kişi ekleme sırasında hata: {Email}", email);
        }
    }

    /// <summary>
    /// Tam adı Brevo'nun FIRSTNAME / LASTNAME alanlarına ayırır.
    ///
    /// İlk kelime ad, kalan her şey soyad sayılır — "Ayşe Nur Demir" için
    /// soyad "Nur Demir" olur. Türkçede iki adlı kişiler yaygın olduğu için
    /// son kelimeyi soyad saymak daha çok hata üretirdi; hitapta kullanılan
    /// alan FIRSTNAME olduğundan ilk kelimeyi doğru almak önceliklidir.
    ///
    /// Tek kelimelik adlarda soyad boş döner ve alan Brevo'ya gönderilmez.
    /// </summary>
    private static (string Ad, string Soyad) AdSoyadAyikla(string? tamAd)
    {
        if (string.IsNullOrWhiteSpace(tamAd)) return ("", "");

        var parcalar = tamAd.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parcalar.Length switch
        {
            0 => ("", ""),
            1 => (parcalar[0], ""),
            _ => (parcalar[0], string.Join(' ', parcalar[1..])),
        };
    }

    private sealed record BrevoContactRequest(
        [property: JsonPropertyName("email")]         string Email,
        [property: JsonPropertyName("listIds")]       int[] ListIds,
        [property: JsonPropertyName("updateEnabled")] bool UpdateEnabled,
        [property: JsonPropertyName("attributes")]    Dictionary<string, string> Attributes);
}
