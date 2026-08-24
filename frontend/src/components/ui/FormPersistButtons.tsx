import { useRef, useState } from 'react'

interface Props {
  getData: () => object
  onLoad: (data: Record<string, unknown>) => void
  filename?: string
}

/**
 * Eski standalone HTML araçları formu farklı bir şemayla kaydediyordu:
 *   { "f-biz": "...", "f-sector": "...", "faq-1": "...", "f-redirect-goal": "..." }
 * SaaS sürümü ise camelCase + dizi kullanıyor:
 *   { biz, sector, faqs: [...], redirectGoal }
 * Eski dosyalar da yüklenebilsin diye anahtarları çeviriyoruz.
 */
function normalizeLegacyForm(raw: Record<string, unknown>): Record<string, unknown> {
  const hasLegacyKeys = Object.keys(raw).some((k) => k.startsWith('f-') || k.startsWith('faq-'))
  if (!hasLegacyKeys) return raw

  const out: Record<string, unknown> = { ...raw }

  // "f-redirect-goal" → "redirectGoal", "f-biz" → "biz"
  for (const [key, value] of Object.entries(raw)) {
    if (!key.startsWith('f-')) continue
    const camel = key
      .slice(2)
      .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    if (out[camel] === undefined) out[camel] = value
  }

  // "faq-1".."faq-5" → faqs: [...]
  const faqKeys = Object.keys(raw)
    .filter((k) => /^faq-\d+$/.test(k))
    .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
  if (faqKeys.length > 0 && out.faqs === undefined) {
    out.faqs = faqKeys.map((k) => String(raw[k] ?? '').trim())
  }

  return out
}

export function FormPersistButtons({ getData, onLoad, filename = 'form.json' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState(false)
  const [error, setError]   = useState(false)

  const handleSave = () => {
    const json = JSON.stringify(getData(), null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string) as Record<string, unknown>
        onLoad(normalizeLegacyForm(raw))
        setNotice(true)
        setTimeout(() => setNotice(false), 2500)
      } catch (error) {
        console.error('Form yüklenemedi:', error)
        setError(true)
        setTimeout(() => setError(false), 4000)
      }
    }
    reader.readAsText(file)
    // aynı dosyayı tekrar yükleyebilmek için sıfırla
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
      >
        💾 Formu Kaydet
      </button>

      <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer">
        📂 Form Yükle (.json)
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {notice && (
        <span className="text-xs text-[#1D9E75] flex items-center gap-1">
          ✓ Form yüklendi
        </span>
      )}

      {error && (
        <span className="text-xs text-red-500 flex items-center gap-1">
          ✕ Dosya okunamadı — geçerli bir .json seçin
        </span>
      )}
    </div>
  )
}
