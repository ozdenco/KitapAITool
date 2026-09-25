/**
 * Kayıtlı bir çıktının ÜRETİLDİĞİ form girdilerini gösterir.
 *
 * Neden: Geçmiş Çıktılar'da yalnızca sonuç görünüyordu. Kullanıcı eski bir
 * takvime bakıp "bu hangi tarih için çalıştırıldı, hangi gün seçilmişti,
 * özel gün olarak ne yazmıştım?" sorusuna cevap bulamıyordu (25 Eyl 2026).
 *
 * Alan opsiyonel: bu bilgiyi göndermeyen araçlarda ve 25 Eyl öncesi
 * kayıtlarda kart hiç çizilmez.
 */
export function FormBilgileriKarti({ ham }: { ham?: string | null }) {
  if (!ham) return null

  let alanlar: [string, string][]
  try {
    const cozulmus = JSON.parse(ham) as Record<string, unknown>
    alanlar = Object.entries(cozulmus)
      .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
      .map(([k, v]) => [k, String(v)])
  } catch (error) {
    console.error('Form bilgileri okunamadı:', error)
    return null
  }

  if (alanlar.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
      <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">📝 Bu çıktı hangi bilgilerle üretildi</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
        {alanlar.map(([etiket, deger]) => (
          <div key={etiket} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">{etiket}</dt>
            <dd className="text-[13px] text-[#3A3935] leading-relaxed break-words">{deger}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
