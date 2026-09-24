/**
 * VİDEO ÇIKTISI — üretilen videoyu oynatır ve indirtir.
 *
 * NEDEN: Geçmiş Çıktılar'da video kaydı açıldığında yalnızca "Video Url:
 * /medya/xxx.mp4" yazan bir satır görünüyordu. Kullanıcı ne izleyebiliyor ne
 * indirebiliyordu — yani ürettiği videoya bir daha ulaşamıyordu (8 Eyl 2026).
 *
 * SAKLAMA UYARISI önemli: dosyalar sunucuda 30 gün duruyor, sonra siliniyor.
 * Kullanıcının bunu indirme kararını verebilmek için BİLMESİ gerekiyor;
 * sessizce silinen bir dosya, kaybolan bir dosyadır.
 */

/** Medya servisinin saklama süresi (medya/sunucu.js · SAKLAMA_SAATI=720). */
const SAKLAMA_GUN = 30

interface Props {
  videoUrl: string
  klipSayisi?: number
  bayt?: number
  /** Kaydın oluşturulma tarihi — kalan süreyi hesaplamak için. */
  olusturmaTarihi?: string
}

function boyutYazisi(bayt?: number): string | null {
  if (!bayt || bayt <= 0) return null
  return `${(bayt / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Dosyanın silinmesine kaç gün kaldığı. Tarih yoksa veya çözümlenemiyorsa
 * null döner — uydurma bir sayı göstermektense hiç göstermemek doğru.
 */
function kalanGun(olusturmaTarihi?: string): number | null {
  if (!olusturmaTarihi) return null
  const t = new Date(olusturmaTarihi).getTime()
  if (Number.isNaN(t)) return null
  const gecen = (Date.now() - t) / (1000 * 60 * 60 * 24)
  return Math.max(0, Math.ceil(SAKLAMA_GUN - gecen))
}

export function VideoCiktisi({ videoUrl, klipSayisi, bayt, olusturmaTarihi }: Props) {
  const boyut = boyutYazisi(bayt)
  const kalan = kalanGun(olusturmaTarihi)
  const suresiDoldu = kalan !== null && kalan <= 0

  const dosyaAdi = videoUrl.split('/').pop() || 'video.mp4'

  return (
    <div className="flex flex-col gap-3">
      {suresiDoldu ? (
        <div className="bg-[#FDF2F2] border border-[#F3C4C4] rounded-xl p-4">
          <p className="text-[13px] font-semibold text-[#9B2C2C] mb-1">
            Bu videonun saklama süresi doldu
          </p>
          <p className="text-[12.5px] text-[#7A2222] leading-relaxed">
            Üretilen videolar sunucuda {SAKLAMA_GUN} gün saklanıyor. Bu dosya
            silinmiş olabilir. Aşağıdaki bağlantı çalışmazsa videoyu yeniden
            üretmeniz gerekir.
          </p>
        </div>
      ) : null}

      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className="w-full max-w-[360px] rounded-xl bg-black border border-[#E2E0D8]"
      >
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>

      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={videoUrl}
          download={dosyaAdi}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white bg-[#1D9E75] hover:bg-[#188560] transition-colors px-3.5 py-2 rounded-lg"
        >
          ⬇ Videoyu indir
        </a>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12.5px] text-[#5A5852] hover:text-[#1C1B19] underline px-1"
        >
          Yeni sekmede aç
        </a>
      </div>

      <p className="text-[11.5px] text-[#9A9792] leading-relaxed">
        {[
          klipSayisi ? `${klipSayisi} sahne` : null,
          boyut,
          kalan !== null && !suresiDoldu
            ? `${kalan} gün sonra silinecek — indirmeniz önerilir`
            : `Videolar ${SAKLAMA_GUN} gün saklanır — indirmeniz önerilir`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
  )
}
