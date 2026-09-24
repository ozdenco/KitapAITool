import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuthStore } from '@/store/auth'
import { apiHataMesaji } from '@/lib/apiHata'
import { useIsletmeProfili, ISLETME_PROFILI_ANAHTARI } from '@/hooks/useIsletmeProfili'
import { MARKA_TONU_SECENEKLERI } from '@/lib/markaTonlari'
import { SEKTORLER } from '@/lib/sektorler'
import { AramaliSecici } from '@/components/ui/AramaliSecici'
import {
  BOS_ISLETME_PROFILI,
  doluAlanSayisi,
  bayatMi,
  type IsletmeProfili,
} from '@/lib/isletmeProfili'

/** Alanın kaç araçta kullanıldığını gösteren küçük etiket. */
function Kullanim({ adet }: { adet: number }) {
  return (
    <span className="text-[11px] text-[#9A9792]">
      {adet === 11 ? '11 aracın tamamında kullanılır' : `${adet} araçta kullanılır`}
    </span>
  )
}

function Bolum({ baslik, aciklama, children }: {
  baslik: string
  aciklama: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6">
      <h2 className="text-[14px] font-semibold text-[#1C1B19] mb-0.5">{baslik}</h2>
      <p className="text-[12px] text-[#9A9792] mb-4">{aciklama}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

export function IsletmeBilgilerimPage() {
  const { profil, yukleniyor } = useIsletmeProfili()
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()

  const [form, setForm] = useState<IsletmeProfili>(BOS_ISLETME_PROFILI)
  const [kaydedildi, setKaydedildi] = useState(false)

  // Profil geldiğinde formu doldur
  useEffect(() => {
    if (!yukleniyor) setForm(profil)
  }, [profil, yukleniyor])

  const guncelle = (alan: keyof IsletmeProfili) => (deger: string) =>
    setForm((onceki) => ({ ...onceki, [alan]: deger }))

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/users/me/business-profile', form)
      if (!res.data?.success) throw new Error(res.data?.error ?? 'Kaydedilemedi.')
      return res.data.data as IsletmeProfili
    },
    onSuccess: (guncel) => {
      queryClient.setQueryData(ISLETME_PROFILI_ANAHTARI, guncel)
      // Dashboard hatırlatması ve oturum yanıtı işletme adını buradan okur
      if (user) setUser({ ...user, company: guncel.businessName ?? '' })
      setKaydedildi(true)
      setTimeout(() => setKaydedildi(false), 3000)
    },
  })

  const { dolu, toplam } = doluAlanSayisi(form)
  const yuzde = Math.round((dolu / toplam) * 100)
  const hata = mutation.isError ? apiHataMesaji(mutation.error, 'Kaydedilemedi.') : null

  if (yukleniyor) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-24 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
        <div className="h-64 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
      </div>
    )
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
    >
      {/* ── Tanıtım + tamamlanma ── */}
      <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5">
        <h1 className="text-[16px] font-semibold text-[#085041] mb-1">İşletme Bilgilerim</h1>
        <p className="text-[13px] text-[#3A3935] leading-relaxed mb-4">
          Buraya bir kez yazdığınız bilgiler, araçları çalıştırırken ilgili form
          alanlarına otomatik gelir — her araçta yeniden yazmanıza gerek kalmaz.
          Tüm alanlar isteğe bağlıdır; boş bıraktıklarınız o araçta size sorulmaya
          devam eder.
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-[6px] bg-white rounded-full overflow-hidden border border-[#9FE1CB]">
            <div
              className="h-full bg-[#1D9E75] rounded-full transition-all"
              style={{ width: `${yuzde}%` }}
            />
          </div>
          <span className="text-[12px] font-medium text-[#085041] tabular-nums shrink-0">
            {dolu} / {toplam} alan
          </span>
        </div>

        {bayatMi(form.updatedAt) && (
          <p className="mt-3 text-[12px] text-[#B4750E]">
            ⏳ Bu bilgiler 6 aydan uzun süredir güncellenmedi. İşletmeniz değiştiyse
            gözden geçirin — çıktıların doğruluğu buna bağlı.
          </p>
        )}
      </div>

      <Bolum
        baslik="Temel bilgiler"
        aciklama="Araçların tamamı bu alanları soruyor."
      >
        <div>
          <Input
            label="İşletme adı"
            placeholder="Örn: Yıldız Muhasebe"
            value={form.businessName}
            onChange={(e) => guncelle('businessName')(e.target.value)}
          />
          <div className="mt-1"><Kullanim adet={11} /></div>
        </div>

        <div>
          <AramaliSecici
            label="Sektör"
            value={form.sector}
            onChange={guncelle('sector')}
            secenekler={SEKTORLER}
          />
          <div className="mt-1"><Kullanim adet={11} /></div>
        </div>

        <div>
          <Input
            label="Şehir / bölge"
            placeholder="Örn: İzmir"
            value={form.city}
            onChange={(e) => guncelle('city')(e.target.value)}
          />
          <div className="mt-1"><Kullanim adet={3} /></div>
        </div>
      </Bolum>

      <Bolum
        baslik="İşiniz"
        aciklama="Çıktıların işletmenize özgü olmasını sağlayan alanlar."
      >
        <div>
          <Textarea
            label="Sunduğunuz hizmet / ürün"
            placeholder="Örn: KOBİ'lere aylık muhasebe, vergi beyannamesi ve e-fatura hizmetleri."
            value={form.productService}
            onChange={(e) => guncelle('productService')(e.target.value)}
            rows={3}
          />
          <div className="mt-1"><Kullanim adet={4} /></div>
        </div>

        <div>
          <Input
            label="Hedef kitle / müşteri profili"
            placeholder="Örn: 5-20 kişilik KOBİ sahipleri, İzmir ve çevresi"
            value={form.targetAudience}
            onChange={(e) => guncelle('targetAudience')(e.target.value)}
          />
          <div className="mt-1"><Kullanim adet={5} /></div>
        </div>

        <div>
          <Input
            label="Fiyat aralığı / segmenti"
            placeholder="Örn: 3.000₺ – 8.000₺/ay · orta segment"
            value={form.priceSegment}
            onChange={(e) => guncelle('priceSegment')(e.target.value)}
          />
          <div className="mt-1"><Kullanim adet={3} /></div>
        </div>

        <div>
          <Textarea
            label="Güçlü yönleriniz"
            placeholder="Örn: 7/24 WhatsApp destek, sertifikalı mali müşavir ekibi, ilk ay ücretsiz"
            value={form.strengths}
            onChange={(e) => guncelle('strengths')(e.target.value)}
            rows={2}
          />
          <div className="mt-1"><Kullanim adet={2} /></div>
        </div>
      </Bolum>

      <Bolum
        baslik="Dijital varlıklarınız"
        aciklama="Görünürlük ve rakip analizi araçları bu adresleri kullanır."
      >
        <Input
          label="Web sitesi"
          placeholder="ornek.com"
          value={form.website}
          onChange={(e) => guncelle('website')(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Instagram" placeholder="@kullaniciadi"
            value={form.instagram} onChange={(e) => guncelle('instagram')(e.target.value)} />
          <Input label="LinkedIn" placeholder="linkedin.com/company/..."
            value={form.linkedIn} onChange={(e) => guncelle('linkedIn')(e.target.value)} />
          <Input label="Facebook" placeholder="facebook.com/..."
            value={form.facebook} onChange={(e) => guncelle('facebook')(e.target.value)} />
          <Input label="YouTube" placeholder="youtube.com/@..."
            value={form.youTube} onChange={(e) => guncelle('youTube')(e.target.value)} />
          <Input label="TikTok" placeholder="@kullaniciadi"
            value={form.tikTok} onChange={(e) => guncelle('tikTok')(e.target.value)} />
        </div>
      </Bolum>

      <Bolum
        baslik="Tercihler"
        aciklama="İçerik üreten araçların tonunu belirler."
      >
        <Select
          label="Marka tonu"
          value={form.brandTone}
          onChange={(e) => guncelle('brandTone')(e.target.value)}
          options={[{ value: '', label: 'Seçin...' }, ...MARKA_TONU_SECENEKLERI]}
        />
        <Textarea
          label="Eklemek istedikleriniz"
          placeholder="Araçların bilmesini istediğiniz her şey — özel notlar, kaçınılması gereken konular, kampanyalar…"
          value={form.notes}
          onChange={(e) => guncelle('notes')(e.target.value)}
          rows={3}
        />
      </Bolum>

      {hata && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {hata}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={mutation.isPending}>
          Bilgileri Kaydet
        </Button>
        {kaydedildi && (
          <span className="text-[13px] text-[#1D9E75] font-medium">✓ Kaydedildi</span>
        )}
      </div>
    </form>
  )
}
