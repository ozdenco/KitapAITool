/**
 * Güvenli AI JSON ayrıştırıcısı.
 *
 * LLM'lerin yaygın çıktı sorunlarını 3 aşamalı stratejiyle düzeltir:
 * 1. Temizleme: <think> blokları, markdown kod blokları, önce/sonra metin
 * 2. Onarım: escape edilmemiş kontrol karakterleri, dizi elemanları arası eksik virgül
 * 3. Kesilmiş JSON onarımı: kapanmamış { ve [ parantezleri kapatılır,
 *    sondaki fazla virgüller temizlenir (uzun içerikte LLM token limit'e takılır)
 */
export function parseAiJson<T>(raw: unknown): T {
  if (typeof raw !== 'string') return raw as T

  // ─── 1. Temizle ───────────────────────────────────────────────────────────

  // MiniMax <think>...</think> bloğunu soy
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Markdown kod bloklarını soy: ```json...\n...\n``` veya ```\n...\n```
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // JSON'un başlangıcını bul ({ veya [)
  const firstBrace   = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')
  const hasBrace     = firstBrace !== -1
  const hasBracket   = firstBracket !== -1

  if (!hasBrace && !hasBracket) {
    throw new Error('Yapay zeka yanıtı işlenemedi. Lütfen tekrar deneyin.')
  }

  const isObject = hasBrace && (!hasBracket || firstBrace < firstBracket)
  const start    = isObject ? firstBrace : firstBracket
  const endChar  = isObject ? '}' : ']'

  // "fromStart": JSON başından itibaren tam metin (kesilmiş olabilir)
  const fromStart = cleaned.slice(start)

  // "trimmed": JSON başından son kapanış karakterine kadar kısmı al
  const lastEnd = cleaned.lastIndexOf(endChar)
  const trimmed = lastEnd > start ? cleaned.slice(start, lastEnd + 1) : fromStart

  // ─── 2. Doğrudan parse (en hızlı yol) ────────────────────────────────────

  try { return JSON.parse(trimmed) as T } catch { /* devam */ }

  // ─── 3. Kontrol karakteri + eksik virgül onarımı ─────────────────────────

  const repairedTrimmed = repairJson(trimmed)
  try { return JSON.parse(repairedTrimmed) as T } catch { /* devam */ }

  // ─── 4. Kesilmiş JSON onarımı (token limit'e takılan çıktılar) ───────────
  //    fromStart üzerinde çalış — trimmed versiyonda item5'in parçası kaybolmuş olabilir

  const repairedFull = repairJson(fromStart)
  try {
    const patched = removeTrailingCommas(repairTruncated(repairedFull))
    return JSON.parse(patched) as T
  } catch {
    throw new Error('Yapay zeka yanıtı işlenemedi. Lütfen tekrar deneyin.')
  }
}

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

/**
 * JSON'daki iki yaygın LLM hatasını tek geçişte düzeltir:
 * 1. String değerleri içindeki escape edilmemiş kontrol karakterleri (\n, \r, \t)
 * 2. Dizi / nesne elemanları arasındaki eksik virgüller (}{ → },{)
 */
function repairJson(text: string): string {
  let result = ''
  let inString = false
  let escaped = false
  let lastNonWsChar = ''
  let lastNonWsPos = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      result += ch
      escaped = false
      lastNonWsChar = ch
      lastNonWsPos = result.length - 1
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escaped = true
      lastNonWsChar = ch
      lastNonWsPos = result.length - 1
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      lastNonWsChar = ch
      lastNonWsPos = result.length - 1
      continue
    }

    if (inString) {
      // Escape edilmemiş kontrol karakterlerini düzelt
      if (ch === '\n') { result += '\\n'; lastNonWsChar = 'n'; lastNonWsPos = result.length - 1; continue }
      if (ch === '\r') { result += '\\r'; lastNonWsChar = 'r'; lastNonWsPos = result.length - 1; continue }
      if (ch === '\t') { result += '\\t'; lastNonWsChar = 't'; lastNonWsPos = result.length - 1; continue }
      if (ch.charCodeAt(0) < 32) continue
      result += ch
      lastNonWsChar = ch
      lastNonWsPos = result.length - 1
      continue
    }

    // String dışı boşluk — izle ama son anlamlı konumu güncelleme
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      result += ch
      continue
    }

    // Açılış karakteri: önceki kapanıştan sonra virgül eksikse ekle
    if (ch === '{' || ch === '[') {
      if (lastNonWsChar === '}' || lastNonWsChar === ']' || lastNonWsChar === '"') {
        result = result.slice(0, lastNonWsPos + 1) + ',' + result.slice(lastNonWsPos + 1)
        lastNonWsPos++
      }
    }

    result += ch
    lastNonWsChar = ch
    lastNonWsPos = result.length - 1
  }

  return result
}

/**
 * Token limit nedeniyle kesilmiş JSON'u onarır.
 * Açık kalan { ve [ parantezlerini takip eder, metnin sonunda kapatır.
 * String içinde kesilmişse önce string'i kapatır.
 */
function repairTruncated(text: string): string {
  const stack: string[] = []
  let inString = false
  let escaped = false

  for (const ch of text) {
    if (escaped) { escaped = false; continue }
    if (ch === '\\' && inString) { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue

    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if ((ch === '}' || ch === ']') && stack.length > 0) stack.pop()
  }

  let result = text
  // String içinde kesmişse kapat
  if (inString) result += '"'
  // Açık parantezleri ters sırayla kapat
  for (let i = stack.length - 1; i >= 0; i--) result += stack[i]

  return result
}

/**
 * JSON'da } veya ] öncesindeki sondaki virgülleri temizler.
 * Kesilmiş JSON onarımından sonra kalabilecek trailing comma'ları giderir.
 * repairJson sonrası string içleri temizlenmiş olduğundan regex güvenle çalışır.
 */
function removeTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, '$1')
}
