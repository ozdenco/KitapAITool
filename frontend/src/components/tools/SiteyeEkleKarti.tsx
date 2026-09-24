import { useState } from 'react'

interface Props {
  resultId: string
  bizName: string
}

/**
 * Üretilen chatbot senaryosunu işletmenin kendi web sitesine gömmesi için
 * kopyalanabilir script etiketi üretir.
 *
 * Gömülen widget senaryoyu açık uçtan (GET /api/public/chatbot/{id}) okur ve
 * ziyaretçi sorularını anahtar kelime eşleştirmesiyle yanıtlar — ziyaretçi
 * mesajı başına yapay zeka çağrısı YAPILMAZ, dolayısıyla ek token maliyeti yoktur.
 */
/** İndirilen dosyanın adı — müşteri bunu kendi sitesine yükleyecek. */
const DOSYA_ADI = 'kolaykobi-chatbot.js'

export function SiteyeEkleKarti({ resultId, bizName }: Props) {
  const [kopyalandi, setKopyalandi] = useState(false)
  const [indirmeDurumu, setIndirmeDurumu] = useState<'hazir' | 'calisiyor' | 'hata'>('hazir')

  const baslik = bizName.trim() || 'Destek'

  const kod =
    `<script src="${window.location.origin}/chatbot-widget.js"\n` +
    `        data-kolaykobi-id="${resultId}"\n` +
    `        data-baslik="${baslik}"></script>`

  const kendiKodu = `<script src="/${DOSYA_ADI}"></script>`

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(kod)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch (error) {
      console.error('Panoya kopyalanamadı:', error)
    }
  }

  /**
   * Senaryoyu widget koduyla BİRLEŞTİRİP tek dosya olarak indirir.
   *
   * Amaç: müşteri KolayKOBİ'ye bağımlı kalmasın. İndirilen dosyada senaryo
   * `window.__KKB_SENARYO__` olarak gömülüdür; widget bunu görünce ağa hiç
   * çıkmaz (bkz. public/chatbot-widget.js başındaki "İKİ ÇALIŞMA BİÇİMİ").
   *
   * Bedeli açıkça söylenmeli: senaryo değişince dosyayı yeniden indirip
   * yüklemeleri gerekir — kartın altındaki not bunu yazıyor.
   */
  const indir = async () => {
    setIndirmeDurumu('calisiyor')
    try {
      const [widgetYanit, senaryoYanit] = await Promise.all([
        fetch('/chatbot-widget.js'),
        fetch(`/api/public/chatbot/${encodeURIComponent(resultId)}`),
      ])
      if (!widgetYanit.ok) throw new Error(`Widget indirilemedi (${widgetYanit.status})`)
      if (!senaryoYanit.ok) throw new Error(`Senaryo okunamadı (${senaryoYanit.status})`)

      const widgetKodu = await widgetYanit.text()
      const senaryo = (await senaryoYanit.json()) as Record<string, unknown>

      const tarih = new Date().toLocaleDateString('tr-TR')
      const dosya =
        `/*!\n` +
        ` * KolayKOBİ Chatbot — ${baslik}\n` +
        ` * Oluşturulma: ${tarih}\n` +
        ` *\n` +
        ` * Bu dosya kendi kendine yeter: senaryo içine gömülüdür, KolayKOBİ'ye\n` +
        ` * hiçbir istek göndermez. Sitenizin kök dizinine koyup şu satırı\n` +
        ` * </body> etiketinden hemen önce ekleyin:\n` +
        ` *   ${kendiKodu}\n` +
        ` *\n` +
        ` * Senaryoyu değiştirirseniz bu dosyayı yeniden indirip değiştirin.\n` +
        ` */\n` +
        `window.__KKB_SENARYO__ = ${JSON.stringify({ ...senaryo, _bizName: baslik })};\n\n` +
        widgetKodu

      const url = URL.createObjectURL(new Blob([dosya], { type: 'text/javascript' }))
      const bag = document.createElement('a')
      bag.href = url
      bag.download = DOSYA_ADI
      bag.click()
      URL.revokeObjectURL(url)
      setIndirmeDurumu('hazir')
    } catch (error) {
      console.error('Chatbot dosyası oluşturulamadı:', error)
      setIndirmeDurumu('hata')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden no-print">
      <div className="px-5 py-3.5 border-b border-[#E2E0D8] flex items-center gap-2">
        <span className="text-[16px]">🌐</span>
        <h3 className="text-[14px] font-semibold text-[#1C1B19]">Sitenize Ekleyin</h3>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <p className="text-[12px] text-[#6B6963] leading-relaxed">
          Aşağıdaki kodu web sitenizin <code className="px-1 py-0.5 bg-[#F7F6F2] rounded text-[11px]">&lt;/body&gt;</code>{' '}
          etiketinden hemen önce yapıştırın. Chatbot sağ alt köşede görünür ve bu senaryoyla yanıt verir.
        </p>

        <pre className="bg-[#1C1B19] text-[#E6F9F2] rounded-xl p-3.5 text-[11px] leading-relaxed overflow-x-auto">
          <code>{kod}</code>
        </pre>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void kopyala()}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
          >
            {kopyalandi ? '✓ Kopyalandı' : '📋 Kodu Kopyala'}
          </button>
          <span className="text-[11px] text-[#9A9792]">
            WordPress, Wix, Shopify ve tüm HTML sitelerle uyumludur.
          </span>
        </div>

        {/*
          KURULUM NOTLARI — 24 Eyl 2026'da eklendi.

          Kodu deneyen kişi HTML dosyasını masaüstüne kaydedip çift tıklayınca
          hiçbir şey olmuyor ve "kod çalışmadı" sanıyor. İki ayrı sebep
          birleşiyor: (1) file:// adresinde tarayıcı, sayfanın senaryoyu
          sunucudan çekmesini engelliyor; (2) widget sayfayı DEĞİŞTİRMİYOR,
          yalnızca sağ alt köşeye küçük bir baloncuk koyuyor — boş bir test
          sayfasında bunu gözden kaçırmak çok kolay. Üçü de tek tek yaşandı,
          bu yüzden kartın içinde yazıyor.
        */}
        <div className="bg-[#FFF9E8] border border-[#F0DFA8] rounded-xl px-3.5 py-3">
          <p className="text-[11px] font-semibold text-[#7A5C10] mb-1.5">Denerken dikkat</p>
          <ul className="flex flex-col gap-1.5 text-[11px] text-[#7A5C10] leading-relaxed">
            <li className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>
                Kod <strong>gerçek sitede</strong> denenmeli. HTML dosyasını bilgisayarınıza
                kaydedip çift tıklayarak açtığınızda çalışmaz — tarayıcı o sayfanın
                senaryoyu sunucudan çekmesine izin vermez.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>
                Chatbot sayfanızın görünümünü değiştirmez; yalnızca{' '}
                <strong>sağ alt köşede</strong> bir 💬 baloncuğu çıkar. “Hiçbir şey olmadı”
                gibi görünüyorsa köşeye bakın.
              </span>
            </li>
            <li className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>
                WordPress’te tema ayarlarındaki <em>“body sonu / footer kodu”</em> alanına ya da
                bir <em>Özel HTML</em> bloğuna yapıştırın.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-xl px-3.5 py-3">
          <p className="text-[11px] text-[#085041] leading-relaxed">
            <strong>Ek ücret yok.</strong> Chatbot, ziyaretçi sorularını burada üretilen SSS
            kartlarıyla eşleştirir — her mesaj için yapay zekaya istek göndermez, kullanım
            hakkınızdan düşmez.
          </p>
        </div>

        {/*
          KENDİ SUNUCUSUNDA BARINDIRMA — 24 Eyl 2026'da eklendi.

          Yukarıdaki kod her ziyarette senaryoyu KolayKOBİ'den çekiyor, yani
          müşterinin sitesi bize bağımlı kalıyor. Bu bölüm senaryoyu widget
          koduyla birleştirip tek dosya olarak indiriyor; dosya kendi kendine
          yetiyor ve bize hiç istek göndermiyor.
        */}
        <div className="border-t border-[#F1EFE8] pt-3.5 flex flex-col gap-2.5">
          <div>
            <p className="text-[12px] font-semibold text-[#1C1B19] mb-1">
              Ya da kendi sunucunuzda barındırın
            </p>
            <p className="text-[11.5px] text-[#6B6963] leading-relaxed">
              Senaryo dosyanın içine gömülür; chatbot <strong>KolayKOBİ&apos;ye hiçbir istek
              göndermez</strong> ve biz olmasak da çalışır. Dosyayı sitenizin kök dizinine
              yükleyip şu satırı ekleyin:
            </p>
          </div>

          <pre className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-lg px-3 py-2 text-[11px] overflow-x-auto">
            <code>{kendiKodu}</code>
          </pre>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void indir()}
              disabled={indirmeDurumu === 'calisiyor'}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#1D9E75] text-[#085041] hover:bg-[#F0FAF6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {indirmeDurumu === 'calisiyor' ? 'Hazırlanıyor…' : `⬇ ${DOSYA_ADI} indir`}
            </button>
            {indirmeDurumu === 'hata' && (
              <span className="text-[11px] text-[#D0483C]">
                Dosya oluşturulamadı. Sayfayı yenileyip tekrar deneyin.
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#9A9792] leading-relaxed">
            <strong>Dikkat:</strong> bu dosya o anki senaryonun kopyasıdır. Senaryoyu
            değiştirirseniz güncellemeler siteye kendiliğinden yansımaz — dosyayı yeniden
            indirip değiştirmeniz gerekir. Yukarıdaki bağlı kodda ise güncellemeler
            kendiliğinden geçerli olur.
          </p>
        </div>

        <p className="text-[11px] text-[#9A9792] leading-relaxed">
          Senaryoyu güncellemek isterseniz formu yeniden çalıştırın; yeni bir kod üretilir ve
          sitenizdeki kodu onunla değiştirmeniz gerekir.
        </p>
      </div>
    </div>
  )
}
