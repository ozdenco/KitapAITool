/**
 * VEO PROMPT İSTE — senaryoyu Veo'nun anladığı dile çevirir
 * n8n düğümü: "Veo Prompt İste" (Code) · Mode: Run Once for All Items
 * ─────────────────────────────────────────────────────────────────────────────
 * NEDEN AYRI BİR GEMINI ÇAĞRISI:
 * Video Oluşturma aracının ürettiği `senaryo_taslagi` bir İNSANA yazılmış —
 * "usta yorumu okur, şaşırır, dışarı çıkar". Veo bunu anlamaz; ona plan ölçeği,
 * kamera hareketi, ışık, mekân ve stil gerekiyor. Aradaki çeviriyi bu adım
 * yapıyor.
 *
 * PROMPT DİLİ İNGİLİZCE, KONUŞMA TÜRKÇE: Veo İngilizce yönergelere belirgin
 * biçimde daha isabetli uyuyor. Ama SES de üretiyor — dil belirtilmezse
 * İngilizce konuşuyor ve video Türk izleyici için kullanılamaz hale geliyor
 * (7 Eyl 2026'da canlıda oldu). Bu yüzden yönerge İngilizce, replikler
 * tırnak içinde Türkçe veriliyor.
 *
 * ZİNCİRLEME KARARI DA BURADA VERİLİYOR ve VARSAYILAN "ZİNCİRLE"DİR.
 * Zincirleme, önceki sahnenin son karesini başlangıç görseli olarak veriyor;
 * mekân, eşyalar ve YÜZLER ancak böyle sabit kalıyor. Metin tek başına bir
 * kişiyi tanımlayamaz.
 *
 * Yalnızca gerçek mekân/kamera değişimi "kesme"dir. Kadraja birinin girmesi
 * KESME DEĞİLDİR — 9 Eyl 2026'da öyle işaretlendi ve 3. sahnede ofis,
 * mikrofon, split-screen ve iki oyuncunun yüzü tamamen değişti.
 */

const body = $('Webhook').first().json.body || $('Webhook').first().json;

const senaryo      = String(body.senaryo || '').trim();
const hook         = String(body.hook || '').trim();
const dorukAn      = String(body.dorukAn || '').trim();
const gorselNotlar = String(body.gorselNotlar || '').trim();
const sektor       = String(body.sektor || '').trim();
const isletme      = String(body.isletme || '').trim();
const sahneSayisi  = Math.min(Math.max(Number(body.sahneSayisi) || 3, 1), 4);

if (senaryo.length < 20) {
  return [{ json: { hata: 'Senaryo çok kısa — video üretilemez.' } }];
}

/*
 * SENARYONUN KİLİT REPLİKLERİ — tırnak içindeki cümleler koddan çıkarılıp
 * modele AYRI, numaralı bir liste olarak veriliyor. Yalnızca kurala bırakınca
 * model esprili repliği başka kurallara uydurmak için yeniden yazdı (11 Eyl
 * 2026, iki ayrı koşuda: "Ruhsat bir, muayene iki, kasko… aaa şu jantlara bak!"
 * → "Kapıdan dosya gelmeden kasko…"). Açılış tırnağı boşluk/iki nokta sonrası,
 * kapanış ardından boşluk/noktalama gelmeli — "Allianz'ın" gibi kesme
 * işaretleri tırnak sanılmasın.
 */
const kilitReplikler = [...new Set(
  /*
   * TÜRKÇE KESME İŞARETİ (12 Eyl 2026): eski desen tırnak içindeki ' karakterini
   * KAPANIŞ sanıyordu; "Eşarj'a yanaştım", "Allianz'ım uygulamasında" gibi ekli
   * özel isim taşıyan her replik senaryodan koparılıyordu. Eşarj planında
   * espriyi kuran sayma cümlesi bu yüzden videoya hiç girmedi. Ardından HARF
   * gelen tırnak metnin parçasıdır; kapanış tırnağını boşluk/noktalama izler.
   */
  [...`${senaryo}\n${dorukAn}`.matchAll(/(?:^|[\s:(])['‘"“]((?:[^'’"”\n]|['’](?=[A-Za-zÇĞİÖŞÜçğıöşüâîû])){6,160}?)['’"”](?=[\s.,;:!?)]|$)/g)]
    .map((m) => m[1].trim()),
)]
  /*
   * MARKA ÇIKAR, CÜMLEYİ TUTMA DEĞİL (12 Eyl 2026). Eskiden firma adı geçen
   * replik tümden eleniyordu (11 Eyl 2026: "Sakin ol, Allianz Kasko anlaşmalı
   * servis ağında hallolur" aynen replik olmuştu). Ama bu, espriyi KURAN
   * cümleyi de götürdü: "Allianz Elektrikli Araç Kaskom var, Eşarj'a
   * yanaştım... 400 TL ve üzeri taktım kabloyu..." düşünce sürücü videoda
   * adımları hiç saymadı ve senaryo kendi premisini gösteremedi.
   * Artık marka (ekleriyle) çıkarılıyor, cümle kalıyor; geriye üç kelimeden
   * azı kalırsa cümle zaten sırf reklamdır, elenir ("Allianz'ım
   * uygulamasında!" → "uygulamasında!").
   */
  .map((r) => {
    const marka = String(isletme || '').trim().split(/\s+/)[0] || '';
    if (marka.length < 3) return r;
    return r
      .replace(new RegExp(`${marka}(?:['’][A-Za-zÇĞİÖŞÜçğıöşüâîû]+)?`, 'gi'), '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;:–-]+/, '')
      .trim();
  })
  .filter((r) => r.split(/\s+/).filter(Boolean).length >= 3)
  .slice(0, 6);

const talimat = `You are a video director writing shot descriptions for Google Veo.

Convert the Turkish scenario below into EXACTLY ${sahneSayisi} shots of 8 seconds each.

SCENARIO (Turkish):
${senaryo}

${hook ? `HOOK — the framing line that opens the video (see the HOOK rule below): ${hook}\n` : ''}${dorukAn ? `THE PAYOFF MOMENT (must appear in the final shot): ${dorukAn}\n` : ''}${kilitReplikler.length ? `THE SCENARIO'S OWN LINES (Turkish) — the joke lives in these. Use the set-up and payoff lines almost WORD FOR WORD as "replik" (cut at most a few words to fit ~12 words; keep counting words like "bir, iki"). Never rewrite them to satisfy another rule — the entrance rule included. A line that only explains the joke after the payoff is dropped:\n${kilitReplikler.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}\n` : ''}${gorselNotlar ? `VISUAL STYLE OF THE REFERENCE VIDEO:\n${gorselNotlar}\n` : ''}${sektor ? `ADVERTISER'S SECTOR: ${sektor} — this is the company paying for the video, NOT the place where the scene happens. If the scenario's characters are its customers (a shop owner, an usta, a small business team), the scene is set in THEIR business.\n` : ''}${isletme ? `ADVERTISER: ${isletme} (never shown or named on screen — the closing card carries it)\n` : ''}
ABOUT THE EXAMPLES IN THESE RULES: they come from many different businesses —
a hair salon, a bakery, a courier, an ad agency — and only illustrate a rule.
NEVER copy their people, props, lines, jokes or settings into this video. Who
appears, what they hold and what they say comes ONLY from the SCENARIO above.

RULES FOR EACH SHOT DESCRIPTION:
- Write the DIRECTION in ENGLISH. Veo follows English far more accurately.
- ⛔ THE SPOKEN LINE GOES IN BOTH PLACES: INSIDE "prompt" AND IN "replik".
  Veo speaks the line itself and moves the lips to match it, so write the
  Turkish sentence inside the prompt, in double quotes, attributed to the
  character and carrying the tone. The SAME sentence also goes in "replik" —
  our software burns it on screen as a subtitle.
  (Measured 12 Sep 2026: a quoted Turkish line with NO microphone in shot
  passes the audio filter and Veo pronounces the Turkish naturally. Before
  that we dubbed the video ourselves and the lips never matched the words.)
      "prompt":  "... {kuafor} looks at the mirror and says in Turkish, excited
                 and cheerful: \"Bu kesimle on yaş gençleştiniz!\" — her mouth
                 widening into a grin showing teeth, eyebrows lifted high"
      "replik":  "Bu kesimle on yaş gençleştiniz!"   (the same sentence, subtitle)
      "ton":     "heyecanlı ve neşeli"               (also written into the prompt)
      "konusan": which character speaks it

  ONE quoted line per shot, spoken by ONE character. Everyone else in the shot
  stays silent — see the SILENCE rule; an unassigned character gets improvised
  speech in a random language and the shot becomes unusable.
  ⛔ STILL NO MICROPHONES IN SHOT: the microphone is what trips the audio
  filter, not the line.
  If a shot has no speech at all, set "replik" to an empty string and write no
  quoted sentence in the prompt.

- ⛔ KEEP THE SCENARIO'S OWN KEY LINES.
  When the scenario quotes a line (in quotes, or as the payoff), use it
  almost word for word — it IS the joke. Shorten it only to fit the length
  rule below, and never rewrite it to satisfy another rule.
      scenario: 'Ruhsat bir, muayene iki, kasko... aaa şu jantlara bak ne parlıyor!'
      ✅ "replik": "Ruhsat bir, muayene iki, kasko... aaa şu jantlara bak!"
      ❌ "replik": "Evraklar kapıdan gelmeden sayayım... Aaa şu jantlara bak!"

- ⛔ KEEP EACH "replik" SHORT — under about 12 words.
  It has to fit the shot and be readable as a subtitle. Split a long line
  across two shots rather than cramming it into one.
  Use "..." where the speaker should pause; the speech layer follows it.

- ⛔ EVERY VALUE IS A NORMAL JSON STRING IN DOUBLE QUOTES — WITH NO QUOTE
  MARKS INSIDE IT.
  Your answer is parsed as JSON. A value opened with a single quote, or a
  double quote inside a value, breaks the parse and the whole plan is thrown
  away — this broke production on 9 Sep and again on 11 Sep 2026.
      ✅ "replik": "Siparişiniz yarın sabah kapınızda."
      ✅ "replik": "Bu strateji KOBİ'ler için birebir."   (apostrophe inside a word is fine)
      ❌ "replik": 'Siparişiniz yarın sabah kapınızda.'  (value in single quotes)
      ❌ "replik": "Müşteri "harika" dedi."              (quotes inside the value)
  If a character repeats someone's words, write them without quote marks.
- Describe what is VISIBLE: subject, action, framing (close-up / medium / wide),
  camera movement, lighting, location, mood.
- People are described ONCE, in "karakterler". Inside a prompt refer to them
  ONLY by placeholder {key}, where key is that character's key in
  "karakterler" — short lowercase ASCII, e.g. isletme_sahibi, musteri, kurye,
  usta, anlatici. Name the roles the SCENARIO actually has.

CASTING — describe APPEARANCE, never nationality:
- ⛔ NEVER use the words "Turkish", "Turkey", "Türkiye", "Anatolian",
  "Ottoman", "Middle Eastern", "traditional", "ethnic", "bazaar" or
  "oriental" to describe a PERSON, their CLOTHING or the LOCATION.
  Naming the nationality makes the model reach for historical costume
  drama — fez, kaftan, old bazaar, period setting — instead of an
  ordinary present-day person. This has happened in practice.

  This ban is absolute now: the spoken line lives in "replik" and is voiced by
  our own speech layer, so the prompt never needs to name a language at all.
      ❌ A Turkish shopkeeper in traditional dress...
- Describe ONLY physical features, like this:
      "a man in his 40s with chestnut-brown hair, a short dark beard,
       light olive skin and brown eyes"
      "a woman in her 30s with wavy light-brown hair and hazel eyes"
- Colouring to use: chestnut or light-to-dark brown hair (not blonde,
  not black); light to light-olive skin; brown or hazel eyes.
- ERA IS MANDATORY: "ortam" and every "karakterler" entry must say "present-day"; describe modern
  clothing — "a plain modern button-up shirt", "a simple knit sweater".
  Never period costume, never historical or folkloric dress.
- LOCATION: say "a modern small shop", "a contemporary small office",
  "a present-day workshop". Never a historic or market-bazaar setting.
- ⛔ THE PLACE BELONGS TO THE PEOPLE IN THE SCENARIO.
  Derive "ortam" from who the characters are and where they work: an usta
  works in a workshop, a kuaför in a salon, a shop owner behind a counter.
  When the advertiser sells a service TO small businesses (software,
  marketing, consulting), the scene is set in the CUSTOMER'S small business —
  their shop, workshop or modest back office — never in a "tech company
  office". The viewer is that small-business owner and must recognise their
  own place (11 Sep 2026: a plan put a shop owner and his senior craftsman
  in a "tech company office").
- Write each person's physical description once, in "karakterler". Our
  software pastes it word-for-word into every shot so Veo draws the same face.

- ⛔ DESCRIBE EVERY VISIBLE PERSON — NO UNDESCRIBED EXTRAS.
  State how many people are on screen and name EACH ONE by placeholder.
  Every placeholder you use must have an entry in "karakterler" with full
  detail (age, hair colour, facial hair, clothing). A placeholder with no
  entry stops the plan.
  If only one person is on screen, write exactly: "No other people are visible."
  Never write "and a colleague", "with an assistant", "a second person"
  without describing them.
  Anyone you leave undescribed is invented by Veo at random — in production
  this produced a second man who matched nothing in the brief (9 Sep 2026).

- ⛔ EVERY SPEAKER TALKS TO SOMEONE — SHOW WHO.
  A person talking straight into the camera or into an empty room reads as a
  presenter, not as a scene. Make the listener visible in the action:
    • another character in the shot — the speaker turns his head toward them;
    • a customer on the phone — the phone held to his ear;
    • a written reply — he reads it aloud from his phone screen as he types.
  Match the line: a line that answers a customer ("fiyat bilgisi ektedir")
  needs the phone; a line that addresses a colleague needs that colleague
  in frame, looked at. Never a phone or device held up to the mouth like a
  microphone. (11 Sep 2026: an intern said "the price list is attached"
  straight into the camera; it looked like no one was being answered.)
      ✅ "{stajyer} holds his phone, eyes on the screen, typing with his thumb
          and reading his reply aloud in a flat, tired voice"
      ❌ "{stajyer} talks toward the front in a tired monotone"

- ⛔ SAY WHO SPEAKS, AND WHAT THE OTHERS ARE DOING INSTEAD.
  Only a character with an explicit written line may speak. For every other
  person in the shot, describe them POSITIVELY with a closed mouth — see the
  SILENCE rule below. Veo gives unassigned characters improvised speech in an
  arbitrary language, which makes the video unusable.
  If nobody speaks, write "No dialogue."
- ⛔ NO MICROPHONES IN SHOT. NO PODCAST / RECORDING SET-UPS.
  A visible microphone signals "speech happening here" and pushes Veo into
  heavier speech synthesis, which repeatedly hit its audio safety filter and
  BLOCKED THE WHOLE GENERATION.
  Measured on 10 Sep 2026: four attempts with a podcast microphone were all
  refused with "an issue with the audio for your prompt"; the identical scene
  with the microphone removed generated on the first try.
  Never write "podcast microphone", "desktop broadcast microphone", "leans into
  the microphone", "recording studio", "podcast desk".
  Put the same two people at a plain table, a shop counter or a workbench and
  let them simply talk to each other.

- ⛔ THE DOOR CHIME GOES IN "efekt", NEVER IN "prompt".
  Veo's own audio is kept (it carries the speech), and our software mixes a
  shop-bell chime on top of it. Whenever a character ENTERS — through a
  door, into the room or into the frame — set "efekt": "zil" on THAT shot; our
  software adds a shop-bell chime at the start of it. Otherwise leave "efekt"
  empty. Do not describe bells, chimes or any sound in the prompt.
  ⛔ NO ANIMAL SOUND, NO SOUND WORD ANYWHERE IN THE PROMPT.
  Veo now produces the scene's own audio too, so a bark WOULD be heard — and
  that is exactly the problem: it lands on top of the character's Turkish line,
  Veo's version of it is unpredictable, and much of the audience watches muted.
  Never write "barks", "meows", "rings", "honks", "crash", music or applause,
  and never build the joke ON a sound. The payoff is VISIBLE: the dog pushes
  its nose out and tilts its head, the phone screen lights up.
  (12 Sep 2026: this rule was briefly softened and a barking dog came straight
  back into a pet-insurance plan.)

- ⛔ AN ENTRANCE MUST BE SET UP BEFORE IT HAPPENS.
  Viewers of a real video (11 Sep 2026) could not tell why a newcomer walked
  in carrying a prop: "what does that have to do with anything?" An entrance
  only lands if the audience already EXPECTS something from the door.
  ⚠️ This applies ONLY when the newcomer's arrival IS the payoff — he walks in
  and his news breaks what the others expected. If the newcomer only REACTS
  to a joke that already happened (laughs, comments), skip step 1: do not
  bend an earlier line toward the door. (11 Sep 2026: "Ruhsat bir, muayene
  iki, kasko… aaa şu jantlara bak!" was rewritten into "Evraklar kapıdan
  gelmeden sayayım…" and the counting joke was lost.)
  Build that expectation in two places:
  1. The line in the shot BEFORE the entrance names, concretely, what the
     characters expect to come through the door — customers, an order, a
     delivery, a guest — whatever the scenario dictates.
         ✅ "Yarından itibaren bu kapı müşteriden kapanmayacak!"
         ✅ "Kurye her an gelir, pastayı hemen kutulayalım!"
         ❌ a vague boast with no door and no arrival in it — the entrance
            that follows then makes no sense
  ⛔ PUT THE DOOR AT THE SIDE OF THE FRAME, NEVER BEHIND THE PEOPLE.
     Write it into "ortam": "a door at the right edge of the frame".
     With the door behind them, turning to the door turned their BACKS to the
     camera and the reaction on their faces was never seen (11 Sep 2026). The
     newcomer enters from the side and stops beside the desk or counter in
     three-quarter view; the others turn only their HEADS, faces stay visible.

  2. THE ENTRANCE SHOT HAS A FIXED TIMELINE — WRITE IT WITH THESE SECONDS.
     Our software starts the newcomer's voice 2.5 seconds into the shot. If
     the newcomer is not inside and facing the others by then, the line is
     heard over someone else's moving mouth (11 Sep 2026: half of the line
     played while the newcomer was still outside the door, and viewers
     thought another character was saying it).
         first 2 s : the people already in the room turn toward the door with
                     expectant faces, LIPS CLOSED; the newcomer walks in and
                     stops inside the room, facing them.
         from 3rd s: the newcomer talks; everyone else listens, mouths closed.
         last second: the others react, as the scenario dictates.
     Write it in the prompt with these time words: "In the first two
     seconds, … From the third second, {key} talks … In the final second, …"
     The camera stays still and every character stays fully in frame until
     the very last frame — that frame is frozen under the closing message
     (11 Sep 2026: two characters drifted out and the frozen ending showed
     only the newcomer).
         ✅ "In the first two seconds, {isletme_sahibi} and {usta} turn toward
             the door with expectant faces, lips closed, as {kurye} walks in
             and stops beside the counter. From the third second, {kurye}
             talks calmly while the other two listen, mouths closed. In the
             final second, their faces fall. The camera stays still and all
             three stay fully in frame."  

- No text overlays, no captions, no logos — Veo renders those badly.
  Turkish characters (ş, ğ, ı, İ, ç, ö, ü) come out mangled, and the video is
  published from a real business account.

- ⛔ THE HOOK IS NARRATION, NOT A CHARACTER'S LINE.
  The hook frames the video — it is the comment, message or claim the video
  reacts to. A real person would never say it out loud in the scene, and
  putting it in a character's mouth makes the opening sound unnatural (this
  happened in production, 10 Sep 2026: the shop owner recited the video's own
  framing sentence).
  ⛔ DO NOT PUT THE HOOK IN THE VIDEO AT ALL — NOT AS SPEECH, NOT AS TEXT.
  The hook is burned onto the finished video afterwards, by our own software.
  Off-screen narration was tried and Veo simply did not produce it
  (10 Sep 2026); on-screen text comes out with broken Turkish characters.
      ❌ prompt veya replik içinde hook cümlesinin geçmesi
      ❌ ekranda hook'u gösteren bir yazı/balon tarif edilmesi
      ❌ a caption or comment bubble showing the hook

  Instead, the FIRST SHOT shows the people REACTING to something they have
  just read or heard — a wry look, a sigh, a glance at each other. Their
  reaction must make sense to a viewer who reads the hook on screen.
  Give the first shot either no dialogue at all, or a short natural line that
  is NOT the hook itself.
- ⛔ NO SLOGANS, NO CTA, NO ADVERTISING COPY IN "replik".
  The closing call-to-action — business name, offer, "come to us" — is shown
  on a card at the end of the video by our software. A character who recites
  a slogan sounds like a TV advert read aloud and kills the scene; in test
  plans (11 Sep 2026) characters ended on lines like "Our shop is the best,
  everything here is transparent!" and "That's the difference we make."
  Characters talk to EACH OTHER about the situation in front of them, the way
  real people do. Never say the business name as a boast, never praise the
  business, never address the viewer, never repeat the CTA.
      ✅ "Şimdi içim çok rahat etti, elinize sağlık."
      ✅ "Bu saç bana mı ait, emin misiniz?"
      ❌ "Yıldız Kuru Temizleme'de kalite tesadüf değil!"
      ❌ "İşte bizim farkımız bu!"
      ❌ "Siz de hemen gelin, pişman olmayacaksınız."
- Never ask for a close-up or tight framing. Our software adds a wide framing
  to every shot so that every character stays fully in frame (11 Sep 2026: a
  tight frame hid the shop owner behind the intern and cut a colleague off).
- One continuous action per shot. Do not describe cuts inside a shot.
- 40-70 words per shot.

CHAINING RULE — THE MOST COMMON MISTAKE. READ CAREFULLY.
"zincirle": true feeds the previous shot's last frame to this shot, so the
room, the furniture, the framing and — above all — the FACES stay identical.
Without it Veo rebuilds everything from your text and CANNOT reproduce the
same faces, because text alone does not identify a person.

DEFAULT TO true. Only a genuine change of location or camera setup is a cut.

These are NOT cuts — chain them ("zincirle": true):
  • someone walks INTO or OUT OF the frame
  • a new person starts speaking while the camera stays put
  • the same people react, turn, stand up or sit down
  • time passes in the same room

These ARE cuts ("zincirle": false):
  • a different room, building or outdoor location
  • the camera moves to a completely different setup (e.g. wide street shot)

Marking a "someone enters" beat as a cut broke a real video on 9 Sep 2026:
the office, the microphone, the split-screen and both actors' faces all
changed between shot 2 and shot 3.

The first shot is always "zincirle": false.

⛔ NOBODY POPS IN.
Anyone who is in the room in a later shot WITHOUT walking in must be visible —
quiet, busy at the side of the frame — in EVERY earlier shot. Each shot
continues from the previous frame; a person missing there is either conjured
out of nowhere or Veo deletes someone else to make room (11 Sep 2026: a senior
craftsman existed only in the last shot, "raising his head at the side desk").
The "first two seconds / from the third second" timeline is for ENTRANCES.

⛔ A CHARACTER WHO ENTERS SPEAKS IN THE SAME SHOT.
Never end a shot with a newcomer who has just arrived and give the line in the
next shot. The next shot starts from the last frame, and Veo often loses a
character who was only at the edge of that frame. On 11 Sep 2026 a newcomer
walked in silently in shot 2; shot 3 began without him, his line was heard
over another character's moving mouth, and Veo then pushed a third character
out of the frame to fit him back in.
      ✅ shot 3: "{kurye} walks in holding the parcel and, unbothered, talks"
      ❌ shot 2: "{kurye} enters and stands quietly" → shot 3: "{kurye} talks"

⛔ NO BACK-REFERENCES — AND NO SETTING OR APPEARANCE INSIDE A SHOT.
Each shot is sent to Veo as a SEPARATE request with no memory of the others.
Our software makes every shot stand alone by pasting "ortam" and the full
"karakterler" descriptions into it. Inside "prompt" write ONLY the action.

BANNED inside "prompt":
      ❌ "Split-screen continues." / "Same setting as before."
      ❌ "the man in his 20s" / "the bearded man" / "the same two men"
      ❌ describing the room, the screen layout, or anyone's hair or clothes
Use the placeholder instead:
      ✅ "{musteri} walks in from the left, holding a shopping bag."

Why: when you wrote the setting into each shot yourself, you paraphrased it
differently every time (11 Sep 2026: "clean minimalist marketing analysis
animation above" → "digital graphic animations above" → "marketing graphic on
top"), and Veo drew a different room in each shot.

⛔ SILENCE MUST BE DESCRIBED POSITIVELY — BUT SILENT IS NOT PASSIVE.
"does not speak" is a negative instruction and Veo follows it poorly — a
character told not to speak still moved his mouth. Describe what the person
IS doing with a closed mouth instead:
      ✅ "listens with his lips closed, still, hands resting on the desk"
      ❌ "does not speak"

⛔ STAGE SILENT PEOPLE AWAY FROM THE "SPEAKING" POSE.
Text alone will not keep a silent character's mouth still. Veo has seen
thousands of scenes of two people at microphones and in nearly all of them
BOTH talk; that visual prior beats a written instruction. In production the
listener kept mumbling through two shots (10 Sep 2026).

So change the FRAME, not just the words. Give every silent person something
that physically occupies or hides the mouth, and move them out of the
speaking position:
      • sipping from a glass or mug
      • arms crossed, leaning back away from the microphone
      • head turned in three-quarter or profile view, looking at the speaker
      • looking down at a notebook or phone
      • hand resting against the chin or jaw
Then add the physical detail: "lips pressed together in a thin line, jaw
still". Concrete beats abstract.

Never leave a silent person squared up to a microphone in a neutral pose —
that is exactly the composition that makes Veo animate speech.

⛔ WHAT A CHARACTER LOOKS AT GOES TO THE SIDE, NEVER BEHIND THEM.
The camera faces the people. Anyone who turns toward something behind them
shows the camera the back of their head, and their expression — the point of
the shot — is lost (11 Sep 2026: characters turned to a door behind them and
their reaction was never seen; a planned payoff line was about to be spoken
with the speaker's face turned away). Place the doors, colleagues and screens
the characters must look at to the LEFT or RIGHT of the frame; they turn only
their heads, in three-quarter view. To refer to someone behind them, they
point over their shoulder with a thumb while still facing the camera.
      ✅ "{isletme_sahibi} faces the camera and points over his shoulder with his thumb toward {calisan}"
      ❌ "{isletme_sahibi} turns toward the background and talks"

⛔ IF THE PAYOFF HAPPENS ON A SCREEN, SHOW THE SCREEN.
When the joke depends on what a device does — a phone answering messages by
itself, an order notification arriving, a booking calendar filling up — the
viewer must SEE it. A character nodding at a phone we cannot see explains
nothing. Describe it in the prompt as an event: the device is turned toward
the camera, or the upper-half graphic CHANGES. Describing such a change is an
action, not a new setting, so it belongs in "prompt".
      ✅ "…holds his phone up toward the camera; the message bubbles in the
          upper half are now answered instantly, each with a green check mark"
      ❌ "…checks his phone and nods approvingly"
  The same holds for a TRIGGER: if a character is distracted by something in
  the upper panel, that shot shows it up close in the upper panel.
      ✅ "In the upper third, the view moves in on the car's gleaming alloy
          wheels as {acemi} stares up at them"
      ❌ "stares at the car wheels on the top screen" (while the upper third
          still shows a whole car far away in traffic)"

⛔ THE SAME ANIMAL OR PROP MUST NOT LOOK THE SAME IN BOTH PANELS.
In a split screen the viewer sees the two halves as one picture. When the
scenario has a dog in the video above AND a dog in the room below, describe
them as clearly different animals — different breed, colour and size — and say
so in BOTH descriptions. Otherwise it reads as the same dog drawn twice and the
split screen looks like a mistake (11 Sep 2026: a golden puppy chewed a slipper
in the upper panel while an identical golden puppy sat under the desk below).
      ✅ upper: "a small golden puppy chewing a slipper" · room: "a large
          short-haired black dog lying under the desk"
      ❌ upper: "a playful puppy" · room: "an office dog"
The same holds for props: two identical objects in the two halves read as one
object duplicated.

⛔ NO OBJECT HAND-OVERS. PROPS STAY WITH ONE PERSON.
Veo cannot track an object changing hands. Asked to pass something, it draws
the object TWICE — once in each pair of hands (10 Sep 2026: one small prop
appeared in two people's hands at the same time).

Never write "hands it to", "gives him the", "takes it from", "puts it down",
"picks up". Decide who holds the prop and let them keep holding it for the
whole shot. If another character must acknowledge it, they LOOK at it — they
do not touch it.
      ✅ "enters holding a small cake box, keeping it in both hands"
      ❌ "enters holding a cake box and hands it to the owner"

⛔ THE PAYOFF COMES LAST — NEVER EXPLAIN THE JOKE.
Put the scenario's payoff line or payoff moment in the FINAL shot. Nothing is
said after it: no line that explains the joke, sums it up or restates the
benefit ("See, the system handles it by itself.") — the viewer already got
it, and the closing card follows. In a test plan (11 Sep 2026) the payoff
line was spent in shot 2 and shot 3 only explained it.

⛔ SAY WHERE THE EYES GO.
A reaction needs a direction. When a character reacts to something — the other
panel, a prop, another person — write what the eyes are fixed on, in the same
sentence as the mouth and eyebrows. Without it Veo lets the character react to
nothing and the viewer cannot tell what caused it (11 Sep 2026: a woman said
"look at that nose!" while looking straight ahead, not at the puppy above).
      ✅ "eyes locked on the puppy in the upper panel, mouth widening into a
          grin with teeth showing"
      ❌ "talks with a delighted smile, leaning forward"

⛔ THE SPEAKER DOES NOT REACT TO HIS OWN NEWS — BUT HE IS NEVER BLANK.
He already knows what he is saying, so the SHOCK belongs to the listeners:
never give the speaker a startled face (10 Sep 2026: the character delivering
the bad news looked more surprised than the people hearing it).
"Not shocked" is NOT "expressionless". The feeling that MAKES him say the line
must be on his face — delight at a puppy, panic about a repair bill, weary
boredom at the fifteenth identical message. Write that feeling as PHYSICAL
MECHANICS of the face, never as an adjective: Veo follows mechanics and ignores
adjectives (11 Sep 2026: "talks with a delighted, captivated expression"
produced a flat, neutral face in the finished video).
  ⚠️ ALWAYS DESCRIBE THE MOUTH. Eyes and eyebrows alone still read as a neutral
  face — the mouth carries the feeling (11 Sep 2026: "eyebrows lifted and eyes
  wide in adoration" gave a blank-mouthed, flat delivery). Every emotion needs
  a mouth: grinning with teeth showing, corners pulled up, lips parted in a
  wide smile, mouth pressed into a tired flat line, jaw slack in disbelief.
      ✅ "grins wide with his teeth showing, the corners of his mouth pulled up,
          eyes crinkling at the corners, eyebrows lifted high, leaning forward"
      ✅ "shoulders sagging, eyelids heavy, mouth in a tired flat line as he talks"
      ❌ "talks with a delighted, captivated expression"   (adjective only)
      ❌ a startled face on the person who is delivering the news
Still no cartoon: no screaming mouth stretched wide open, no hands on cheeks.
The rule for a character who brings bad news calmly stays: "unhurried, eyes
steady, shoulders relaxed" — that too is mechanics, not an adjective.

⛔ EACH SILENT PERSON GETS HIS OWN SENTENCE.
Never bundle several people into one clause — give each one a separate
sentence that starts with their placeholder.
      ❌ "{isletme_sahibi} and {musteri} freeze, listening with lips closed."
      ✅ "{isletme_sahibi} freezes, eyes widening. Beside him, {musteri} stops
          mid-nod, eyebrows raised, lips closed."
A bundled clause produced a shot where BOTH people moved their mouths and the
line sounded like two people speaking at once (10 Sep 2026).

⛔ THE PAYOFF SHOT NEEDS A VISIBLE REACTION.
In the final shot the whole joke lands on the listeners' faces. "Listens with
lips closed" is NOT a reaction — it reads as indifference and kills the
punchline (this happened in production, 10 Sep 2026).
THE REACTION MUST BE ON THE FACE, AND THE FACE INCLUDES THE MOUTH. A body
movement alone is not shock — in production a character was given only "snaps
his head around, lips pressed tight" and read as merely curious (10 Sep 2026).
Write eyes, eyebrows AND mouth together: "eyes widening, eyebrows shooting up,
jaw dropping open" or "eyes crinkling as a laugh breaks out, teeth showing".

For EVERY listener in the payoff shot, describe BOTH:
  1. the FACE — eyes widening, eyebrows shooting up, a blink, the jaw
     loosening. This is mandatory.
  2. optionally a body beat — freezing mid-gesture, lowering a glass,
     turning the head. Never the body beat on its own.

⚠️ AT THE PAYOFF, LIPS MAY PART. Elsewhere closed lips stop Veo inventing
speech, but a shocked face with clamped lips reads as indifference. Here write
"his jaw drops in a silent gasp" or "lips part in disbelief" and add "he makes
no sound" so no dialogue is generated. A silent open mouth is the single most
recognisable image of shock; do not trade it away.

⛔ DESCRIBE THE SETTING AND THE CAST EXACTLY ONCE — NOT PER SHOT.
Our software builds each shot's final prompt by pasting the SAME setting text
and the SAME character descriptions into every shot. You write them once:
  • "ortam": the location, key props and screen layout. It is prepended to
    every shot unchanged. Do NOT describe the setting again inside "prompt".
    ⛔ "ortam" is the PLACE ONLY — never how many people are there, where they
    sit or what they do. It is pasted into every shot, so "where two people
    sit side by side" also reached a three-person shot and Veo deleted one
    character to make room for another (11 Sep 2026).
  • "karakterler": one entry per character, keyed by a short ASCII role key:
      "tarif":    full physical description in English (age, hair, facial
                  hair, skin tone, present-day clothing)
      "cinsiyet": "erkek" or "kadın"
      "yas":      "genç" (under 30), "orta" (30–50) or "olgun" (over 50)
      "etiket":   short Turkish role name shown to the user — "Müşteri", "Kurye"
    The speaking VOICE is chosen from cinsiyet + yas, so they must match the
    description. In "prompt" refer to a character ONLY by placeholder {key}.
      ✅ "prompt": "{kuafor} talks cheerfully, pointing at the mirror.
                    Beside her, {musteri} leans back in the chair, arms crossed."
      ❌ "prompt": "The woman in her 30s in a denim jacket leans back..."
Every character used in any shot MUST appear in "karakterler".
This exists because writing the description by hand in every shot kept being
shortened and paraphrased from shot to shot (10-11 Sep 2026), and Veo — which
sees each shot in isolation — then drew a different room and different faces.

Return ONLY this JSON, no markdown:
{
  "ortam": "A present-day ... with ... (English, once, the PLACE only; a door at the side of the frame if someone enters)",
  "karakterler": {
    "isletme_sahibi": { "tarif": "a present-day man in his 40s with ...", "cinsiyet": "erkek", "yas": "orta", "etiket": "İşletme sahibi" },
    "musteri": { "tarif": "a present-day woman in her 30s with ...", "cinsiyet": "kadın", "yas": "orta", "etiket": "Müşteri" }
  },
  "sahneler": [
    {
      "sira": 1,
      "prompt": "{isletme_sahibi} ... {musteri} ... (English, action only, NO setting, NO spoken line)",
      "replik": "Türkçe konuşma cümlesi",
      "konusan": "isletme_sahibi",
      "ton": "repliğin söylenme tonu, Türkçe 2-3 kelime (ör. heyecanlı ve neşeli / bıkkın ve yorgun / sakin ve güven veren)",
      "efekt": "",
      "zincirle": false,
      "aciklama": "Türkçe tek cümlelik özet"
    }
  ]
}`;

const apiBody = {
  contents: [{ parts: [{ text: talimat }] }],
  generationConfig: {
    temperature: 0.6,
    /*
     * 2000 → 8000 (9 Eyl 2026). İKİ sebep birikti:
     *
     * 1. gemini-3.8-flash DÜŞÜNEN bir model ve düşünme jetonları da bu
     *    limite sayılıyor. Düşünme payı büyüyünce JSON'a birkaç yüz karakter
     *    kalıyor, yanıt string'in ortasında kesiliyordu:
     *      "Unterminated string in JSON at position 279"
     * 2. Kadro tarifi kuralı her sahnede kişinin görünümünün birebir
     *    tekrarlanmasını istiyor; promptlar zaten uzadı.
     *
     * 8000, Video Oluşturma'daki çalışan Gemini çağrısıyla aynı değer —
     * tahmin değil, kanıtlanmış sınır.
     */
    /*
     * 8000 → 24000 (11 Eyl 2026). Aynı gün eklenen ~15 kural (kadraj, muhatap,
     * süreklilik, slogan, giriş zaman çizelgesi…) modelin DÜŞÜNME payını büyüttü
     * ve 8000'e sığmayan planlar "yanıt kesildi" hatası verdi. Ücret kullanılan
     * jeton kadar; sınırı yükseltmek normal planın maliyetini değiştirmiyor.
     * 11 Eyl ölçümü (otomasyon senaryosu): girdi 6.900 · düşünme 4.087 · cevap 874
     * jeton. Düşünme koşudan koşuya değişiyor; aynı gün 8000'i aşan bir koşu görüldü.
     */
    maxOutputTokens: 24000,
    responseMimeType: 'application/json',
  },
};

return [{ json: { ...body, sahneSayisi, apiBodyStr: JSON.stringify(apiBody) } }];
