import { useEffect, useId, useRef, useState } from 'react'
import { SEKTOR_ARAMA_KELIMELERI } from '@/lib/sektorler'

interface AramaliSeciciProps {
  label?: string
  value: string
  onChange: (yeni: string) => void
  secenekler: readonly string[]
  placeholder?: string
  /** Listede olmayan bir değer varsa (eski kayıt) yine de gösterilir. */
  error?: string
}

/** Aksan ve büyük/küçük harf farkını yok sayan Türkçe arama karşılaştırması. */
function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim()
}

/**
 * Yazarak filtrelenebilen seçim kutusu.
 *
 * NEDEN: Sektör listesi 23 maddeye çıkınca kullanıcılar aradıklarını
 * bulmak için uzun listeyi kaydırmak zorunda kalıyordu ("baş harf
 * yazdığımızda filtrelense" geri bildirimi, 28 Ağu 2026).
 *
 * Yalnızca listedeki değerler seçilebilir — serbest metin kabul edilmez.
 * Bu önemli: sektör değeri işletme profilinden araç formlarına
 * ön-dolduruluyor ve iki taraf birebir eşleşmeli.
 */
export function AramaliSecici({
  label, value, onChange, secenekler, placeholder = 'Yazarak arayın…', error,
}: AramaliSeciciProps) {
  const [acik, setAcik]     = useState(false)
  const [arama, setArama]   = useState('')
  const [vurgu, setVurgu]   = useState(0)
  const sarmalayiciRef      = useRef<HTMLDivElement>(null)
  const listeRef            = useRef<HTMLUListElement>(null)
  const listeId             = useId()

  /*
   * Seçenek + eş anlamlıları birlikte aranır: "depolama" → Lojistik / Taşımacılık,
   * "konfeksiyon" → Giyim / Tekstil. Eş anlamlısı olmayan listelerde yalnızca
   * etiket aranır. Seçilen değer her zaman etiketin kendisidir.
   */
  const aranabilir = (s: string) => sadelestir([s, ...(SEKTOR_ARAMA_KELIMELERI[s] ?? [])].join(' '))
  const filtreli = arama.trim()
    ? secenekler.filter((s) => aranabilir(s).includes(sadelestir(arama)))
    : secenekler

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!acik) return
    const disariTikla = (e: MouseEvent) => {
      if (!sarmalayiciRef.current?.contains(e.target as Node)) {
        setAcik(false)
        setArama('')
      }
    }
    document.addEventListener('mousedown', disariTikla)
    return () => document.removeEventListener('mousedown', disariTikla)
  }, [acik])

  // Vurgulanan seçenek görünür kalsın
  useEffect(() => {
    if (!acik) return
    listeRef.current?.children[vurgu]?.scrollIntoView({ block: 'nearest' })
  }, [vurgu, acik])

  const sec = (secenek: string) => {
    onChange(secenek)
    setAcik(false)
    setArama('')
  }

  const klavye = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!acik) { setAcik(true); return }
      setVurgu((v) => Math.min(v + 1, filtreli.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setVurgu((v) => Math.max(v - 1, 0))
    } else if (e.key === 'Enter') {
      if (!acik) return
      e.preventDefault()
      if (filtreli[vurgu]) sec(filtreli[vurgu])
    } else if (e.key === 'Escape') {
      setAcik(false)
      setArama('')
    }
  }

  return (
    <div className="flex flex-col gap-[6px]" ref={sarmalayiciRef}>
      {label && <label className="text-[12px] font-medium text-[#6B6963]">{label}</label>}

      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={acik}
          aria-controls={listeId}
          aria-autocomplete="list"
          value={acik ? arama : value}
          placeholder={value ? value : placeholder}
          onChange={(e) => { setArama(e.target.value); setVurgu(0); setAcik(true) }}
          onFocus={() => { setAcik(true); setArama('') }}
          onKeyDown={klavye}
          className={`w-full rounded-lg border pl-[12px] pr-[30px] py-[8px] text-[13px] text-[#1C1B19] bg-white outline-none transition
            focus:ring-2 focus:ring-[#1D9E75]/10 focus:border-[#1D9E75]
            ${error ? 'border-red-400' : 'border-[#D3D1C7]'}`}
        />

        <span
          aria-hidden="true"
          className={`absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9A9792] text-[10px] pointer-events-none transition-transform ${acik ? 'rotate-180' : ''}`}
        >
          ▼
        </span>

        {acik && (
          <ul
            id={listeId}
            ref={listeRef}
            role="listbox"
            className="absolute z-30 top-full left-0 right-0 mt-1 max-h-[240px] overflow-y-auto bg-white border border-[#D3D1C7] rounded-lg shadow-lg py-1"
          >
            {filtreli.length === 0 ? (
              <li className="px-3 py-2 text-[12px] text-[#9A9792]">Eşleşen seçenek yok</li>
            ) : (
              filtreli.map((secenek, i) => (
                <li
                  key={secenek}
                  role="option"
                  aria-selected={secenek === value}
                  onMouseEnter={() => setVurgu(i)}
                  onMouseDown={(e) => { e.preventDefault(); sec(secenek) }}
                  className={`px-3 py-[7px] text-[13px] cursor-pointer transition-colors ${
                    i === vurgu ? 'bg-[#F0FAF6] text-[#085041]' : 'text-[#1C1B19]'
                  } ${secenek === value ? 'font-semibold' : ''}`}
                >
                  {secenek}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </div>
  )
}
