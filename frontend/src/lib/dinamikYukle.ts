/**
 * DİNAMİK MODÜL YÜKLEME — deploy sonrası bayat sekmeleri kurtarır.
 *
 * SORUN (9 Eyl 2026'da canlıda görüldü):
 * Ağır kütüphaneler (jspdf, html2canvas-pro, dosya okuyucu) yalnızca
 * gerektiğinde `import()` ile yükleniyor. Vite bu parçaları içerik hash'li
 * adlarla üretiyor: `jspdf.es.min-MEnX1whD.js`.
 *
 * Yeni bir sürüm yayınlandığında hash değişiyor ve ESKİ dosyalar sunucudan
 * siliniyor. O sırada sayfası AÇIK olan kullanıcının tarayıcısında hâlâ eski
 * `index.js` çalışıyor ve artık var olmayan parçayı istiyor:
 *
 *   TypeError: Failed to fetch dynamically imported module: .../jspdf.es.min-MEnX1whD.js
 *
 * Kullanıcı için bu "PDF bozuk" demek; oysa tek gereken sayfayı yenilemek.
 *
 * ÇÖZÜM: hatayı tanı, sayfayı BİR KEZ yenile. Yenileme sonrası taze index.js
 * doğru parça adlarını biliyor ve işlem çalışıyor. sessionStorage'daki
 * işaret sonsuz yenileme döngüsünü engelliyor — parça gerçekten bozuksa
 * kullanıcı ikinci denemede normal hata mesajını görür.
 */

const YENILEME_ISARETI = 'kkb-surum-yenilendi'

/**
 * Yükleme hatası yeni sürümden mi kaynaklanıyor?
 *
 * Tarayıcılar bu durumu farklı metinlerle bildiriyor; hepsi "modül dosyası
 * getirilemedi" anlamına geliyor. Ağ kopukluğu da aynı hatayı verebilir,
 * ama o durumda da yenileme zararsız.
 */
function surumHatasiMi(hata: unknown): boolean {
  const mesaj = hata instanceof Error ? hata.message : String(hata)
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
    .test(mesaj)
}

/**
 * Dinamik `import()` çağrısını sarmalar.
 *
 * @param yukle  Modülü getiren fonksiyon, ör. `() => import('jspdf')`
 * @returns      Modülün kendisi
 * @throws       Yenileme yapılmadıysa özgün hatayı yeniden fırlatır
 */
export async function dinamikYukle<T>(yukle: () => Promise<T>): Promise<T> {
  try {
    return await yukle()
  } catch (hata) {
    if (!surumHatasiMi(hata)) throw hata

    let dahaOnceYenilendi = false
    try {
      dahaOnceYenilendi = sessionStorage.getItem(YENILEME_ISARETI) === '1'
      if (!dahaOnceYenilendi) sessionStorage.setItem(YENILEME_ISARETI, '1')
    } catch {
      /* gizli sekme veya depolama kapalı — yenilemeyi yine de dene */
    }

    if (dahaOnceYenilendi) {
      throw new Error(
        'Uygulama dosyaları yüklenemedi. Sayfayı yenileyip tekrar deneyin.',
      )
    }

    window.location.reload()
    // reload() eşzamanlı dönmez; çağıranın devam etmemesi için bekletiyoruz.
    return await new Promise<T>(() => {})
  }
}

/**
 * Başarılı bir gezinme sonrası işareti temizler; böylece sonraki bir deploy
 * yine bir kez yenileme hakkı bulur.
 */
export function yenilemeIsaretiniTemizle() {
  try {
    sessionStorage.removeItem(YENILEME_ISARETI)
  } catch { /* erişim yok */ }
}
