using System.Text.Json;

namespace KolayKobi.Api.Services;

/// <summary>
/// Async araçların (icerik-takvimi, trend-video, video-uret) iş biletiyle
/// ilgili ortak işlemler.
///
/// Bu araçlar çalıştırıldığında n8n hemen sonuç dönmez; bir iş kimliği döner ve
/// sonuç dakikalar sonra hazır olur. Bu süre boyunca Geçmiş Çıktılar'da bir
/// YER TUTUCU satır durur; iş bitince aynı satır gerçek çıktıyla güncellenir.
///
/// Yer tutucuyu hem <c>ToolsController</c> hem <c>AsyncJobWatcher</c> okuyup
/// yazdığı için biçim burada tek yerde tanımlı.
/// </summary>
public static class AsyncJobHelper
{
    /// <summary>Yer tutucu çıktıyı işaretleyen alan adı.</summary>
    public const string BekliyorAlani = "_bekliyor";

    /// <summary>
    /// n8n'in iş bileti yanıtından iş kimliğini çıkarır.
    /// Araçlar farklı alan adı kullanıyor: <c>job_id</c> (takvim, trend),
    /// <c>isId</c> / <c>jobId</c> (video-uret).
    /// </summary>
    public static bool TryExtractJobId(string content, out string jobId)
    {
        jobId = string.Empty;
        try
        {
            var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            // n8n bazen tek elemanlı dizi döndürüyor
            if (root.ValueKind == JsonValueKind.Array)
            {
                if (root.GetArrayLength() != 1) return false;
                root = root[0];
            }

            if (root.ValueKind != JsonValueKind.Object) return false;

            foreach (var alan in new[] { "job_id", "jobId", "isId" })
            {
                if (root.TryGetProperty(alan, out var el)
                    && el.ValueKind == JsonValueKind.String)
                {
                    var deger = el.GetString();
                    if (!string.IsNullOrWhiteSpace(deger))
                    {
                        jobId = deger;
                        return true;
                    }
                }
            }
        }
        catch { /* geçersiz JSON — bilet değil */ }

        return false;
    }

    /// <summary>Sonuç beklenirken kaydedilen yer tutucu çıktı.</summary>
    public static string BekleyenCiktisi(string jobId) =>
        JsonSerializer.Serialize(new Dictionary<string, object>
        {
            [BekliyorAlani] = true,
            ["jobId"]       = jobId,
        });

    /// <summary>
    /// Bir kayıt hâlâ sonuç bekliyor mu? Yer tutucu satırları bulmak için
    /// hem arka plan servisi hem de güncelleme mantığı bunu kullanır.
    /// </summary>
    public static bool BekliyorMu(string? outputJson)
    {
        if (string.IsNullOrWhiteSpace(outputJson)) return false;
        try
        {
            var doc = JsonDocument.Parse(outputJson);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty(BekliyorAlani, out var el)
                && el.ValueKind == JsonValueKind.True;
        }
        catch { return false; }
    }

    /// <summary>n8n durum yanıtı kalıcı bir HATA mı? (kredi iadesi bunu kullanıyor)</summary>
    public static bool HataMi(string json)
    {
        try
        {
            var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("status", out var el)
                && el.GetString() == "error";
        }
        catch { return false; }
    }

    /// <summary>n8n durum yanıtı "completed" mi?</summary>
    public static bool TamamlandiMi(string json)
    {
        try
        {
            var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("status", out var el)
                && el.GetString() == "completed";
        }
        catch { return false; }
    }

    /// <summary>
    /// n8n async poll yanıtından ({status, result:{content:[{text}]}}) gerçek
    /// araç çıktısını çıkarır. Geçmiş Çıktılar'da doğru render olması için
    /// sarmalayıcı olmadan kaydedilmesi gerekir.
    ///
    /// Sarmalayıcı yoksa (video-uret düz {status, videoUrl, ...} döndürüyor)
    /// null döner ve çağıran ham içeriği kullanır.
    /// </summary>
    public static string? GercekCiktiyiAyikla(string wrappedJson)
    {
        try
        {
            var doc = JsonDocument.Parse(wrappedJson);
            var root = doc.RootElement;

            if (!root.TryGetProperty("result", out var resultEl)) return null;

            if (resultEl.TryGetProperty("content", out var contentArr)
                && contentArr.ValueKind == JsonValueKind.Array)
            {
                var texts = new System.Text.StringBuilder();
                foreach (var item in contentArr.EnumerateArray())
                {
                    if (item.TryGetProperty("text", out var textEl))
                        texts.Append(textEl.GetString() ?? "");
                }
                var combined = texts.ToString().Trim();
                if (!string.IsNullOrEmpty(combined)) return KesilmeBayraginiTasi(combined, resultEl);
            }

            return resultEl.GetRawText();
        }
        catch { return null; }
    }

    /// <summary>
    /// Sarmalayıcıdaki <c>_kesildi</c> bayrağını çıktının içine taşır.
    ///
    /// NEDEN: n8n worker'ı model bütçesine takılan yanıtı artık kendisi
    /// dengeliyor (kapanmamış parantezleri kapatıp yarım maddeyi atıyor), yani
    /// kaydedilen JSON geçerli oluyor. Bu iyi — ama bayrak taşınmazsa eksik bir
    /// takvim TAM görünür: uygulama kesilmeyi yalnızca "JSON bozuktu, onardım"
    /// yolundan anlıyordu. Sessizce eksik sonuç vermek, 25 Eyl 2026'da şikâyet
    /// edilen ham JSON dökümü kadar yanlış.
    ///
    /// Bayrak yoksa ya da metin bir JSON nesnesi değilse metin olduğu gibi kalır.
    /// </summary>
    private static string KesilmeBayraginiTasi(string combined, JsonElement resultEl)
    {
        if (!resultEl.TryGetProperty("_kesildi", out var bayrak)
            || bayrak.ValueKind != JsonValueKind.True)
        {
            return combined;
        }

        try
        {
            using var icDoc = JsonDocument.Parse(combined);
            if (icDoc.RootElement.ValueKind != JsonValueKind.Object) return combined;

            using var akis = new MemoryStream();
            using (var yazici = new Utf8JsonWriter(akis))
            {
                yazici.WriteStartObject();
                foreach (var alan in icDoc.RootElement.EnumerateObject())
                {
                    if (alan.NameEquals("_kesildi")) continue;
                    alan.WriteTo(yazici);
                }
                yazici.WriteBoolean("_kesildi", true);
                yazici.WriteEndObject();
            }
            return System.Text.Encoding.UTF8.GetString(akis.ToArray());
        }
        catch { return combined; }
    }

    /// <summary>Yer tutucu satırdan iş kimliğini okur.</summary>
    public static string? JobIdOku(string? outputJson)
    {
        if (string.IsNullOrWhiteSpace(outputJson)) return null;
        try
        {
            var doc = JsonDocument.Parse(outputJson);
            return doc.RootElement.TryGetProperty("jobId", out var el)
                ? el.GetString()
                : null;
        }
        catch { return null; }
    }
}
