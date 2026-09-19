import { useMemo, useState } from 'react'
import { ITIRAZ_KATEGORILERI, itirazKategorisi } from '@/lib/whatsappItirazlar'

interface ItirazSeciciProps {
  secilenler: string[]
  onChange: (yeni: string[]) => void
  /** Bu sayıya ulaşınca yeni ekleme kapanır — prompt'un şişmesini engeller. */
  enFazla?: number
}

const VARSAYILAN_EN_FAZLA = 10

/** Aksan/büyük-küçük farkını yok sayan karşılaştırma (Türkçe arama için). */
function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim()
}

/**
 * İtiraz seçimi — soldaki katalogdan sağdaki listeye aktarma.
 *
 * NEDEN: 6 maddelik checkbox ızgarası son kullanıcıya yetersiz geldi.
 * 36 maddeyi aynı ızgarada göstermek formu boğardı; bunun yerine
 * kategori filtresi + arama ile kaydırmalı tek panel kullanıyoruz —
 * sayfalama yok, her şey tek ekranda kalıyor.
 */
export function ItirazSecici({ secilenler, onChange, enFazla = VARSAYILAN_EN_FAZLA }: ItirazSeciciProps) {
  const [arama, setArama] = useState('')
  const [aktifKategori, setAktifKategori] = useState<string>('hepsi')
  const [serbestMetin, setSerbestMetin] = useState('')

  const doluMu = secilenler.length >= enFazla

  // Katalog: kategori filtresi + arama uygulanmış, seçilmiş olanlar çıkarılmış
  const gorunenKategoriler = useMemo(() => {
    const q = sadelestir(arama)
    return ITIRAZ_KATEGORILERI
      .filter((k) => aktifKategori === 'hepsi' || k.id === aktifKategori)
      .map((k) => ({
        ...k,
        itirazlar: k.itirazlar.filter(
          (it) => !secilenler.includes(it) && (q === '' || sadelestir(it).includes(q)),
        ),
      }))
      .filter((k) => k.itirazlar.length > 0)
  }, [arama, aktifKategori, secilenler])

  const ekle = (itiraz: string) => {
    if (doluMu || secilenler.includes(itiraz)) return
    onChange([...secilenler, itiraz])
  }

  const cikar = (itiraz: string) => {
    onChange(secilenler.filter((x) => x !== itiraz))
  }

  const serbestEkle = () => {
    const temiz = serbestMetin.trim()
    if (!temiz || doluMu) return
    // Aynı itiraz iki kez eklenmesin (büyük/küçük harf farkı dahil)
    if (secilenler.some((x) => sadelestir(x) === sadelestir(temiz))) {
      setSerbestMetin('')
      return
    }
    onChange([...secilenler, temiz])
    setSerbestMetin('')
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
        <p className="text-sm font-medium text-[#6B6963]">En sık karşılaştığınız itirazlar</p>
        <p className="text-[12px] text-[#9A9792]">
          {secilenler.length} / {enFazla} seçildi
          {doluMu && <span className="text-[#B4750E]"> · sınıra ulaşıldı</span>}
        </p>
      </div>
      <p className="text-[12px] text-[#9A9792] mb-3">
        Listeden tıklayarak sağa taşıyın. Seçtiğiniz her itiraz için ayrı bir ikna metni yazılır.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ── Sol: katalog ── */}
        <div className="border border-[#D3D1C7] rounded-xl overflow-hidden bg-white flex flex-col">
          <div className="px-3 py-2.5 border-b border-[#E2E0D8] bg-[#F7F6F2] flex flex-col gap-2">
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="İtiraz ara…"
              aria-label="İtiraz ara"
              className="w-full px-2.5 py-1.5 text-[13px] border border-[#D3D1C7] rounded-lg bg-white focus:outline-none focus:border-[#1D9E75]"
            />
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setAktifKategori('hepsi')}
                className={`px-2 py-1 rounded-full text-[11px] transition-colors ${
                  aktifKategori === 'hepsi'
                    ? 'bg-[#1D9E75] text-white'
                    : 'bg-white border border-[#D3D1C7] text-[#6B6963] hover:border-[#B4B2A9]'
                }`}
              >
                Hepsi
              </button>
              {ITIRAZ_KATEGORILERI.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setAktifKategori(k.id)}
                  className={`px-2 py-1 rounded-full text-[11px] transition-colors ${
                    aktifKategori === k.id
                      ? 'bg-[#1D9E75] text-white'
                      : 'bg-white border border-[#D3D1C7] text-[#6B6963] hover:border-[#B4B2A9]'
                  }`}
                >
                  {k.ikon} {k.ad}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto p-2 flex flex-col gap-2">
            {gorunenKategoriler.length === 0 ? (
              <p className="text-[12px] text-[#9A9792] text-center py-6">
                {arama ? 'Eşleşen itiraz yok — aşağıdan kendiniz yazabilirsiniz.' : 'Tüm itirazlar seçildi.'}
              </p>
            ) : (
              gorunenKategoriler.map((k) => (
                <div key={k.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A9792] px-1 mb-1">
                    {k.ikon} {k.ad}
                  </p>
                  <div className="flex flex-col gap-1">
                    {k.itirazlar.map((it) => (
                      <button
                        key={it}
                        type="button"
                        onClick={() => ekle(it)}
                        disabled={doluMu}
                        title={doluMu ? `En fazla ${enFazla} itiraz seçebilirsiniz` : 'Seçime ekle'}
                        className="flex items-center justify-between gap-2 text-left px-2.5 py-[7px] rounded-lg text-[13px] text-[#1C1B19] hover:bg-[#F0FAF6] hover:text-[#085041] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>{it}</span>
                        <span className="text-[#1D9E75] shrink-0" aria-hidden="true">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Sağ: seçilenler ── */}
        <div className="border border-[#D3D1C7] rounded-xl overflow-hidden bg-white flex flex-col">
          <div className="px-3 py-2.5 border-b border-[#E2E0D8] bg-[#F0FAF6] flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[#085041]">Seçtikleriniz</p>
            {secilenler.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-[#6B6963] hover:text-[#E05252] transition-colors"
              >
                Tümünü kaldır
              </button>
            )}
          </div>

          {/*
            Seçilenler listesinde YÜKSEKLİK SINIRI YOK.

            Eskiden burada da max-h-[280px] vardı ve panel tam 7 öğe alıyordu;
            seçim sınırı ise 10. Yani 8-10 itiraz seçen kullanıcı son seçimlerini
            HİÇ göremiyordu — macOS'ta kaydırma çubuğu kendiliğinden görünmediği
            için liste kesilmiş gibi değil, eksik seçilmiş gibi duruyordu
            (19 Eyl 2026'da ölçüldü: 10 öğe = 387px, kutu 280px, 2 öğe görünmez).

            Liste zaten `enFazla` ile sınırlı olduğu için serbest bırakmak güvenli.
            overflow-y-auto, çağıran taraf çok yüksek bir `enFazla` verirse
            emniyet supabı olarak duruyor.
          */}
          <div className="overflow-y-auto p-2 flex-1">
            {secilenler.length === 0 ? (
              <p className="text-[12px] text-[#9A9792] text-center py-6">
                Henüz itiraz seçmediniz.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {secilenler.map((it) => {
                  const kat = itirazKategorisi(it)
                  return (
                    <button
                      key={it}
                      type="button"
                      onClick={() => cikar(it)}
                      title="Seçimden çıkar"
                      className="flex items-center gap-2 text-left px-2.5 py-[7px] rounded-lg text-[13px] text-[#085041] bg-[#F0FAF6] hover:bg-[#FDECEC] hover:text-[#B33A3A] transition-colors"
                    >
                      <span className="shrink-0" aria-hidden="true">‹</span>
                      <span className="flex-1">{it}</span>
                      <span className="text-[10px] text-[#9A9792] shrink-0">
                        {kat ? kat.ikon : '✏️ kendi'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Serbest metin — listede olmayan itirazlar için */}
          <div className="px-2 py-2 border-t border-[#E2E0D8] bg-[#F7F6F2] flex gap-1.5">
            <input
              type="text"
              value={serbestMetin}
              onChange={(e) => setSerbestMetin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  serbestEkle()
                }
              }}
              disabled={doluMu}
              placeholder="Kendi itirazınızı yazın…"
              aria-label="Kendi itirazınızı yazın"
              className="flex-1 min-w-0 px-2.5 py-1.5 text-[13px] border border-[#D3D1C7] rounded-lg bg-white focus:outline-none focus:border-[#1D9E75] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={serbestEkle}
              disabled={doluMu || !serbestMetin.trim()}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[#1D9E75] text-white hover:bg-[#178a65] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
