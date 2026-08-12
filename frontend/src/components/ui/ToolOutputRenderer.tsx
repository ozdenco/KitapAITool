// ToolOutputRenderer — tool-specific rich renderers for Geçmiş Çıktılarım
// Each renderer mirrors the result section of the corresponding tool page.

// ─── Shared helpers ───────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return { text: 'text-green-600', ring: 'stroke-green-500' }
  if (score >= 40) return { text: 'text-amber-500', ring: 'stroke-amber-400' }
  return { text: 'text-red-500', ring: 'stroke-red-400' }
}

function statusConfig(status: string) {
  if (status === 'red')   return { dot: 'bg-red-500',   badge: 'bg-red-50 text-red-700 border-red-200' }
  if (status === 'amber') return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' }
  return                         { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200' }
}

function durumColor(d: string) {
  if (d === 'green') return { text: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500', border: 'border-green-200' }
  if (d === 'amber') return { text: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-400', border: 'border-amber-200' }
  return                    { text: 'text-red-600',   bg: 'bg-red-50',   bar: 'bg-red-400',   border: 'border-red-200' }
}

const TEHDIT_STYLE: Record<string, string> = {
  'Yüksek': 'bg-red-100 text-red-700 border border-red-200',
  'Orta':   'bg-amber-100 text-amber-700 border border-amber-200',
  'Düşük':  'bg-green-100 text-green-700 border border-green-200',
}

const PLATFORM_EMOJIS: Record<string, string> = {
  Instagram: '📸', Facebook: '👍', LinkedIn: '💼', Twitter: '🐦',
  YouTube: '▶️', TikTok: '🎵', WhatsApp: '💬', Blog: '✍️',
  Email: '📧', X: '🐦', Pinterest: '📌', Telegram: '✈️',
}

const AVATAR_COLORS = [
  'bg-[#1D9E75] text-white',
  'bg-[#6366F1] text-white',
  'bg-[#F59E0B] text-white',
  'bg-[#EF4444] text-white',
  'bg-[#8B5CF6] text-white',
]

// ─── CtaBox ───────────────────────────────────────────────────────────────────

function CtaBox({ text }: { text?: string }) {
  if (!text) return null
  return (
    <div className="bg-[#1D9E75]/5 border border-[#1D9E75]/20 rounded-2xl p-5 text-center">
      <p className="text-sm text-[#1D9E75] font-medium">{text}</p>
    </div>
  )
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ score, colors, size = 24 }: { score: number; colors: ReturnType<typeof scoreColor>; size?: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const px = size * 4 // tailwind w-{size} = size*4px
  return (
    <div className="relative shrink-0" style={{ width: px, height: px }}>
      <svg className="-rotate-90" viewBox="0 0 96 96" width={px} height={px}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          className={colors.ring}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${colors.text}`} style={{ fontSize: px / 4 }}>{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
  )
}

// ─── Renderers ────────────────────────────────────────────────────────────────

// gorunurluk-skoru
interface ScoreItem { status: string; icon: string; name: string; desc: string; badge: string; weight?: number }
interface ScoreResult { score: number; level: string; summary: string; items: ScoreItem[]; ctaText?: string }

function RenderGorunurlukSkoru({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ScoreResult
  if (!d.score) return null
  const colors = scoreColor(d.score)
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-6 flex items-center gap-6">
        <ScoreRing score={d.score} colors={colors} size={24} />
        <div>
          <p className={`text-lg font-bold ${colors.text}`}>{d.level}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{d.summary}</p>
        </div>
      </div>

      {d.items && d.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">🔎 Detaylı Değerlendirme</h3>
          <div className="flex flex-col gap-3">
            {d.items.map((item, i) => {
              const sc = statusConfig(item.status)
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-[#F2F1ED] last:border-0">
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{item.icon} {item.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${sc.badge}`}>{item.badge}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// musteri-persona
interface Persona {
  name: string; age: string | number; job: string; location: string; quote: string
  motivations: string[]; objections: string[]; platforms: string[]; contentPrefs: string[]; summary: string
}
interface PersonaResult { personas: Persona[]; ctaText?: string }

function RenderMusteriPersona({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as PersonaResult
  if (!d.personas?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.personas.map((p, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-[#F7F6F2] to-white border-b border-[#F1EFE8] flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
              {p.name?.charAt(0) ?? '?'}
            </div>
            <div>
              <p className="font-semibold text-[#1C1B19]">{p.name}</p>
              <p className="text-xs text-gray-500">{p.age} yaş · {p.job} · {p.location}</p>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {p.quote && (
              <blockquote className="text-sm italic text-gray-600 border-l-4 border-[#1D9E75]/30 pl-3 leading-relaxed">"{p.quote}"</blockquote>
            )}
            {p.summary && (
              <p className="text-sm text-gray-600 leading-relaxed">{p.summary}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {p.motivations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">✅ Motivasyonlar</p>
                  <ul className="flex flex-col gap-1">
                    {p.motivations.map((m, j) => (
                      <li key={j} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-500 shrink-0">•</span>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
              {p.objections?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">❌ İtirazlar</p>
                  <ul className="flex flex-col gap-1">
                    {p.objections.map((o, j) => (
                      <li key={j} className="text-xs text-gray-600 flex gap-1.5"><span className="text-red-400 shrink-0">•</span>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {p.platforms?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {p.platforms.map((pl, j) => (
                  <span key={j} className="text-xs px-2.5 py-1 bg-[#F0FAF6] text-[#085041] font-medium rounded-full border border-[#9FE1CB]">
                    {PLATFORM_EMOJIS[pl] ?? '📱'} {pl}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// icerik-takvimi
interface IcerikItem {
  gun: string; tarih?: string; platform: string; icerik_turu: string
  baslik: string; konu?: string; icerik: string; hashtag: string[]; en_iyi_saat?: string
}
interface IcerikResult { ozet?: string; icerik_takvimi: IcerikItem[]; ipuclari?: string[]; ctaText?: string }

function RenderIcerikTakvimi({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as IcerikResult
  if (!d.icerik_takvimi?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.ozet && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📊 Strateji Özeti</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{d.ozet}</p>
        </div>
      )}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">📅 {d.icerik_takvimi.length} İçerik Planı</h3>
        <div className="flex flex-col gap-3">
          {d.icerik_takvimi.map((item, i) => (
            <div key={i} className="rounded-xl border border-[#F1EFE8] p-4 hover:border-[#1D9E75]/30 transition">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span>{PLATFORM_EMOJIS[item.platform] ?? '📝'}</span>
                  <span className="text-xs font-semibold text-gray-500">{item.platform}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">{item.gun}{item.tarih ? ` · ${item.tarih}` : ''}</span>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{item.icerik_turu}</span>
              </div>
              <p className="font-semibold text-sm text-gray-800 mb-1">{item.baslik}</p>
              {item.konu && item.konu !== item.baslik && (
                <p className="text-xs text-gray-400 mb-2 italic">{item.konu}</p>
              )}
              <p className="text-sm text-[#1C1B19] leading-relaxed mb-3 whitespace-pre-wrap">{item.icerik}</p>
              {item.hashtag?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.hashtag.map((tag, j) => (
                    <span key={j} className="text-xs text-[#1D9E75]">{tag}</span>
                  ))}
                </div>
              )}
              {item.en_iyi_saat && (
                <p className="text-xs text-gray-400">⏰ En iyi paylaşım saati: {item.en_iyi_saat}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {d.ipuclari && d.ipuclari.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Pratik İpuçları</h3>
          <ul className="flex flex-col gap-2">
            {d.ipuclari.map((ip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1D9E75] shrink-0">✓</span>{ip}
              </li>
            ))}
          </ul>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// reklam-butce
interface BudgetChannel { kanal: string; yuzde: number; tutar: number; aciklama: string; tahminiLead?: string; tahminiTiklama?: string }
interface BudgetResult { dagilim: BudgetChannel[]; strateji: string; uyarilar?: string[]; ctaText?: string }

function RenderReklamButce({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as BudgetResult
  if (!d.dagilim?.length) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">📊 Kanal Bazlı Dağılım</h3>
        <div className="flex flex-col gap-4">
          {d.dagilim.map((k, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-800">{k.kanal}</span>
                <div className="flex items-center gap-3">
                  {k.tahminiLead && <span className="text-xs text-gray-500">~{k.tahminiLead} lead</span>}
                  <span className="text-sm font-bold text-gray-900">{Number(k.tutar).toLocaleString('tr-TR')} ₺</span>
                  <span className="text-xs text-gray-400 w-10 text-right">%{k.yuzde}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-[#1D9E75] rounded-full transition-all" style={{ width: `${k.yuzde}%` }} />
              </div>
              {k.tahminiTiklama && (
                <p className="text-xs text-gray-400 mt-1">{k.tahminiTiklama} tıklama/ay</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {d.strateji && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">💡 Strateji</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{d.strateji}</p>
        </div>
      )}
      {d.uyarilar && d.uyarilar.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-amber-700 mb-2">⚠️ Dikkat Edilmesi Gerekenler</h3>
          <ul className="flex flex-col gap-1.5">
            {d.uyarilar.map((u, i) => (
              <li key={i} className="text-sm text-amber-700 flex gap-2"><span className="shrink-0">•</span>{u}</li>
            ))}
          </ul>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// whatsapp-satis
interface WaScript { label: string; message: string; timing?: string }
interface WaResult { scripts: WaScript[]; ctaText?: string }

function RenderWhatsappSatis({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as WaResult
  if (!d.scripts?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.scripts.map((script, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#F1EFE8] bg-[#1D9E75]/5 flex items-center gap-2">
            <span className="text-xs font-semibold text-[#085041] bg-[#1D9E75]/15 px-2.5 py-1 rounded-full">💬 {script.label}</span>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{script.message}</p>
          </div>
          {script.timing && (
            <div className="px-5 py-3 border-t border-[#F1EFE8] bg-gray-50">
              <p className="text-xs text-gray-500">⏰ {script.timing}</p>
            </div>
          )}
        </div>
      ))}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// musteri-geri-donus
interface GeriDonusAdim { adim: number; kanal: string; zamanlama: string; mesaj: string; ipucu?: string }
interface GeriDonusResult { adimlar: GeriDonusAdim[]; ctaText?: string }

function RenderMusteriGeriDonus({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as GeriDonusResult
  if (!d.adimlar?.length) return null
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
        <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">🔄 Müşteri Takip Senaryosu</h3>
        <div className="flex flex-col gap-4">
          {d.adimlar.map((adim, i) => (
            <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                <div className="w-6 h-6 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {adim.adim}
                </div>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#085041]">{adim.kanal}</span>
                  <span className="text-xs text-gray-400">• {adim.zamanlama}</span>
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">{adim.mesaj}</p>
                {adim.ipucu && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">💡 {adim.ipucu}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// chatbot-senaryo
interface OzelMesaj { tip: string; metin: string }
interface SssKart { soru: string; cevap: string }
interface ChatbotResult { ozel_mesajlar?: OzelMesaj[]; sss_kartlari?: SssKart[]; ipuclari?: string[]; ctaText?: string }

function RenderChatbotSenaryo({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ChatbotResult
  return (
    <div className="flex flex-col gap-4">
      {d.ozel_mesajlar && d.ozel_mesajlar.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">💬 Özel Mesajlar</h3>
          <div className="flex flex-col gap-3">
            {d.ozel_mesajlar.map((m, i) => (
              <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
                  <span className="text-xs font-semibold text-[#085041]">{m.tip}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{m.metin}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.sss_kartlari && d.sss_kartlari.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-4">❓ SSS Akış Kartları</h3>
          <div className="flex flex-col gap-3">
            {d.sss_kartlari.map((item, i) => (
              <div key={i} className="border border-[#F1EFE8] rounded-xl overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800">👤 {item.soru}</div>
                <div className="bg-gray-50 px-4 py-2.5 text-sm text-gray-700">🤖 {item.cevap}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.ipuclari && d.ipuclari.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">💡 Kurulum & Kullanım İpuçları</h3>
          <ul className="flex flex-col gap-2">
            {d.ipuclari.map((ip, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1D9E75] shrink-0">✓</span>{ip}
              </li>
            ))}
          </ul>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// ai-gorunurluk
interface GeoKategori { baslik: string; skor: number; durum: string; oneri: string }
interface GeoResult { genel_skor: number; seviye: string; ozet: string; kategoriler: GeoKategori[]; oncelikli_adimlar: string[]; ctaText?: string }

function RenderAiGorunurluk({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as GeoResult
  if (!d.genel_skor) return null
  const genelColor = scoreColor(d.genel_skor)
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-6 flex items-center gap-6">
        <ScoreRing score={d.genel_skor} colors={genelColor} size={24} />
        <div>
          <p className={`text-lg font-bold ${genelColor.text}`}>{d.seviye}</p>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{d.ozet}</p>
        </div>
      </div>
      {d.kategoriler?.map((k, i) => {
        const clr = durumColor(k.durum)
        return (
          <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${clr.border}`}>
            <div className={`px-5 py-3 flex items-center justify-between ${clr.bg} border-b ${clr.border}`}>
              <span className={`font-semibold text-sm ${clr.text}`}>{k.baslik}</span>
              <span className={`text-sm font-bold ${clr.text}`}>{k.skor}/100</span>
            </div>
            <div className="px-5 pt-3 pb-4">
              <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                <div className={`h-1.5 rounded-full ${clr.bar}`} style={{ width: `${k.skor}%` }} />
              </div>
              <p className="text-sm text-gray-600">→ {k.oneri}</p>
            </div>
          </div>
        )
      })}
      {d.oncelikli_adimlar?.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">🚀 Öncelikli Aksiyonlar</h3>
          <ul className="flex flex-col gap-2">
            {d.oncelikli_adimlar.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1D9E75] font-bold shrink-0">{i + 1}.</span>{a}
              </li>
            ))}
          </ul>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// viral-video
interface ViralUyarlama { numara: number; baslik: string; senaryo: string; kanca?: string; ipucu?: string; platformlar?: string[]; format?: string }
interface ViralResult { kaynak_analiz?: string; uyarlamalar: ViralUyarlama[]; ctaText?: string }

function RenderViralVideo({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as ViralResult
  if (!d.uyarlamalar?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.kaynak_analiz && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">🔍 Viral Analiz</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{d.kaynak_analiz}</p>
        </div>
      )}
      {d.uyarlamalar.map((u, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
            <div className="w-7 h-7 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {u.numara}
            </div>
            <span className="font-semibold text-sm text-[#085041]">{u.baslik}</span>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-sm text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
              {u.senaryo}
            </div>
            {u.kanca && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">🎣 İlk 3 Saniye Kancası</p>
                <p className="text-sm text-amber-800">{u.kanca}</p>
              </div>
            )}
            {u.ipucu && (
              <div className="flex gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
                <span className="text-[#1D9E75] shrink-0">💡</span>{u.ipucu}
              </div>
            )}
            {(u.platformlar || u.format) && (
              <div className="flex gap-2 flex-wrap">
                {u.platformlar?.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-[#E1F5EE] text-[#085041] font-medium rounded-full">{p}</span>
                ))}
                {u.format && (
                  <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-medium rounded-full">{u.format}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// trend-video
interface TrendVideo { sira: number; baslik: string; platform: string; neden_trend: string; uyarlama: string; ipucu?: string; etiketler?: string[] }
interface TrendResult { ozet?: string; videolar: TrendVideo[]; ctaText?: string }

function RenderTrendVideo({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as TrendResult
  if (!d.videolar?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.ozet && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📊 Trend Özeti</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{d.ozet}</p>
        </div>
      )}
      {d.videolar.map((v, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-[#1D9E75]/5 border-b border-[#F1EFE8]">
            <div className="w-7 h-7 rounded-full bg-[#1D9E75] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {v.sira}
            </div>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-[#085041]">{v.baslik}</span>
              <span className="text-xs px-2 py-0.5 bg-[#F0FAF6] text-[#085041] rounded-full font-medium">{v.platform}</span>
            </div>
          </div>
          <div className="p-5 flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">🔥 Neden Trend?</p>
              <p className="text-sm text-gray-600 leading-relaxed">{v.neden_trend}</p>
            </div>
            <div className="relative bg-[#DCF8C6] rounded-tr-xl rounded-b-xl px-4 py-3 text-sm text-[#1C1B19] leading-relaxed whitespace-pre-wrap">
              <p className="text-xs font-semibold text-[#085041] mb-1">💡 Uyarlama</p>
              {v.uyarlama}
            </div>
            {v.ipucu && (
              <div className="flex gap-2 bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
                <span className="text-[#1D9E75] shrink-0">💡</span>{v.ipucu}
              </div>
            )}
            {v.etiketler && v.etiketler.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {v.etiketler.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-[#F0FAF6] border border-[#9FE1CB] text-[#085041] font-medium rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// rakip-analiz
interface Rakip { ad: string; tehdit: string; guclu: string[]; zayif: string[]; firsat: string }
interface RakipResult { rakipler: Rakip[]; genel_degerlendirme?: string; oneriler?: string[]; ctaText?: string }

function RenderRakipAnaliz({ data }: { data: Record<string, unknown> }) {
  const d = data as unknown as RakipResult
  if (!d.rakipler?.length) return null
  return (
    <div className="flex flex-col gap-4">
      {d.rakipler.map((rakip, i) => (
        <div key={i} className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-[#1D9E75]/5 border-b border-[#F1EFE8] flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-sm text-[#085041]">🏢 {rakip.ad}</span>
            {rakip.tehdit && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TEHDIT_STYLE[rakip.tehdit] ?? 'bg-gray-100 text-gray-600'}`}>
                {rakip.tehdit} Tehdit
              </span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rakip.guclu?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-2">💪 Güçlü Yönler</p>
                <ul className="flex flex-col gap-1">
                  {rakip.guclu.map((g, j) => (
                    <li key={j} className="text-xs text-gray-600 flex gap-1.5"><span className="text-green-500 shrink-0">•</span>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {rakip.zayif?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">⚠️ Zayıf Yönler</p>
                <ul className="flex flex-col gap-1">
                  {rakip.zayif.map((z, j) => (
                    <li key={j} className="text-xs text-gray-600 flex gap-1.5"><span className="text-red-400 shrink-0">•</span>{z}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {rakip.firsat && (
            <div className="px-5 pb-4">
              <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-xl px-4 py-2.5">
                <p className="text-xs font-semibold text-[#085041] mb-0.5">🎯 Fırsat</p>
                <p className="text-xs text-[#085041] leading-relaxed">{rakip.firsat}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {d.genel_degerlendirme && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-2">📋 Genel Değerlendirme</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{d.genel_degerlendirme}</p>
        </div>
      )}

      {d.oneriler && d.oneriler.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E0D8] shadow-sm p-5">
          <h3 className="text-sm font-semibold text-[#1C1B19] mb-3">🚀 Stratejik Öneriler</h3>
          <ul className="flex flex-col gap-2">
            {d.oneriler.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1D9E75] font-bold shrink-0">{i + 1}.</span>{o}
              </li>
            ))}
          </ul>
        </div>
      )}
      <CtaBox text={d.ctaText} />
    </div>
  )
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

interface ToolOutputRendererProps {
  toolId: string
  data: Record<string, unknown>
}

export function ToolOutputRenderer({ toolId, data }: ToolOutputRendererProps) {
  switch (toolId) {
    case 'gorunurluk-skoru':   return <RenderGorunurlukSkoru   data={data} />
    case 'musteri-persona':    return <RenderMusteriPersona     data={data} />
    case 'icerik-takvimi':     return <RenderIcerikTakvimi      data={data} />
    case 'reklam-butce':       return <RenderReklamButce        data={data} />
    case 'whatsapp-satis':     return <RenderWhatsappSatis      data={data} />
    case 'musteri-geri-donus': return <RenderMusteriGeriDonus   data={data} />
    case 'chatbot-senaryo':    return <RenderChatbotSenaryo     data={data} />
    case 'ai-gorunurluk':      return <RenderAiGorunurluk       data={data} />
    case 'viral-video':        return <RenderViralVideo         data={data} />
    case 'trend-video':        return <RenderTrendVideo         data={data} />
    case 'rakip-analiz':       return <RenderRakipAnaliz        data={data} />
    default:                   return null
  }
}
