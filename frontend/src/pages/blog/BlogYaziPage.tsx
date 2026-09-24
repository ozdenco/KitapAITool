import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { yaziBul, ilgiliYazilar, okumaSuresi, tarihGoster, type Blok } from '@/lib/blog'
import { TOOLS } from '@/lib/tools'
import { YasalSayfa } from '@/components/legal/YasalSayfa'
import { RehberKutusu } from '@/components/RehberKutusu'

function AracKutusu({ toolId, metin }: { toolId: string; metin: string }) {
  const arac = TOOLS.find((t) => t.id === toolId)
  if (!arac) return null

  return (
    <div className="bg-[#F0FAF6] border border-[#9FE1CB] rounded-2xl p-5 my-5">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[22px] leading-none" aria-hidden="true">{arac.icon}</span>
        <p className="text-[14px] font-semibold text-[#085041]">{arac.name}</p>
      </div>
      <p className="text-[13px] text-[#3A3935] leading-relaxed mb-3">{metin}</p>
      <Link
        to={`/arac/${arac.id}`}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold bg-[#1D9E75] text-white hover:bg-[#178a65] transition-colors"
      >
        Aracı Aç →
      </Link>
    </div>
  )
}

function BlokCiz({ blok }: { blok: Blok }) {
  switch (blok.tur) {
    case 'h2':
      return <h2 className="text-[16px] font-semibold text-[#1C1B19] mt-6 mb-2">{blok.metin}</h2>
    case 'p':
      return <p className="text-[14px] text-[#3A3935] leading-[1.75] mb-3">{blok.metin}</p>
    case 'liste':
      return (
        <ul className="list-disc pl-5 space-y-1.5 mb-3 text-[14px] text-[#3A3935] leading-relaxed">
          {blok.maddeler.map((m, i) => <li key={i}>{m}</li>)}
        </ul>
      )
    case 'sirali':
      return (
        <ol className="list-decimal pl-5 space-y-1.5 mb-3 text-[14px] text-[#3A3935] leading-relaxed">
          {blok.maddeler.map((m, i) => <li key={i}>{m}</li>)}
        </ol>
      )
    case 'not':
      return (
        <div className="border-l-[3px] border-[#1D9E75] bg-[#F7F6F2] rounded-r-lg px-4 py-3 my-4">
          <p className="text-[13px] text-[#3A3935] leading-relaxed">{blok.metin}</p>
        </div>
      )
    case 'aracCta':
      return <AracKutusu toolId={blok.toolId} metin={blok.metin} />
  }
}

export function BlogYaziPage() {
  const { slug } = useParams<{ slug: string }>()
  const yazi = slug ? yaziBul(slug) : undefined

  // Yeni yazıya geçildiğinde sayfa başına dön
  useEffect(() => { window.scrollTo(0, 0) }, [slug])

  if (!yazi) {
    return (
      <YasalSayfa baslik="Yazı bulunamadı">
        <p className="text-[13px] text-[#6B6963]">
          Aradığınız yazı yayından kaldırılmış olabilir.{' '}
          <Link to="/blog" className="text-[#1D9E75] hover:underline">Blog\'a dönün</Link>.
        </p>
      </YasalSayfa>
    )
  }

  const { dakika, kelime } = okumaSuresi(yazi)
  const digerleri = ilgiliYazilar(yazi.slug)

  return (
    <YasalSayfa baslik={yazi.baslik} ozet={yazi.ozet}>
      <div className="flex items-center gap-2 flex-wrap -mt-2 mb-4">
        <span className="text-[11px] text-[#9A9792]">{tarihGoster(yazi.tarih)}</span>
        <span className="text-[11px] text-[#D3D1C7]">·</span>
        <span className="text-[11px] text-[#9A9792]">{dakika} dk okuma · {kelime} kelime</span>
      </div>

      <article>
        {yazi.bloklar.map((blok, i) => <BlokCiz key={i} blok={blok} />)}
      </article>

      {/* Rehber teklifi — yazı biter bitmez, ilgili yazılar okuyucuyu
          başka yere çekmeden önce. Ziyaretçiye form, kayıtlıya indirme. */}
      <RehberKutusu />

      {digerleri.length > 0 && (
        <div className="mt-8 pt-5 border-t border-[#E2E0D8]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A9792] mb-3">
            Devam edin
          </p>
          <div className="flex flex-col gap-2">
            {digerleri.map((d) => (
              <Link
                key={d.slug}
                to={`/blog/${d.slug}`}
                className="block bg-white rounded-xl border border-[#E2E0D8] p-4 hover:border-[#9FE1CB] transition-colors group"
              >
                <p className="text-[13px] font-semibold text-[#1C1B19] group-hover:text-[#085041] transition-colors mb-1">
                  {d.baslik}
                </p>
                <p className="text-[12px] text-[#6B6963] leading-relaxed">{d.ozet}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <Link to="/blog" className="text-[13px] text-[#1D9E75] hover:underline">
          ← Tüm yazılar
        </Link>
      </div>
    </YasalSayfa>
  )
}
