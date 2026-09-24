import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CiktiRow {
  id: string
  toolId: string
  inputSummary: string
  createdAt: string
  userId: string
  userName: string
  userEmail: string
}

interface MetaUser {
  id: string
  name: string
  email: string
}

interface AllResultsResponse {
  success: boolean
  data: CiktiRow[]
  meta: {
    users: MetaUser[]
    tools: string[]
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

const SAYFA_BOYUTU = 25

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  'gorunurluk-skoru':  'İşletme Görünürlük Skoru',
  'musteri-persona':   'Müşteri Persona',
  'icerik-takvimi':    'İçerik Takvimi',
  'whatsapp-satis':    'WhatsApp Satış Script',
  'reklam-butce':      'Reklam Bütçe Planlayıcı',
  'musteri-geri-donus':'Müşteri Geri Dönüş',
  'rakip-analiz':      'Rakip Analiz',
  'chatbot-senaryo':   'Chatbot Senaryo',
  'ai-gorunurluk':     'AI Görünürlük',
  'viral-video':       'Viral Video Uyarlayıcı',
  'trend-video':       'Trend Video Bulucu',
}

const TOOL_ICONS: Record<string, string> = {
  'gorunurluk-skoru':  '📊',
  'musteri-persona':   '👤',
  'icerik-takvimi':    '📅',
  'whatsapp-satis':    '💬',
  'reklam-butce':      '💰',
  'musteri-geri-donus':'🔄',
  'rakip-analiz':      '🔍',
  'chatbot-senaryo':   '🤖',
  'ai-gorunurluk':     '✨',
  'viral-video':       '🎬',
  'trend-video':       '📱',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function monthOptions() {
  const now  = new Date()
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
    })
  }
  return opts
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminTumCiktilarPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initUserId = searchParams.get('userId') ?? ''
  const initMonth  = searchParams.get('month')  ?? ''
  const initTool   = searchParams.get('toolId') ?? ''
  const initPage   = Math.max(parseInt(searchParams.get('sayfa') ?? '1') || 1, 1)

  const [selectedUserId, setSelectedUserId] = useState(initUserId)
  const [selectedMonth,  setSelectedMonth]  = useState(initMonth)
  const [selectedTool,   setSelectedTool]   = useState(initTool)
  const [sayfa,          setSayfa]          = useState(initPage)

  // Parse year/month from "YYYY-MM"
  const parsedYear  = selectedMonth ? parseInt(selectedMonth.split('-')[0]) : undefined
  const parsedMonth = selectedMonth ? parseInt(selectedMonth.split('-')[1]) : undefined

  const queryStr = new URLSearchParams()
  if (selectedUserId)  queryStr.set('userId', selectedUserId)
  if (parsedYear)      queryStr.set('year',   String(parsedYear))
  if (parsedMonth)     queryStr.set('month',  String(parsedMonth))
  if (selectedTool)    queryStr.set('toolId', selectedTool)
  queryStr.set('page',     String(sayfa))
  queryStr.set('pageSize', String(SAYFA_BOYUTU))

  const { data, isLoading } = useQuery<AllResultsResponse>({
    queryKey: ['admin-all-results', selectedUserId, selectedMonth, selectedTool, sayfa],
    placeholderData: (onceki) => onceki,   // sayfa değişiminde tablo boşalmasın
    queryFn: () =>
      api.get<AllResultsResponse>(`/admin/all-results?${queryStr.toString()}`)
         .then(r => r.data),
  })

  const rows       = data?.data  ?? []
  const users      = data?.meta?.users ?? []
  const araclar    = data?.meta?.tools ?? []
  const toplam     = data?.meta?.total ?? 0
  const toplamSayfa = data?.meta?.totalPages ?? 1

  const months = useMemo(() => monthOptions(), [])

  /** Filtre değişince 1. sayfaya dönülür; aksi hâlde boş sayfada kalınabilir. */
  const adresGuncelle = (degisiklik: (p: URLSearchParams) => void, sayfayiSifirla = true) => {
    const p = new URLSearchParams(searchParams)
    degisiklik(p)
    if (sayfayiSifirla) { p.delete('sayfa'); setSayfa(1) }
    setSearchParams(p, { replace: true })
  }

  const handleUserChange = (uid: string) => {
    setSelectedUserId(uid)
    adresGuncelle(p => { if (uid) p.set('userId', uid); else p.delete('userId') })
  }

  const handleMonthChange = (m: string) => {
    setSelectedMonth(m)
    adresGuncelle(p => { if (m) p.set('month', m); else p.delete('month') })
  }

  const handleToolChange = (t: string) => {
    setSelectedTool(t)
    adresGuncelle(p => { if (t) p.set('toolId', t); else p.delete('toolId') })
  }

  const sayfayaGit = (yeni: number) => {
    const hedef = Math.min(Math.max(yeni, 1), Math.max(toplamSayfa, 1))
    setSayfa(hedef)
    adresGuncelle(p => { if (hedef > 1) p.set('sayfa', String(hedef)); else p.delete('sayfa') }, false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectedUserName = users.find(u => u.id === selectedUserId)?.name

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[16px] font-semibold text-[#1C1B19]">📄 Tüm Çıktılar</h1>
          <p className="text-[13px] text-[#6B6963] mt-0.5">
            Tüm kullanıcıların kayıtlı AI çıktıları
            {selectedUserName ? ` — ${selectedUserName}` : ''}
          </p>
        </div>

        {/* ── Filtreler ── */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Kullanıcı filtresi */}
          <select
            value={selectedUserId}
            onChange={e => handleUserChange(e.target.value)}
            className="px-3 py-1.5 border border-[#D3D1C7] rounded-lg text-[12px] text-[#1C1B19] bg-white focus:outline-none focus:border-[#1D9E75] min-w-[160px]"
          >
            <option value="">Tüm kullanıcılar</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>

          {/* Ay filtresi */}
          <select
            value={selectedMonth}
            onChange={e => handleMonthChange(e.target.value)}
            className="px-3 py-1.5 border border-[#D3D1C7] rounded-lg text-[12px] text-[#1C1B19] bg-white focus:outline-none focus:border-[#1D9E75]"
          >
            <option value="">Tüm aylar</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Araç filtresi */}
          <select
            value={selectedTool}
            onChange={e => handleToolChange(e.target.value)}
            className="px-3 py-1.5 border border-[#D3D1C7] rounded-lg text-[12px] text-[#1C1B19] bg-white focus:outline-none focus:border-[#1D9E75] min-w-[160px]"
          >
            <option value="">Tüm araçlar</option>
            {araclar.map(t => (
              <option key={t} value={t}>
                {TOOL_ICONS[t] ?? '🔧'} {TOOL_LABELS[t] ?? t}
              </option>
            ))}
          </select>

          {(selectedUserId || selectedMonth || selectedTool) && (
            <button
              onClick={() => { handleUserChange(''); handleMonthChange(''); handleToolChange('') }}
              className="text-[12px] text-[#9A9792] hover:text-red-500 transition-colors"
            >
              ✕ Filtreyi temizle
            </button>
          )}
        </div>
      </div>

      {/* ── Sonuç sayısı ── */}
      {!isLoading && (
        <p className="text-[12px] text-[#9A9792]">
          {rows.length} çıktı gösteriliyor {rows.length === 200 ? '(limit 200 — filtreleyerek daraltın)' : ''}
        </p>
      )}

      {/* ── Tablo ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F7F6F2] rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-[#9A9792] text-[13px]">
            Bu filtreye ait çıktı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#F7F6F2] border-b border-[#E2E0D8]">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">ID</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Kullanıcı</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Özet / Girdi</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#9A9792]">Tarih</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-[#F1EFE8] hover:bg-[#F7F6F2]/60 transition-colors"
                  >
                    {/*
                      Veritabanı kimliği. GUID 36 karakter — tamamı kolonu
                      şişirirdi. İlk 8 hane gösteriliyor; tıklayınca tam
                      değer panoya kopyalanıyor, tooltip'te de duruyor.
                    */}
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        title={`${row.id}\n(tıklayınca kopyalanır)`}
                        onClick={() => void navigator.clipboard?.writeText(row.id)}
                        className="font-mono text-[10px] text-[#9A9792] hover:text-[#1C1B19]
                                   bg-[#F7F6F2] hover:bg-[#EDEBE4] border border-[#E2E0D8]
                                   rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                      >
                        {row.id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-[#1C1B19]">{row.userName}</div>
                      <div className="text-[10px] text-[#9A9792]">{row.userEmail}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px]">{TOOL_ICONS[row.toolId] ?? '🔧'}</span>
                        <span className="text-[11px] text-[#1C1B19]">
                          {TOOL_LABELS[row.toolId] ?? row.toolId}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <p className="text-[11px] text-[#6B6963] truncate">
                        {row.inputSummary || <span className="text-[#D3D1C7] italic">Özet yok</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-[#9A9792]">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => navigate(`/admin/rapor/${row.id}`)}
                        className="text-[11px] text-[#1D9E75] hover:underline font-medium"
                      >
                        Detay →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Sayfalama ── */}
        {toplam > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-[#E2E0D8]">
            <span className="text-[12px] text-[#6B6963] tabular-nums">
              Toplam <strong className="text-[#1C1B19]">{toplam}</strong> kayıt ·
              {' '}{(sayfa - 1) * SAYFA_BOYUTU + 1}–{Math.min(sayfa * SAYFA_BOYUTU, toplam)} arası
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => sayfayaGit(sayfa - 1)}
                disabled={sayfa <= 1}
                className="px-3 py-1.5 rounded-lg border border-[#D3D1C7] text-[12px] text-[#3A3935] bg-white hover:border-[#B4B2A9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Önceki
              </button>

              <span className="px-2 text-[12px] text-[#6B6963] tabular-nums">
                Sayfa <strong className="text-[#1C1B19]">{sayfa}</strong> / {Math.max(toplamSayfa, 1)}
              </span>

              <button
                type="button"
                onClick={() => sayfayaGit(sayfa + 1)}
                disabled={sayfa >= toplamSayfa}
                className="px-3 py-1.5 rounded-lg border border-[#D3D1C7] text-[12px] text-[#3A3935] bg-white hover:border-[#B4B2A9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
