/**
 * Güvenli AI JSON ayrıştırıcısı.
 *
 * AI modelleri zaman zaman JSON çıktısını markdown kod bloğuna sarar
 * (```json ... ```) veya string alanlarında kaçırılmamış satır sonu
 * karakterleri bırakır. Bu fonksiyon o durumları ele alır:
 *
 * 1. Markdown kod bloğu çıtalarını soyar.
 * 2. JSON olmayan baştaki / sondaki metni kırpar.
 * 3. Temizlenmiş string'i JSON.parse'a verir.
 */
export function parseAiJson<T>(raw: unknown): T {
  if (typeof raw !== 'string') return raw as T

  // Markdown kod bloğunu soy: ```json\n...\n``` veya ```\n...\n```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // JSON nesnesi ya da dizisinin başını ve sonunu bul
  const firstBrace = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')

  const hasBrace = firstBrace !== -1
  const hasBracket = firstBracket !== -1

  if (hasBrace || hasBracket) {
    const isObject =
      hasBrace && (!hasBracket || firstBrace < firstBracket)
    const start = isObject ? firstBrace : firstBracket
    const endChar = isObject ? '}' : ']'
    const end = cleaned.lastIndexOf(endChar)

    if (end > start) {
      cleaned = cleaned.slice(start, end + 1)
    }
  }

  return JSON.parse(cleaned) as T
}
