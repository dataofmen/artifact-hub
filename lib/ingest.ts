// Revised Romanization jamo tables, indexed by position within a syllable.
const CHOSEONG = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h']
const JUNGSEONG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i']
const JONGSEONG = ['','k','k','k','n','n','n','t','l','k','m','p','t','t','p','l','m','p','p','t','t','ng','t','t','k','t','p','h']

/** Hangul -> latin, so a Korean file name still yields a usable slug. */
export function romanize(text: string): string {
  let out = ''
  for (const char of text.normalize('NFC')) {
    const code = char.charCodeAt(0) - 0xac00
    if (code >= 0 && code <= 11171) {
      out +=
        CHOSEONG[Math.floor(code / 588)] +
        JUNGSEONG[Math.floor((code % 588) / 28)] +
        JONGSEONG[code % 28]
    } else {
      out += char
    }
  }
  return out
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Slugs stay ASCII: a Korean file name would be stored decomposed (NFD) on
 * macOS and is awkward in URLs. The title keeps the original text.
 */
export function slugFromName(name: string): string {
  const stem = name.replace(/\.(html?|md|tsx?|jsx?)$/i, '')
  return slugify(stem) || slugify(romanize(stem)) || 'artifact'
}

export function titleFromHtml(source: string): string | null {
  const match = source.match(/<title>([\s\S]*?)<\/title>/i)
  const title = match?.[1].trim()
  return title || null
}

export function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Rough sensitivity heuristics, surfaced as a warning before publishing. */
export function scanForSensitiveData(source: string): string[] {
  const findings: string[] = []
  const checks: [string, RegExp][] = [
    ['이메일 주소', /[\w.+-]+@[\w-]+\.[\w.]{2,}/],
    ['전화번호', /0\d{1,2}-?\d{3,4}-?\d{4}/],
    ['주민등록번호 형식', /\d{6}-\d{7}/],
    ['카드/계좌 형식 숫자', /\b\d{12,}\b/],
    ['API 키/토큰 형식', /\b(sk|pk|ghp|gho|xox[baprs])[-_][A-Za-z0-9_-]{16,}/],
  ]
  for (const [label, pattern] of checks) {
    if (pattern.test(source)) findings.push(label)
  }
  return findings
}
