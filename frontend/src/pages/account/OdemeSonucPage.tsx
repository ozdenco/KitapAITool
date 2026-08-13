import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

const PLAN_LABELS: Record<string, string> = {
  standard:   'Standart',
  premium:    'Premium',
  enterprise: 'Kurumsal',
}

export function OdemeSonucPage() {
  const [params]     = useSearchParams()
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  const status = params.get('status')   // "success" | "error"
  const plan   = params.get('plan')     // "standard" | "premium" | …
  const reason = params.get('reason')   // hata mesajı

  const isSuccess = status === 'success'

  // Başarılıysa abonelik ve kullanıcı önbelleğini temizle
  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    }
  }, [isSuccess, queryClient])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">

      {isSuccess ? (
        <>
          <div className="text-[56px] mb-4">🎉</div>
          <h1 className="text-[22px] font-semibold text-[#1C1B19] mb-2">
            Ödeme Başarılı!
          </h1>
          <p className="text-[14px] text-[#6B6963] mb-1">
            {plan && PLAN_LABELS[plan]
              ? <><strong className="text-[#1D9E75]">{PLAN_LABELS[plan]}</strong> paketi aktive edildi.</>
              : 'Paketiniz başarıyla aktive edildi.'}
          </p>
          <p className="text-[13px] text-[#9A9792] mb-8">
            Aboneliğiniz 30 gün geçerlidir.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
            >
              Araçları Kullan →
            </button>
            <button
              onClick={() => navigate('/hesabim/abonelik')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium border border-[#D3D1C7] bg-white text-[#6B6963] hover:bg-[#F7F6F2] transition-colors"
            >
              Aboneliğimi Gör
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-[56px] mb-4">❌</div>
          <h1 className="text-[22px] font-semibold text-[#1C1B19] mb-2">
            Ödeme Başarısız
          </h1>
          <p className="text-[14px] text-[#6B6963] mb-1">
            {reason
              ? decodeURIComponent(reason)
              : 'Ödeme işlemi tamamlanamadı.'}
          </p>
          <p className="text-[13px] text-[#9A9792] mb-8">
            Hesabınızdan herhangi bir ücret alınmadı.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/hesabim/paket-sec')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium bg-[#1C1B19] text-white hover:bg-[#2C2B27] transition-colors"
            >
              Tekrar Dene
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl text-[13px] font-medium border border-[#D3D1C7] bg-white text-[#6B6963] hover:bg-[#F7F6F2] transition-colors"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </>
      )}
    </div>
  )
}
