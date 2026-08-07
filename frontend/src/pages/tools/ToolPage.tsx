import { useParams, Link } from 'react-router-dom'
import { GorunurlukSkoruPage } from './GorunurlukSkoruPage'
import { MusteriPersonaPage } from './MusteriPersonaPage'
import { IcerikTakvimiPage } from './IcerikTakvimiPage'

const TOOL_PAGES: Record<string, React.ComponentType> = {
  'gorunurluk-skoru': GorunurlukSkoruPage,
  'musteri-persona': MusteriPersonaPage,
  'icerik-takvimi': IcerikTakvimiPage,
}

export function ToolPage() {
  const { toolId } = useParams<{ toolId: string }>()

  if (!toolId) return <NotFound />

  const Page = TOOL_PAGES[toolId]
  if (!Page) return <ComingSoon toolId={toolId} />

  return <Page />
}

function ComingSoon({ toolId }: { toolId: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-5xl mb-4">🚀</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Çok Yakında</h2>
      <p className="text-gray-500 text-sm mb-6">
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{toolId}</span> aracı
        {' '}yakında kullanıma açılacak.
      </p>
      <Link to="/dashboard" className="text-sm text-[#1D9E75] hover:underline">
        ← Araçlara Dön
      </Link>
    </div>
  )
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
