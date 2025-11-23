const base = location.origin
const DEBUG = process.env.PLASMO_TAG !== 'prod'

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

export const withPerf = async <T>(
  label: string,
  fn: () => Promise<T> | T
): Promise<T> => {
  if (!DEBUG) {
    return fn()
  }

  const t0 = performance.now()
  try {
    return await fn()
  } finally {
    const t1 = performance.now()
    console.log(`[UTAF] ${label}: ${(t1 - t0).toFixed(1)} ms`)
  }
}

export const withPerfSync = <T>(label: string, fn: () => T): T => {
  if (!DEBUG) {
    return fn()
  }

  const t0 = performance.now()
  try {
    return fn()
  } finally {
    const t1 = performance.now()
    console.log(`[UTAF] ${label}: ${(t1 - t0).toFixed(1)} ms`)
  }
}

export const withPerfV2: <Args extends any[], R>(
  label: string,
  fn: (...args: Args) => R
) => (...args: Args) => R = DEBUG
  ? <Args extends any[], R>(label: string, fn: (...args: Args) => R) =>
      (...args: Args): R => {
        const t0 = performance.now()
        try {
          return fn(...args)
        } finally {
          const t1 = performance.now()
          console.log(`[UTAF] ${label}: ${(t1 - t0).toFixed(1)} ms`)
        }
      }
  : <Args extends any[], R>(_label: string, fn: (...args: Args) => R) => fn
