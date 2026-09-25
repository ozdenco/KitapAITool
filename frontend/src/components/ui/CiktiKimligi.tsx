import { useState } from 'react'

/**
 * Kayıtlı çıktının ID'si + kopyala düğmesi.
 *
 * Neden var: bir çıktıda sorun görüldüğünde "şu çıktıyı incele" diyebilmek
 * için elde bir tanımlayıcı olması gerekiyordu; ID yalnızca arka planda
 * (X-Result-Id başlığı, /tools/results/{id}) duruyordu, ekranda hiçbir
 * yerde görünmüyordu (25 Eyl 2026). Yönetici bu ID ile kaydı
 * /admin/rapor/{id} adresinden açabilir.
 */
export function CiktiKimligi({ id }: { id: string }) {
  const [kopyalandi, setKopyalandi] = useState(false)

  const kopyala = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setKopyalandi(true)
      setTimeout(() => setKopyalandi(false), 1500)
    } catch { /* pano izni yoksa kullanıcı metni elle seçebilir */ }
  }

  return (
    <div className="flex items-center gap-2 text-[11px] text-[#9A9792] no-print">
      <span>Çıktı ID:</span>
      <code className="font-mono text-[#3A3935] bg-[#F7F6F2] border border-[#E2E0D8] rounded px-1.5 py-0.5 select-all break-all">
        {id}
      </code>
      <button
        type="button"
        onClick={kopyala}
        className="shrink-0 px-2 py-0.5 rounded border border-[#D3D1C7] hover:bg-[#F7F6F2] text-[#6B6963]"
      >
        {kopyalandi ? '✓ Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  )
}
