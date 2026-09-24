import { useState } from 'react'
import { DOSYA_ADI, gommeDosyasiOlustur, tekParcaKod } from '@/lib/chatbotGommeDosyasi'

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
export function SiteyeEkleKarti({ resultId, bizName }: Props) {
  const [kopyalandi, setKopyalandi] = useState(false)
  const [indirmeDurumu, setIndirmeDurumu] = useState<
    'hazir' | 'indiriliyor' | 'kopyalaniyor' | 'kopyalandi' | 'hata'
  >('hazir')

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
   * Gömülü sürümü üretip ya dosya olarak indirir ya da panoya kopyalar.
   *
   * İki çıkış da aynı içerikten türüyor; ayrım yalnızca müşterinin altyapısı:
   * WordPress `.js` yüklemesine izin vermediği için oradaki tek pratik yol
   * "tek parça kod" — bkz. lib/chatbotGommeDosyasi.ts.
   */
  const gomuluUret = async (bicim: 'dosya' | 'pano') => {
    setIndirmeDurumu(bicim === 'dosya' ? 'indiriliyor' : 'kopyalaniyor')
    try {
      const icerik = await gommeDosyasiOlustur({ resultId, baslik })

      if (bicim === 'pano') {
        await navigator.clipboard.writeText(tekParcaKod(icerik))
        setIndirmeDurumu('kopyalandi')
        setTimeout(() => setIndirmeDurumu('hazir'), 2500)
        return
      }

      const url = URL.createObjectURL(new Blob([icerik], { type: 'text/javascript' }))
      const bag = document.createElement('a')
      bag.href = url
      bag.download = DOSYA_ADI
      bag.click()
      URL.revokeObjectURL(url)
      setIndirmeDurumu('hazir')
    } catch (error) {
      console.error('Chatbot gömülü sürümü oluşturulamadı:', error)
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
              Senaryo kodun içine gömülür; chatbot <strong>KolayKOBİ&apos;ye hiçbir istek
              göndermez</strong> ve biz olmasak da çalışır. Altyapınıza göre iki yol var:
            </p>
          </div>

          {/*
            İKİ ÇIKIŞ BİÇİMİ — ikisi de aynı içerikten türüyor, ayrım
            müşterinin altyapısında: WordPress Ortam Kitaplığı `.js`
            yüklemesine varsayılan olarak izin vermiyor ("Sorry, this file
            type is not permitted for security reasons"), dolayısıyla
            WordPress kullanıcılarının pratikte tek yolu "tek parça kod".
            Dosya seçeneği FTP/dosya yöneticisi olanlar için duruyor.
          */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-[#E2E0D8] p-3 flex flex-col gap-2">
              <p className="text-[11.5px] font-semibold text-[#1C1B19]">
                WordPress, Wix, Shopify kullanıyorsanız
              </p>
              <p className="text-[11px] text-[#6B6963] leading-relaxed">
                Bu platformlar <code className="px-1 bg-[#F7F6F2] rounded">.js</code> dosyası
                yüklemenize genelde izin vermez. Kodu tek parça alın ve temanızın
                <em> footer / body sonu kodu</em> alanına yapıştırın — dosya yüklemeye gerek kalmaz.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => void gomuluUret('pano')}
                  disabled={indirmeDurumu === 'kopyalaniyor'}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {indirmeDurumu === 'kopyalaniyor'
                    ? 'Hazırlanıyor…'
                    : indirmeDurumu === 'kopyalandi'
                      ? '✓ Kopyalandı'
                      : '📋 Tek parça kodu kopyala'}
                </button>
                <span className="text-[11px] text-[#9A9792]">yaklaşık 26 KB</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E2E0D8] p-3 flex flex-col gap-2">
              <p className="text-[11.5px] font-semibold text-[#1C1B19]">
                Sunucuya dosya yükleyebiliyorsanız
              </p>
              <p className="text-[11px] text-[#6B6963] leading-relaxed">
                Dosyayı sitenizin kök dizinine yükleyip şu satırı ekleyin
                (WordPress&apos;te FTP ya da hosting panelindeki dosya yöneticisiyle
                <code className="px-1 bg-[#F7F6F2] rounded">/wp-content/uploads/</code> altına
                koyup tam adresiyle çağırabilirsiniz):
              </p>
              <pre className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-lg px-3 py-2 text-[11px] overflow-x-auto">
                <code>{kendiKodu}</code>
              </pre>
              <button
                type="button"
                onClick={() => void gomuluUret('dosya')}
                disabled={indirmeDurumu === 'indiriliyor'}
                className="self-start px-4 py-2 rounded-lg text-[13px] font-semibold border border-[#1D9E75] text-[#085041] hover:bg-[#F0FAF6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {indirmeDurumu === 'indiriliyor' ? 'Hazırlanıyor…' : `⬇ ${DOSYA_ADI} indir`}
              </button>
            </div>

            {indirmeDurumu === 'hata' && (
              <p className="text-[11px] text-[#D0483C]">
                Oluşturulamadı. Sayfayı yenileyip tekrar deneyin.
              </p>
            )}
          </div>

          <div className="bg-[#FFF9E8] border border-[#F0DFA8] rounded-xl px-3.5 py-3">
            <p className="text-[11px] text-[#7A5C10] leading-relaxed">
              <strong>Bu iki yöntemden yalnızca BİRİNİ kullanın.</strong> Hem yukarıdaki bağlı
              kodu hem de buradaki gömülü sürümü aynı sayfaya eklerseniz{' '}
              <strong>iki chatbot birden</strong> açılır.
            </p>
          </div>

          <p className="text-[11px] text-[#9A9792] leading-relaxed">
            <strong>Dikkat:</strong> bu gömülü sürüm o anki senaryonun kopyasıdır. Senaryoyu
            değiştirirseniz güncellemeler siteye kendiliğinden yansımaz — kodu/dosyayı
            yeniden alıp değiştirmeniz gerekir. Yukarıdaki bağlı kodda ise güncellemeler
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
