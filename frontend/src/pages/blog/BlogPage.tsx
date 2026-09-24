import { Link } from 'react-router-dom'
import { BLOG_YAZILARI, okumaSuresi, tarihGoster } from '@/lib/blog'
import { YasalSayfa } from '@/components/legal/YasalSayfa'

export function BlogPage() {
  return (
    <YasalSayfa
      baslik="Blog"
      ozet="Küçük işletmeler için yapay zeka, pazarlama ve satış üzerine pratik rehberler."
    >
      <div className="flex flex-col gap-3">
        {BLOG_YAZILARI.map((yazi) => {
          const { dakika } = okumaSuresi(yazi)
          return (
            <Link
              key={yazi.slug}
              to={`/blog/${yazi.slug}`}
              className="block bg-white rounded-2xl border border-[#E2E0D8] p-5 hover:border-[#9FE1CB] hover:bg-[#FCFEFD] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[11px] text-[#9A9792]">{tarihGoster(yazi.tarih)}</span>
                <span className="text-[11px] text-[#D3D1C7]">·</span>
                <span className="text-[11px] text-[#9A9792]">{dakika} dk okuma</span>
              </div>

              <h2 className="text-[15px] font-semibold text-[#1C1B19] group-hover:text-[#085041] transition-colors mb-1.5">
                {yazi.baslik}
              </h2>
              <p className="text-[13px] text-[#6B6963] leading-relaxed mb-3">{yazi.ozet}</p>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1.5 flex-wrap">
                  {yazi.etiketler.map((etiket) => (
                    <span
                      key={etiket}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-[#F0FAF6] border border-[#9FE1CB] text-[#085041]"
                    >
                      {etiket}
                    </span>
                  ))}
                </div>
                <span className="text-[12px] font-medium text-[#1D9E75]">Devamını oku →</span>
              </div>
            </Link>
          )
        })}
      </div>
    </YasalSayfa>
  )
}
