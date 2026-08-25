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
export function SiteyeEkleKarti({ resultId, bizName }: Props) {
  const [kopyalandi, setKopyalandi] = useState(false)

  const kod =
    `<script src="${window.location.origin}/chatbot-widget.js"\n` +
    `        data-kolaykobi-id="${resultId}"\n` +
    `        data-baslik="${bizName.trim() || 'Destek'}"></script>`

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(kod)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 2500)
    } catch (error) {
      console.error('Panoya kopyalanamadı:', error)
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

        <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-xl px-3.5 py-3">
          <p className="text-[11px] text-[#085041] leading-relaxed">
            <strong>Ek ücret yok.</strong> Chatbot, ziyaretçi sorularını burada üretilen SSS
            kartlarıyla eşleştirir — her mesaj için yapay zekaya istek göndermez, kullanım
            hakkınızdan düşmez.
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
