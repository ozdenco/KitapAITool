/**
 * VİDEO OLUŞTURMA — ViralVideoPage.tsx kopyası (4 Eyl 2026).
 *
 * NEDEN KOPYA: Viral Video Uyarlayıcı canlıda çalışıyor ve kullanıcıları var.
 * Video üretimi (Veo) ve linkten otomatik çözümleme burada geliştirilecek;
 * çalışan araç riske atılmayacak. İkisi ayrıştıktan sonra ortak parçalar
 * bileşene çıkarılabilir.
 *
 * Araç şu an tools.ts icinde active:false — kullanıcılara gorunmuyor.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormPersistButtons } from '@/components/ui/FormPersistButtons'
import { ToolShell } from '@/components/ui/ToolShell'
import { useElapsedSeconds } from '@/hooks/useElapsedSeconds'
import { useProfilOnDolgu } from '@/hooks/useIsletmeProfili'
import { SEKTORLER } from '@/lib/sektorler'
import { AramaliSecici } from '@/components/ui/AramaliSecici'
import { useFormOtomatikKayit } from '@/hooks/useFormOtomatikKayit'
import { VideoCiktisi } from '@/components/ui/VideoCiktisi'
import { useAuthStore } from '@/store/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SektoreOzguUyarlama {
  sektor: string
  /** Bu senaryonun açısı — 3 kart artık farklı sektör değil, farklı yaklaşım. */
  yaklasim?: string
  /** Senaryonun dayandığı gerçek hizmet (birebir alıntı) — uydurma denetimi. */
  dayanak_hizmet?: string
  hook: string
  senaryo_taslagi: string
  /** Kaynak videodaki doruk anın bu sektördeki karşılığı. */
  doruk_an_karsiligi?: string
  cta?: string
}

interface PlanSahnesi {
  sira: number
  aciklama: string
  prompt: string
  zincirle: boolean
  /** Türkçe konuşma — Veo'ya gitmiyor, seslendirilip altyazı olarak basılıyor. */
  replik?: string
  /** Repliği söyleyen karakter — ses seçimi buna göre. */
  konusan?: string
  /** Ses efekti (ör. "zil") — Veo sesi silindiği için medya servisi ekliyor. */
  efekt?: string
  /** Konuşanın senaryodaki rol adı ("Müşteri", "Kurye") — sabit 4 rolle sınırlı değil. */
  konusanEtiket?: string
  /** "erkek-orta" gibi — medya servisi sesi buna göre seçiyor; üretime aynen geri gider. */
  sesProfili?: string
}

const KONUSAN_ETIKET: Record<string, string> = {
  isletme_sahibi: 'İşletme sahibi',
  reklamci: 'Reklamcı',
  cirak: 'Çırak',
  anlatici: 'Anlatıcı',
}

interface ViralVideoResult {
  format_adi?: string
  format_tipi?: string
  format_aciklamasi?: string
  kurgu_yapisi?: string
  ornek_hook?: string
  sure?: string
  uretim_zorlugu?: string
  marka_guvenligi?: string
  sektore_ozgu_uyarlamalar: SektoreOzguUyarlama[]
  uygulama_ipuclari?: string

  /*
   * 5 Eyl 2026'da eklenen alanlar. Gerçek çıktı incelemesi, modelin yapıyı
   * doğru çıkarıp ESPRİYİ kaçırdığını gösterdi (bkz. n8n prompt notu).
   * Hepsi opsiyonel — eski kayıtlar bu alanlar olmadan da açılır.
   */
  /**
   * 8 Eyl 2026: modelin senaryoları neye dayandırdığını görünür kılan alanlar.
   * `firma_hizmetleri` boşsa/"bulunamadı" diyorsa kullanıcı hizmet alanını
   * doldurmalı — yoksa model boşluğu uydurmayla dolduruyor.
   */
  firma_hizmetleri?: string
  sektor_notu?: string

  /** Telifli öğe çıkarılınca format hâlâ çalışır mı? "evet" değilse uyarı. */
  telifsiz_calisir_mi?: string
  /** İşletme sahibi hangi rolde — küçümseyici senaryoyu yakalamak için. */
  rol_dagilimi?: string

  kim_oynuyor?: string
  doruk_an?: string
  neden_tuttu?: string
  uyarlamada_korunacak?: string
  gorsel_notlar?: string
  telif_riski?: string
  /**
   * Senaryodaki ürün/hizmet iddiasının kaynağı. 7 Eyl 2026'da model
   * KolayKOBİ için var olmayan bir özellik uydurdu; bu alan iddiayı
   * denetlenebilir kılıyor.
   */
  dayanak?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TONLAR = [
  'Eğlenceli / Komik',
  'Bilgilendirici',
  'İlham Verici',
  'Duygusal / Samimi',
  'Profesyonel / Kurumsal',
  'Merak Uyandıran',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function VideoOlusturmaPage() {
  const queryClient     = useQueryClient()
  const [searchParams]  = useSearchParams()

  // Form state
  const [videoUrl,  setVideoUrl]  = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [bizName,   setBizName]   = useState('')
  const [sector,    setSector]    = useState('')
  const [bizUrl,    setBizUrl]    = useState('')
  const [tones,     setTones]     = useState<string[]>([])
  const [extra,     setExtra]     = useState('')
  /** İşletme profilindeki "Sunduğunuz hizmet / ürün" — ön dolu gelir. */
  const [hizmetler, setHizmetler] = useState('')

  // Sonuç + akış bildirimi
  const [result,        setResult]        = useState<ViralVideoResult | null>(null)
  /*
   * Sonucun ÜRETİLDİĞİ link. Kaynak kartı eskiden formdaki `videoUrl`i
   * yazıyordu; başarısız bir çalıştırmadan sonra kullanıcı yeni linki yazınca
   * ESKİ analiz YENİ linkin altında görünüyordu (6 Eyl 2026). Analiz hangi
   * videodan geldiyse onu göstermek zorundayız.
   */
  const [resultUrl,     setResultUrl]     = useState('')
  /**
   * Ekrandaki sonuç bu oturumda mı üretildi, yoksa kayıttan mı geldi?
   * Belirtilmezse kullanıcı eski senaryoyu az önce üretilmiş sanıyor.
   */
  const [eskiSonuc,     setEskiSonuc]     = useState(false)

  /*
   * VİDEO ÜRETİMİ — uyarlama kartlarındaki düğmeden tetikleniyor.
   *
   * Ayrı bir araç (`video-uret`) çünkü maliyeti bambaşka: senaryo üretmek
   * kuruşlar, video üretmek klip başına $0.40. Kullanıcı hangi uyarlamayı
   * istediğini seçtikten sonra bilinçli bir tıklamayla harcanıyor.
   *
   * 2-5 dakika sürdüğü için async: iş kimliği alınıp durum yoklanıyor.
   */
  const [videoIndex,  setVideoIndex]  = useState<number | null>(null)
  const [videoDurum,  setVideoDurum]  = useState<string>('')
  const [videoUrl2,   setVideoUrl2]   = useState<string | null>(null)
  const [videoHata,   setVideoHata]   = useState<string | null>(null)

  /*
   * İKİ ADIMLI AKIŞ (7 Eyl 2026)
   *
   * Video üretimi klip başına $0.40. Bir çalıştırmada model KolayKOBİ için
   * olmayan bir özellik uydurdu ve replikler İngilizce çıktı — para gittikten
   * SONRA görüldü.
   *
   * Artık sahne planı önce ÜCRETSİZ üretilip onaya sunuluyor (yalnızca bir
   * Gemini çağrısı). Kullanıcı İngilizce promptları da görüyor; uydurma
   * iddiayı veya yanlış dili orada yakalayabiliyor. Para ancak onaydan
   * sonra harcanıyor.
   */
  /*
   * VİDEO KREDİSİ — araç kullanım hakkından ayrı cüzdan.
   * 1 kredi = 1 sahne (8 sn klip). Bakiye burada gösteriliyor ki kullanıcı
   * üretime kalkışmadan önce yetip yetmediğini bilsin.
   */
  const { data: krediBilgi } = useQuery<{ bakiye: number; sinirsiz: boolean }>({
    queryKey: ['video-kredi'],
    queryFn: () =>
      api.get('/video-credits/me').then((r) => r.data?.data ?? r.data),
  })
  const bakiye   = krediBilgi?.bakiye ?? 0
  /** Yönetici sahne planındaki İngilizce Veo tarifini açık görür (kalite denetimi). */
  const yonetici = useAuthStore((s) => s.user?.isAdmin ?? false)
  const sinirsiz = krediBilgi?.sinirsiz ?? false

  /*
   * HER SENARYONUN PLANI EKRANDA KALIR (12 Eyl 2026, Özden'in isteği).
   * Eskiden tek bir plan tutuluyordu; ikinci senaryo için plan üretilince
   * birincisi kayboluyordu ve kullanıcı ikisini karşılaştıramıyordu. Artık
   * plan kart SIRASINA göre saklanıyor, beğendiğini seçip onu ürettiriyor.
   */
  const [planlar,     setPlanlar]     = useState<Record<number, PlanSahnesi[]>>({})
  const [planYukleniyorIndex, setPlanYukleniyorIndex] = useState<number | null>(null)
  /*
   * Videoyu ÜRETEN kartın sırası. `videoIndex` üretim bitince null'a dönüyor;
   * video yine de kendi senaryosunun altında kalmalı.
   */
  const [uretilenIndex, setUretilenIndex] = useState<number | null>(null)
  const yoklamaRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const yoklamayiDurdur = useCallback(() => {
    if (yoklamaRef.current) {
      clearInterval(yoklamaRef.current)
      yoklamaRef.current = null
    }
  }, [])

  useEffect(() => yoklamayiDurdur, [yoklamayiDurdur])

  /*
   * ESKİ SENARYONUN PLANINI VE VİDEO DURUMUNU TEMİZLE.
   * Planlar kart SIRASINA göre saklanıyor (planlar[i]). Yeni senaryolar gelince
   * temizlenmezse eski plan yeni 1. kartın altında kalıyordu ve "3 sahnenin
   * hepsi"ne basan kullanıcı YENİ senaryo için ESKİ planın videosunu üretip
   * kredi harcıyordu
   * (11 Eyl 2026, Allianz denemesi). Süren bir üretim sunucuda devam eder;
   * sonucu Geçmiş Çıktılar'a düşer — burada yalnızca ekran yoklaması durur.
   */
  const planiSifirla = useCallback(() => {
    yoklamayiDurdur()
    setPlanlar({})
    setPlanYukleniyorIndex(null)
    setUretilenIndex(null)
    setVideoIndex(null)
    setVideoDurum('')
    setVideoUrl2(null)
    setVideoHata(null)
  }, [yoklamayiDurdur])

  /** 1. ADIM — ücretsiz: sahne planını üret ve göster. */
  const planUret = async (uyarlama: SektoreOzguUyarlama, index: number) => {
    if (planYukleniyorIndex !== null || videoIndex !== null) return
    setVideoUrl2(null)
    setVideoHata(null)
    setPlanYukleniyorIndex(index)
    try {
      const r = await api.post<{ sahneler?: PlanSahnesi[]; error?: string }>(
        '/tools/video-uret/run',
        {
          senaryo:      uyarlama.senaryo_taslagi,
          hook:         uyarlama.hook,
          dorukAn:      uyarlama.doruk_an_karsiligi,
          gorselNotlar: result?.gorsel_notlar,
          sektor:       uyarlama.sektor,
          isletme:      bizName || undefined,
          sahneSayisi:  3,
        },
      )
      const sahneler = r.data.sahneler
      if (!sahneler?.length) throw new Error(r.data.error || 'Sahne planı üretilemedi')
      setPlanlar((onceki) => ({ ...onceki, [index]: sahneler }))
    } catch (e) {
      setVideoHata(e instanceof Error ? e.message : 'Sahne planı üretilemedi.')
    } finally {
      setPlanYukleniyorIndex(null)
    }
  }

  /** 2. ADIM — ücretli: onaylanan sahneleri videoya çevir. */
  const videoUret = async (kacSahne: number, index: number) => {
    const plan = planlar[index]
    if (!plan || videoIndex !== null) return
    const secilen = plan.slice(0, kacSahne)
    setVideoIndex(index)
    setUretilenIndex(index)
    setVideoHata(null)
    setVideoDurum('başlıyor')
    try {
      /*
        `hook` ÜRETİM İSTEĞİNDE DE GÖNDERİLMELİ.
        Medya servisi hook cümlesini videonun üstüne basıyor (ffmpeg drawtext).
        Plan adımında gönderiliyordu ama üretim adımında unutulmuştu; n8n
        `body.hook` boş okuyunca metin hiç basılmadı (10 Eyl 2026).
      */
      const uyarlama = result?.sektore_ozgu_uyarlamalar?.[index]
      const baslat = await api.post<{ isId?: string; jobId?: string; error?: string }>(
        '/tools/video-uret/run',
        {
          sahneler: secilen,
          hook: uyarlama?.hook || undefined,
          // Kapanış çağrısı videonun sonuna yazı olarak basılıyor
          cta:  uyarlama?.cta  || undefined,
        },
      )
      const isId = baslat.data.isId ?? baslat.data.jobId
      if (!isId) throw new Error(baslat.data.error || 'Üretim başlatılamadı')
      // Kredi düşüldü — bakiyeyi tazele
      void queryClient.invalidateQueries({ queryKey: ['video-kredi'] })

      let deneme = 0
      yoklamaRef.current = setInterval(async () => {
        deneme++
        if (deneme > 60) {   // 8 sn × 60 = 8 dakika
          yoklamayiDurdur(); setVideoIndex(null)
          setVideoHata('Video 8 dakikada tamamlanmadı. Üretim sürüyor olabilir.')
          return
        }
        try {
          const d = await api.get<{ status: string; videoUrl?: string; ilerleme?: string; error?: string }>(
            `/tools/video-uret/status/${isId}`,
          )
          if (d.data.status === 'completed') {
            yoklamayiDurdur(); setVideoIndex(null)
            setVideoUrl2(d.data.videoUrl ?? null)
            void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
          } else if (d.data.status === 'error') {
            yoklamayiDurdur(); setVideoIndex(null)
            setVideoHata(d.data.error ?? 'Video üretilemedi.')
          } else if (d.data.ilerleme) {
            setVideoDurum(d.data.ilerleme)
          }
        } catch { /* geçici ağ hatası */ }
      }, 8000)
    } catch (e) {
      setVideoIndex(null)
      /*
       * Backend yetersiz kredide 402 + açıklayıcı mesaj dönüyor.
       * Axios'un kendi mesajı ("Request failed with status code 402")
       * kullanıcıya hiçbir şey anlatmıyor; sunucunun mesajını gösteriyoruz.
       */
      const sunucuMesaji = (e as { response?: { data?: { error?: string } } })
        ?.response?.data?.error
      setVideoHata(
        sunucuMesaji
        ?? (e instanceof Error ? e.message : 'Video üretimi başlatılamadı.'),
      )
      void queryClient.invalidateQueries({ queryKey: ['video-kredi'] })
    }
  }

  const [fromTrend,     setFromTrend]     = useState(false)

  // İşletme profilinden ön dolgu — boş alanlar doldurulur, kullanıcının
  // yazdığına dokunulmaz (bkz. useProfilOnDolgu).
  useProfilOnDolgu({
    businessName: [bizName, setBizName],
    sector: [sector, setSector],
    website: [bizUrl, setBizUrl],
    productService: [hizmetler, setHizmetler],
  })

  /*
   * Yazılanlar tarayıcıda saklanır — sayfa yenilenirse kaybolmasın.
   * Profil ön dolgusu yalnızca BOŞ alanları doldurduğu için, burada geri
   * yüklenen değerler korunur.
   */
  useFormOtomatikKayit(
    'video-olusturma',
    { videoUrl, videoDesc, bizName, sector, bizUrl, tones, extra, hizmetler },
    (k) => {
      if (typeof k.videoUrl  === 'string') setVideoUrl(k.videoUrl)
      if (typeof k.videoDesc === 'string') setVideoDesc(k.videoDesc)
      if (typeof k.bizName   === 'string') setBizName(k.bizName)
      if (typeof k.sector    === 'string') setSector(k.sector)
      if (typeof k.bizUrl    === 'string') setBizUrl(k.bizUrl)
      if (typeof k.extra     === 'string') setExtra(k.extra)
      if (typeof k.hizmetler === 'string') setHizmetler(k.hizmetler)
      if (Array.isArray(k.tones))          setTones(k.tones as string[])
    },
  )

  /*
   * SON ÇIKTIYI GERİ GETİR — sayfa açıldığında en son üretilen senaryolar gelir.
   *
   * NEDEN: Senaryo üretmek para yakıyor (Gemini videoyu izliyor). Kullanıcı
   * sayfadan çıkıp geri geldiğinde çıktı kayboluyordu ve elindeki tek yol
   * aracı YENİDEN çalıştırmaktı — hem ücret hem de model bu sefer bambaşka
   * üç senaryo üretiyordu.
   *
   * Artık en son çıktı duruyor; kullanıcı "Uyarlama Fikirlerini Üret"e basana
   * kadar değişmiyor. Bastığında yeni sonuç eskisinin yerini alıyor.
   *
   * ?sonuc= parametresi varsa BU ÇALIŞMAZ — o durumda kullanıcı Geçmiş
   * Çıktılar'dan belirli bir kaydı açmak istiyordur, en sonuncuyu değil.
   */
  useEffect(() => {
    if (searchParams.get('sonuc')) return

    let iptal = false
    ;(async () => {
      try {
        const r = await api.get('/tools/video-olusturma/last-result')
        const kayit = r.data?.data ?? r.data
        const ham = JSON.parse(kayit.outputJson)
        const veri = Array.isArray(ham) && ham.length === 1 ? ham[0] : ham
        // setResult(prev => ...): kullanıcı bu sırada aracı çalıştırdıysa
        // taze sonucun üstüne ESKİSİNİ yazmamalıyız.
        if (!iptal && veri?.sektore_ozgu_uyarlamalar) {
          setResult((onceki) => {
            if (onceki) return onceki
            setEskiSonuc(true)
            return veri as ViralVideoResult
          })
        }
      } catch {
        /* henüz sonuç yok (404) — form boş açılır, normal durum */
      }
    })()

    return () => { iptal = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // URL parametrelerinden form doldur (Trend Video Bulucu entegrasyonu)
  /*
   * KAYITLI SONUCU GERİ YÜKLE — ?sonuc=<resultId>
   *
   * Araç üç senaryo üretiyor, kullanıcı birini videoya çeviriyor. Sonradan
   * diğerini de istediğinde eskiden formu baştan doldurup ARACI YENİDEN
   * ÇALIŞTIRMASI gerekiyordu: hem kullanım hakkı yanıyor hem model bu sefer
   * bambaşka üç senaryo üretiyordu — beğendiği senaryo geri gelmiyordu.
   *
   * Artık Geçmiş Çıktılar'daki kayıttan buraya dönülüyor; kartlar aynen
   * geliyor ve "Sahne planını gör → Videoyu üret" akışı normal işliyor.
   */
  useEffect(() => {
    const sonucId = searchParams.get('sonuc')
    if (!sonucId) return

    let iptal = false
    ;(async () => {
      try {
        const r = await api.get(`/tools/results/${sonucId}`)
        const kayit = r.data?.data ?? r.data
        const ham = JSON.parse(kayit.outputJson)
        const veri = Array.isArray(ham) && ham.length === 1 ? ham[0] : ham
        if (!iptal && veri?.sektore_ozgu_uyarlamalar) {
          // Kaynak video linki kayıtta tutulmuyor; kaynak kartı boş kalsın —
          // yanlış bir link göstermektense hiç göstermemek doğru.
          setResult(veri as ViralVideoResult)
          setEskiSonuc(true)
        }
      } catch {
        if (!iptal) setVideoHata('Kayıtlı senaryo yüklenemedi.')
      }
    })()

    return () => { iptal = true }
  }, [searchParams])

  useEffect(() => {
    const urlParam    = searchParams.get('url')
    const descParam   = searchParams.get('desc')
    const sectorParam = searchParams.get('sector')
    const bizParam    = searchParams.get('biz')
    const bizUrlParam = searchParams.get('bizUrl')
    const tonesParam  = searchParams.get('tones')
    const extraParam  = searchParams.get('extra')

    if (urlParam)    setVideoUrl(urlParam)
    if (descParam)   setVideoDesc(descParam.slice(0, 500))
    if (bizParam)    setBizName(bizParam)
    if (bizUrlParam) setBizUrl(bizUrlParam)
    if (extraParam)  setExtra(extraParam)

    if (sectorParam) {
      // 1. Tam eşleşme (TrendVideoPage sektör değerleri birebir aynı olmalı)
      // 2. İlk kelime eşleşmesi — geriye dönük uyumluluk için
      const exact   = SEKTORLER.find((s) => s === sectorParam)
      const partial = SEKTORLER.find((s) => s.startsWith(sectorParam.split('/')[0].trim()))
      const match   = exact ?? partial
      if (match) setSector(match)
    }

    if (tonesParam) {
      // "Eğlenceli / Komik,Bilgilendirici" → ['Eğlenceli / Komik', 'Bilgilendirici']
      // Sadece TONLAR listesindeki geçerli değerleri kabul et
      const incoming = tonesParam.split(',').map((t) => t.trim()).filter(Boolean)
      const valid    = incoming.filter((t) => TONLAR.includes(t))
      if (valid.length > 0) setTones(valid)
    }

    if (urlParam || descParam) setFromTrend(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTone = (t: string) =>
    setTones((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const mutation = useMutation<ViralVideoResult>({
    mutationFn: async () => {
      const res = await api.post<ViralVideoResult>('/tools/video-olusturma/run', {
        isletmeAdi: bizName,
        videoUrl,
        videoDesc,
        sector,
        biz:    bizName || undefined,
        bizUrl: bizUrl  || undefined,
        tones,
        note:      extra     || undefined,
        hizmetler: hizmetler || undefined,
      })
      return res.data
    },
    onSuccess: (data) => {
      planiSifirla()
      setResult(data)
      setEskiSonuc(false)
      setResultUrl(videoUrl)
      void queryClient.invalidateQueries({ queryKey: ['tool-usage'] })
    },
  })

  // Bekleme sirasinda gecen sureyi gosterir (sabit mesaj donmus hissi veriyordu)
  const elapsedSec = useElapsedSeconds(mutation.isPending)

  // videoDesc ARTIK ZORUNLU DEĞİL — n8n'deki Video Scrape düğümü linki açıp
  // başlığı, hashtagleri, müziği ve istatistikleri kendisi çekiyor. Kullanıcı
  // isterse ekleme yapar; boş bırakırsa akış gerçek video verisiyle çalışır.
  const canSubmit = videoUrl.trim() && sector && !mutation.isPending

  return (
    <ToolShell
      toolId="video-olusturma"
      title="Video Oluşturma"
      icon="🎥"
      description="Bir video linki yapıştır. Yapay zeka videoyu çözümleyip işletmene özel senaryo üretir; sonrasında gerçek video üretimine bağlanacak."
      hasResult={!!result}
      formHasInput={!!videoUrl.trim()}
      isPending={mutation.isPending}
    >
      {({ isFormOpen, header, rateBar }) => (
        <>
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-[#E2E0D8] p-8 mb-6">
              <div className="flex flex-col gap-5">
                {header}

                {/* Trend Video Bulucu'dan aktar bildirimi */}
                {fromTrend && (
                  <div className="flex items-center gap-2 bg-[#F0FAF6] border border-[#9FE1CB] rounded-lg px-4 py-2.5 text-[12.5px] text-[#085041]">
                    📈 Trend Video Bulucu'dan aktarıldı. Alanları kontrol edip uyarla butonuna basın.
                  </div>
                )}

                <Input
                  label="Video Linki *"
                  placeholder="YouTube, TikTok veya Instagram linki"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  type="url"
                />


                <Textarea
                  label="Video Ne Hakkında? (isteğe bağlı — boş bırakırsanız videodan okunur)"
                  placeholder="Videonun konusunu kısaca açıkla. Örn: Bir penguen tuhaf şekilde yürüyor, üzerine komik müzik eklenmiş ve sonunda bir iş yerinde çalışıyormuş gibi sahne geliyor."
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  rows={3}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="İşletme Adı"
                    placeholder="Logvance Lojistik"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                  <AramaliSecici
                    label="Sektör *"
                    value={sector}
                    onChange={setSector}
                    secenekler={SEKTORLER}
                  />
                </div>

                <Input
                  label="Firma Web Sitesi (isteğe bağlı — daha kişisel senaryo için)"
                  placeholder="https://logvance.com.tr"
                  value={bizUrl}
                  onChange={(e) => setBizUrl(e.target.value)}
                  type="url"
                />

                <div>
                  <p className="text-sm font-medium text-[#6B6963] mb-2">Video Tonu</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TONLAR.map((t) => (
                      <label
                        key={t}
                        className={`flex items-center gap-2 px-[11px] py-[9px] border-[0.5px] rounded-lg cursor-pointer text-[13px] select-none transition-colors ${
                          tones.includes(t)
                            ? 'border-[#1D9E75] bg-[#F0FAF6] text-[#085041]'
                            : 'border-[#D3D1C7] bg-white text-[#1C1B19] hover:border-[#B4B2A9]'
                        }`}
                      >
                        <input type="checkbox" className="w-auto" checked={tones.includes(t)} onChange={() => toggleTone(t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>

                {/*
                  HİZMET METNİ — uydurmaya karşı en güçlü savunma.

                  Model senaryoyu firmanın gerçek hizmetine dayandırmak
                  zorunda. Web sitesinden çekilen metin çoğu KOBİ'de menü ve
                  slogandan ibaret oluyor; modelin "AI otomasyon" gibi genel
                  bir ifadeden "tek tıkla fatura kesme" uydurmasının sebebi
                  buydu (8 Eyl 2026). Kullanıcının kendi yazdığı metin en
                  güvenilir kaynak, o yüzden İşletme Bilgilerim'den ön dolu
                  geliyor.
                */}
                <Textarea
                  label="Sunduğunuz hizmet / ürün"
                  placeholder="Örn: KOBİ'lere aylık muhasebe, vergi beyannamesi ve e-fatura hizmetleri."
                  value={hizmetler}
                  onChange={(e) => setHizmetler(e.target.value)}
                  rows={3}
                />
                <p className="-mt-2 text-[11.5px] text-[#9A9792] leading-relaxed">
                  Boş bırakırsanız web sitenizden çıkarılmaya çalışılır. Sitede
                  net bilgi yoksa senaryolar ürün iddiası içermez.
                </p>

                {/*
                  Eski adı "Ek Not (isteğe bağlı)" idi ve ne yazılacağı belirsizdi;
                  kullanıcılar boş bırakıyor, model de tanıtılacak hizmeti
                  kendi uyduruyordu. Alan artık tek bir şey soruyor.
                */}
                <Textarea
                  label="Bu video hangi hizmet veya ürününüz için?"
                  placeholder="Bu videoda tanıtmak istediğiniz hizmet veya ürünü yazın. Örn: yeni açılan e-fatura danışmanlığı. Boş bırakırsanız yukarıdaki hizmet listesinden seçilir."
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={2}
                />

                <FormPersistButtons
                  filename="video-olusturma-formu.json"
                  getData={() => ({ videoUrl, videoDesc, bizName, sector, bizUrl, tones, extra, hizmetler })}
                  onLoad={(d) => {
                    if (typeof d.videoUrl  === 'string') setVideoUrl(d.videoUrl)
                    if (typeof d.videoDesc === 'string') setVideoDesc(d.videoDesc)
                    if (typeof d.bizName   === 'string') setBizName(d.bizName)
                    if (typeof d.sector    === 'string') setSector(d.sector)
                    if (typeof d.bizUrl    === 'string') setBizUrl(d.bizUrl)
                    if (Array.isArray(d.tones))          setTones(d.tones as string[])
                    if (typeof d.extra     === 'string') setExtra(d.extra)
                    if (typeof d.hizmetler === 'string') setHizmetler(d.hizmetler)
                  }}
                />
                {rateBar}

                {mutation.isError && (
                  <p className="text-[13px] text-[#A32D2D] bg-[#FCEBEB] rounded-xl px-4 py-3">
                    ⚠️ {(mutation.error as Error)?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.'}
                  </p>
                )}

                <Button
                  onClick={() => { planiSifirla(); setResult(null); setResultUrl(''); mutation.mutate() }}
                  disabled={!canSubmit}
                  loading={mutation.isPending}
                  className="mt-1 w-full"
                >
                  🎬 Uyarlama Fikirlerini Üret
                </Button>

                {mutation.isPending && (
                  <p className="text-center text-[13px] text-[#9A9792] animate-pulse">
                    Format analiz ediliyor, uyarlama fikirleri üretiliyor — {elapsedSec} sn geçti
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Sonuçlar ── */}
          {result && (
            <div className="flex flex-col gap-4">

              {/*
                Bu sonuç bu oturumda üretilmedi — kayıttan geldi. Belirtmezsek
                kullanıcı az önce üretilmiş sanıp neden aynı senaryoların
                geldiğini anlamıyor.
              */}
              {eskiSonuc && (
                <div className="bg-[#F7F6F2] border border-[#E2E0D8] rounded-xl px-4 py-3">
                  <p className="text-[12.5px] text-[#3A3935]">
                    📄 <strong>Önceki çalıştırmanızın sonucu.</strong> Senaryoları
                    videoya çevirmeye buradan devam edebilirsiniz. Yeni fikirler
                    isterseniz formu güncelleyip <em>Uyarlama Fikirlerini Üret</em>'e
                    basın — bu sonucun yerini alır.
                  </p>
                </div>
              )}

              {/* Kaynak kart + format analizi */}
              <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#F0FAF6] flex items-center justify-center text-lg shrink-0">🎬</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">Kaynak Video</p>
                  <p className="text-[13px] text-[#1C1B19] break-all mb-2">{resultUrl || videoUrl}</p>

                  {/* Format analizi — tüm format_* alanlarını satır satır yazar */}
                  {(() => {
                    const lines: string[] = []
                    if (result.format_adi)         lines.push('📌 ' + result.format_adi)
                    if (result.format_tipi)        lines.push('Tür: ' + result.format_tipi)
                    if (result.format_aciklamasi)  lines.push(result.format_aciklamasi)
                    if (result.kurgu_yapisi)       lines.push('🎬 Kurgu: ' + result.kurgu_yapisi)
                    if (result.ornek_hook)         lines.push('🪝 Örnek Hook: ' + result.ornek_hook)
                    const meta = [
                      result.sure,
                      result.uretim_zorlugu ? 'Üretim: ' + result.uretim_zorlugu : '',
                      result.marka_guvenligi ? 'Marka: ' + result.marka_guvenligi : '',
                    ].filter(Boolean).join(' · ')
                    if (meta) lines.push(meta)
                    if (lines.length === 0) return null
                    return (
                      <div className="border-t border-[#F1EFE8] pt-2 text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">
                        {lines.join('\n')}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/*
                Doruk an — formatın MOTORU. En üstte ve vurgulu duruyor çünkü
                uyarlamanın doğru olup olmadığı buradan anlaşılıyor: bu an
                korunmamışsa senaryo iskelet olarak doğru, işlev olarak ölü.
              */}
              {result.doruk_an && (
                <div className="bg-[#FFF9EC] rounded-2xl border border-[#F0DCA8] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A6A1F] mb-1.5">
                    ⚡ Doruk An — formatın işleyen kısmı
                  </p>
                  <p className="text-[13px] text-[#4A3B14] leading-relaxed whitespace-pre-wrap">{result.doruk_an}</p>
                </div>
              )}

              {/* Neden tuttu · kim oynuyor · korunacak öğe */}
              {(result.neden_tuttu || result.kim_oynuyor || result.uyarlamada_korunacak) && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 flex flex-col gap-3.5">
                  {result.neden_tuttu && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">🔥 Neden tuttu</p>
                      <p className="text-[13px] text-[#444441] leading-relaxed">{result.neden_tuttu}</p>
                    </div>
                  )}
                  {result.kim_oynuyor && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">👥 Kim oynuyor</p>
                      <p className="text-[13px] text-[#444441] leading-relaxed">{result.kim_oynuyor}</p>
                    </div>
                  )}
                  {result.uyarlamada_korunacak && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">🔒 Uyarlamada korunacak</p>
                      <p className="text-[13px] text-[#444441] leading-relaxed">{result.uyarlamada_korunacak}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Görsel notlar — Veo'ya verilecek tarif buradan çıkacak */}
              {result.gorsel_notlar && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">🎥 Görsel notlar</p>
                  <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">{result.gorsel_notlar}</p>
                </div>
              )}

              {/*
                Telif uyarısı. "yok" dönerse gösterilmiyor — sadece gerçek risk
                varken çıkıyor ki uyarı körlüğü oluşmasın.
              */}
              {result.telif_riski && !/^\s*(yok|yoktur|hayır|none)\s*\.?\s*$/i.test(result.telif_riski) && (
                <div className="bg-[#FDF2F2] rounded-2xl border border-[#F3C4C4] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9B2C2C] mb-1.5">⚠️ Telif riski</p>
                  <p className="text-[13px] text-[#7A2222] leading-relaxed whitespace-pre-wrap">{result.telif_riski}</p>

                  {/*
                    Telif uyarısına uymak bazen formatı ÖLDÜRÜYOR: kaynak
                    videonun çekim gücü izleyicinin o filmi tanımasından
                    geliyorsa, telifsiz stok görüntüyle değiştirince geriye
                    sebepsiz bir sahne kalıyor (8 Eyl 2026, Finding Dory
                    dublaj formatı). Kullanıcı bunu ÜRETİMDEN ÖNCE bilmeli.
                  */}
                  {result.telifsiz_calisir_mi &&
                   !/^\s*evet/i.test(result.telifsiz_calisir_mi) && (
                    <div className="mt-3 pt-3 border-t border-[#F3C4C4]">
                      <p className="text-[12px] font-semibold text-[#9B2C2C] mb-1">
                        Telifli öğe çıkarılırsa format çalışır mı?
                      </p>
                      <p className="text-[12.5px] text-[#7A2222] leading-relaxed whitespace-pre-wrap">
                        {result.telifsiz_calisir_mi}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/*
                Rol dağılımı — izleyici işletme sahibinin kendisi. Onu şaşıran
                ve düzeltilen tarafa koyan bir senaryo küçümseyici oluyor ve
                satmıyor. Model bunu açıkça beyan etsin ki kullanıcı denetlesin.
              */}
              {result.rol_dagilimi && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">
                    🎭 Rol dağılımı
                  </p>
                  <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">
                    {result.rol_dagilimi}
                  </p>
                  <p className="text-[11px] text-[#9A9792] mt-2">
                    İşletme sahibi şaşıran veya düzeltilen taraftaysa senaryoyu kullanmayın —
                    videoyu izleyecek kişi odur.
                  </p>
                </div>
              )}

              {/*
                Dayanak — senaryodaki ürün iddiası neye dayanıyor.
                "iddia yok" dediğinde sakin, somut bir kaynak gösterdiğinde
                de sakin; asıl amaç kullanıcının UYDURMAYI görebilmesi.
              */}
              {/*
                Modelin firmanın hizmeti olarak NE ANLADIĞI. "bulunamadı"
                diyorsa senaryolar ürün iddiası içermiyor demektir ve
                kullanıcının hizmet alanını doldurması gerekir — asıl çözüm bu.
              */}
              {result.firma_hizmetleri && (
                <div className={`rounded-2xl border p-5 ${
                  result.firma_hizmetleri.includes('bulunamadı')
                    ? 'bg-[#FFF9E8] border-[#F0DFA8]'
                    : 'bg-white border-[#E2E0D8]'
                }`}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">
                    🏷️ Senaryoların dayandığı hizmetler
                  </p>
                  <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">
                    {result.firma_hizmetleri}
                  </p>
                  {result.sektor_notu && result.sektor_notu !== 'uyumlu' && (
                    <p className="text-[12px] text-[#7A5C10] mt-2">⚠️ Sektör notu: {result.sektor_notu}</p>
                  )}
                </div>
              )}

              {result.dayanak && (
                <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963] mb-1">
                    🔗 Ürün iddiasının dayanağı
                  </p>
                  <p className="text-[13px] text-[#444441] leading-relaxed whitespace-pre-wrap">{result.dayanak}</p>
                  <p className="text-[11px] text-[#9A9792] mt-2">
                    Burada tanımadığınız bir özellik yazıyorsa senaryo uydurulmuş demektir — videoya çevirmeyin.
                  </p>
                </div>
              )}

              {/* Uyarlama kartları */}
              {result.sektore_ozgu_uyarlamalar?.map((u, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F1EFE8]">
                    <div className="w-[30px] h-[30px] rounded-full bg-[#1D9E75] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    {/*
                      Kartlar eskiden 3 FARKLI SEKTÖR gösteriyordu; firma zaten
                      kendi sektöründe olduğu için diğer ikisi işe yaramıyordu
                      ve model tanımadığı sektörler için uydurmaya zorlanıyordu.
                      Artık üçü de aynı firmaya ait FARKLI YAKLAŞIMLAR.
                    */}
                    <div className="min-w-0">
                      <span className="text-[14px] font-medium text-[#1C1B19] block truncate">
                        {u.yaklasim || u.sektor}
                      </span>
                      {u.dayanak_hizmet && (
                        <span className="text-[11.5px] text-[#6B6963] block truncate">
                          Dayanak: {u.dayanak_hizmet}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col gap-3">
                    {/* Hook */}
                    {u.hook && (
                      <div className="bg-[#FFF8ED] border border-[#F2D8A0] rounded-lg px-3 py-2.5">
                        <p className="text-[12px] font-semibold text-[#633806] mb-1">🪝 Hook</p>
                        <p className="text-[13px] text-[#1C1B19]">{u.hook}</p>
                      </div>
                    )}

                    {/* Senaryo — WhatsApp balonu */}
                    {u.senaryo_taslagi && (
                      <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-[13px] text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
                        <div
                          className="absolute w-0 h-0"
                          style={{
                            left: '-8px', top: 0,
                            borderTop: '8px solid #DCF8C6',
                            borderLeft: '8px solid transparent',
                          }}
                        />
                        {u.senaryo_taslagi}
                      </div>
                    )}

                    {/* Doruk anın bu sektördeki karşılığı — uyarlamanın sınavı */}
                    {u.doruk_an_karsiligi && (
                      <div className="flex items-start gap-2 bg-[#FFF9EC] border border-[#F0DCA8] rounded-lg px-3 py-2 text-[12.5px] text-[#4A3B14] leading-relaxed">
                        <span className="shrink-0 mt-px">⚡</span>
                        <span><strong className="text-[#8A6A1F]">Doruk an:</strong> {u.doruk_an_karsiligi}</span>
                      </div>
                    )}

                    {/* CTA */}
                    {u.cta && (
                      <div className="flex items-start gap-2 bg-[#F7F6F2] rounded-lg px-3 py-2 text-[12px] text-[#6B6963]">
                        <span className="text-[#1D9E75] shrink-0 mt-px">▶</span>
                        <span><strong className="text-[#1C1B19]">CTA:</strong> {u.cta}</span>
                      </div>
                    )}

                    {/*
                      İKİ ADIM: önce ücretsiz sahne planı, sonra onaylı üretim.
                      Para yalnızca kullanıcı planı görüp onayladıktan sonra
                      harcanıyor (bkz. planUret / videoUret).
                    */}
                    {/*
                      `no-print` BU SARMALAYICIDAN KALDIRILDI (9 Eyl 2026).
                      Tüm blok yazdırmadan gizlendiği için sahne planı PDF/çıktıda
                      hiç görünmüyordu — oysa çekim ekibine verilecek asıl belge o.
                      Artık yalnızca düğmeler gizleniyor, plan metni basılıyor.
                    */}
                    <div className="pt-1 flex flex-col gap-2.5">
                      {!planlar[i] && videoIndex !== i && (
                        <button
                          type="button"
                          onClick={() => void planUret(u, i)}
                          disabled={planYukleniyorIndex !== null || videoIndex !== null}
                          className="no-print self-start inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#9FE1CB] bg-white text-[12.5px] font-medium text-[#085041] hover:bg-[#F0FAF6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          🎬 Sahne planını gör <span className="text-[#6B6963] font-normal">· ücretsiz</span>
                        </button>
                      )}

                      {planYukleniyorIndex === i && (
                        <div className="no-print flex items-center gap-2.5 text-[12.5px] text-[#6B6963]">
                          <span className="w-3.5 h-3.5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
                          Sahne planı hazırlanıyor…
                        </div>
                      )}

                      {/* Plan onaya sunuluyor */}
                      {/*
                        Üretim sırasında da GÖRÜNÜR kalır.
                        Eskiden `videoIndex === null` koşulu vardı ve üretim
                        başlar başlamaz plan kayboluyordu; kullanıcı 2-5 dakika
                        boyunca onayladığı sahneleri göremiyordu (10 Eyl 2026).
                        Artık yalnızca eylem düğmeleri gizleniyor.
                      */}
                      {planlar[i] && (
                        <div className="bg-[#FBFAF7] border border-[#E2E0D8] rounded-xl p-4 flex flex-col gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6963]">
                            Sahne planı — onaylamadan önce okuyun
                          </p>

                          {planlar[i].map((sh) => (
                            <div key={sh.sira} className="border-l-2 border-[#9FE1CB] pl-3">
                              <p className="text-[12.5px] text-[#1C1B19]">
                                <strong>{sh.sira}.</strong> {sh.aciklama}
                                {!sh.zincirle && sh.sira > 1 && (
                                  <span className="ml-1.5 text-[10.5px] text-[#9A9792]">· kesme</span>
                                )}
                              </p>
                              {/*
                                Replik ekranda GÖRÜNMELİ: yeni hatta konuşma Veo'dan değil
                                seslendirmeden geliyor. Replik boşsa video sessiz çıkar —
                                kullanıcı bunu onaylamadan önce görebilmeli (11 Eyl 2026).
                              */}
                              {sh.replik ? (
                                <p className="text-[12.5px] text-[#085041] bg-[#F0FAF6] rounded-md px-2 py-1 mt-1">
                                  🗣️ <span className="text-[#6B6963]">{sh.konusanEtiket || KONUSAN_ETIKET[sh.konusan ?? ''] || sh.konusan || 'Konuşan'}:</span>{' '}
                                  <strong>{sh.replik}</strong>
                                </p>
                              ) : (
                                <p className="text-[11.5px] text-[#9A9792] mt-1">🔇 Bu sahnede konuşma yok</p>
                              )}
                              {sh.efekt === 'zil' && (
                                <p className="text-[11.5px] text-[#6B6963] mt-0.5">🔔 Kapı zili</p>
                              )}
                              {/*
                                İNGİLİZCE TARİF MÜŞTERİYE AÇIK GELMİYOR (11 Eyl 2026: "KOBİ'ler
                                nasıl anlayacak?"). Konuşmalar artık 🗣️ satırında Türkçe; bu
                                metin yalnızca video motoruna giden görüntü tarifi. Yöneticiye
                                açık gelir (kalite denetimi, destek); müşteri isterse açabilir.
                                Kapalıyken PDF çıktısına da girmez.
                              */}
                              <details open={yonetici} className="mt-1">
                                <summary className="text-[10.5px] text-[#9A9792] cursor-pointer select-none hover:text-[#6B6963]">
                                  Teknik ayrıntı — video motoruna giden İngilizce tarif
                                </summary>
                                <p className="text-[11px] text-[#6B6963] leading-relaxed mt-1 font-mono">
                                  {sh.prompt}
                                </p>
                              </details>
                            </div>
                          ))}

                          <p className="text-[11.5px] text-[#7A5E12] bg-[#FFF9EC] border border-[#F0DCA8] rounded-lg px-3 py-2">
                            ⚠️ Konuşmalarda (🗣️) işletmenizde olmayan bir hizmetten ya da
                            özellikten söz ediliyorsa üretmeyin — "Ek Not" alanına doğrusunu
                            yazıp senaryoyu yeniden üretin.
                          </p>

                          {/*
                            ÜRETİM SONRASI DÜĞMELER KAYBOLUR.
                            Eskiden video bittikten sonra düğmeler geri geliyordu ve
                            "3 sahnenin hepsi"ne basan kullanıcı 1. sahnenin parasını
                            İKİNCİ KEZ ödüyordu (üretim baştan başlıyor, kısmi ekleme
                            yok). 1 kredi + 3 kredi = 4 kredi, oysa elde 3 klip var (9 Eyl 2026'da
                            bildirildi).
                            Yeniden üretim artık bilinçli bir tıklama gerektiriyor.
                          */}
                          {videoIndex !== null ? null : videoUrl2 ? (
                            <div className="no-print bg-[#FFF9EC] border border-[#F0DCA8] rounded-lg px-3.5 py-3">
                              <p className="text-[12.5px] text-[#7A5E12] leading-relaxed">
                                Bu senaryo için video üretildi (aşağıda). Daha fazla sahne
                                istiyorsanız <strong>tamamı yeniden üretilir</strong> — üretilen
                                sahne saklanıp üzerine eklenemiyor, yani ilk sahnenin kredisi
                                tekrar harcanır.
                              </p>
                              <button
                                type="button"
                                onClick={() => { setVideoUrl2(null); setVideoHata(null) }}
                                className="mt-2 text-[12px] text-[#7A5E12] underline hover:no-underline"
                              >
                                Yine de yeniden üretmek istiyorum
                              </button>
                            </div>
                          ) : (
                            <div className="no-print flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void videoUret(1, i)}
                                disabled={!sinirsiz && bakiye < 1}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E0D8] bg-white text-[12.5px] font-medium text-[#1C1B19] hover:bg-[#F7F6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                Yalnızca 1. sahne <span className="text-[#6B6963] font-normal">· 1 kredi</span>
                              </button>
                              {/*
                                ARA SEÇENEK — yalnızca 3+ sahnede anlamlı.
                                Kural denemelerinde tam videoya para vermeden
                                zincirleme, oynayış tonu ve susan kişinin
                                sahnelenmesi 2 sahneyle görülebiliyor
                                (10 Eyl 2026: her tam tur ~₺93 yakıyordu).
                              */}
                              {planlar[i].length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => void videoUret(2, i)}
                                  disabled={!sinirsiz && bakiye < 2}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2E0D8] bg-white text-[12.5px] font-medium text-[#1C1B19] hover:bg-[#F7F6F2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                  İlk 2 sahne <span className="text-[#6B6963] font-normal">· 2 kredi</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => void videoUret(planlar[i].length, i)}
                                disabled={!sinirsiz && bakiye < planlar[i].length}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1D9E75] text-[12.5px] font-medium text-white hover:bg-[#178A65] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                ✅ {planlar[i].length} sahnenin hepsi <span className="opacity-80 font-normal">· {planlar[i].length} kredi</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPlanlar((onceki) => {
                                  const kalan = { ...onceki }
                                  delete kalan[i]
                                  return kalan
                                })}
                                className="px-3 py-2 text-[12.5px] text-[#6B6963] hover:text-[#1C1B19] transition-colors"
                              >
                                Vazgeç
                              </button>
                            </div>
                          )}

                          {/*
                            "Kredi" kullanıcı için yeni bir birim; karşılığı
                            yazılmazsa düğmedeki sayı anlamsız kalıyor.
                            Ham maliyet (TL) BİLEREK gösterilmiyor — müşteriye
                            tedarikçi maliyetini göstermek marjı ifşa eder ve
                            zaten ödediği şey o değil.
                          */}
                          {!videoUrl2 && (
                            <div className="no-print text-[11.5px] text-[#9A9792] leading-relaxed">
                              <p>
                                1 kredi = 8 saniyelik bir sahne. Krediler video üretimine özeldir,
                                araç kullanım hakkınızdan düşmez.
                              </p>
                              {sinirsiz ? (
                                <p className="text-[#1D9E75] font-medium mt-0.5">
                                  Krediniz sınırsız (yönetici/kurumsal hesap).
                                </p>
                              ) : (
                                <p className={`mt-0.5 font-medium ${bakiye > 0 ? 'text-[#3A3935]' : 'text-[#9B2C2C]'}`}>
                                  Kredi bakiyeniz: {bakiye}
                                  {bakiye < planlar[i].length && bakiye > 0 &&
                                    ` — ${planlar[i].length} sahnenin tamamı için ${planlar[i].length - bakiye} kredi daha gerekiyor.`}
                                  {bakiye === 0 && ' — üretim için kredi yüklemeniz gerekiyor.'}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Üretim sürüyor */}
                      {videoIndex === i && (
                        <div className="flex items-center gap-2.5 bg-[#F0FAF6] border border-[#9FE1CB] rounded-lg px-3.5 py-2.5 text-[12.5px] text-[#085041]">
                          <span className="w-3.5 h-3.5 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin shrink-0" />
                          <span>Video üretiliyor — {videoDurum || 'başlıyor'}</span>
                        </div>
                      )}

                      {/*
                        ÜRETİLEN VİDEO KENDİ SENARYOSUNUN ALTINDA.
                        Eskiden tüm kartların en altında duruyordu; kullanıcı
                        hangi senaryodan üretildiğini anlamıyor, hatta videonun
                        üretildiğini fark etmiyordu (9 Eyl 2026).
                        `uretilenIndex === i` → video bu kartın planından üretildi.
                        (`videoIndex` üretim bitince null'a döndüğü için kullanılamaz.)
                      */}
                      {videoUrl2 && uretilenIndex === i && (
                        <div className="bg-white rounded-xl border border-[#9FE1CB] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#085041] mb-2.5">
                            🎞️ Bu senaryo için üretilen video
                          </p>
                          <VideoCiktisi
                            videoUrl={videoUrl2}
                            olusturmaTarihi={new Date().toISOString()}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {videoHata && (
                <div className="bg-[#FDF2F2] rounded-2xl border border-[#F3C4C4] p-4 text-[13px] text-[#7A2222]">
                  ⚠️ {videoHata}
                </div>
              )}

              {result.uygulama_ipuclari && (
                <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5 flex items-start gap-3">
                  <span className="text-lg shrink-0">💡</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[#085041] mb-1">Uygulama İpuçları</p>
                    <p className="text-[13px] text-[#0F6E56] leading-relaxed">{result.uygulama_ipuclari}</p>
                  </div>
                </div>
              )}

              {/* CTA kutusu */}
              <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-6 text-center">
                <p className="text-[15px] font-medium text-[#085041] mb-1">Bu fikirleri düzenli almak ister misin?</p>
                <p className="text-[13px] text-[#0F6E56] mb-4 leading-relaxed">
                  Video Oluşturma'yı her ay düzenli kullanmak ve sosyal medya içeriklerini<br />
                  rakiplerden önce planlamak ister misin?
                </p>
                <a
                  href="https://kolaykobi.com/iletisim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-[#1D9E75] text-white px-6 py-2.5 rounded-lg text-[14px] font-medium hover:bg-[#0F6E56] transition-colors"
                >
                  Ücretsiz Görüşme Ayarla
                </a>
              </div>

            </div>
          )}
        </>
      )}
    </ToolShell>
  )
}
