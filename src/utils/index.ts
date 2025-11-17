const base = location.origin

export const extractCanonicalId = (href: string): string | undefined => {
  try {
    const u = new URL(href, base)
    const p = u.pathname.toLowerCase()

    // Discourse, V2EX
    let m = /^(\/t\/\d+)(?:\/|$)/.exec(p)
    if (m) return m[1]

    // Discourse
    m = /^(\/t\/[^/]+\/\d+)(?:\/|$)/.exec(p)
    if (m) return m[1]

    // Flarum
    m = /^(\/d\/\d+(?:-[^/]+)?)(?:\/|$)/.exec(p)
    if (m) return m[1]

    const f = p + u.search

    // Youtube
    m = /^(\/watch\?v=[\w-]+)/.exec(f)
    if (m) return m[1]
  } catch {}

  return undefined
}

// Extract base domain (registrable domain) with simple PSL-like heuristic
export const getBaseDomain = (h: string) => {
  const host = (h || '').toLowerCase().replace(/^www\./, '')
  // Handle IP addresses and localhost directly
  if (
    /^\d+(?:\.\d+){3}$/.test(host) ||
    host === 'localhost' ||
    host.includes(':')
  ) {
    return host
  }

  const parts = host.split('.').filter(Boolean)
  if (parts.length <= 2) return host
  const secondLevelDomains = new Set([
    'co',
    'com',
    'org',
    'net',
    'edu',
    'gov',
    'mil',
    'ac',
  ])
  const secondLast = parts.at(-2)!
  const baseSegments = secondLevelDomains.has(secondLast) ? 3 : 2
  return parts.slice(-baseSegments).join('.')
}

export const isSameBaseDomain = (a: string, b: string) => {
  if (!a || !b) return false
  return getBaseDomain(a) === getBaseDomain(b)
}
