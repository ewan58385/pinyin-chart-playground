/**
 * Hand curation applied on top of the automatic choices in build-data.ts.
 * Kept deliberately small. Every entry has a reason, and nothing here adds
 * information that is not already in CC-CEDICT: it only rejects a pick or
 * reorders the senses of an existing entry.
 */

/**
 * Tone cell → characters that must not be chosen as its example.
 * The automatic rule ranks by how common a character reading is, which goes
 * wrong when a very common character has an obscure second reading.
 * reports/data-report.md lists, on every build, whether each entry still
 * changes a pick; entries that stopped doing so were removed in Round 10
 * (e2 俄, pang1 膀, lin4 淋, zhuai1 拽, cha3 叉, ye2 耶, di2 迪, ding1 丁,
 * zi1 兹, nai4 奈, kui2 奎, kai3 凯, ke4 克, hang2 航, du1 嘟, guai5 乖).
 */
export const REJECT: Record<string, string[]> = {
  // Obscure or literary second readings of common characters
  e1: ['阿'], // ē only in 阿谀
  e2: ['哦'], // 哦 é "to chant" is literary
  bo2: ['薄'], // bó is the literary reading; the everyday one is báo
  pen4: ['喷'],
  la2: ['拉'],
  zuo1: ['作'],
  ci1: ['刺'],
  shua4: ['刷'],
  jia2: ['夹'],
  ge3: ['合'],
  ha3: ['哈'],
  // Vulgar readings
  diao3: ['鸟'],
  // A character common only in one word, where another is the useful example
  ma2: ['嘛'], // only in 干嘛; 麻 as in 麻烦 is the useful one
  // Neutral-tone variants whose meaning differs from the everyday word
  gong5: ['公'], // 老公 lǎogong is "eunuch"; "husband" is lǎogōng
};

/**
 * "character|reading" or "word|reading" → senses to put first, each copied
 * verbatim from the CC-CEDICT entry (after the automatic clean-up). CC-CEDICT
 * lists senses in historical order, so the everyday meaning is sometimes last.
 * The build fails if a sense listed here is no longer in the entry.
 */
export const PREFER_SENSE: Record<string, string[]> = {
  '号|hao4': ['number designation', 'day of the month', 'mark'],
  '老|lao3': ['old', 'experienced'],
  '被|bei4': ['used to indicate passive voice', 'quilt'],
  '才|cai2': ['then and only then', 'just now', 'only', 'ability'],
  '次|ci4': ['classifier for enumerated events: time', 'next in sequence'],
  '当|dang4': ['to regard as', 'suitable', 'to pawn'],
  '干|gan4': ['to do', 'to work', 'tree trunk'],
  '规矩|gui1 ju5': ['rule', 'customs', 'well-behaved'],
  '在乎|zai4 hu5': ['to care about'],
};

/** "character|reading" → which traditional form's entry to gloss from, where several merge into one simplified character. */
export const PREFER_TRAD: Record<string, string> = {};
