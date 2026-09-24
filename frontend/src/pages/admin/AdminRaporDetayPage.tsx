import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { TOOLS } from '@/lib/tools'
import { parseAiJson, extractAiContent } from '@/lib/parseAiJson'
import { CiktiGovdesi } from '@/components/ui/CiktiGovdesi'
import { PrintButton } from '@/components/ui/PrintButton'
import { CiktiBasligi } from '@/components/ui/CiktiBasligi'
import { HataSiniri } from '@/components/ui/HataSiniri'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultDetail {
  id: string
  toolId: string
  inputSummary: string
  outputJson: string
  createdAt: string
  userId: string
  name: string
  email: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOOL_META = Object.fromEntries(TOOLS.map((t) => [t.id, { name: t.name, icon: t.icon }]))

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  )
}

function parseOutput(outputJson: string): Record<string, unknown> | null {
  try {
    let raw = JSON.parse(outputJson) as Record<string, unknown> | Record<string, unknown>[]
    if (Array.isArray(raw) && raw.length === 1) raw = raw[0]
    let parsed = raw as Record<string, unknown>

    // Kaydedilen çıktı iki sarmalayıcıyla gelebilir:
    //   { content: [{ text }] }               → dönüştürülmüş
    //   { choices: [{ message: { content }}]} → ham MiniMax (AI Görünürlük)
    // Yalnızca ilki tanınınca rapor boş açılıyordu. Kullanıcı tarafındaki
    // Geçmiş Çıktılar sayfası düzeltilmişti; admin rapor sayfası atlanmıştı.
    const icMetin = extractAiContent(parsed)
    if (typeof icMetin === 'string') {
      try {
        const inner = parseAiJson<Record<string, unknown>>(icMetin)
        const extras: Record<string, unknown> = {}
        for (const k of Object.keys(parsed)) {
          if (k !== 'content' && k !== 'choices') extras[k] = (parsed as Record<string, unknown>)[k]
        }
        parsed = { ...inner, ...extras }
      } catch { /* keep raw parsed */ }
    }
    return parsed
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminRaporDetayPage() {
  const { resultId } = useParams<{ resultId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery<ResultDetail>({
    queryKey: ['admin-result', resultId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ResultDetail }>(
        `/admin/results/${resultId}`
      )
      if (!res.data.success) throw new Error('Rapor yüklenemedi')
      return res.data.data
    },
    enabled: !!resultId,
  })

  const tool   = data ? (TOOL_META[data.toolId] ?? { name: data.toolId, icon: '🔧' }) : null
  const parsed = data ? parseOutput(data.outputJson) : null

  // PDF doğrudan indirme hedefi
  const ciktiRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (!data || !tool) return
    const prev = document.title
    document.title = `${tool.name}_${data.name}_Rapor`
    document.body.setAttribute('data-printing-result', 'true')
    const restore = () => {
      document.body.removeAttribute('data-printing-result')
      document.title = prev
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">

      {/* ── Geri butonu ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-[13px] text-[#6B6963] hover:text-[#1C1B19] mb-5 transition-colors no-print"
      >
        {/* navigate(-1) kullanıyor; sabit bir hedef yazmak yanıltıcıydı */}
        ← Geri
      </button>

      {/* ── Yükleniyor ── */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="h-20 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-[#E2E0D8] animate-pulse" />
        </div>
      )}

      {/* ── Hata ── */}
      {isError && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
          <p className="text-[14px] font-medium text-red-700">Rapor yüklenemedi</p>
          <p className="text-[12px] text-red-500 mt-1">Kayıt bulunamıyor ya da erişim yetkiniz yok.</p>
        </div>
      )}

      {/* ── İçerik ── */}
      {data && tool && (
        <>
          {/* Başlık kartı */}
          <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5 mb-4 no-print">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[28px] leading-none">{tool.icon}</span>
                <div>
                  <h1 className="text-[18px] font-semibold text-[#1C1B19]">{tool.name}</h1>

                  {/* Hangi işletme için çalıştırıldığı — yönetici raporda
                      yalnızca kullanıcı adını görüyordu, çıktının hangi
                      firmaya ait olduğu ancak metnin içinden anlaşılıyordu. */}
                  {data.inputSummary?.trim() && (
                    <p className="text-[13px] font-medium text-[#085041] mt-0.5">
                      🏢 {data.inputSummary}
                    </p>
                  )}

                  <p className="text-[12px] text-[#6B6963] mt-0.5">
                    <strong className="text-[#3A3935]">{data.name}</strong>
                    {' '}·{' '}
                    <span className="text-[#9A9792]">{data.email}</span>
                  </p>
                  <p className="text-[11px] text-[#9A9792] mt-0.5">{formatDateTime(data.createdAt)}</p>
                </div>
              </div>

              <PrintButton
                onPrint={handlePrint}
                boyut="kompakt"
                className="shrink-0"
                pdfHedefi={() => ciktiRef.current}
                pdfDosyaAdi={`${tool?.name ?? data.toolId}_${data.name}`}
              />
            </div>
          </div>

          {/* Rapor içeriği */}
          <div className="bg-[#F7F6F2] rounded-2xl border border-[#E2E0D8] overflow-hidden">
            <div ref={ciktiRef} className="p-5 gecmis-print-target">
              <CiktiBasligi
                aracAdi={tool?.name ?? data.toolId}
                tarih={formatDateTime(data.createdAt)}
                kisi={data.name}
              />
              {parsed !== null ? (
                <HataSiniri baslik={data.toolId}>
                  <CiktiGovdesi
                    toolId={data.toolId}
                    parsed={parsed}
                    olusturmaTarihi={data.createdAt}
                    isletmeAdi={data.inputSummary}
                    sonucId={data.id}
                    videoBaglantisi={false}
                  />
                </HataSiniri>
              ) : (
                <pre className="text-[11px] text-[#3A3935] bg-white border border-[#E2E0D8] rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {data.outputJson}
                </pre>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
