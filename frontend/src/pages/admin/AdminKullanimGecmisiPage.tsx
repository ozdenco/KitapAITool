import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOL_LABELS } from './adminConstants'

/**
 * Tüm kullanıcıların AYLIK kullanım özeti.
 *
 * Kullanıcı bazlı "Kullanım Geçmişi" sayfasının (AdminKullaniciGecmisiPage)
 * platform geneli karşılığı. Kullanım Raporu'ndan farkı: orası tek tek
 * çalıştırma kaydı gösterir, burası ay bazında toplar.
 *
 * "Kalan hak" kolonu YOK — her kullanıcının kendi limiti olduğu için
 * bunları toplamak anlamlı bir sayı vermiyor. Yerine o ay araç çalıştıran
 * kullanıcı sayısı ve kullanıcı başına ortalama var.
 */

interface AyKaydi {
  monthYear:    string
  totalUsed:    number
  activeUsers:  number
  avgPerUser:   number
  topToolId:    string | null
  topToolCount: number
}

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

/** '2026-08' → 'Ağustos 2026' */
function ayGoster(monthYear: string): string {
  const [yil, ay] = monthYear.split('-')
  return `${AYLAR[parseInt(ay, 10) - 1] ?? ay} ${yil}`
}

function Kart({ etiket, deger, alt }: { etiket: string; deger: string; alt: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] mb-1">{etiket}</p>
      <p className="text-[22px] font-semibold text-[#1C1B19] leading-none">{deger}</p>
      <p className="text-[11px] text-[#9A9792] mt-1">{alt}</p>
    </div>
  )
}

export function AdminKullanimGecmisiPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-usage-history'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { history: AyKaydi[] } }>(
        '/admin/usage-history?months=6',
      )
      if (!res.data.success) throw new Error('Kullanım geçmişi yüklenemedi')
      return res.data.data.history
    },
  })

  const gecmis = data ?? []

  // Kartlar — son 6 ayın toplamı üzerinden
  const toplamKullanim = gecmis.reduce((t, a) => t + a.totalUsed, 0)
  const aktifAySayisi  = gecmis.filter((a) => a.totalUsed > 0).length
  const aylikOrtalama  = aktifAySayisi > 0 ? Math.round(toplamKullanim / aktifAySayisi) : 0
  const zirveKullanici = gecmis.reduce((m, a) => Math.max(m, a.activeUsers), 0)

  // Oran çubuğu, dönemin en yoğun ayına göre ölçeklenir
  const enYuksekAy = gecmis.reduce((m, a) => Math.max(m, a.totalUsed), 0)

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-[#1C1B19] flex items-center gap-2">
          📊 Kullanım Geçmişi
        </h1>
        <p className="text-[13px] text-[#6B6963] mt-0.5">
          Tüm kullanıcılar — son 6 ayın aylık özeti
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Kart etiket="Toplam Kullanım"  deger={isLoading ? '—' : String(toplamKullanim)} alt="son 6 ay" />
        <Kart etiket="Aylık Ortalama"   deger={isLoading ? '—' : String(aylikOrtalama)}  alt="kullanım/ay" />
        <Kart etiket="En Yüksek Aktif"  deger={isLoading ? '—' : String(zirveKullanici)} alt="kullanıcı/ay" />
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && (
          <p className="px-5 py-10 text-center text-[13px] text-red-600">
            Kullanım geçmişi yüklenemedi. Lütfen sayfayı yenileyin.
          </p>
        )}

        {!isLoading && !isError && gecmis.length === 0 && (
          <p className="px-5 py-10 text-center text-[13px] text-[#9A9792]">Henüz kullanım kaydı yok.</p>
        )}

        {!isLoading && !isError && gecmis.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E0D8] bg-[#F7F6F2]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Ay</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Kullanım</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Aktif Kullanıcı</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Kişi Başına</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">En Çok Kullanılan</th>
                </tr>
              </thead>
              <tbody>
                {[...gecmis].reverse().map((ay) => {
                  const oran = enYuksekAy > 0 ? Math.round((ay.totalUsed / enYuksekAy) * 100) : 0
                  return (
                    <tr
                      key={ay.monthYear}
                      className="border-b border-[#F2F1ED] last:border-0 hover:bg-[#FAFAF8] transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#1C1B19] whitespace-nowrap">{ayGoster(ay.monthYear)}</td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-[5px] bg-[#E2E0D8] rounded-full overflow-hidden">
                            <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${oran}%` }} />
                          </div>
                          <span className="text-[#1C1B19] tabular-nums w-8 text-right">{ay.totalUsed}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right text-[#6B6963] tabular-nums">{ay.activeUsers}</td>
                      <td className="px-4 py-3 text-right text-[#6B6963] tabular-nums">
                        {ay.activeUsers > 0 ? ay.avgPerUser : '—'}
                      </td>

                      <td className="px-4 py-3">
                        {ay.topToolId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#1D9E75]/10 text-[#085041] text-[11px]">
                              {TOOL_LABELS[ay.topToolId] ?? ay.topToolId}
                            </span>
                            <span className="text-[11px] text-[#9A9792]">×{ay.topToolCount}</span>
                          </span>
                        ) : (
                          <span className="text-[#C0BDB5]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
