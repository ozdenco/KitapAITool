import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { YasalSayfa } from '@/components/legal/YasalSayfa'
import { SIRKET } from '@/lib/sirketBilgileri'
import { apiHataMesaji } from '@/lib/apiHata'

interface TalepFormu {
  adSoyad: string
  sirket: string
  eposta: string
  telefon: string
  ihtiyac: string
  /** Honeypot — gerçek kullanıcı görmez, bot doldurur. */
  website: string
}

const BOS_FORM: TalepFormu = {
  adSoyad: '', sirket: '', eposta: '', telefon: '', ihtiyac: '', website: '',
}

const EPOSTA_DESENI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function KurumsalTalepPage() {
  const [form, setForm] = useState<TalepFormu>(BOS_FORM)
  const [gonderildi, setGonderildi] = useState(false)

  const guncelle = (alan: keyof TalepFormu, deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }))

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/public/iletisim/kurumsal-talep', {
        adSoyad: form.adSoyad.trim(),
        sirket: form.sirket.trim() || null,
        eposta: form.eposta.trim(),
        telefon: form.telefon.trim() || null,
        ihtiyac: form.ihtiyac.trim(),
        website: form.website,
      })
      if (!res.data?.success) throw new Error(res.data?.error ?? 'Talep gönderilemedi.')
      return res.data
    },
    onSuccess: () => {
      setGonderildi(true)
      setForm(BOS_FORM)
    },
  })

  const gonderilebilir =
    form.adSoyad.trim().length >= 2 &&
    EPOSTA_DESENI.test(form.eposta.trim()) &&
    form.ihtiyac.trim().length >= 10 &&
    !mutation.isPending

  const hataMesaji = mutation.isError
    ? apiHataMesaji(mutation.error, 'Talep gönderilemedi. Lütfen tekrar deneyin.')
    : null

  if (gonderildi) {
    return (
      <YasalSayfa baslik="Kurumsal Talep">
        <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-8 text-center">
          <p className="text-[32px] mb-3" aria-hidden="true">✅</p>
          <h2 className="text-[16px] font-semibold text-[#085041] mb-2">Talebiniz bize ulaştı</h2>
          <p className="text-[13px] text-[#3A3935] leading-relaxed mb-5">
            En kısa sürede size dönüş yapacağız. Acele bir konuysa{' '}
            <a href={`tel:${SIRKET.telefonHref}`} className="text-[#1D9E75] hover:underline font-medium">
              {SIRKET.telefon}
            </a>{' '}
            numarasından bize ulaşabilirsiniz.
          </p>
          <button
            type="button"
            onClick={() => setGonderildi(false)}
            className="text-[13px] text-[#6B6963] underline hover:text-[#1C1B19] transition-colors"
          >
            Yeni talep gönder
          </button>
        </div>
      </YasalSayfa>
    )
  }

  return (
    <YasalSayfa
      baslik="Kurumsal Talep"
      ozet="Üyelik gerektirmez. Ekibinizin ihtiyacını yazın, size özel bir çözüm önerelim."
    >
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6 sm:p-8">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (gonderilebilir) mutation.mutate()
          }}
        >
          <Input
            label="Ad Soyad *"
            placeholder="Adınız soyadınız"
            value={form.adSoyad}
            onChange={(e) => guncelle('adSoyad', e.target.value)}
          />

          <Input
            label="Şirket Adı"
            placeholder="Şirket adınız"
            value={form.sirket}
            onChange={(e) => guncelle('sirket', e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="E-posta *"
              type="email"
              placeholder="ornek@sirket.com"
              value={form.eposta}
              onChange={(e) => guncelle('eposta', e.target.value)}
            />
            <Input
              label="Telefon"
              placeholder="0555 123 45 67"
              value={form.telefon}
              onChange={(e) => guncelle('telefon', e.target.value)}
            />
          </div>

          <Textarea
            label="İhtiyaçlarınız *"
            placeholder="Kaç kullanıcı olacağınızı, hangi araçlara ihtiyaç duyduğunuzu ve varsa entegrasyon taleplerinizi yazın…"
            value={form.ihtiyac}
            onChange={(e) => guncelle('ihtiyac', e.target.value)}
            rows={5}
          />

          {/*
            Honeypot. Ekran okuyucudan ve klavyeden gizlenir; yalnızca formu
            körlemesine dolduran botlar buraya yazar. Sunucu doluysa isteği
            sessizce yok sayar.
          */}
          <div className="absolute w-px h-px overflow-hidden -left-[9999px]" aria-hidden="true">
            <label htmlFor="website-alan">Web sitesi</label>
            <input
              id="website-alan"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => guncelle('website', e.target.value)}
            />
          </div>

          {hataMesaji && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {hataMesaji}
            </p>
          )}

          <Button type="submit" disabled={!gonderilebilir} loading={mutation.isPending} className="w-full">
            Talep Gönder
          </Button>

          <p className="text-[12px] text-[#9A9792] leading-relaxed">
            Formu göndererek bilgilerinizin talebinizi değerlendirmek amacıyla işlenmesini kabul
            etmiş olursunuz. Ayrıntılar için{' '}
            <a href="/kvkk" className="text-[#1D9E75] hover:underline">KVKK Aydınlatma Metni</a>.
          </p>
        </form>
      </div>

      <div className="mt-5 text-[13px] text-[#6B6963]">
        <p>
          Doğrudan yazmak isterseniz:{' '}
          <a href={`mailto:${SIRKET.eposta}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.eposta}
          </a>{' '}
          ·{' '}
          <a href={`tel:${SIRKET.telefonHref}`} className="text-[#1D9E75] hover:underline">
            {SIRKET.telefon}
          </a>
        </p>
      </div>
    </YasalSayfa>
  )
}
