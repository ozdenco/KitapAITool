import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * HATA SINIRI — bir alt ağaçtaki render hatasını yakalar.
 *
 * NEDEN: Geçmiş Çıktılar'da bir kayıt açılırken render hatası oluşunca TÜM
 * uygulama çöküyor ve kullanıcı bembeyaz bir sayfa görüyordu (7 Eyl 2026).
 * Tek bir bozuk kaydın bütün paneli götürmesi kabul edilemez — özellikle
 * tanıtım haftasında bir KOBİ'ye demo yapılırken.
 *
 * React'te hata sınırı yalnızca SINIF bileşeniyle yazılabilir; işlevsel
 * karşılığı henüz yok.
 *
 * Hata mesajı kullanıcıya da gösteriliyor. Teknik görünüyor ama alternatifi
 * "bir şeyler ters gitti" demek ve sebebi asla öğrenememek.
 */

interface Props {
  children: ReactNode
  /** Hatanın hangi bağlamda olduğunu söyleyen kısa etiket. */
  baslik?: string
}

interface State {
  hata: Error | null
}

export class HataSiniri extends Component<Props, State> {
  state: State = { hata: null }

  static getDerivedStateFromError(hata: Error): State {
    return { hata }
  }

  componentDidCatch(hata: Error, bilgi: ErrorInfo) {
    // Tarayıcı konsoluna tam yığın izini bırak — teşhis için gerekli
    // eslint-disable-next-line no-console
    console.error('[HataSiniri]', this.props.baslik ?? '', hata, bilgi.componentStack)
  }

  render() {
    const { hata } = this.state
    if (!hata) return this.props.children

    return (
      <div className="bg-[#FDF2F2] border border-[#F3C4C4] rounded-xl p-4">
        <p className="text-[13px] font-semibold text-[#9B2C2C] mb-1">
          ⚠️ Bu kayıt görüntülenemedi
        </p>
        <p className="text-[12.5px] text-[#7A2222] leading-relaxed mb-2">
          Sayfanın geri kalanı çalışmaya devam ediyor. Diğer kayıtları açabilirsiniz.
        </p>
        <details className="text-[11.5px] text-[#7A2222]">
          <summary className="cursor-pointer select-none">Teknik ayrıntı</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words bg-white/60 rounded-lg p-2.5 max-h-48 overflow-y-auto">
            {hata.message}
          </pre>
        </details>
        <button
          type="button"
          onClick={() => this.setState({ hata: null })}
          className="mt-2.5 text-[12px] text-[#9B2C2C] underline hover:no-underline"
        >
          Tekrar dene
        </button>
      </div>
    )
  }
}
