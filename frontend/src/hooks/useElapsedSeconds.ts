import { useEffect, useState } from 'react'

/**
 * Bir işlem sürerken geçen saniyeyi sayar.
 *
 * AI araçları 15–60 saniye arası sürebildiği için sabit "bekleyin" mesajı
 * kullanıcıya donmuş hissi veriyordu; sayaç ilerlediğini gösterir.
 *
 * Her yeni çalıştırmada sıfırdan başlar.
 *
 * @param isRunning İşlem sürüyor mu (genellikle `mutation.isPending`)
 * @returns Başlangıçtan bu yana geçen tam saniye
 */
export function useElapsedSeconds(isRunning: boolean): number {
  const [saniye, setSaniye] = useState(0)

  useEffect(() => {
    if (!isRunning) return

    setSaniye(0)                                   // yeni çalıştırma → sıfırla
    const id = setInterval(() => setSaniye((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRunning])

  return saniye
}
