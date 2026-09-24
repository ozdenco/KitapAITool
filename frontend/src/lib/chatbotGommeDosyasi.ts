/**
 * Chatbot'un KENDİ SUNUCUSUNDA barındırılan sürümünü üretir.
 *
 * Senaryo, widget kodunun başına `window.__KKB_SENARYO__` olarak gömülür;
 * widget bunu görünce ağa hiç çıkmaz (bkz. public/chatbot-widget.js başındaki
 * "İKİ ÇALIŞMA BİÇİMİ" notu). Sonuç kendi kendine yeten tek bir dosyadır.
 *
 * İki kullanım biçimi var çünkü müşterinin altyapısı buna zorluyor:
 *  - DOSYA: siteye .js olarak yüklenir, `<script src="…">` ile çağrılır.
 *  - TEK PARÇA: dosya yükleyemeyenler için içerik doğrudan `<script>` etiketi
 *    içine konur. WordPress `.js` yüklemesine varsayılan olarak izin vermiyor
 *    ("Sorry, this file type is not permitted for security reasons"), bu
 *    yüzden WordPress kullanıcılarının pratikte tek yolu budur.
 */

/** İndirilen dosyanın adı — müşteri bunu kendi sitesine yükleyecek. */
export const DOSYA_ADI = 'kolaykobi-chatbot.js'

interface Girdi {
  resultId: string
  baslik: string
}

/**
 * Widget kodunu ve senaryoyu indirip tek parça JavaScript üretir.
 *
 * @throws Ağ ya da sunucu hatasında; çağıran tarafın kullanıcıya bildirmesi beklenir.
 */
export async function gommeDosyasiOlustur({ resultId, baslik }: Girdi): Promise<string> {
  const [widgetYanit, senaryoYanit] = await Promise.all([
    fetch('/chatbot-widget.js'),
    fetch(`/api/public/chatbot/${encodeURIComponent(resultId)}`),
  ])
  if (!widgetYanit.ok) throw new Error(`Widget indirilemedi (${widgetYanit.status})`)
  if (!senaryoYanit.ok) throw new Error(`Senaryo okunamadı (${senaryoYanit.status})`)

  const widgetKodu = await widgetYanit.text()
  const senaryo = (await senaryoYanit.json()) as Record<string, unknown>
  const tarih = new Date().toLocaleDateString('tr-TR')

  return (
    `/*!\n` +
    ` * KolayKOBİ Chatbot — ${baslik}\n` +
    ` * Oluşturulma: ${tarih}\n` +
    ` *\n` +
    ` * Bu dosya kendi kendine yeter: senaryo içine gömülüdür, KolayKOBİ'ye\n` +
    ` * hiçbir istek göndermez.\n` +
    ` *\n` +
    ` * Senaryoyu değiştirirseniz bu dosyayı yeniden üretip değiştirin.\n` +
    ` */\n` +
    `window.__KKB_SENARYO__ = ${JSON.stringify({ ...senaryo, _bizName: baslik })};\n\n` +
    widgetKodu
  )
}

/** Dosya yükleyemeyenler için: içeriği doğrudan sayfaya yapıştırılabilir hâle getirir. */
export function tekParcaKod(icerik: string): string {
  /*
   * `</script>` dizisi kaçırılmalı: senaryo metninde geçerse tarayıcı script
   * etiketini ORADA kapatır ve sayfanın geri kalanı bozulur. Klasik ve sessiz
   * bir tuzak — JSON içine kullanıcı metni gömüldüğü için gerçekten olabilir.
   */
  const guvenli = icerik.replace(/<\/script/gi, '<\\/script')
  return `<script>\n${guvenli}\n</script>`
}
