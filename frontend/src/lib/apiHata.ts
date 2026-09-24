/**
 * API hata mesajını çıkarır.
 *
 * Backend iki farklı biçimde hata döndürebiliyor:
 *   1) Kendi biçimimiz:  { success: false, error: "..." }
 *   2) ASP.NET ProblemDetails: { errors: { Alan: ["mesaj", ...] }, title: "..." }
 *
 * [ApiController] özniteliği model doğrulama hatalarını controller kodu
 * çalışmadan ÖNCE ikinci biçimde döndürdüğü için, yalnızca `error` alanına
 * bakan istemciler kullanıcıya genel bir mesaj gösteriyordu.
 */
export function apiHataMesaji(hata: unknown, varsayilan = 'Bir hata oluştu. Lütfen tekrar deneyin.'): string {
  const veri = (hata as { response?: { data?: unknown } })?.response?.data

  if (typeof veri === 'string' && veri.trim()) return veri

  if (veri && typeof veri === 'object') {
    const kayit = veri as Record<string, unknown>

    // 1) Kendi biçimimiz
    if (typeof kayit.error === 'string' && kayit.error.trim()) return kayit.error

    // 2) ProblemDetails — ilk alan hatasını göster
    const errors = kayit.errors
    if (errors && typeof errors === 'object') {
      for (const deger of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(deger)) {
          const ilk = deger.find((m) => typeof m === 'string' && m.trim())
          if (typeof ilk === 'string') return ilk
        }
      }
    }

    if (typeof kayit.title === 'string' && kayit.title.trim()) return kayit.title
  }

  const mesaj = (hata as Error)?.message
  return typeof mesaj === 'string' && mesaj.trim() ? mesaj : varsayilan
}
