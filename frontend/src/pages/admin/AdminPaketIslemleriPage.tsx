import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { PERIOD_TYPE_LABELS, type AdminPlan } from './adminConstants'

// ─── Period selector ──────────────────────────────────────────────────────────

interface PeriodFieldsProps {
  periodType: number
  periodDays: string
  periodStartDate: string
  periodEndDate: string
  onChange: (field: string, value: string) => void
}

function PeriodFields({ periodType, periodDays, periodStartDate, periodEndDate, onChange }: PeriodFieldsProps) {
  if (periodType === 1) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-[#9A9792] shrink-0">Gün sayısı</label>
        <input
          type="number"
          min={1}
          value={periodDays}
          onChange={(e) => onChange('periodDays', e.target.value)}
          className="w-20 border border-[#E2E0D8] rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
        />
      </div>
    )
  }
  if (periodType === 3) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#9A9792] w-24 shrink-0">Başlangıç</label>
          <input
            type="date"
            value={periodStartDate}
            onChange={(e) => onChange('periodStartDate', e.target.value)}
            className="border border-[#E2E0D8] rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-[#9A9792] w-24 shrink-0">Bitiş</label>
          <input
            type="date"
            value={periodEndDate}
            onChange={(e) => onChange('periodEndDate', e.target.value)}
            className="border border-[#E2E0D8] rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
          />
        </div>
      </div>
    )
  }
  return null
}

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: AdminPlan
  onSave: (id: number, draft: PlanDraft) => void
  isSaving: boolean
}

interface PlanDraft {
  name: string
  description: string
  priceMonthly: string
  usageLimit: string
  pricePerUse: string
  periodType: number
  periodDays: string
  periodStartDate: string
  periodEndDate: string
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.split('T')[0]
}

function PlanCard({ plan, onSave, isSaving }: PlanCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PlanDraft>({
    name:            plan.name,
    description:     plan.description,
    priceMonthly:    String(plan.priceMonthly),
    usageLimit:      plan.usagePerToolPerMonth == null ? '' : String(plan.usagePerToolPerMonth),
    pricePerUse:     plan.pricePerUse == null ? '' : String(plan.pricePerUse),
    periodType:      plan.periodType,
    periodDays:      plan.periodDays == null ? '' : String(plan.periodDays),
    periodStartDate: toDateInput(plan.periodStartDate),
    periodEndDate:   toDateInput(plan.periodEndDate),
  })

  const set = (field: string, value: string | number) =>
    setDraft((prev) => ({ ...prev, [field]: value }))

  const handleSave = () => {
    onSave(plan.id, draft)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft({
      name:            plan.name,
      description:     plan.description,
      priceMonthly:    String(plan.priceMonthly),
      usageLimit:      plan.usagePerToolPerMonth == null ? '' : String(plan.usagePerToolPerMonth),
      pricePerUse:     plan.pricePerUse == null ? '' : String(plan.pricePerUse),
      periodType:      plan.periodType,
      periodDays:      plan.periodDays == null ? '' : String(plan.periodDays),
      periodStartDate: toDateInput(plan.periodStartDate),
      periodEndDate:   toDateInput(plan.periodEndDate),
    })
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {editing ? (
            <input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              className="text-[15px] font-semibold border-b border-[#1D9E75] bg-transparent focus:outline-none w-48"
            />
          ) : (
            <h3 className="text-[15px] font-semibold text-[#1C1B19]">{plan.name}</h3>
          )}
          <p className="text-[11px] text-[#9A9792] mt-0.5 uppercase tracking-wide">{plan.type}</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[12px] text-[#1D9E75] hover:text-[#085041] font-medium"
          >
            ✎ Düzenle
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#9A9792] w-28 shrink-0">Aylık Fiyat (₺)</span>
          {editing ? (
            <input
              type="number"
              min={0}
              step={0.01}
              value={draft.priceMonthly}
              onChange={(e) => set('priceMonthly', e.target.value)}
              className="w-28 border border-[#E2E0D8] rounded-lg px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
            />
          ) : (
            <span className="text-[13px] font-semibold text-[#1C1B19]">
              {plan.priceMonthly === 0 ? 'Ücretsiz' : `₺${plan.priceMonthly.toLocaleString('tr-TR')}`}
            </span>
          )}
        </div>

        {/* Usage limit */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#9A9792] w-28 shrink-0">Adet (araç/ay)</span>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={draft.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)}
                placeholder="boş = sınırsız"
                className="w-28 border border-[#E2E0D8] rounded-lg px-2 py-1 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
              />
              <span className="text-[11px] text-[#9A9792]">boş = sınırsız</span>
            </div>
          ) : (
            <span className="text-[13px] font-semibold text-[#1C1B19]">
              {plan.usagePerToolPerMonth == null ? '∞ Sınırsız' : plan.usagePerToolPerMonth}
            </span>
          )}
        </div>

        {/* Period type */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#9A9792] w-28 shrink-0">Dönem</span>
          {editing ? (
            <select
              value={draft.periodType}
              onChange={(e) => set('periodType', Number(e.target.value))}
              className="border border-[#E2E0D8] rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40"
            >
              {Object.entries(PERIOD_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          ) : (
            <span className="text-[13px] font-semibold text-[#1C1B19]">
              {PERIOD_TYPE_LABELS[plan.periodType] ?? '—'}
            </span>
          )}
        </div>

        {/* Period-specific fields (edit mode only) */}
        {editing && (
          <PeriodFields
            periodType={draft.periodType}
            periodDays={draft.periodDays}
            periodStartDate={draft.periodStartDate}
            periodEndDate={draft.periodEndDate}
            onChange={(field, value) => set(field, value)}
          />
        )}

        {/* Description (edit mode) */}
        {editing && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[#9A9792]">Açıklama</span>
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => set('description', e.target.value)}
              className="border border-[#E2E0D8] rounded-lg px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 resize-none"
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      {editing && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-[#F2F1ED]">
          <button
            onClick={handleCancel}
            className="flex-1 py-2 rounded-xl text-[12px] text-[#6B6963] bg-[#F7F6F2] hover:bg-[#ECEAE2] transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2 rounded-xl text-[12px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Kaydediliyor…' : '✓ Kaydet'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPaketIslemleriPage() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: plans, isLoading, isError } = useQuery<AdminPlan[]>({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AdminPlan[] }>('/admin/plans')
      if (!res.data.success) throw new Error('Paketler yüklenemedi')
      return res.data.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: number; draft: PlanDraft }) => {
      const payload = {
        name:           draft.name.trim(),
        description:    draft.description.trim(),
        priceMonthly:   Number(draft.priceMonthly) || 0,
        usageLimit:     draft.usageLimit === '' ? null : Number(draft.usageLimit),
        pricePerUse:    draft.pricePerUse === '' ? null : Number(draft.pricePerUse),
        periodType:     draft.periodType,
        periodDays:     draft.periodDays === '' ? null : Number(draft.periodDays),
        periodStartDate: draft.periodStartDate || null,
        periodEndDate:   draft.periodEndDate   || null,
      }
      const res = await api.put<{ success: boolean; error?: string }>(`/admin/plans/${id}`, payload)
      if (!res.data.success) throw new Error(res.data.error ?? 'Paket güncellenemedi')
    },
    onSuccess: () => {
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] })
      void queryClient.invalidateQueries({ queryKey: ['plans'] })
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-[#1C1B19]">📦 Paket İşlemleri</h1>
        <p className="text-[13px] text-[#6B6963] mt-0.5">Paket fiyatlarını, kullanım adetlerini ve dönemlerini düzenleyin</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">
          Paketler yüklenemedi. Lütfen sayfayı yenileyin.
        </div>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(plans ?? []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSaving={saveMutation.isPending}
              onSave={(id, draft) => saveMutation.mutate({ id, draft })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
