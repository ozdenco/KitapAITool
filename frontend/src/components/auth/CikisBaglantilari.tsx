import { useNavigate } from 'react-router-dom'
import { SIRKET } from '@/lib/sirketBilgileri'

/**
 * Giriş / kayıt sayfasının altındaki kaçış yolları.
 *
 * NEDEN: Herkese açık sayfalarda (Kurumsal Talep, Blog, SSS…) üst menüdeki
 * "Araçlar" bağlantısı oturum gerektirdiği için ziyaretçiyi giriş sayfasına
 * atıyor. Giriş sayfasında hiçbir geri dönüş bağlantısı olmadığı için
 * ziyaretçi sıkışıp kalıyordu (27 Ağu 2026'da bildirildi).
 *
 * "Geri dön" için history kullanılır: AuthGuard yönlendirmeyi `replace` ile
 * yaptığından, denenen korumalı sayfa geçmişe eklenmez — bir adım geri
 * gitmek ziyaretçiyi geldiği herkese açık sayfaya döndürür.
 *
 * Buton yalnızca uygulama içinde gezinme geçmişi varsa gösterilir; giriş
 * sayfasına doğrudan (yer imi, e-posta bağlantısı) gelen kullanıcıya
 * siteden dışarı atacak bir "geri" düğmesi sunulmaz.
 */
export function CikisBaglantilari() {
  const navigate = useNavigate()

  // React Router, gezinme geçmişindeki sırayı history.state.idx içinde tutar.
  // idx > 0 → bu sayfaya uygulama içinden gelinmiş demektir.
  const idx = (window.history.state as { idx?: number } | null)?.idx
  const geriGidilebilir = typeof idx === 'number' && idx > 0

  return (
    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap text-[13px]">
      {geriGidilebilir && (
        <>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-[#6B6963] hover:text-[#1D9E75] transition-colors"
          >
            ← Geldiğiniz sayfaya dönün
          </button>
          <span className="text-[#D3D1C7]" aria-hidden="true">·</span>
        </>
      )}

      <a
        href={`https://${SIRKET.alanAdi}`}
        className="text-[#6B6963] hover:text-[#1D9E75] transition-colors"
      >
        {SIRKET.marka} ana sayfası
      </a>
    </div>
  )
}
