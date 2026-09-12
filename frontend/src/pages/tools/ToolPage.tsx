import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { TOOLS } from '@/lib/tools'
import { GorunurlukSkoruPage } from './GorunurlukSkoruPage'
import { MusteriPersonaPage } from './MusteriPersonaPage'
import { IcerikTakvimiPage } from './IcerikTakvimiPage'
import { WhatsappSatisPage } from './WhatsappSatisPage'
import { ReklamButcePage } from './ReklamButcePage'
import { MusteriGeriDonusPage } from './MusteriGeriDonusPage'
import { RakipAnalizPage } from './RakipAnalizPage'
import { ChatbotSenaryoPage } from './ChatbotSenaryoPage'
import { AiGorunurlukPage } from './AiGorunurlukPage'
import { ViralVideoPage } from './ViralVideoPage'
import { TrendVideoPage } from './TrendVideoPage'
import { VideoOlusturmaPage } from './VideoOlusturmaPage'

const TOOL_PAGES: Record<string, React.ComponentType> = {
  'gorunurluk-skoru': GorunurlukSkoruPage,
  'musteri-persona': MusteriPersonaPage,
  'icerik-takvimi': IcerikTakvimiPage,
  'whatsapp-satis': WhatsappSatisPage,
  'reklam-butce': ReklamButcePage,
  'musteri-geri-donus': MusteriGeriDonusPage,
  'rakip-analiz': RakipAnalizPage,
  'chatbot-senaryo': ChatbotSenaryoPage,
  'ai-gorunurluk': AiGorunurlukPage,
  'viral-video': ViralVideoPage,
  'trend-video': TrendVideoPage,
  'video-olusturma': VideoOlusturmaPage,
}

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const yonetici = useAuthStore((s) => s.user?.isAdmin ?? false)

  if (!toolId) return <NotFound />

  const Page = TOOL_PAGES[toolId]
  if (!Page) return <NotFound />

  /*
   * ADRESİ BİLEN GİREMESİN (12 Eyl 2026). Araç kaydında active:false olan
   * araçlar hiçbir listede görünmüyordu ama /arac/<id> adresi elle yazıldığında
   * sayfa yine de açılıyordu — gizlemek erişimi engellemiyor. Sunucu tarafında
   * da aynı kısıt var (ToolsController.YoneticiAraclari); bu yalnızca kullanıcıyı
   * boş bir forma sokmamak için.
   */
  const arac = TOOLS.find((t) => t.id === toolId)
  if (arac?.active === false && !yonetici) return <NotFound />

  return <Page />
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">🔍</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Araç Bulunamadı</h2>
      <Link to="/dashboard" className="text-sm text-[#1D9E75] hover:underline">
        ← Araçlara Dön
      </Link>
    </div>
  )
}
