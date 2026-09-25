import { parseAiJsonAyrintili, extractAiContent } from '@/lib/parseAiJson'

/**
 * KAYDEDİLMİŞ ARAÇ ÇIKTISINI AYRIŞTIRIR — tek kaynak.
 *
 * NEDEN ORTAK: bu mantık iki yerde birebir kopyalanmıştı (Geçmiş Çıktılar ve
 * yönetici Rapor Detayı). Kopyalar birlikte güncellenmediği için aynı hata iki
 * kez canlıya çıktı: 27 Ağu 2026'da `choices` sarmalayıcısı yalnızca kullanıcı
 * tarafında tanındı, yönetici raporu boş açıldı. Aynı tuzak CiktiGovdesi'nde de
 * yaşanmıştı; artık tek yer.
 *
 * NEDEN `JSON.parse` DEĞİL: dış katman da kesilmiş olabiliyor. 25 Eyl 2026'da
 * bir Sosyal Medya İçerik Takvimi çıktısı model bütçesine takılıp yarıda kesildi;
 * n8n'in "Response Transform" adımı son `}` karakterine kadarki kısmı kaydetti,
 * yani kapanmamış `]` ve `}` içeren geçersiz JSON. Çıplak `JSON.parse` patlayıp
 * `null` döndürünce sayfa ham JSON dökümü gösterdi — kullanıcı gözünde "çıktı
 * formatı bozuldu". parseAiJson kesik JSON'u onarabiliyor; bu yol tercih
 * edilirse kullanıcı hiç değilse tamamlanmış gönderileri görüyor.
 */

export interface CiktiAyristirmaSonucu {
  /** Ayrıştırılamadıysa null — çağıran taraf ham metni göstermeli. */
  parsed: Record<string, unknown> | null
  /** true ise çıktı yarıda kesilmişti; içerik eksik olabilir. */
  kesilmis: boolean
}

/**
 * n8n worker'ının koyduğu kesilme bayrağı.
 *
 * İki ayrı yoldan kesilme anlaşılabiliyor ve İKİSİ de gerekli:
 *  - Onarım yolu: kaydedilmiş JSON gerçekten bozuksa (eski kayıtlar, worker
 *    güncellenmeden önce üretilenler).
 *  - Bu bayrak: worker JSON'u kendisi dengelediğinde kayıt GEÇERLİ olur, o
 *    zaman onarım yolu hiç tetiklenmez ve eksik sonuç tam görünürdü.
 */
function bayrakVar(obj: Record<string, unknown>): boolean {
  return obj._kesildi === true
}

export function ciktiyiAyristir(outputJson: string): CiktiAyristirmaSonucu {
  try {
    const dis = parseAiJsonAyrintili<Record<string, unknown> | Record<string, unknown>[]>(outputJson)
    const raw = Array.isArray(dis.veri) && dis.veri.length === 1 ? dis.veri[0] : dis.veri
    const parsed = raw as Record<string, unknown>
    let kesilmis = dis.kesilmis

    /*
     * Kaydedilen çıktı iki sarmalayıcıyla gelebilir:
     *   { content: [{ text }] }                → dönüştürülmüş
     *   { choices: [{ message: { content } }] } → ham MiniMax
     * İç metin de ayrıca ayrıştırılır; <think> ve markdown orada temizlenir.
     */
    const icMetin = extractAiContent(parsed)
    if (typeof icMetin === 'string') {
      try {
        const ic = parseAiJsonAyrintili<Record<string, unknown>>(icMetin)
        // Sarmalayıcının yanındaki üst düzey alanları koru (ör. geminiPlatforms)
        const ekler: Record<string, unknown> = {}
        for (const k of Object.keys(parsed)) {
          if (k !== 'content' && k !== 'choices') ekler[k] = parsed[k]
        }
        const birlesik = { ...ic.veri, ...ekler }
        return { parsed: birlesik, kesilmis: kesilmis || ic.kesilmis || bayrakVar(birlesik) }
      } catch {
        // İç metin ayrıştırılamadı — dış nesneyi olduğu gibi kullan.
        kesilmis = true
      }
    }

    return { parsed, kesilmis: kesilmis || bayrakVar(parsed) }
  } catch {
    return { parsed: null, kesilmis: false }
  }
}
