import { getPrefferedLocale } from 'browser-extension-i18n'
import {
  getSettingsValue,
  initSettings,
  showSettings,
  type SettingsTable,
} from 'browser-extension-settings'
import {
  addValueChangeListener,
  getValue,
  setValue,
} from 'browser-extension-storage'
import {
  $,
  $$,
  addAttribute,
  addEventListener,
  addStyle,
  doc,
  getAttribute,
  hasClass,
  removeAttribute,
  runWhenBodyExists,
  runWhenHeadExists,
  setAttribute,
  throttle,
} from 'browser-extension-utils'
import styleText from 'data-text:./content.scss'
import tailwindCssText from 'data-text:./tailwind.css'
import iconNoBgSvgText from 'data-text:./ui/icon-no-bg.svg'
import {
  ChevronUp,
  createElement as createIconElement,
  RotateCcw,
} from 'lucide'
import type { PlasmoCSConfig } from 'plasmo'

import { getAvailableLocales, i, resetI18n } from './messages'
import { createDatePresetInput } from './ui/date-preset-input'

const cn = (s: string) => s

const host = location.host

if (
  // eslint-disable-next-line n/prefer-global/process
  process.env.PLASMO_TARGET === 'chrome-mv3' ||
  // eslint-disable-next-line n/prefer-global/process
  process.env.PLASMO_TARGET === 'firefox-mv3'
) {
  // Receive popup trigger to show settings in the content context
  const runtime =
    (globalThis as any).chrome?.runtime ?? (globalThis as any).browser?.runtime
  runtime?.onMessage?.addListener((message: any) => {
    if (message?.type === 'utags-advanced-filter:show-settings') {
      showSettings()
    }
  })
}

export const config: PlasmoCSConfig = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  run_at: 'document_end',
  // matches: ['https://greasyfork.org/*'],
  // eslint-disable-next-line @typescript-eslint/naming-convention
  all_frames: false,
}

const getSettingsTable = (): SettingsTable => {
  const groupNumber = 1
  return {
    enable: {
      title: i('settings.enable'),
      defaultValue: true,
    },
    [`enableCurrentSite_${host}`]: {
      title: i('settings.enableCurrentSite'),
      defaultValue: true,
    },
    // [`enableCustomRulesForCurrentSite_${host}`]: {
    //   title: i('settings.enableCustomRulesForTheCurrentSite'),
    //   defaultValue: false,
    // },
    // [`customRulesForCurrentSite_${host}`]: {
    //   title: i('settings.enableCustomRulesForTheCurrentSite'),
    //   defaultValue: '',
    //   placeholder: i('settings.customRulesPlaceholder'),
    //   type: 'textarea',
    //   group: ++groupNumber,
    // },
    // customRulesTip: {
    //   title: i('settings.customRulesTipTitle'),
    //   type: 'tip',
    //   tipContent: i('settings.customRulesTipContent'),
    //   group: groupNumber,
    // },
    // [`enableOpenNewTabInBackgroundForCurrentSite_${host}`]: {
    //   title: i('settings.enableOpenNewTabInBackgroundForCurrentSite'),
    //   defaultValue: false,
    //   group: ++groupNumber,
    // },
    // [`enableTreatSubdomainsAsSameSiteForCurrentSite_${host}`]: {
    //   title: i('settings.enableTreatSubdomainsAsSameSiteForCurrentSite'),
    //   defaultValue: false,
    //   group: ++groupNumber,
    // },
    // [`enableTextToLinksForCurrentSite_${host}`]: {
    //   title: i('settings.enableTextToLinksForCurrentSite'),
    //   // Default false; only v2ex.com and localhost support
    //   defaultValue: Boolean(/v2ex\.com|localhost/.test(host)),
    //   group: ++groupNumber,
    // },
    // [`enableLinkToImgForCurrentSite_${host}`]: {
    //   title: i('settings.enableLinkToImgForCurrentSite'),
    //   // Default false; only v2ex.com and localhost support
    //   defaultValue: Boolean(/v2ex\.com|localhost/.test(host)),
    //   group: groupNumber,
    // },
  }
}

const CONFIG = {
  FILTERS_KEY: (() => {
    const host = location.hostname.replace(/^www\./, '')
    return `utaf_${host}_filters`
  })(),
  GLOBAL_KEY: 'utaf_global_state',
}

const DEFAULTS = (() => {
  const base = {
    updatedMode: 'months' as const,
    updatedDays: 90,
    updatedMonths: 24,
    createdOlderMode: 'days' as const,
    createdOlderDays: 90,
    createdOlderMonths: 0,
    createdRecentMode: 'days' as const,
    createdRecentDays: 90,
    createdRecentMonths: 0,
    totalInstallsLimit: 100,
    dailyInstallsLimit: 10,
    blockedAuthors: [] as Array<{ id: string; name: string; enabled: boolean }>,
    keywordsEnabled: false,
    keywordsThreshold: 15,
    keywordsScope: 'both' as const,
    keywordsCaseSensitive: false,
    keywords: [] as Array<{ keyword: string; score: number; enabled: boolean }>,
  }
  return base
})()

async function loadFilterSettings() {
  try {
    const saved = await getValue(CONFIG.FILTERS_KEY)
    return saved || {}
  } catch {
    return {}
  }
}

async function saveFilterSettings(settings) {
  try {
    const prev = await loadFilterSettings()
    await setValue(CONFIG.FILTERS_KEY, Object.assign({}, prev, settings))
  } catch {}
}

async function loadGlobalState() {
  try {
    const saved = await getValue(CONFIG.GLOBAL_KEY)
    return saved || {}
  } catch {
    return {}
  }
}

async function saveGlobalState(settings) {
  try {
    const prev = await loadGlobalState()
    await setValue(CONFIG.GLOBAL_KEY, Object.assign({}, prev, settings))
  } catch {}
}

function isGreasyForkSearchPage() {
  const host = location.hostname.replace(/^www\./, '')
  if (host !== 'greasyfork.org') return false
  const path = location.pathname || ''
  return path.endsWith('/scripts') || path.includes('/scripts/by-site/')
}

function addGreasyForkFilterStyles() {
  addStyle(`
      .fsfts-hidden { display: none !important; }
    `)
}

function parseTimeElementToTs(el) {
  if (!el) return null
  const dt = el.getAttribute('datetime') || el.getAttribute('title')
  if (dt) {
    const t = Date.parse(dt)
    if (!Number.isNaN(t)) return t
  }

  const txt = (el.textContent || '').trim()
  const t2 = Date.parse(txt)
  return Number.isNaN(t2) ? null : t2
}

function getUpdatedTimestampInItem(item) {
  const dsAttr =
    item.dataset.scriptUpdatedDate ||
    (item.dataset ? item.dataset.scriptUpdatedDate : null)
  if (dsAttr) {
    const t = Date.parse(dsAttr)
    if (!Number.isNaN(t)) return t
  }

  const el =
    item.querySelector(
      'dd.script-list-updated-date relative-time, dd.script-list-updated-date time, dd.script-list-updated-date [datetime]'
    ) || null
  return parseTimeElementToTs(el)
}

function getCreatedTimestampInItem(item) {
  const dsAttr =
    item.dataset.scriptCreatedDate ||
    (item.dataset ? item.dataset.scriptCreatedDate : null)
  if (dsAttr) {
    const t = Date.parse(dsAttr)
    if (!Number.isNaN(t)) return t
  }

  const el =
    item.querySelector(
      'dd.script-list-created-date relative-time, dd.script-list-created-date time, dd.script-list-created-date [datetime]'
    ) || null
  if (el) return parseTimeElementToTs(el)
  const times = Array.from(item.querySelectorAll('time, relative-time'))
  if (times.length === 0) return null
  const ts = times.map(parseTimeElementToTs).filter((v) => v !== null)
  if (ts.length === 0) return null
  return Math.min.apply(null, ts)
}

function parseIntSafe(text) {
  const n = Number.parseInt(String(text).replaceAll(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function getTotalInstallsInItem(item) {
  const dsAttr =
    item.dataset.scriptTotalInstalls ||
    (item.dataset ? item.dataset.scriptTotalInstalls : null)
  if (dsAttr !== null && dsAttr !== undefined) {
    const n = parseIntSafe(dsAttr)
    if (n !== null) return n
  }

  const el =
    item.querySelector(
      'dd.script-list-total-installs, dd.script-list-installs-total'
    ) || null
  if (el) {
    const n2 = parseIntSafe(el.textContent || '')
    if (n2 !== null) return n2
  }

  return null
}

function getAuthorIdsInItem(item: Element): string[] {
  const ids: string[] = []
  const raw = (item as HTMLElement).dataset?.scriptAuthors || null
  if (raw) {
    let text = String(raw)
    if (text.includes('&quot;')) {
      text = text.replaceAll('&quot;', '"')
    }

    try {
      const obj = JSON.parse(text)
      for (const k of Object.keys(obj)) {
        ids.push(String(k))
      }
    } catch {}
  }

  if (ids.length === 0) {
    const a = item.querySelector('dd.script-list-author a[href*="/users/"]')
    if (a) {
      const href = String((a as HTMLAnchorElement).href || '')
      const m = /\/users\/(\d+)/.exec(href)
      if (m) ids.push(m[1])
    }
  }

  return ids
}

function getDailyInstallsInItem(item) {
  const dsAttr =
    item.dataset.scriptDailyInstalls ||
    (item.dataset ? item.dataset.scriptDailyInstalls : null)
  if (dsAttr !== null && dsAttr !== undefined) {
    const n = parseIntSafe(dsAttr)
    if (n !== null) return n
  }

  const el =
    item.querySelector(
      'dd.script-list-daily-installs, dd.script-list-installs-daily'
    ) || null
  if (el) {
    const n2 = parseIntSafe(el.textContent || '')
    if (n2 !== null) return n2
  }

  return null
}

function getTitleTextInItem(item: Element): string | undefined {
  const a =
    item.querySelector('a.script-link') ||
    item.querySelector('a[href^="/scripts/"]')
  const t = (a?.textContent || '').trim()
  return t ? t : undefined
}

function getDescriptionTextInItem(item: Element): string | undefined {
  const el =
    item.querySelector('dd.script-list-description') ||
    item.querySelector('.script-description')
  const t = (el?.textContent || '').trim()
  return t ? t : undefined
}

function collectScriptItems() {
  const candidates = Array.from(document.querySelectorAll('li[data-script-id]'))
  return candidates.filter((el) => {
    const hasDetailLink =
      Boolean(el.querySelector('a.script-link')) ||
      Boolean(el.querySelector('a[href^="/scripts/"]'))
    const hasUpdated =
      Object.hasOwn((el as HTMLElement).dataset, 'scriptUpdatedDate') ||
      Boolean(
        el.querySelector(
          'dd.script-list-updated-date relative-time, dd.script-list-updated-date time, dd.script-list-updated-date [datetime]'
        )
      )
    return hasDetailLink && hasUpdated
  })
}

const itemMetricsCache = new WeakMap()

function readItemMetrics(item) {
  let m = itemMetricsCache.get(item)
  if (!m) {
    m = {
      updatedTs: getUpdatedTimestampInItem(item),
      createdTs: getCreatedTimestampInItem(item),
      totalInstalls: getTotalInstallsInItem(item),
      dailyInstalls: getDailyInstallsInItem(item),
      authorIds: getAuthorIdsInItem(item),
      titleText: getTitleTextInItem(item),
      descriptionText: getDescriptionTextInItem(item),
    }
    itemMetricsCache.set(item, m)
  }

  return m
}

function applyCombinedFilters(
  updatedDays,
  createdOlderDays,
  createdRecentDays,
  totalLessThan,
  dailyLessThan,
  blockedIds,
  keywordsThreshold,
  keywordsScope: 'title' | 'description' | 'both',
  keywordsList: Array<{
    keyword: string
    score: number
    enabled: boolean
    isRegex?: boolean
    regex?: RegExp
  }>,
  keywordsCaseSensitive: boolean
) {
  const items = collectScriptItems()
  if (items.length === 0) return { visible: 0, hidden: 0, total: 0 }
  const now = Date.now()
  const ud = updatedDays > 0 ? updatedDays * 24 * 60 * 60 * 1000 : 0
  const od = createdOlderDays > 0 ? createdOlderDays * 24 * 60 * 60 * 1000 : 0
  const rd = createdRecentDays > 0 ? createdRecentDays * 24 * 60 * 60 * 1000 : 0
  const ti = Math.max(totalLessThan, 0)
  const di = Math.max(dailyLessThan, 0)
  let visible = 0
  let hidden = 0
  for (const item of items) {
    const metrics = readItemMetrics(item)
    const updatedTs = metrics.updatedTs
    const createdTs = metrics.createdTs
    const totalInstalls = metrics.totalInstalls
    const dailyInstalls = metrics.dailyInstalls
    const authorIds = metrics.authorIds || []
    let hide = false
    if (ud && updatedTs) {
      const ageU = now - updatedTs
      if (ageU >= ud) hide = true
    }

    if (od && createdTs) {
      const ageC = now - createdTs
      if (ageC >= od) hide = true
    }

    if (rd && createdTs) {
      const ageC = now - createdTs
      if (ageC <= rd) hide = true
    }

    if (ti && totalInstalls !== null && totalInstalls < ti) hide = true
    if (di && dailyInstalls !== null && dailyInstalls < di) hide = true
    if (!hide && blockedIds && blockedIds.size > 0) {
      for (const aid of authorIds) {
        if (blockedIds.has(String(aid))) {
          hide = true
          break
        }
      }
    }

    if (!hide && keywordsThreshold && keywordsThreshold > 0) {
      const title = String(metrics.titleText || '')
      const desc = String(metrics.descriptionText || '')
      const src =
        keywordsScope === 'title'
          ? title
          : keywordsScope === 'description'
            ? desc
            : `${title}\n${desc}`
      const baseText = src
      const text = keywordsCaseSensitive ? baseText : baseText.toLowerCase()
      let sum = 0
      for (const k of keywordsList || []) {
        if (!k) continue
        const kw = k.keyword
        if (!kw) continue
        if (k.isRegex && k.regex) {
          if (k.regex.test(baseText)) {
            sum += k.score
            if (sum >= keywordsThreshold) {
              hide = true
              break
            }
          }
        } else if (text.includes(kw)) {
          sum += k.score
          if (sum >= keywordsThreshold) {
            hide = true
            break
          }
        }
      }
    }

    if (hide) {
      item.classList.add('fsfts-hidden')
      hidden += 1
    } else {
      item.classList.remove('fsfts-hidden')
      visible += 1
    }
  }

  return { visible, hidden, total: items.length }
}

function createDivider() {
  const divider = document.createElement('div')
  divider.className = cn('my-5 h-[0.5px] bg-gray-200 opacity-70')
  return divider
}

async function injectGreasyForkFilters() {
  if (!isGreasyForkSearchPage()) return
  addGreasyForkFilterStyles()

  const saved = await loadFilterSettings()
  let currentMonths = Number(
    saved.updatedThresholdMonths ?? DEFAULTS.updatedMonths
  )
  let currentDays = Number(saved.updatedThresholdDays ?? DEFAULTS.updatedDays)
  let currentMode =
    (saved.updatedThresholdMode as 'months' | 'days') ?? DEFAULTS.updatedMode
  let createdOlderDays = Number(
    saved.createdOlderThresholdDays ?? DEFAULTS.createdOlderDays
  )
  let createdOlderMode =
    (saved.createdOlderThresholdMode as 'months' | 'days') ??
    DEFAULTS.createdOlderMode
  let createdOlderMonths = Number(
    saved.createdOlderThresholdMonths ?? DEFAULTS.createdOlderMonths
  )
  let createdRecentDays = Number(
    saved.createdRecentThresholdDays ?? DEFAULTS.createdRecentDays
  )
  let createdRecentMode =
    (saved.createdRecentThresholdMode as 'months' | 'days') ??
    DEFAULTS.createdRecentMode
  let createdRecentMonths = Number(
    saved.createdRecentThresholdMonths ?? DEFAULTS.createdRecentMonths
  )
  let updatedEnabled = Boolean(saved.updatedEnabled as boolean | undefined)
  let createdOlderEnabled = Boolean(
    saved.createdOlderEnabled as boolean | undefined
  )
  let createdRecentEnabled = Boolean(
    saved.createdRecentEnabled as boolean | undefined
  )
  let totalInstallsEnabled = Boolean(
    saved.totalInstallsEnabled as boolean | undefined
  )
  let dailyInstallsEnabled = Boolean(
    saved.dailyInstallsEnabled as boolean | undefined
  )
  let blockedAuthors = Array.isArray(saved.blockedAuthors)
    ? (saved.blockedAuthors as Array<{
        id: string
        name: string
        enabled: boolean
      }>)
    : DEFAULTS.blockedAuthors
  let keywordsEnabled = Boolean(saved.keywordsEnabled as boolean | undefined)
  let keywordsThreshold = Number(
    saved.keywordsThreshold ?? DEFAULTS.keywordsThreshold
  )
  let keywordsScope =
    (saved.keywordsScope as 'title' | 'description' | 'both') ??
    DEFAULTS.keywordsScope
  let keywordsCaseSensitive = Boolean(
    saved.keywordsCaseSensitive ?? DEFAULTS.keywordsCaseSensitive
  )
  let keywords = Array.isArray(saved.keywords)
    ? (saved.keywords as Array<{
        keyword: string
        score: number
        enabled: boolean
      }>)
    : DEFAULTS.keywords
  let totalInstallsLimit = Number(
    saved.totalInstallsLimit ?? DEFAULTS.totalInstallsLimit
  )
  let dailyInstallsLimit = Number(
    saved.dailyInstallsLimit ?? DEFAULTS.dailyInstallsLimit
  )
  const globalState = await loadGlobalState()
  const isFirstUse =
    globalState.isFirstUse === undefined
      ? true
      : Boolean(globalState.isFirstUse)
  const defaultUICollapsed = !isFirstUse
  let uiCollapsed =
    saved.uiCollapsed === undefined
      ? defaultUICollapsed
      : Boolean(saved.uiCollapsed)
  if (isFirstUse) {
    await saveGlobalState({ isFirstUse: false })
  }

  const host = document.createElement('div')
  host.id = 'utaf-host'
  host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;'
  const shadow = host.attachShadow({ mode: 'open' })
  document.body.append(host)

  const tw = document.createElement('style')
  tw.textContent = tailwindCssText
  shadow.append(tw)
  const globalCss = document.createElement('style')
  globalCss.textContent = styleText
  shadow.append(globalCss)

  const panel = document.createElement('div')
  panel.className =
    'bg-white shadow-xl rounded-xl px-3 pb-3 pt-0 pr-5 w-80 overflow-y-auto font-sans text-sm'
  panel.style.maxHeight = 'calc(100vh - 24px)'
  panel.style.setProperty('filter', 'revert', 'important')
  panel.style.setProperty('color-scheme', 'light')
  const header = document.createElement('div')
  header.className =
    'sticky top-0 bg-white z-10 mb-2 space-y-4 transition-shadow -ml-3 -mr-5 pl-3 pr-5 py-2'
  const title = document.createElement('div')
  title.className = cn('text-sm font-semibold text-gray-900')
  title.textContent = 'UTags Advanced Filter'
  const titleIcon = new DOMParser().parseFromString(
    iconNoBgSvgText,
    'image/svg+xml'
  ).documentElement
  titleIcon.setAttribute('width', '16')
  titleIcon.setAttribute('height', '16')
  titleIcon.classList.add('inline-block', 'mr-2')
  title.prepend(titleIcon)
  const headerRow1 = document.createElement('div')
  headerRow1.className = cn('flex items-center')
  headerRow1.append(title)
  const headerRow2 = document.createElement('div')
  headerRow2.className = cn('flex items-center gap-2')
  const masterChk = document.createElement('input')
  masterChk.type = 'checkbox'
  masterChk.className = 'utaf-checkbox'
  masterChk.setAttribute('title', '反选')
  masterChk.setAttribute('aria-label', '反选')
  const stats = document.createElement('div')
  stats.className = cn('text-xs text-gray-500')
  headerRow2.append(stats)
  const headerRight = document.createElement('div')
  headerRight.className = cn('ml-auto flex items-center gap-2')
  const btnCollapse = document.createElement('button')
  btnCollapse.className = cn(
    'rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200'
  )
  btnCollapse.setAttribute('title', '折叠')
  btnCollapse.setAttribute('aria-label', '折叠')
  const iconCollapse = createIconElement(ChevronUp, {
    width: 16,
    height: 16,
    'stroke-width': 2,
  })
  btnCollapse.append(iconCollapse)
  const btnReset = document.createElement('button')
  btnReset.className = cn(
    'utaf-reset-btn rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200'
  )
  btnReset.setAttribute('title', '重置')
  btnReset.setAttribute('aria-label', '重置')
  const iconReset = createIconElement(RotateCcw, {
    width: 16,
    height: 16,
    'stroke-width': 2,
  })
  btnReset.append(iconReset)
  const resetSlot = document.createElement('div')
  resetSlot.className = 'utaf-reset-slot'
  resetSlot.append(btnReset)
  headerRight.append(resetSlot)
  headerRight.append(btnCollapse)
  headerRow1.append(headerRight)
  header.append(headerRow1)
  header.append(headerRow2)
  panel.append(header)

  // icon replacement happens after panel is attached in setCollapsed()

  const content = document.createElement('div')
  content.className = cn('space-y-2')
  panel.append(content)

  panel.addEventListener('scroll', () => {
    const scrolled = panel.scrollTop > 0
    if (scrolled) {
      header.classList.add('shadow-md', 'border-b', 'border-gray-200')
      header.classList.remove('shadow-sm')
    } else {
      header.classList.remove('shadow-md', 'border-b', 'border-gray-200')
    }
  })
  if (panel.scrollTop > 0) {
    header.classList.add('shadow-md', 'border-b', 'border-gray-200')
  }

  const fab = document.createElement('button')
  fab.className = 'utaf-fab'
  fab.setAttribute('title', '打开筛选')
  fab.setAttribute('aria-label', '打开筛选')
  const iconFab = new DOMParser().parseFromString(
    iconNoBgSvgText,
    'image/svg+xml'
  ).documentElement
  fab.append(iconFab)

  async function setCollapsed(next) {
    uiCollapsed = next
    await saveFilterSettings({ uiCollapsed })
    if (uiCollapsed) {
      if (panel.parentNode) panel.remove()
      shadow.append(fab)
    } else {
      if (fab.parentNode) fab.remove()
      shadow.append(panel)
    }
  }

  fab.addEventListener('click', async () => setCollapsed(false))
  btnCollapse.addEventListener('click', async () => setCollapsed(true))
  let resetHoverTimer: number | undefined
  resetSlot.addEventListener('mouseenter', () => {
    resetHoverTimer = globalThis.setTimeout(() => {
      btnReset.classList.add('utaf-reset-btn--visible')
    }, 3000) as unknown as number
  })
  resetSlot.addEventListener('mouseleave', () => {
    if (resetHoverTimer) globalThis.clearTimeout(resetHoverTimer)
    resetHoverTimer = undefined
    btnReset.classList.remove('utaf-reset-btn--visible')
  })

  function monthsToDays(m) {
    if (m === 6) return 182
    if (m === 12) return 365
    if (m === 24) return 730
    return m * 30
  }

  function applyAndUpdateStatus() {
    const updatedDays = updatedEnabled
      ? currentMode === 'days'
        ? currentDays
        : currentMonths > 0
          ? monthsToDays(currentMonths)
          : 0
      : 0
    const olderDays = createdOlderEnabled
      ? createdOlderMode === 'days'
        ? createdOlderDays
        : createdOlderMonths > 0
          ? monthsToDays(createdOlderMonths)
          : 0
      : 0
    const recentDays = createdRecentEnabled
      ? createdRecentMode === 'days'
        ? createdRecentDays
        : createdRecentMonths > 0
          ? monthsToDays(createdRecentMonths)
          : 0
      : 0
    const totalLess = totalInstallsEnabled ? totalInstallsLimit : 0
    const dailyLess = dailyInstallsEnabled ? dailyInstallsLimit : 0
    const blockedIds = new Set(
      (blockedAuthors || [])
        .filter((x) => Boolean(x.enabled))
        .map((x) => String(x.id))
    )
    const kwThreshold = keywordsEnabled ? Math.max(keywordsThreshold, 0) : 0
    const kwScope = keywordsScope
    const caseSensitive = keywordsCaseSensitive
    const enabledKeywords = (keywords || []).filter((x) => Boolean(x.enabled))
    const map = new Map<
      string,
      {
        keyword: string
        score: number
        enabled: true
        isRegex?: boolean
        regex?: RegExp
      }
    >()
    for (const x of enabledKeywords) {
      const raw = String(x.keyword || '').trim()
      const score = Number.isFinite(Number(x.score)) ? Number(x.score) : 5
      if (!raw) continue
      if (raw.startsWith('/') && raw.lastIndexOf('/') > 1) {
        const last = raw.lastIndexOf('/')
        const pattern = raw.slice(1, last)
        let flags = raw.slice(last + 1)
        try {
          const hasI = flags.includes('i')
          if (!hasI && !caseSensitive) flags += 'i'
          const re = new RegExp(pattern, flags)
          const key = `/${pattern}/${flags}`
          console.log('pattern', re, key)
          const prev = map.get(key)
          if (!prev || score > prev.score) {
            map.set(key, {
              keyword: key,
              score,
              enabled: true,
              isRegex: true,
              regex: re,
            })
          }
        } catch {}
      } else {
        const norm = caseSensitive ? raw : raw.toLowerCase()
        if (!norm) continue
        const prev = map.get(norm)
        if (!prev || score > prev.score) {
          map.set(norm, { keyword: norm, score, enabled: true })
        }
      }
    }

    const kwList = Array.from(map.values())
    const counts = applyCombinedFilters(
      updatedDays,
      olderDays,
      recentDays,
      totalLess,
      dailyLess,
      blockedIds,
      kwThreshold,
      kwScope,
      kwList,
      caseSensitive
    )
    stats.textContent = `显示 ${counts.visible} | 隐藏 ${counts.hidden}`
    const states = [
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
      keywordsEnabled,
    ]
    const any = states.some(Boolean)
    const all = states.every(Boolean)
    masterChk.indeterminate = any && !all
    masterChk.checked = all
    updateAuthorsMasterChk()
  }

  masterChk.addEventListener('change', async () => {
    const states = [
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
      keywordsEnabled,
    ]
    const any = states.some(Boolean)
    const next = !any
    updatedEnabled = next
    createdOlderEnabled = next
    createdRecentEnabled = next
    totalInstallsEnabled = next
    dailyInstallsEnabled = next
    keywordsEnabled = next
    updatedComp.setEnabledSilently(next)
    olderComp.setEnabledSilently(next)
    recentComp.setEnabledSilently(next)
    chkTotal.checked = next
    chkDaily.checked = next
    chkKeywords.checked = next
    await saveFilterSettings({
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
      keywordsEnabled,
    })
    updateControlsDisabled()
    updateKeywordsControlsDisabled()
    applyAndUpdateStatus()
  })

  const updatedComp = createDatePresetInput({
    shadow,
    preLabel: '隐藏',
    monthsSuffix: '未更新',
    daysSuffix: '天未更新',
    initial: {
      enabled: updatedEnabled,
      mode: currentMode,
      months: currentMonths,
      days: currentDays,
    },
    onChange(s) {
      updatedEnabled = s.enabled
      currentMode = s.mode
      currentMonths = s.months
      currentDays = s.days
      applyAndUpdateStatus()
    },
    async onSave(s) {
      await saveFilterSettings({
        updatedThresholdMode: s.mode,
        updatedThresholdMonths: s.months,
        updatedThresholdDays: s.days,
        updatedEnabled: s.enabled,
      })
    },
  })

  const olderComp = createDatePresetInput({
    shadow,
    preLabel: '隐藏',
    monthsSuffix: '以前创建',
    daysSuffix: '天以前创建',
    initial: {
      enabled: createdOlderEnabled,
      mode: createdOlderMode,
      months: createdOlderMonths,
      days: createdOlderDays,
    },
    onChange(s) {
      createdOlderEnabled = s.enabled
      createdOlderMode = s.mode
      createdOlderMonths = s.months
      createdOlderDays = s.days
      applyAndUpdateStatus()
    },
    async onSave(s) {
      await saveFilterSettings({
        createdOlderEnabled: s.enabled,
        createdOlderThresholdMode: s.mode,
        createdOlderThresholdMonths: s.months,
        createdOlderThresholdDays: s.days,
      })
    },
  })

  const recentComp = createDatePresetInput({
    shadow,
    preLabel: '隐藏',
    monthsSuffix: '以内创建',
    daysSuffix: '天以内创建',
    initial: {
      enabled: createdRecentEnabled,
      mode: createdRecentMode,
      months: createdRecentMonths,
      days: createdRecentDays,
    },
    onChange(s) {
      createdRecentEnabled = s.enabled
      createdRecentMode = s.mode
      createdRecentMonths = s.months
      createdRecentDays = s.days
      applyAndUpdateStatus()
    },
    async onSave(s) {
      await saveFilterSettings({
        createdRecentEnabled: s.enabled,
        createdRecentThresholdMode: s.mode,
        createdRecentThresholdMonths: s.months,
        createdRecentThresholdDays: s.days,
      })
    },
  })

  const quickSection = document.createElement('div')
  quickSection.className = cn('space-y-2')
  const quickTitle = document.createElement('div')
  quickTitle.className = cn('text-sm font-semibold text-gray-900')
  quickTitle.textContent = '便捷筛选'
  quickSection.append(quickTitle)
  const quickTable = document.createElement('table')
  quickTable.className = cn(
    'w-full table-fixed rounded-md border border-gray-200 text-sm'
  )
  const qthd = document.createElement('thead')
  const qthr = document.createElement('tr')
  const qth0 = document.createElement('th')
  qth0.className = cn(
    'w-8 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  qth0.append(masterChk)
  const qth1 = document.createElement('th')
  qth1.className = cn(
    'border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm text-gray-700'
  )
  qth1.textContent = '全选/全关'
  qthr.append(qth0)
  qthr.append(qth1)
  qthd.append(qthr)
  const qtb = document.createElement('tbody')
  quickTable.append(qthd)
  quickTable.append(qtb)
  quickSection.append(quickTable)
  panel.append(quickSection)
  panel.append(createDivider())

  function appendQuickRow(
    chkEl: HTMLElement,
    labelEl: HTMLElement,
    inputEl: HTMLElement,
    suffixEl: HTMLElement
  ) {
    const tr = document.createElement('tr')
    const td0 = document.createElement('td')
    td0.className = cn(
      'w-8 border-t border-gray-200 px-2 py-1 text-left align-middle'
    )
    const td1 = document.createElement('td')
    td1.className = cn('border-t border-gray-200 px-2 py-1 align-middle')
    const wrap = document.createElement('div')
    wrap.className = cn('flex items-center gap-2')
    wrap.append(labelEl)
    wrap.append(inputEl)
    wrap.append(suffixEl)
    td0.append(chkEl)
    td1.append(wrap)
    tr.append(td0)
    tr.append(td1)
    qtb.append(tr)
  }

  {
    const [c, p, iEl, s] = Array.from(
      updatedComp.root.children
    ) as HTMLElement[]
    appendQuickRow(c, p, iEl, s)
  }

  {
    const [c, p, iEl, s] = Array.from(olderComp.root.children) as HTMLElement[]
    appendQuickRow(c, p, iEl, s)
  }

  {
    const [c, p, iEl, s] = Array.from(recentComp.root.children) as HTMLElement[]
    appendQuickRow(c, p, iEl, s)
  }

  const chkTotal = document.createElement('input')
  chkTotal.type = 'checkbox'
  chkTotal.className = 'utaf-checkbox'
  chkTotal.checked = totalInstallsEnabled
  const lblTotalPre = document.createElement('span')
  lblTotalPre.className = 'utaf-label'
  lblTotalPre.textContent = '隐藏总安装量 <'
  const inputTotal = document.createElement('input')
  inputTotal.type = 'number'
  inputTotal.min = '0'
  inputTotal.step = '1'
  inputTotal.value = String(totalInstallsLimit)
  inputTotal.className =
    'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs'
  const lblTotalSuf = document.createElement('span')
  lblTotalSuf.textContent = ''
  chkTotal.addEventListener('change', async () => {
    totalInstallsEnabled = chkTotal.checked
    await saveFilterSettings({ totalInstallsEnabled })
    applyAndUpdateStatus()
  })
  lblTotalPre.addEventListener('click', () => {
    chkTotal.click()
  })
  inputTotal.addEventListener('change', async () => {
    let v = Number(inputTotal.value)
    if (!Number.isFinite(v) || v < 0) v = 100
    totalInstallsLimit = v
    await saveFilterSettings({ totalInstallsLimit })
    applyAndUpdateStatus()
  })
  appendQuickRow(chkTotal, lblTotalPre, inputTotal, lblTotalSuf)

  const chkDaily = document.createElement('input')
  chkDaily.type = 'checkbox'
  chkDaily.className = 'utaf-checkbox'
  chkDaily.checked = dailyInstallsEnabled
  const lblDailyPre = document.createElement('span')
  lblDailyPre.className = 'utaf-label'
  lblDailyPre.textContent = '隐藏日安装量 <'
  const inputDaily = document.createElement('input')
  inputDaily.type = 'number'
  inputDaily.min = '0'
  inputDaily.step = '1'
  inputDaily.value = String(dailyInstallsLimit)
  inputDaily.className =
    'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs'
  const lblDailySuf = document.createElement('span')
  lblDailySuf.textContent = ''
  chkDaily.addEventListener('change', async () => {
    dailyInstallsEnabled = chkDaily.checked
    await saveFilterSettings({ dailyInstallsEnabled })
    applyAndUpdateStatus()
  })
  lblDailyPre.addEventListener('click', () => {
    chkDaily.click()
  })
  inputDaily.addEventListener('change', async () => {
    let v = Number(inputDaily.value)
    if (!Number.isFinite(v) || v < 0) v = 10
    dailyInstallsLimit = v
    await saveFilterSettings({ dailyInstallsLimit })
    applyAndUpdateStatus()
  })
  appendQuickRow(chkDaily, lblDailyPre, inputDaily, lblDailySuf)

  const authorsSection = document.createElement('div')
  authorsSection.className = cn('space-y-2')
  const usersFilterTitle = document.createElement('div')
  usersFilterTitle.className = cn('text-sm font-semibold text-gray-900')
  usersFilterTitle.textContent = '隐藏指定作者'
  authorsSection.append(usersFilterTitle)

  const authorsActions = document.createElement('div')
  authorsActions.className = cn('flex items-center gap-2')
  const btnOpenPicker = document.createElement('button')
  btnOpenPicker.className =
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200'
  btnOpenPicker.textContent = '采集页面作者'
  authorsActions.append(btnOpenPicker)
  // authorsActions will be appended below the authors table

  const authorsPicker = document.createElement('div')
  authorsPicker.className = cn('space-y-2')
  authorsPicker.style.display = 'none'
  const authorsPickerControls = document.createElement('div')
  authorsPickerControls.className = cn('flex items-center gap-2')
  const chkSelectAll = document.createElement('input')
  chkSelectAll.type = 'checkbox'
  chkSelectAll.className = 'utaf-checkbox'
  const lblSelectAll = document.createElement('span')
  lblSelectAll.className = cn('utaf-label text-xs font-semibold')
  lblSelectAll.textContent = '全选/全不选'
  const btnRefreshPicker = document.createElement('button')
  btnRefreshPicker.className =
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200'
  btnRefreshPicker.textContent = '刷新'
  const btnAddSelected = document.createElement('button')
  btnAddSelected.className =
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200'
  btnAddSelected.textContent = '添加选中'
  const btnClosePicker = document.createElement('button')
  btnClosePicker.className =
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200'
  btnClosePicker.textContent = '关闭'
  authorsPickerControls.append(chkSelectAll)
  authorsPickerControls.append(lblSelectAll)
  authorsPickerControls.append(btnRefreshPicker)
  authorsPickerControls.append(btnAddSelected)
  authorsPickerControls.append(btnClosePicker)
  const authorsPickerList = document.createElement('div')
  authorsPickerList.className = cn('space-y-1')
  authorsPicker.append(authorsPickerControls)
  authorsPicker.append(authorsPickerList)
  // authorsPicker will be appended below the authors table
  const authorsMasterChk = document.createElement('input')
  authorsMasterChk.type = 'checkbox'
  authorsMasterChk.className = 'utaf-checkbox h-4 w-4 align-middle'

  function updateAuthorsMasterChk() {
    const list = Array.isArray(blockedAuthors) ? blockedAuthors : []
    const total = list.length
    const enabledCount = list.reduce((n, a) => n + (a.enabled ? 1 : 0), 0)
    authorsMasterChk.indeterminate = enabledCount > 0 && enabledCount < total
    authorsMasterChk.checked = total > 0 && enabledCount === total
    authorsMasterChk.disabled = total === 0
  }

  authorsMasterChk.addEventListener('change', async () => {
    const next = authorsMasterChk.checked
    blockedAuthors = (blockedAuthors || []).map((a) => ({
      ...a,
      enabled: next,
    }))
    await saveFilterSettings({ blockedAuthors })
    renderAuthorsTable()
    applyAndUpdateStatus()
    updateAuthorsMasterChk()
  })

  const authorsTable = document.createElement('table')
  authorsTable.className = cn(
    'w-full table-fixed rounded-md border border-gray-200'
  )
  const thd = document.createElement('thead')
  const thr = document.createElement('tr')
  const th0 = document.createElement('th')
  th0.className = cn(
    'w-8 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  th0.append(authorsMasterChk)
  const th1 = document.createElement('th')
  th1.className = cn(
    'w-20 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  th1.textContent = '用户ID'
  const th2 = document.createElement('th')
  th2.className = cn(
    'w-24 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  th2.textContent = '用户名'
  const th3 = document.createElement('th')
  th3.className = cn(
    'w-16 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  th3.textContent = '操作'
  thr.append(th0)
  thr.append(th1)
  thr.append(th2)
  thr.append(th3)
  thd.append(thr)
  const tb = document.createElement('tbody')
  authorsTable.append(thd)
  authorsTable.append(tb)
  authorsSection.append(authorsTable)
  authorsSection.append(authorsActions)
  authorsSection.append(authorsPicker)
  panel.append(authorsSection)

  function collectPageAuthorsMap() {
    const map = new Map<string, string>()
    const items = collectScriptItems()
    for (const item of items) {
      const a = item.querySelector('dd.script-list-author a[href*="/users/"]')
      if (a) {
        const href = String((a as HTMLAnchorElement).href || '')
        const m = /\/users\/(\d+)/.exec(href)
        if (m) {
          const id = m[1]
          const name = String((a.textContent || '').trim() || id)
          if (!map.has(id)) {
            map.set(id, name)
          }
        }
      }
    }

    return map
  }

  function populateAuthorsPicker() {
    authorsPickerList.textContent = ''
    const map = collectPageAuthorsMap()
    for (const [id, name] of map) {
      const row = document.createElement('div')
      row.className = cn('flex items-center gap-2')
      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'utaf-checkbox'
      ;(chk as any).dataset.id = id
      ;(chk as any).dataset.name = name
      const exists = (blockedAuthors || []).some((x) => String(x.id) === id)
      if (exists) {
        chk.disabled = true
      }

      const lbl = document.createElement('span')
      lbl.className = cn('utaf-label text-sm text-gray-800')
      lbl.textContent = `${name} (${id})`
      row.append(chk)
      row.append(lbl)
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target && target.tagName.toLowerCase() === 'input') return
        if (!chk.disabled) chk.checked = !chk.checked
      })
      authorsPickerList.append(row)
    }
  }

  btnOpenPicker.addEventListener('click', () => {
    populateAuthorsPicker()
    authorsPicker.style.display = 'block'
  })

  btnRefreshPicker.addEventListener('click', () => {
    populateAuthorsPicker()
  })

  btnClosePicker.addEventListener('click', () => {
    authorsPicker.style.display = 'none'
  })

  chkSelectAll.addEventListener('change', () => {
    const boxes = Array.from(
      authorsPickerList.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]'
      )
    )
    for (const b of boxes) {
      if (!b.disabled) b.checked = chkSelectAll.checked
    }
  })

  btnAddSelected.addEventListener('click', async () => {
    const boxes = Array.from(
      authorsPickerList.querySelectorAll('input[type="checkbox"]:checked')
    )
    let changed = false
    for (const b of boxes) {
      const id = String((b as any).dataset.id || '')
      const name = String((b as any).dataset.name || id)
      if (!id) continue
      const exists = (blockedAuthors || []).find((x) => String(x.id) === id)
      if (exists) {
        exists.name = exists.name || name
        exists.enabled = true
      } else {
        blockedAuthors.push({ id, name, enabled: true })
        changed = true
      }
    }

    if (changed) {
      await saveFilterSettings({ blockedAuthors })
      renderAuthorsTable()
      applyAndUpdateStatus()
      updateAuthorsMasterChk()
    }

    authorsPicker.style.display = 'none'
  })

  function renderAuthorsTable() {
    tb.textContent = ''
    for (const a of blockedAuthors) {
      const tr = document.createElement('tr')
      const td0 = document.createElement('td')
      td0.className = cn(
        'border-t border-gray-200 px-2 py-1 text-left align-middle'
      )
      const td1 = document.createElement('td')
      td1.className = cn('w-20 border-t border-gray-200 px-2 py-1 align-middle')
      const td2 = document.createElement('td')
      td2.className = cn('w-24 border-t border-gray-200 px-2 py-1 align-middle')
      const td3 = document.createElement('td')
      td3.className = cn(
        'border-t border-gray-200 px-2 py-1 align-middle whitespace-nowrap'
      )

      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'utaf-checkbox h-4 w-4 align-middle'
      chk.checked = Boolean(a.enabled)
      chk.addEventListener('change', async () => {
        a.enabled = chk.checked
        await saveFilterSettings({ blockedAuthors })
        applyAndUpdateStatus()
      })
      td0.append(chk)

      const idLabel = document.createElement('span')
      idLabel.className = cn(
        'utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      idLabel.textContent = String(a.id)
      idLabel.title = String(a.id)
      const idInput = document.createElement('input')
      idInput.type = 'text'
      idInput.className = cn(
        'hidden h-5 w-full max-w-[10rem] min-w-[5rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      idInput.value = String(a.id)
      const commitId = async () => {
        const v = String(idInput.value || '').trim()
        if (v) {
          a.id = v
          await saveFilterSettings({ blockedAuthors })
          applyAndUpdateStatus()
        } else {
          idInput.value = String(a.id)
        }

        idInput.classList.add('hidden')
        idLabel.textContent = String(a.id)
        idLabel.title = String(a.id)
        idLabel.style.display = 'block'
      }

      idLabel.addEventListener('click', () => {
        idLabel.style.display = 'none'
        idInput.classList.remove('hidden')
        idInput.focus()
        idInput.select()
      })
      idInput.addEventListener('blur', commitId)
      idInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          void commitId()
        }
      })
      td1.append(idLabel)
      td1.append(idInput)

      const nameLabel = document.createElement('span')
      nameLabel.className = cn(
        'utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      nameLabel.textContent = String(a.name || '')
      nameLabel.title = String(a.name || '')
      const nameInput = document.createElement('input')
      nameInput.type = 'text'
      nameInput.className = cn(
        'hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      nameInput.value = String(a.name || '')
      const commitName = async () => {
        a.name = String(nameInput.value || '').trim() || a.id
        await saveFilterSettings({ blockedAuthors })
        nameInput.classList.add('hidden')
        nameLabel.textContent = String(a.name)
        nameLabel.title = String(a.name)
        nameLabel.style.display = 'block'
      }

      nameLabel.addEventListener('click', () => {
        nameLabel.style.display = 'none'
        nameInput.classList.remove('hidden')
        nameInput.focus()
        nameInput.select()
      })
      nameInput.addEventListener('blur', commitName)
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          void commitName()
        }
      })
      td2.append(nameLabel)
      td2.append(nameInput)

      const btnDel = document.createElement('button')
      btnDel.className = cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 hover:bg-gray-200'
      )
      btnDel.textContent = '删除'
      btnDel.addEventListener('click', async () => {
        blockedAuthors = blockedAuthors.filter(
          (x) => String(x.id) !== String(a.id)
        )
        await saveFilterSettings({ blockedAuthors })
        renderAuthorsTable()
        applyAndUpdateStatus()
      })
      td3.append(btnDel)

      tr.append(td0)
      tr.append(td1)
      tr.append(td2)
      tr.append(td3)
      tb.append(tr)
    }

    const addTr = document.createElement('tr')
    const addTd0 = document.createElement('td')
    addTd0.className = cn('border-t border-gray-200 px-2 py-1 text-center')
    const addPlusBtn = document.createElement('button')
    addPlusBtn.type = 'button'
    addPlusBtn.textContent = '+'
    addPlusBtn.className = cn(
      'flex h-4 w-4 items-center justify-center rounded bg-gray-100 text-xs text-gray-700 hover:bg-gray-200'
    )
    addTd0.append(addPlusBtn)
    const addTd1 = document.createElement('td')
    addTd1.className = cn(
      'w-20 border-t border-gray-200 px-2 py-1 align-middle'
    )

    const addIdInput = document.createElement('input')
    addIdInput.type = 'text'
    addIdInput.placeholder = '作者ID'
    addIdInput.className = cn(
      'h-5 w-full max-w-[10rem] min-w-[5rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
    )

    const addTd2 = document.createElement('td')
    addTd2.className = cn(
      'w-24 border-t border-gray-200 px-2 py-1 align-middle'
    )

    const addNameInput = document.createElement('input')
    addNameInput.type = 'text'
    addNameInput.placeholder = '作者名'
    addNameInput.className = cn(
      'h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
    )

    const doAdd = async () => {
      const id = String(addIdInput.value || '').trim()
      const name = String(addNameInput.value || '').trim()
      if (!id) return
      const exists = blockedAuthors.find((x) => String(x.id) === id)
      if (exists) {
        exists.name = name || exists.name
        exists.enabled = true
      } else {
        blockedAuthors.push({ id, name: name || id, enabled: true })
      }

      addIdInput.value = ''
      addNameInput.value = ''
      await saveFilterSettings({ blockedAuthors })
      renderAuthorsTable()
      applyAndUpdateStatus()
    }

    const addBtn = document.createElement('button')
    addBtn.className =
      'px-1 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs hover:bg-gray-200 whitespace-nowrap inline-flex items-center justify-center shrink-0'
    addBtn.textContent = '添加'
    addBtn.addEventListener('click', doAdd)
    addPlusBtn.addEventListener('click', doAdd)
    addIdInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        void doAdd()
      }
    })
    addNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        void doAdd()
      }
    })

    addTd1.append(addIdInput)
    addTd2.append(addNameInput)

    const addTd3 = document.createElement('td')
    addTd3.className =
      'px-2 py-1 border-t border-gray-200 whitespace-nowrap align-middle'
    addTd3.append(addBtn)

    addTr.append(addTd0)
    addTr.append(addTd1)
    addTr.append(addTd2)
    addTr.append(addTd3)
    tb.append(addTr)

    updateAuthorsMasterChk()
  }

  renderAuthorsTable()

  panel.append(createDivider())

  const keywordsSection = document.createElement('div')
  keywordsSection.className = cn('space-y-2')
  const keywordsTitle = document.createElement('div')
  keywordsTitle.className = cn('text-sm font-semibold text-gray-900')
  keywordsTitle.textContent = '关键字过滤'
  keywordsSection.append(keywordsTitle)

  const keywordsControls = document.createElement('div')
  keywordsControls.className = cn('space-y-2')
  const chkKeywords = document.createElement('input')
  chkKeywords.type = 'checkbox'
  chkKeywords.className = 'utaf-checkbox'
  chkKeywords.checked = keywordsEnabled
  const lblThresholdPre = document.createElement('span')
  lblThresholdPre.className = cn('utaf-label text-xs leading-5')
  lblThresholdPre.textContent = '当分数 ≥'
  const inputKwThreshold = document.createElement('input')
  inputKwThreshold.type = 'number'
  inputKwThreshold.min = '0'
  inputKwThreshold.step = '1'
  inputKwThreshold.value = String(keywordsThreshold)
  inputKwThreshold.className =
    'h-5 w-20 px-2 py-0.5 border border-gray-300 rounded-md text-xs'
  const lblScopePre = document.createElement('span')
  lblScopePre.className = cn('utaf-label text-xs leading-5')
  lblScopePre.textContent = '范围'
  const selectScope = document.createElement('select')
  selectScope.className =
    'h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs'
  const optTitle = document.createElement('option')
  optTitle.value = 'title'
  optTitle.textContent = '标题'
  const optDesc = document.createElement('option')
  optDesc.value = 'description'
  optDesc.textContent = '描述'
  const optBoth = document.createElement('option')
  optBoth.value = 'both'
  optBoth.textContent = '标题+描述'
  selectScope.append(optTitle)
  selectScope.append(optDesc)
  selectScope.append(optBoth)
  selectScope.value = keywordsScope
  const rowEnable = document.createElement('div')
  rowEnable.className = cn('flex items-center gap-2')
  const lblEnable = document.createElement('span')
  lblEnable.className = cn('utaf-label text-xs leading-5')
  lblEnable.textContent = '启用'
  rowEnable.append(lblEnable)
  rowEnable.append(chkKeywords)

  const rowThreshold = document.createElement('div')
  rowThreshold.className = cn('flex items-center gap-2')
  rowThreshold.append(lblThresholdPre)
  rowThreshold.append(inputKwThreshold)

  const rowScope = document.createElement('div')
  rowScope.className = cn('flex items-center gap-2')
  rowScope.append(lblScopePre)
  rowScope.append(selectScope)
  const chkCaseSensitive = document.createElement('input')
  chkCaseSensitive.type = 'checkbox'
  chkCaseSensitive.className = 'utaf-checkbox'
  chkCaseSensitive.checked = keywordsCaseSensitive
  const lblCaseSensitive = document.createElement('span')
  lblCaseSensitive.className = cn('utaf-label text-xs leading-5')
  lblCaseSensitive.textContent = '大小写敏感'
  const rowCase = document.createElement('div')
  rowCase.className = cn('flex items-center gap-2')
  rowCase.append(lblCaseSensitive)
  rowCase.append(chkCaseSensitive)
  keywordsControls.append(rowEnable)
  keywordsControls.append(rowThreshold)
  keywordsControls.append(rowScope)
  keywordsControls.append(rowCase)
  keywordsSection.append(keywordsControls)

  const keywordsTable = document.createElement('table')
  keywordsTable.className = cn(
    'w-full table-fixed rounded-md border border-gray-200'
  )
  const keywordsMasterChk = document.createElement('input')
  keywordsMasterChk.type = 'checkbox'
  keywordsMasterChk.className = 'utaf-checkbox h-4 w-4 align-middle'
  function updateKeywordsMasterChk() {
    const list = Array.isArray(keywords) ? keywords : []
    const total = list.length
    const enabledCount = list.reduce((n, k) => n + (k.enabled ? 1 : 0), 0)
    keywordsMasterChk.indeterminate = enabledCount > 0 && enabledCount < total
    keywordsMasterChk.checked = total > 0 && enabledCount === total
    keywordsMasterChk.disabled = total === 0
  }

  keywordsMasterChk.addEventListener('change', async () => {
    const next = keywordsMasterChk.checked
    keywords = (keywords || []).map((k) => ({ ...k, enabled: next }))
    await saveFilterSettings({ keywords })
    renderKeywordsTable()
    applyAndUpdateStatus()
    updateKeywordsMasterChk()
  })
  const kwThd = document.createElement('thead')
  const kwThr = document.createElement('tr')
  const kwTh0 = document.createElement('th')
  kwTh0.className = cn(
    'w-8 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  kwTh0.append(keywordsMasterChk)
  const kwTh1 = document.createElement('th')
  kwTh1.className = cn(
    'min-w-0 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  kwTh1.textContent = '关键字'
  const kwTh2 = document.createElement('th')
  kwTh2.className = cn(
    'w-14 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  kwTh2.textContent = '分数'
  const kwTh3 = document.createElement('th')
  kwTh3.className = cn(
    'w-16 border-b border-gray-200 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  kwTh3.textContent = '操作'
  kwThr.append(kwTh0)
  kwThr.append(kwTh1)
  kwThr.append(kwTh2)
  kwThr.append(kwTh3)
  kwThd.append(kwThr)
  const kwTb = document.createElement('tbody')
  keywordsTable.append(kwThd)
  keywordsTable.append(kwTb)
  keywordsSection.append(keywordsTable)
  panel.append(keywordsSection)

  function renderKeywordsTable() {
    kwTb.textContent = ''
    for (const k of keywords) {
      const tr = document.createElement('tr')
      const td0 = document.createElement('td')
      td0.className = cn(
        'border-t border-gray-200 px-2 py-1 text-left align-middle'
      )
      const td1 = document.createElement('td')
      td1.className = cn(
        'min-w-0 border-t border-gray-200 px-2 py-1 align-middle'
      )
      const td2 = document.createElement('td')
      td2.className = cn('w-14 border-t border-gray-200 px-2 py-1 align-middle')
      const td3 = document.createElement('td')
      td3.className = cn(
        'w-16 border-t border-gray-200 px-2 py-1 align-middle whitespace-nowrap'
      )

      const rowWrap = document.createElement('div')
      rowWrap.className = cn('flex min-w-0 items-center gap-2')
      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'utaf-checkbox h-4 w-4 align-middle'
      chk.checked = Boolean(k.enabled)
      chk.addEventListener('change', async () => {
        k.enabled = chk.checked
        await saveFilterSettings({ keywords })
        applyAndUpdateStatus()
        updateKeywordsMasterChk()
      })
      td0.append(chk)

      const kwLabel = document.createElement('span')
      kwLabel.className = cn(
        'utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      kwLabel.textContent = String(k.keyword || '')
      kwLabel.title = String(k.keyword || '')
      const kwInput = document.createElement('input')
      kwInput.type = 'text'
      kwInput.className = cn(
        'hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      kwInput.value = String(k.keyword || '')
      const commitKw = async () => {
        const v = String(kwInput.value || '').trim()
        if (v) {
          k.keyword = v
          await saveFilterSettings({ keywords })
          applyAndUpdateStatus()
        } else {
          kwInput.value = String(k.keyword || '')
        }

        kwInput.classList.add('hidden')
        kwLabel.textContent = String(k.keyword || '')
        kwLabel.title = String(k.keyword || '')
        kwLabel.style.display = 'block'
      }

      kwLabel.addEventListener('click', () => {
        kwLabel.style.display = 'none'
        kwInput.classList.remove('hidden')
        kwInput.focus()
        kwInput.select()
      })
      kwInput.addEventListener('blur', commitKw)
      kwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          void commitKw()
        }
      })

      rowWrap.append(kwLabel)
      rowWrap.append(kwInput)
      td1.append(rowWrap)

      const scoreInput = document.createElement('input')
      scoreInput.type = 'number'

      scoreInput.step = '1'
      scoreInput.value = String(
        Number.isFinite(Number(k.score)) ? Number(k.score) : 5
      )
      scoreInput.className = cn(
        'h-5 w-full max-w-[4rem] min-w-[3rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      scoreInput.addEventListener('change', async () => {
        let v = Number(scoreInput.value)
        if (!Number.isFinite(v)) v = 5
        k.score = v
        await saveFilterSettings({ keywords })
        applyAndUpdateStatus()
      })
      td2.append(scoreInput)

      const btnDel = document.createElement('button')
      btnDel.className = cn(
        'inline-flex shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 hover:bg-gray-200'
      )
      btnDel.textContent = '删除'
      btnDel.addEventListener('click', async () => {
        keywords = keywords.filter(
          (x) => String(x.keyword) !== String(k.keyword)
        )
        await saveFilterSettings({ keywords })
        renderKeywordsTable()
        applyAndUpdateStatus()
      })
      td3.append(btnDel)

      tr.append(td0)
      tr.append(td1)
      tr.append(td2)
      tr.append(td3)
      kwTb.append(tr)
    }

    const addTr = document.createElement('tr')
    const addTd0 = document.createElement('td')
    addTd0.className = cn(
      'border-t border-gray-200 px-2 py-1 text-left align-middle'
    )
    const addTd1 = document.createElement('td')
    addTd1.className = cn(
      'min-w-0 border-t border-gray-200 px-2 py-1 align-middle'
    )
    const addKwInput = document.createElement('input')
    addKwInput.type = 'text'
    addKwInput.placeholder = '关键字'
    addKwInput.className = cn(
      'h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
    )
    addTd1.append(addKwInput)
    const addTd2 = document.createElement('td')
    addTd2.className = cn(
      'w-14 border-t border-gray-200 px-2 py-1 align-middle'
    )
    const addScoreInput = document.createElement('input')
    addScoreInput.type = 'number'

    addScoreInput.step = '1'
    addScoreInput.placeholder = '分数'
    addScoreInput.value = '5'
    addScoreInput.className = cn(
      'h-5 w-full max-w-[4rem] min-w-[3rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
    )
    addTd2.append(addScoreInput)
    const addTd3 = document.createElement('td')
    addTd3.className = cn(
      'w-16 border-t border-gray-200 px-2 py-1 align-middle whitespace-nowrap'
    )
    const addBtn = document.createElement('button')
    addBtn.className = cn(
      'inline-flex shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 hover:bg-gray-200'
    )
    addBtn.textContent = '添加'
    const doAdd = async () => {
      const kw = String(addKwInput.value || '').trim()
      let sc = Number(addScoreInput.value)
      if (!Number.isFinite(sc)) sc = 5
      if (!kw) return
      const exists = keywords.find(
        (x) => String(x.keyword).toLowerCase() === kw.toLowerCase()
      )
      if (exists) {
        exists.score = sc
        exists.enabled = true
      } else {
        keywords.push({ keyword: kw, score: sc, enabled: true })
      }

      addKwInput.value = ''
      addScoreInput.value = '5'
      await saveFilterSettings({ keywords })
      renderKeywordsTable()
      applyAndUpdateStatus()
      // Scroll add keyword input into view
      const lastRow = kwTb.querySelector('tr:last-child')
      if (lastRow) {
        lastRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    addBtn.addEventListener('click', doAdd)
    addKwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        void doAdd()
      }
    })
    addScoreInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        void doAdd()
      }
    })
    addTd3.append(addBtn)
    addTr.append(addTd0)
    addTr.append(addTd1)
    addTr.append(addTd2)
    addTr.append(addTd3)
    kwTb.append(addTr)
  }

  renderKeywordsTable()
  updateKeywordsMasterChk()

  function updateKeywordsControlsDisabled() {
    inputKwThreshold.disabled = !chkKeywords.checked
    selectScope.disabled = !chkKeywords.checked
    chkCaseSensitive.disabled = !chkKeywords.checked
    inputKwThreshold.className = inputKwThreshold.disabled
      ? 'h-5 w-20 px-2 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'h-5 w-20 px-2 py-0.5 border border-gray-300 rounded-md text-xs'
    selectScope.className = selectScope.disabled
      ? 'h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs'
    lblCaseSensitive.className = chkCaseSensitive.disabled
      ? 'utaf-label text-xs leading-5 opacity-50 cursor-not-allowed'
      : 'utaf-label text-xs leading-5'
  }

  updateKeywordsControlsDisabled()
  chkKeywords.addEventListener('change', async () => {
    keywordsEnabled = chkKeywords.checked
    await saveFilterSettings({ keywordsEnabled })
    updateKeywordsControlsDisabled()
    applyAndUpdateStatus()
  })
  chkCaseSensitive.addEventListener('change', async () => {
    keywordsCaseSensitive = chkCaseSensitive.checked
    await saveFilterSettings({ keywordsCaseSensitive })
    applyAndUpdateStatus()
  })
  inputKwThreshold.addEventListener('change', async () => {
    let v = Number(inputKwThreshold.value)
    if (!Number.isFinite(v) || v < 0) v = 15
    keywordsThreshold = v
    await saveFilterSettings({ keywordsThreshold })
    applyAndUpdateStatus()
  })
  selectScope.addEventListener('change', async () => {
    const v = String(selectScope.value || 'both') as
      | 'title'
      | 'description'
      | 'both'
    keywordsScope = v
    await saveFilterSettings({ keywordsScope })
    applyAndUpdateStatus()
  })

  function updateControlsDisabled() {
    inputTotal.disabled = !chkTotal.checked
    inputDaily.disabled = !chkDaily.checked
    inputTotal.className = inputTotal.disabled
      ? 'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs'
    inputDaily.className = inputDaily.disabled
      ? 'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'w-20 px-2 py-1 border border-gray-300 rounded-md text-xs'
  }

  updateControlsDisabled()
  chkTotal.addEventListener('change', updateControlsDisabled)
  chkDaily.addEventListener('change', updateControlsDisabled)

  async function resetAll() {
    currentMonths = DEFAULTS.updatedMonths
    currentDays = DEFAULTS.updatedDays
    currentMode = DEFAULTS.updatedMode
    createdOlderDays = DEFAULTS.createdOlderDays
    createdRecentDays = DEFAULTS.createdRecentDays
    createdOlderMode = DEFAULTS.createdOlderMode
    createdOlderMonths = DEFAULTS.createdOlderMonths
    createdRecentMode = DEFAULTS.createdRecentMode
    createdRecentMonths = DEFAULTS.createdRecentMonths
    createdOlderEnabled = false
    createdRecentEnabled = false
    updatedEnabled = false
    totalInstallsEnabled = false
    dailyInstallsEnabled = false
    totalInstallsLimit = DEFAULTS.totalInstallsLimit
    dailyInstallsLimit = DEFAULTS.dailyInstallsLimit
    blockedAuthors = DEFAULTS.blockedAuthors
    keywordsEnabled = DEFAULTS.keywordsEnabled
    keywordsThreshold = DEFAULTS.keywordsThreshold
    keywordsScope = DEFAULTS.keywordsScope
    keywordsCaseSensitive = DEFAULTS.keywordsCaseSensitive
    keywords = DEFAULTS.keywords
    updatedComp.setState({
      enabled: updatedEnabled,
      mode: currentMode,
      months: currentMonths,
      days: currentDays,
    })
    olderComp.setState({
      enabled: createdOlderEnabled,
      mode: createdOlderMode,
      months: createdOlderMonths,
      days: createdOlderDays,
    })
    recentComp.setState({
      enabled: createdRecentEnabled,
      mode: createdRecentMode,
      months: createdRecentMonths,
      days: createdRecentDays,
    })
    chkTotal.checked = totalInstallsEnabled
    chkDaily.checked = dailyInstallsEnabled
    chkKeywords.checked = keywordsEnabled

    inputTotal.value = String(totalInstallsLimit)
    inputDaily.value = String(dailyInstallsLimit)
    inputKwThreshold.value = String(keywordsThreshold)
    selectScope.value = keywordsScope
    chkCaseSensitive.checked = keywordsCaseSensitive
    updateControlsDisabled()
    updateKeywordsControlsDisabled()
    await saveFilterSettings({
      updatedThresholdMode: currentMode,
      updatedThresholdMonths: currentMonths,
      updatedThresholdDays: currentDays,
      updatedEnabled,
      createdOlderEnabled,
      createdOlderThresholdMode: createdOlderMode,
      createdOlderThresholdMonths: createdOlderMonths,
      createdOlderThresholdDays: createdOlderDays,
      createdRecentEnabled,
      createdRecentThresholdMode: createdRecentMode,
      createdRecentThresholdMonths: createdRecentMonths,
      createdRecentThresholdDays: createdRecentDays,
      totalInstallsEnabled,
      totalInstallsLimit,
      dailyInstallsEnabled,
      dailyInstallsLimit,
      blockedAuthors,
      keywordsEnabled,
      keywordsThreshold,
      keywordsScope,
      keywordsCaseSensitive,
      keywords,
    })
    applyAndUpdateStatus()
  }

  btnReset.addEventListener('click', async () => {
    const ok = globalThis.confirm('确定要重置所有筛选设置吗？此操作不可撤销。')
    if (!ok) return
    await resetAll()
  })

  void setCollapsed(uiCollapsed)
  applyAndUpdateStatus()
}

function initialize() {
  if (!isGreasyForkSearchPage()) return
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGreasyForkFilters)
  } else {
    void injectGreasyForkFilters()
  }
}

function onSettingsChange() {
  const locale =
    (getSettingsValue('locale') as string | undefined) || getPrefferedLocale()
  resetI18n(locale)
  // enableTreatSubdomainsSameSite = Boolean(
  //   getSettingsValue(`enableTreatSubdomainsAsSameSiteForCurrentSite_${host}`)
  // )
  // enableBackground = Boolean(
  //   getSettingsValue(`enableOpenNewTabInBackgroundForCurrentSite_${host}`)
  // )
  // enableLinkToImg = Boolean(
  //   getSettingsValue(`enableLinkToImgForCurrentSite_${host}`)
  // )
}

async function main() {
  await initSettings(() => {
    const settingsTable = getSettingsTable()
    return {
      id: 'utags-advanced-filter',
      title: i('settings.title'),
      footer: `
    <p>${i('settings.information')}</p>
    <p>
    <a href="https://github.com/utags/utags-advanced-filter/issues" target="_blank">
    ${i('settings.report')}
    </a></p>
    <p>Made with ❤️ by
    <a href="https://www.pipecraft.net/" target="_blank">
      Pipecraft
    </a></p>`,
      settingsTable,
      availableLocales: getAvailableLocales(),
      async onValueChange() {
        onSettingsChange()
      },
      onViewUpdate(settingsMainView) {
        const group2 = $(`.option_groups:nth-of-type(2)`, settingsMainView)
        if (group2) {
          group2.style.display = getSettingsValue(
            `enableCustomRulesForCurrentSite_${host}`
          )
            ? 'block'
            : 'none'
        }
      },
    }
  })

  if (
    !getSettingsValue('enable') ||
    !getSettingsValue(`enableCurrentSite_${host}`)
  ) {
    return
  }

  onSettingsChange()

  addStyle(styleText)

  initialize()
}

runWhenHeadExists(async () => {
  if (doc.documentElement.dataset.utaf === undefined) {
    doc.documentElement.dataset.utaf = ''
    await main()
  }
})
