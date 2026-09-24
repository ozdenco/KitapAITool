import { useAuthStore } from '@/store/auth'

/**
 * Blog yazılarının altındaki rehber kutusu.
 *
 * İKİ FARKLI GÖRÜNÜM — okuyucunun durumuna göre:
 *
 *  • Giriş YAPMAMIŞ ziyaretçi → Brevo formu (iframe). Amaç lead toplamak;
 *    e-postasını bırakır, çift onaydan sonra rehberi alır.
 *
 *  • Giriş YAPMIŞ kullanıcı → doğrudan indirme bağlantısı. E-postasını
 *    zaten biliyoruz; tekrar istemek gereksiz sürtünme yaratır ve pazarlama
 *    listesini mevcut müşterilerle kirletir.
 *
 * Uygulamanın blogu herkese açık (App.tsx'te AuthGuard dışında), o yüzden
 * iki durum da gerçekten oluşuyor.
 */

/** Brevo "Rehber Indirme Formu" gömme adresi (form #MUIFAL…). */
const BREVO_FORM_URL =
  'https://1cf9b7a8.sibforms.com/serve/MUIFAL94xRB86aONxz0BelMeD3KoTaGH9yi4blEsHdvR2bQXKd5MscxTIlNewZrWXT9Hhdp6sZSbjmfTtv5LGJYbWB_6lkCuFcswGgV0vkkNNdeu2_JJgthghCMpvy_wcssli6PWjNcT1nUdidEjFagUYDezbDYY0H0I3cfiQ-I_GNMaog3oH7OrB7sj84SEG-yHV_B60ol9Lk3vQg=='

const PDF_URL =
  'https://kolaykobi.com/wp-content/uploads/2026/08/KolayKOBI-Yapay-Zeka-Baslangic-Rehberi.pdf'

const ICINDEKILER = [
  ['Doğru işi seçin', 'neyi devretmeli, neyi devretmemeli'],
  ['Müşteri personanız', 'beş adımda çıkarma yöntemi'],
  ['İçerik takvimi', 'denge oranları ve konu havuzu'],
  ['İtiraz karşılama', 'işe yarayan üç adımlı kalıp'],
  ['Kontrol listesi', 'yazdırıp işaretleyebileceğiniz plan'],
] as const

function Icerik() {
  return (
    <ul className="flex flex-col gap-1.5 mb-4">
      {ICINDEKILER.map(([baslik, aciklama]) => (
        <li key={baslik} className="flex gap-2 text-[13px] leading-relaxed">
          <span className="text-[#1D9E75] shrink-0" aria-hidden="true">✓</span>
          <span className="text-[#3A3935]">
            <strong className="font-semibold text-[#1C1B19]">{baslik}</strong> — {aciklama}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function RehberKutusu() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <section className="mt-8 bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#085041] mb-2">
        🎁 Ücretsiz Rehber
      </p>

      <h2 className="text-[17px] font-semibold text-[#1C1B19] leading-snug mb-2">
        KOBİ'ler için Yapay Zeka Başlangıç Rehberi
      </h2>

      <p className="text-[13.5px] text-[#3A3935] leading-relaxed mb-4">
        Yapay zekayı işletmenizde nereden kullanmaya başlayacağınızı dört adımda
        anlatan uygulama rehberi. Baştan sona okumak için değil, sırayla uygulamak
        için hazırlandı.
      </p>

      <Icerik />

      {isAuthenticated ? (
        /* Kayıtlı kullanıcı — form yok, doğrudan indirsin */
        <>
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold
                       bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
          >
            📄 Rehberi İndir (PDF)
          </a>
          <p className="text-[11.5px] text-[#6B6963] mt-2.5">
            8 sayfa · 4 haftalık uygulama planı · yeni sekmede açılır
          </p>
        </>
      ) : (
        /* Ziyaretçi — e-postasını bırakırsa rehber gider */
        <>
          <div className="bg-white border border-[#D3D1C7] rounded-xl overflow-hidden">
            <iframe
              src={BREVO_FORM_URL}
              title="Rehber indirme formu"
              className="block w-full border-0"
              height={520}
              scrolling="auto"
            />
          </div>
          <p className="text-[11.5px] text-[#6B6963] leading-relaxed mt-2.5">
            E-postanızı yalnızca rehberi göndermek ve KOBİ ipuçları paylaşmak için
            kullanırız. Dilediğiniz zaman çıkabilirsiniz —{' '}
            <a href="/gizlilik" className="underline hover:text-[#085041]">
              Gizlilik Politikası
            </a>
          </p>
        </>
      )}
    </section>
  )
}
