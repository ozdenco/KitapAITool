import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { ISLETME_PROFILI_YOLU } from '@/lib/isletmeProfili'

const KAPATILDI_ANAHTARI = 'kkb-isletme-profili-hatirlatmasi-kapatildi'

/** Kapatma tercihi okunamazsa (gizli sekme, engellenmiş depolama) uyarı gösterilir. */
function kapatilmisMi(): boolean {
  try {
    return localStorage.getItem(KAPATILDI_ANAHTARI) === '1'
  } catch {
    return false
  }
}

/**
 * Dashboard'da işletme profilini doldurmaya davet eden şerit.
 *
 * Yalnızca profil eksikse görünür; dolduran kullanıcı bir daha görmez.
 * Kapatılabilir — tercih tarayıcıda saklanır.
 *
 * Tasarım notu: dikkat çekmesi isteniyor ama "sırıtmaması" da. Bu yüzden
 * kırmızı/sarı uyarı rengi değil, markanın kendi yeşil tonu ve ince bir
 * sol şerit kullanıldı; kapatma düğmesi sessiz bırakıldı.
 */
export function IsletmeProfiliHatirlatmasi() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [kapatildi, setKapatildi] = useState(kapatilmisMi)

  const profilDolu = !!user?.company?.trim()
  if (profilDolu || kapatildi) return null

  const kapat = () => {
    try {
      localStorage.setItem(KAPATILDI_ANAHTARI, '1')
    } catch {
      /* depolama yoksa yalnızca bu oturumda gizlenir */
    }
    setKapatildi(true)
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#9FE1CB] bg-[#F4FBF8] border-l-[3px] border-l-[#1D9E75] px-4 py-3">
      <span className="text-[16px] leading-none mt-[1px]" aria-hidden="true">🏢</span>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#1C1B19] leading-relaxed">
          <strong className="font-semibold">İşletme bilgilerinizi tamamlayın.</strong>{' '}
          <span className="text-[#3A3935]">
            Bir kez yazdığınız bilgiler, araçları çalıştırırken ilgili form alanlarına
            otomatik gelir — her araçta yeniden yazmanıza gerek kalmaz. Tüm alanlar
            isteğe bağlıdır; boş bıraktıklarınız o araçta size sorulmaya devam eder.
          </span>
        </p>
        <button
          type="button"
          onClick={() => navigate(ISLETME_PROFILI_YOLU)}
          className="mt-1.5 text-[13px] font-semibold text-[#1D9E75] hover:text-[#178a65] transition-colors"
        >
          Bilgilerimi ekle →
        </button>
      </div>

      <button
        type="button"
        onClick={kapat}
        aria-label="Bu hatırlatmayı kapat"
        title="Kapat"
        className="shrink-0 text-[#9A9792] hover:text-[#3A3935] transition-colors text-[15px] leading-none px-1"
      >
        ×
      </button>
    </div>
  )
}
