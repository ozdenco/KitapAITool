import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface YasalSayfaProps {
  baslik: string
  ozet?: string
  sonGuncelleme?: string
  children: ReactNode
}

/**
 * Yasal ve kurumsal sayfaların ortak kabuğu.
 *
 * Her sayfa aynı geri butonunu, başlık bloğunu ve tipografiyi kendi içinde
 * tekrarlıyordu. Yeni sayfa eklerken (Gizlilik, DPA, Açık Rıza…) bu kabuk
 * kullanılır; sayfa yalnızca içerik bölümlerini yazar.
 */
export function YasalSayfa({ baslik, ozet, sonGuncelleme, children }: YasalSayfaProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-4 text-[13px] text-[#6B6963] hover:text-[#1D9E75] transition-colors no-print"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Geri Dön
        </button>

        <h1 className="text-[22px] font-bold text-[#1C1B19] mb-1">{baslik}</h1>
        {ozet && <p className="text-[13px] text-[#6B6963] leading-relaxed mb-2">{ozet}</p>}
        {sonGuncelleme && (
          <p className="text-[12px] text-[#9A9792] mb-5">Son güncelleme: {sonGuncelleme}</p>
        )}

        <div className="text-[13px] text-[#3A3935] leading-relaxed space-y-4">{children}</div>
      </div>
    </div>
  )
}

/** Numaralı/başlıklı içerik bölümü. */
export function Bolum({ baslik, children }: { baslik: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[14px] font-semibold text-[#1C1B19] mb-1.5 mt-5">{baslik}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

/** Madde listesi — yasal metinlerde en sık tekrarlanan yapı. */
export function Maddeler({ maddeler }: { maddeler: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {maddeler.map((m, i) => (
        <li key={i}>{m}</li>
      ))}
    </ul>
  )
}
