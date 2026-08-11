import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CreateUserModal } from './AdminModals'

export function AdminKullaniciIslemleriPage() {
  const queryClient  = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const handleCreated = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    setCreateOpen(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-[#1C1B19]">⚙️ Kullanıcı İşlemleri</h1>
        <p className="text-[13px] text-[#6B6963] mt-0.5">Kullanıcı oluşturma ve toplu işlemler</p>
      </div>

      {/* ── Action cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Create user */}
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">➕</span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1C1B19]">Yeni Kullanıcı Ekle</h2>
              <p className="text-[12px] text-[#9A9792]">Sisteme yeni bir kullanıcı kaydı oluşturun</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5 text-[12px] text-[#6B6963]">
            {['Ad, e-posta ve şifre belirlenir', 'Şirket adı ve plan seçilir', 'Admin yetkisi verilebilir', 'Kullanıcıya hoş geldin maili gönderilir'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-[#1D9E75] font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setCreateOpen(true)}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
          >
            ➕ Yeni Kullanıcı Oluştur
          </button>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-[#E2E0D8] p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h2 className="text-[15px] font-semibold text-[#1C1B19]">Kullanıcı Yönetimi</h2>
              <p className="text-[12px] text-[#9A9792]">Mevcut kullanıcılar üzerinde işlem yapın</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5 text-[12px] text-[#6B6963]">
            {['Kullanıcı Listesi\'nden kullanıcı seçin', 'Sağ panelden işlem yapın', 'Ad, şirket ve admin yetkisi düzenlenebilir', 'Şifre sıfırlama maili gönderilebilir', 'Hesap aktif/pasif yapılabilir veya silinebilir'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-amber-500 font-bold">→</span>
                {item}
              </li>
            ))}
          </ul>
          <a
            href="/admin/kullanici-listesi"
            className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[#F7F6F2] border border-[#E2E0D8] text-[#3A3935] hover:bg-[#ECEAE2] transition-colors text-center block"
          >
            👥 Kullanıcı Listesine Git
          </a>
        </div>
      </div>

      {/* ── Modal ── */}
      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={handleCreated} />}
    </div>
  )
}
