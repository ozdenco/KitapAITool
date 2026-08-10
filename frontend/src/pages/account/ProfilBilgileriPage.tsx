import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Input } from '@/components/ui/Input'
import type { ApiResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  name: string
  email: string
  company: string
}

interface ProfileUpdateBody {
  name: string
  company: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfilBilgileriPage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch profile (may include company not in auth store)
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['user-profile'],
    queryFn: () =>
      api.get<ProfileData>('/users/me/profile').then((r: { data: ProfileData }) => r.data),
    // Fall back to auth store if endpoint not implemented
    placeholderData: { name: user?.name ?? '', email: user?.email ?? '', company: '' },
  })

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      setCompany(profile.company ?? '')
    }
  }, [profile])

  const [saved, setSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: async (body: ProfileUpdateBody) => {
      const { data } = await api.patch<ApiResponse<ProfileData>>('/users/me/profile', body)
      if (!data.success || !data.data) throw new Error(data.error ?? 'Güncelleme başarısız')
      return data.data
    },
    onSuccess: (updated) => {
      if (user) {
        setUser({ ...user, name: updated.name })
      }
      queryClient.setQueryData<ProfileData>(['user-profile'], updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ name: name.trim(), company: company.trim() })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Title ── */}
      <div>
        <div className="flex items-center gap-[10px] mb-[4px]">
          <span className="text-[22px] leading-none">👤</span>
          <h1 className="text-[20px] font-medium text-[#1C1B19]">Profil Bilgileri</h1>
        </div>
        <p className="text-[13px] text-[#6B6963]">Hesap bilgilerinizi görüntüleyin ve güncelleyin</p>
      </div>

      {/* ── Form ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-[#F7F6F2] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adınız ve soyadınız"
              required
            />

            <div className="flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-[#6B6963]">E-posta</label>
              <div className="rounded-lg border border-[#D3D1C7] px-[12px] py-[10px] text-[14px] text-[#9A9792] bg-[#F7F6F2] select-none">
                {profile?.email ?? user?.email}
              </div>
              <p className="text-[11px] text-[#9A9792]">
                E-posta adresi değiştirilemez. Değişiklik için destek ekibiyle iletişime geçin.
              </p>
            </div>

            <Input
              label="Şirket"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Şirket veya işletme adı (isteğe bağlı)"
            />

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-[18px] py-[8px] bg-[#1D9E75] text-white text-[13px] font-medium rounded-lg hover:bg-[#178a65] disabled:opacity-60 transition-colors"
              >
                {updateMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>

              {saved && (
                <span className="text-[13px] text-[#1D9E75] font-medium">
                  ✓ Değişiklikler kaydedildi
                </span>
              )}

              {updateMutation.isError && (
                <span className="text-[13px] text-red-600">
                  Hata: {(updateMutation.error as Error).message}
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ── Account info ── */}
      <div className="bg-white rounded-2xl border border-[#E2E0D8] p-5">
        <h2 className="text-[13px] font-semibold text-[#6B6963] uppercase tracking-wider mb-3">
          Hesap Detayları
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between py-[6px] border-b border-[#F2F1ED]">
            <span className="text-[13px] text-[#6B6963]">Üyelik tipi</span>
            <span className="text-[13px] font-medium text-[#1C1B19]">
              {user?.isAdmin ? 'Admin' : 'Kullanıcı'}
            </span>
          </div>
          <div className="flex items-center justify-between py-[6px] border-b border-[#F2F1ED]">
            <span className="text-[13px] text-[#6B6963]">E-posta doğrulama</span>
            <span className={`text-[13px] font-medium ${user?.emailVerified ? 'text-[#1D9E75]' : 'text-amber-600'}`}>
              {user?.emailVerified ? '✓ Doğrulandı' : '⚠ Doğrulanmadı'}
            </span>
          </div>
          {user?.createdAt && (
            <div className="flex items-center justify-between py-[6px]">
              <span className="text-[13px] text-[#6B6963]">Üyelik tarihi</span>
              <span className="text-[13px] font-medium text-[#1C1B19]">
                {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
