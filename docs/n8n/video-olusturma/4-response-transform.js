/**
 * RESPONSE TRANSFORM — Gemini cevabını çözümler
 * n8n düğümü: "Response Transform" (Code)
 * ─────────────────────────────────────────────────────────────────────────────
 * MiniMax sürümünden üç fark:
 *   - Cevap yolu farklı: candidates[0].content.parts[].text
 *   - <think> temizliği GEREKMİYOR — Gemini reasoning bloğu döndürmüyor
 *   - TR_RESTORE (GBK karakter onarımı) KALDIRILDI — o MiniMax'a özgü bir
 *     kodlama hatasıydı, Gemini'de karşılığı yok
 *
 * responseMimeType: 'application/json' istendiği için cevap genelde temiz JSON
 * geliyor; yine de markdown sarmalayıcı ve sondaki fazla virgül gibi sapmalara
 * karşı onarım katmanı korundu.
 */

const cevap = $input.first().json;

// Gemini engelleme/durdurma bildirirse sessiz boş cevap yerine açık hata ver.
const aday = cevap?.candidates?.[0];
if (!aday) {
  const sebep = cevap?.promptFeedback?.blockReason
    || cevap?.error?.message
    || 'bilinmiyor';
  return [{ json: { _parseError: true, error: 'Gemini yanıt vermedi: ' + sebep } }];
}
if (aday.finishReason && !['STOP', 'MAX_TOKENS'].includes(aday.finishReason)) {
  return [{ json: { _parseError: true, error: 'Gemini isteği durdurdu: ' + aday.finishReason } }];
}

/*
 * thought:true parçaları AYIKLANIYOR. Gemini 3.x düşünen bir model;
 * varsayılanda akıl yürütme parçalarını döndürmüyor ama thinkingConfig
 * değişirse dönebilir. Filtre olmadan düşünce metni JSON'un başına
 * karışıp çözümlemeyi bozardı.
 */
let text = (aday.content?.parts || [])
  .filter((p) => !p?.thought)
  .map((p) => p?.text || '')
  .join('')
  .trim();

// ```json ... ``` sarmalayıcısını kaldır
text = text.replace(/```(?:json)?/gi, '');

const jsonStart = text.indexOf('{');
const jsonEnd = text.lastIndexOf('}');
if (jsonStart !== -1 && jsonEnd !== -1) text = text.slice(jsonStart, jsonEnd + 1);

/** Sondaki fazla virgül ve kontrol karakterleri modelin en sık iki sapması. */
function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e1) {
    const onarilmis = raw
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    try {
      return { ok: true, value: JSON.parse(onarilmis) };
    } catch (e2) {
      return { ok: false, error: e1.message };
    }
  }
}

const parsed = tryParseJson(text);
if (!parsed.ok) {
  return [{ json: {
    _parseError: true,
    _rawText: text.slice(0, 500),
    error: 'AI çıktısı geçerli JSON değildi: ' + parsed.error,
  } }];
}

return [{ json: { ...parsed.value, _ok: true } }];
