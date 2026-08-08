import { useRef, useState } from 'react'

interface Props {
  getData: () => object
  onLoad: (data: Record<string, unknown>) => void
  filename?: string
}

export function FormPersistButtons({ getData, onLoad, filename = 'form.json' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState(false)

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
        const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>
        onLoad(data)
        setNotice(true)
        setTimeout(() => setNotice(false), 2500)
      } catch {
        // bozuk dosya — sessizce görmezden gel
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
    </div>
  )
}
