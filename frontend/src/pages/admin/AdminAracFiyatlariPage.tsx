import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ToolPrice {
  id: number
  toolId: string
  toolName: string
  priceMonthly: number
  isActive: boolean
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Inline editable row ──────────────────────────────────────────────────────

function PriceRow({
  tool,
  onSave,
}: {
  tool: ToolPrice
  onSave: (id: number, price: number, active: boolean) => Promise<void>
}) {
  const [price, setPrice]   = useState(tool.priceMonthly.toString())
  const [active, setActive] = useState(tool.isActive)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  const handlePriceChange = (v: string) => {
    setPrice(v)
    setDirty(true)
  }

  const handleActiveChange = (v: boolean) => {
    setActive(v)
    setDirty(true)
  }

  const handleSave = async () => {
    const numPrice = parseFloat(price)
    if (isNaN(numPrice) || numPrice < 0) return
    setSaving(true)
    try {
      await onSave(tool.id, numPrice, active)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  const icon = TOOL_ICONS[tool.toolId] ?? '🔧'

  return (
    <tr className="border-b border-[#F0EFE9] last:border-b-0 hover:bg-[#FAFAF7] transition-colors">
      {/* Araç */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[17px] shrink-0">{icon}</span>
          <div>
            <p className="text-[13px] font-medium text-[#1C1B19]">{tool.toolName}</p>
            <p className="text-[11px] text-[#9A9792] font-mono">{tool.toolId}</p>
          </div>
        </div>
      </td>

      {/* Fiyat */}
      <td className="px-5 py-3.5 w-36">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-[#9A9792]">₺</span>
          <input
            type="number"
            min={0}
            max={9999}
            step={1}
            value={price}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="w-20 px-2.5 py-1 rounded-lg border border-[#D3D1C7] text-[13px] font-medium text-[#1C1B19] text-right focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]/20 bg-white tabular-nums"
          />
          <span className="text-[11px] text-[#9A9792]">/ay</span>
        </div>
      </td>

      {/* Aktif */}
      <td className="px-5 py-3.5 w-24">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="switch"
            aria-checked={active}
            tabIndex={0}
            onClick={() => handleActiveChange(!active)}
            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleActiveChange(!active) : null}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1D9E75]/40 ${
              active ? 'bg-[#1D9E75]' : 'bg-[#D3D1C7]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                active ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
          <span className={`text-[12px] font-medium ${active ? 'text-[#085041]' : 'text-[#9A9792]'}`}>
            {active ? 'Aktif' : 'Pasif'}
          </span>
        </label>
      </td>

      {/* Son güncelleme */}
      <td className="px-5 py-3.5 w-36">
        <span className="text-[11px] text-[#9A9792]">
          {new Date(tool.updatedAt).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </span>
      </td>

      {/* Kaydet */}
      <td className="px-5 py-3.5 w-24 text-right">
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {saving ? '⏳' : 'Kaydet'}
          </button>
        )}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AdminAracFiyatlariPage() {
  const queryClient = useQueryClient()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { data: prices, isLoading } = useQuery<ToolPrice[]>({
    queryKey: ['admin-tool-prices'],
    queryFn: () =>
      api.get<{ success: boolean; data: ToolPrice[] }>('/admin/tool-prices')
         .then((r: { data: { success: boolean; data: ToolPrice[] } }) => r.data.data),
  })

  const mutation = useMutation({
    mutationFn: ({ id, priceMonthly, isActive }: { id: number; priceMonthly: number; isActive: boolean }) =>
      api.put(`/admin/tool-prices/${id}`, { priceMonthly, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tool-prices'] })
      setSuccessMsg('Fiyat güncellendi ✓')
      setTimeout(() => setSuccessMsg(null), 2500)
    },
  })

  const handleSave = async (id: number, priceMonthly: number, isActive: boolean) => {
    await mutation.mutateAsync({ id, priceMonthly, isActive })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-[10px] mb-[4px]">
            <span className="text-[20px] leading-none">🏷️</span>
            <h1 className="text-[18px] font-semibold text-[#1C1B19]">Araç Fiyatları</h1>
          </div>
          <p className="text-[13px] text-[#6B6963]">
            Tekil araç satın alımı için aylık fiyatları buradan ayarlayın
          </p>
        </div>

        {successMsg && (
          <span className="text-[12px] font-medium text-[#085041] bg-[#E6F9F2] border border-[#9FE1CB] px-3 py-1.5 rounded-lg">
            {successMsg}
          </span>
        )}
      </div>

      {/* ── Info banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[12px] text-amber-800">
        💡 <strong>Not:</strong> Bu fiyatlar "Araç Satın Al" sayfasında görünür. Pasif araçlar satın alınamaz.
        Paket aboneliği fiyatları için{' '}
        <span className="font-medium">Paket İşlemleri</span> sayfasını kullanın.
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-[1px] p-4">
            {[...Array(11)].map((_, i) => (
              <div key={i} className="h-12 bg-[#F7F6F2] rounded animate-pulse mb-1" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E2E0D8]">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Araç</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Aylık Fiyat</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Durum</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9A9792]">Son Güncelleme</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(prices ?? []).map((tool) => (
                <PriceRow key={tool.id} tool={tool} onSave={handleSave} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
