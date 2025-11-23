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
  Check,
  ChevronUp,
  createElement as createIconElement,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide'
import type { PlasmoCSConfig } from 'plasmo'

import { getAvailableLocales, i, resetI18n } from './messages'
import { createDatePresetInput } from './ui/date-preset-input'
import {
  getNumberInputOrDefault,
  normalizeText,
  parseNumberOrDefault,
} from './ui/form-helpers'
import { buildAuthorForm, buildKeywordForm } from './ui/modal-forms'
import { openPanelModal } from './ui/panel-modal'

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
      void showSettings()
    }
  })
}

export const config: PlasmoCSConfig = {
  run_at: 'document_end',
  // matches: ['https://greasyfork.org/*'],
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
    blockedAuthors: [] as Array<{
      id: string
      name: string
      enabled: boolean
      score: number
    }>,
    keywordsEnabled: true,
    scoreThreshold: 15,
    keywordsScope: 'both' as const,
    keywordsCaseSensitive: false,
    keywords: [] as Array<{ keyword: string; score: number; enabled: boolean }>,
    updatedScore: 20,
    createdOlderScore: 20,
    createdRecentScore: 20,
    totalInstallsScore: 20,
    dailyInstallsScore: 20,
    authorsDefaultScore: 20,
    keywordsDefaultScore: 5,
    quickEnabled: true,
    authorsEnabled: true,
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
  if (host !== 'greasyfork.org' && host !== 'sleazyfork.org') return false
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
  const ts = times
    .map((el) => parseTimeElementToTs(el))
    .filter((v) => v !== null)
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
  return t || undefined
}

function getDescriptionTextInItem(item: Element): string | undefined {
  const el =
    item.querySelector('dd.script-list-description') ||
    item.querySelector('.script-description')
  const t = (el?.textContent || '').trim()
  return t || undefined
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
  authorScores: Map<string, number>,
  scoreThreshold,
  keywordsScope: 'title' | 'description' | 'both',
  keywordsList: Array<{
    keyword: string
    score: number
    enabled: boolean
    isRegex?: boolean
    regex?: RegExp
  }>,
  keywordsCaseSensitive: boolean,
  swapShownHidden: boolean,
  weights: {
    updatedScore: number
    createdOlderScore: number
    createdRecentScore: number
    totalInstallsScore: number
    dailyInstallsScore: number
  }
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
    let sum = 0
    if (ud && updatedTs) {
      const ageU = now - updatedTs
      if (ageU >= ud) sum += Math.max(weights.updatedScore, 0)
    }

    if (od && createdTs) {
      const ageC = now - createdTs
      if (ageC >= od) sum += Math.max(weights.createdOlderScore, 0)
    }

    if (rd && createdTs) {
      const ageC = now - createdTs
      if (ageC <= rd) sum += Math.max(weights.createdRecentScore, 0)
    }

    if (ti && totalInstalls !== null && totalInstalls < ti)
      sum += Math.max(weights.totalInstallsScore, 0)
    if (di && dailyInstalls !== null && dailyInstalls < di)
      sum += Math.max(weights.dailyInstallsScore, 0)
    if (authorScores && authorScores.size > 0) {
      for (const aid of authorIds) {
        const sc = authorScores.get(String(aid))
        if (Number.isFinite(sc)) {
          sum += Number(sc!)
        }
      }
    }

    if (keywordsList && keywordsList.length > 0) {
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
      let kwSum = 0
      for (const k of keywordsList || []) {
        if (!k) continue
        const kw = k.keyword
        if (!kw) continue
        if (k.isRegex && k.regex) {
          if (k.regex.test(baseText)) {
            kwSum += k.score
          }
        } else if (text.includes(kw)) {
          kwSum += k.score
        }
      }

      sum += kwSum
    }

    const hide = sum >= Math.max(scoreThreshold, 0)
    const finalHide = swapShownHidden ? !hide : hide
    if (finalHide) {
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
  let blockedAuthors = (
    (Array.isArray(saved.blockedAuthors)
      ? (saved.blockedAuthors as Array<{
          id: string
          name: string
          enabled: boolean
          score: number
        }>)
      : (DEFAULTS.blockedAuthors as Array<{
          id: string
          name: string
          enabled: boolean
          score: number
        }>)) as Array<{
      id: string
      name: string
      enabled: boolean
      score: number
    }>
  ).map((x) => ({
    id: String(x.id),
    name: String(x.name ?? x.id),
    enabled: Boolean(x.enabled),
    score: Number(x.score),
  }))
  let keywordsEnabled =
    saved.keywordsEnabled === undefined
      ? DEFAULTS.keywordsEnabled
      : Boolean(saved.keywordsEnabled)
  let scoreThreshold = Number(saved.scoreThreshold ?? DEFAULTS.scoreThreshold)
  let keywordsScope =
    (saved.keywordsScope as 'title' | 'description' | 'both') ??
    DEFAULTS.keywordsScope
  let keywordsCaseSensitive = Boolean(
    saved.keywordsCaseSensitive ?? DEFAULTS.keywordsCaseSensitive
  )
  let keywords = (
    (Array.isArray(saved.keywords)
      ? (saved.keywords as Array<{
          keyword: string
          score: number
          enabled: boolean
        }>)
      : (DEFAULTS.keywords as Array<{
          keyword: string
          score: number
          enabled: boolean
        }>)) as Array<{
      keyword: string
      score: number
      enabled: boolean
    }>
  ).map((k) => ({
    keyword: String(k.keyword),
    score: Number(k.score),
    enabled: Boolean(k.enabled),
  }))
  let swapShownHidden = Boolean(saved.swapShownHidden as boolean | undefined)
  let quickEnabled =
    saved.quickEnabled === undefined
      ? DEFAULTS.quickEnabled
      : Boolean(saved.quickEnabled)
  let authorsEnabled =
    saved.authorsEnabled === undefined
      ? DEFAULTS.authorsEnabled
      : Boolean(saved.authorsEnabled)
  let totalInstallsLimit = Number(
    saved.totalInstallsLimit ?? DEFAULTS.totalInstallsLimit
  )
  let dailyInstallsLimit = Number(
    saved.dailyInstallsLimit ?? DEFAULTS.dailyInstallsLimit
  )
  let updatedScore = Number(saved.updatedScore ?? DEFAULTS.updatedScore)
  let createdOlderScore = Number(
    saved.createdOlderScore ?? DEFAULTS.createdOlderScore
  )
  let createdRecentScore = Number(
    saved.createdRecentScore ?? DEFAULTS.createdRecentScore
  )
  let totalInstallsScore = Number(
    saved.totalInstallsScore ?? DEFAULTS.totalInstallsScore
  )
  let dailyInstallsScore = Number(
    saved.dailyInstallsScore ?? DEFAULTS.dailyInstallsScore
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
    'relative bg-white shadow-xl rounded-xl px-3 pb-3 pt-0 pr-5 w-80 overflow-y-auto font-sans text-sm'
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
  masterChk.className = 'utaf-checkbox hidden'
  masterChk.id = 'utaf-master'
  masterChk.setAttribute('title', '反选')
  masterChk.setAttribute('aria-label', '反选')
  const stats = document.createElement('div')
  stats.className = cn('text-xs text-gray-500')
  headerRow2.append(stats)
  // moved global threshold row to content area for non-fixed display
  const chkSwap = document.createElement('input')
  chkSwap.type = 'checkbox'
  chkSwap.className = 'utaf-checkbox utaf-toggle'
  chkSwap.id = 'utaf-swap'
  chkSwap.checked = swapShownHidden
  chkSwap.setAttribute('title', '反向显示')
  chkSwap.setAttribute('aria-label', '反向显示')
  const lblSwap = document.createElement('label')
  lblSwap.className = cn('utaf-label text-xs')
  lblSwap.htmlFor = 'utaf-swap'
  lblSwap.textContent = '反向显示'
  const swapRight = document.createElement('div')
  swapRight.className = cn('ml-auto flex items-center gap-2')
  swapRight.append(lblSwap)
  swapRight.append(chkSwap)
  headerRow2.append(swapRight)
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
  const thresholdRow = document.createElement('div')
  thresholdRow.className = cn('flex items-center gap-2 text-xs')
  const lblGlobalThreshold = document.createElement('span')
  lblGlobalThreshold.className = cn('utaf-label text-xs')
  lblGlobalThreshold.textContent = '当分数 >='
  const inputScoreThreshold = document.createElement('input')
  inputScoreThreshold.type = 'number'
  inputScoreThreshold.min = '0'
  inputScoreThreshold.step = '1'
  inputScoreThreshold.value = String(scoreThreshold)
  inputScoreThreshold.className = cn(
    'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
  )
  const lblThresholdAction = document.createElement('span')
  lblThresholdAction.className = cn('utaf-label utaf-threshold-action text-xs')
  lblThresholdAction.textContent = swapShownHidden ? '时显示' : '时隐藏'
  thresholdRow.append(lblGlobalThreshold)
  thresholdRow.append(inputScoreThreshold)
  thresholdRow.append(lblThresholdAction)
  inputScoreThreshold.addEventListener('change', async () => {
    let v = Number(inputScoreThreshold.value)
    if (!Number.isFinite(v) || v < 0) v = 15
    scoreThreshold = v
    await saveFilterSettings({ scoreThreshold })
    applyAndUpdateStatus()
  })
  panel.append(content)
  content.append(thresholdRow)

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
    const updatedDays =
      quickEnabled && updatedEnabled
        ? currentMode === 'days'
          ? currentDays
          : currentMonths > 0
            ? monthsToDays(currentMonths)
            : 0
        : 0
    const olderDays =
      quickEnabled && createdOlderEnabled
        ? createdOlderMode === 'days'
          ? createdOlderDays
          : createdOlderMonths > 0
            ? monthsToDays(createdOlderMonths)
            : 0
        : 0
    const recentDays =
      quickEnabled && createdRecentEnabled
        ? createdRecentMode === 'days'
          ? createdRecentDays
          : createdRecentMonths > 0
            ? monthsToDays(createdRecentMonths)
            : 0
        : 0
    const totalLess =
      quickEnabled && totalInstallsEnabled ? totalInstallsLimit : 0
    const dailyLess =
      quickEnabled && dailyInstallsEnabled ? dailyInstallsLimit : 0
    const authorScores = new Map(
      (authorsEnabled ? blockedAuthors || [] : [])
        .filter((x) => Boolean(x.enabled))
        .map((x) => [
          String(x.id),
          Number.isFinite(Number((x as any).score))
            ? Number((x as any).score)
            : DEFAULTS.authorsDefaultScore,
        ])
    )
    const threshold = Math.max(scoreThreshold, 0)
    const kwScope = keywordsScope
    const caseSensitive = keywordsCaseSensitive
    const enabledKeywords = keywordsEnabled
      ? (keywords || []).filter((x) => Boolean(x.enabled))
      : []
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
      const score = Number.isFinite(Number(x.score))
        ? Number(x.score)
        : DEFAULTS.keywordsDefaultScore
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
      authorScores,
      threshold,
      kwScope,
      kwList,
      caseSensitive,
      swapShownHidden,
      {
        updatedScore,
        createdOlderScore,
        createdRecentScore,
        totalInstallsScore,
        dailyInstallsScore,
      }
    )
    stats.textContent = `显示 ${counts.visible} | 隐藏 ${counts.hidden}`
    const states = [
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
      keywordsEnabled,
      quickEnabled,
      authorsEnabled,
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
      quickEnabled,
      authorsEnabled,
    ]
    const any = states.some(Boolean)
    const next = !any
    updatedEnabled = next
    createdOlderEnabled = next
    createdRecentEnabled = next
    totalInstallsEnabled = next
    dailyInstallsEnabled = next
    keywordsEnabled = next
    quickEnabled = next
    authorsEnabled = next
    updatedComp.setEnabledSilently(next)
    olderComp.setEnabledSilently(next)
    recentComp.setEnabledSilently(next)
    chkTotal.checked = next
    chkDaily.checked = next
    chkKeywords.checked = next
    // may be undefined if section not built yet
    try {
      const q = document.querySelector('#utaf-quick-enable') as
        | HTMLInputElement
        | undefined
      if (q) q.checked = next
      const a = document.querySelector('#utaf-authors-enable') as
        | HTMLInputElement
        | undefined
      if (a) a.checked = next
    } catch {}

    await saveFilterSettings({
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
      keywordsEnabled,
      quickEnabled,
      authorsEnabled,
    })
    updateControlsDisabled()
    updateAuthorsControlsDisabled()
    updateKeywordsControlsDisabled()
    applyAndUpdateStatus()
  })

  chkSwap.addEventListener('change', async () => {
    swapShownHidden = chkSwap.checked
    if (lblThresholdAction !== undefined) {
      lblThresholdAction.textContent = swapShownHidden ? '时显示' : '时隐藏'
    }

    await saveFilterSettings({ swapShownHidden })
    applyAndUpdateStatus()
  })

  const updatedComp = createDatePresetInput({
    shadow,
    // preLabel: '隐藏',
    preLabel: '更新时间 >',
    monthsSuffix: '',
    daysSuffix: '',
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
      updateControlsDisabled()
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
    // preLabel: '隐藏',
    preLabel: '创建时间 >',
    monthsSuffix: '',
    daysSuffix: '',
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
      updateControlsDisabled()
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
    // preLabel: '隐藏',
    preLabel: '创建时间 <',
    monthsSuffix: '',
    daysSuffix: '',
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
      updateControlsDisabled()
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

  panel.append(createDivider())

  const quickSection = document.createElement('div')
  quickSection.className = cn('space-y-2')
  const quickTitle = document.createElement('div')
  quickTitle.className = cn(
    'flex items-center justify-between text-sm font-semibold text-gray-900'
  )
  const quickTitleText = document.createElement('span')
  quickTitleText.textContent = '便捷筛选'
  const quickRight = document.createElement('div')
  quickRight.className = cn('flex items-center gap-2')
  const lblQuickEnable = document.createElement('label')
  lblQuickEnable.className = cn('utaf-label text-xs leading-5')
  lblQuickEnable.textContent = '启用'
  const chkQuick = document.createElement('input')
  chkQuick.type = 'checkbox'
  chkQuick.className = 'utaf-checkbox utaf-toggle'
  chkQuick.checked = quickEnabled
  chkQuick.id = 'utaf-quick-enable'
  quickRight.append(lblQuickEnable)
  quickRight.append(chkQuick)
  quickTitle.append(quickTitleText)
  quickTitle.append(quickRight)
  quickSection.append(quickTitle)
  const quickTable = document.createElement('table')
  quickTable.className = cn('w-full table-fixed text-sm')
  const qthd = document.createElement('thead')
  const qthr = document.createElement('tr')
  const qth0 = document.createElement('th')
  qth0.className = cn(
    'utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  qth0.append(masterChk)
  const qth1 = document.createElement('th')
  qth1.className = cn(
    'utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm text-gray-700'
  )
  const lblMaster = document.createElement('label')
  // lblMaster.className = cn('utaf-label')
  // lblMaster.htmlFor = 'utaf-master'
  lblMaster.textContent = '条件'
  qth1.append(lblMaster)
  const qth2 = document.createElement('th')
  qth2.className = cn(
    'utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  qth2.textContent = '分数'
  qthr.append(qth1)
  qthr.append(qth2)
  qthr.append(qth0)
  qthd.append(qthr)
  const qtb = document.createElement('tbody')
  quickTable.append(qthd)
  quickTable.append(qtb)
  quickSection.append(quickTable)
  panel.append(quickSection)
  panel.append(createDivider())

  let inputUpdatedScore: HTMLInputElement
  let inputOlderScore: HTMLInputElement
  let inputRecentScore: HTMLInputElement
  // let inputTotalScore: HTMLInputElement
  // let inputDailyScore: HTMLInputElement
  let updatedPresetChk: HTMLInputElement | undefined
  let updatedPresetInput: HTMLInputElement | undefined
  let olderPresetChk: HTMLInputElement | undefined
  let olderPresetInput: HTMLInputElement | undefined
  let recentPresetChk: HTMLInputElement | undefined
  let recentPresetInput: HTMLInputElement | undefined

  function appendQuickRow(
    chkEl: HTMLElement,
    labelEl: HTMLElement,
    inputEl: HTMLElement,
    suffixEl: HTMLElement,
    scoreInputEl: HTMLElement
  ) {
    const tr = document.createElement('tr')
    tr.className = cn('cursor-pointer hover:bg-gray-50')
    const td0 = document.createElement('td')
    td0.className = cn(
      'utaf-col-user min-w-0 border-b border-gray-100 px-2 py-1 pr-3 align-middle'
    )
    const td1 = document.createElement('td')
    td1.className = cn(
      'utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle'
    )
    const td2 = document.createElement('td')
    td2.className = cn(
      'utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle'
    )
    const wrap = document.createElement('div')
    wrap.className = cn('flex flex-wrap items-center gap-1')
    wrap.append(labelEl)
    wrap.append(inputEl)
    wrap.append(suffixEl)
    td0.append(wrap)
    td1.append(scoreInputEl)
    td2.append(chkEl)
    tr.append(td0)
    tr.append(td1)
    tr.append(td2)
    tr.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (
        target.closest('input,button,select,textarea') ||
        target.closest('svg')
      )
        return
      const box = chkEl as HTMLInputElement
      box.checked = !box.checked
      box.dispatchEvent(new Event('change'))
    })
    qtb.append(tr)
  }

  {
    const [c, p, iEl, s] = Array.from(
      updatedComp.root.children
    ) as HTMLElement[]
    updatedPresetChk = c as HTMLInputElement
    updatedPresetInput = iEl as HTMLInputElement
    inputUpdatedScore = document.createElement('input')
    inputUpdatedScore.type = 'number'
    inputUpdatedScore.min = '0'
    inputUpdatedScore.step = '1'
    inputUpdatedScore.value = String(updatedScore)
    inputUpdatedScore.className = cn(
      'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
    )
    inputUpdatedScore.addEventListener('change', async () => {
      let v = Number(inputUpdatedScore.value)
      if (!Number.isFinite(v) || v < 0) v = DEFAULTS.updatedScore
      updatedScore = v
      await saveFilterSettings({ updatedScore })
      applyAndUpdateStatus()
    })
    appendQuickRow(c, p, iEl, s, inputUpdatedScore)
  }

  {
    const [c, p, iEl, s] = Array.from(olderComp.root.children) as HTMLElement[]
    olderPresetChk = c as HTMLInputElement
    olderPresetInput = iEl as HTMLInputElement
    inputOlderScore = document.createElement('input')
    inputOlderScore.type = 'number'
    inputOlderScore.min = '0'
    inputOlderScore.step = '1'
    inputOlderScore.value = String(createdOlderScore)
    inputOlderScore.className = cn(
      'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
    )
    inputOlderScore.addEventListener('change', async () => {
      let v = Number(inputOlderScore.value)
      if (!Number.isFinite(v) || v < 0) v = DEFAULTS.createdOlderScore
      createdOlderScore = v
      await saveFilterSettings({ createdOlderScore })
      applyAndUpdateStatus()
    })
    appendQuickRow(c, p, iEl, s, inputOlderScore)
  }

  {
    const [c, p, iEl, s] = Array.from(recentComp.root.children) as HTMLElement[]
    recentPresetChk = c as HTMLInputElement
    recentPresetInput = iEl as HTMLInputElement
    inputRecentScore = document.createElement('input')
    inputRecentScore.type = 'number'
    inputRecentScore.min = '0'
    inputRecentScore.step = '1'
    inputRecentScore.value = String(createdRecentScore)
    inputRecentScore.className = cn(
      'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
    )
    inputRecentScore.addEventListener('change', async () => {
      let v = Number(inputRecentScore.value)
      if (!Number.isFinite(v) || v < 0) v = DEFAULTS.createdRecentScore
      createdRecentScore = v
      await saveFilterSettings({ createdRecentScore })
      applyAndUpdateStatus()
    })
    appendQuickRow(c, p, iEl, s, inputRecentScore)
  }

  const chkTotal = document.createElement('input')
  chkTotal.type = 'checkbox'
  chkTotal.className = 'utaf-checkbox utaf-toggle'
  chkTotal.id = 'utaf-total'
  chkTotal.checked = totalInstallsEnabled
  const lblTotalPre = document.createElement('label')
  // lblTotalPre.className = 'utaf-label'
  // lblTotalPre.htmlFor = 'utaf-total'
  lblTotalPre.textContent = '总安装量 <'
  const inputTotal = document.createElement('input')
  inputTotal.type = 'number'
  inputTotal.min = '0'
  inputTotal.step = '1'
  inputTotal.value = String(totalInstallsLimit)
  inputTotal.className =
    'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs'
  const lblTotalSuf = document.createElement('span')
  lblTotalSuf.textContent = ''
  const inputTotalScore = document.createElement('input')
  inputTotalScore.type = 'number'
  inputTotalScore.min = '0'
  inputTotalScore.step = '1'
  inputTotalScore.value = String(totalInstallsScore)
  inputTotalScore.className = cn(
    'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
  )
  inputTotalScore.addEventListener('change', async () => {
    let v = Number(inputTotalScore.value)
    if (!Number.isFinite(v) || v < 0) v = DEFAULTS.totalInstallsScore
    totalInstallsScore = v
    await saveFilterSettings({ totalInstallsScore })
    applyAndUpdateStatus()
  })
  chkTotal.addEventListener('change', async () => {
    totalInstallsEnabled = chkTotal.checked
    await saveFilterSettings({ totalInstallsEnabled })
    applyAndUpdateStatus()
  })
  inputTotal.addEventListener('change', async () => {
    let v = Number(inputTotal.value)
    if (!Number.isFinite(v) || v < 0) v = DEFAULTS.totalInstallsLimit
    totalInstallsLimit = v
    await saveFilterSettings({ totalInstallsLimit })
    applyAndUpdateStatus()
  })
  appendQuickRow(
    chkTotal,
    lblTotalPre,
    inputTotal,
    lblTotalSuf,
    inputTotalScore
  )

  const chkDaily = document.createElement('input')
  chkDaily.type = 'checkbox'
  chkDaily.className = 'utaf-checkbox utaf-toggle'
  chkDaily.id = 'utaf-daily'
  chkDaily.checked = dailyInstallsEnabled
  const lblDailyPre = document.createElement('label')
  // lblDailyPre.className = 'utaf-label'
  // lblDailyPre.htmlFor = 'utaf-daily'
  lblDailyPre.textContent = '日安装量 <'
  const inputDaily = document.createElement('input')
  inputDaily.type = 'number'
  inputDaily.min = '0'
  inputDaily.step = '1'
  inputDaily.value = String(dailyInstallsLimit)
  inputDaily.className =
    'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs'
  const lblDailySuf = document.createElement('span')
  lblDailySuf.textContent = ''
  const inputDailyScore = document.createElement('input')
  inputDailyScore.type = 'number'
  inputDailyScore.min = '0'
  inputDailyScore.step = '1'
  inputDailyScore.value = String(dailyInstallsScore)
  inputDailyScore.className = cn(
    'h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
  )
  inputDailyScore.addEventListener('change', async () => {
    let v = Number(inputDailyScore.value)
    if (!Number.isFinite(v) || v < 0) v = DEFAULTS.dailyInstallsScore
    dailyInstallsScore = v
    await saveFilterSettings({ dailyInstallsScore })
    applyAndUpdateStatus()
  })
  chkDaily.addEventListener('change', async () => {
    dailyInstallsEnabled = chkDaily.checked
    await saveFilterSettings({ dailyInstallsEnabled })
    applyAndUpdateStatus()
  })
  inputDaily.addEventListener('change', async () => {
    let v = Number(inputDaily.value)
    if (!Number.isFinite(v) || v < 0) v = DEFAULTS.dailyInstallsLimit
    dailyInstallsLimit = v
    await saveFilterSettings({ dailyInstallsLimit })
    applyAndUpdateStatus()
  })
  appendQuickRow(
    chkDaily,
    lblDailyPre,
    inputDaily,
    lblDailySuf,
    inputDailyScore
  )

  const authorsSection = document.createElement('div')
  authorsSection.className = cn('space-y-2')
  const usersFilterTitle = document.createElement('div')
  usersFilterTitle.className = cn(
    'flex items-center justify-between text-sm font-semibold text-gray-900'
  )
  const usersLeft = document.createElement('div')
  usersLeft.className = cn('flex items-center gap-2')
  const usersTitleText = document.createElement('span')
  usersTitleText.textContent = '包含作者'
  usersLeft.append(usersTitleText)
  usersFilterTitle.append(usersLeft)
  authorsSection.append(usersFilterTitle)
  const authorsEnableRow = document.createElement('div')
  authorsEnableRow.className = cn('flex items-center gap-2')
  const lblAuthorsEnable = document.createElement('label')
  lblAuthorsEnable.className = cn('utaf-label text-xs leading-5')
  lblAuthorsEnable.textContent = '启用'
  const chkAuthorsEnable = document.createElement('input')
  chkAuthorsEnable.type = 'checkbox'
  chkAuthorsEnable.className = 'utaf-checkbox utaf-toggle'
  chkAuthorsEnable.checked = authorsEnabled
  chkAuthorsEnable.id = 'utaf-authors-enable'
  authorsEnableRow.append(lblAuthorsEnable)
  authorsEnableRow.append(chkAuthorsEnable)

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
  chkSelectAll.id = 'utaf-authors-selectall'
  const lblSelectAll = document.createElement('label')
  lblSelectAll.className = cn('utaf-label text-xs font-semibold')
  lblSelectAll.htmlFor = 'utaf-authors-selectall'
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
  authorsMasterChk.className = 'utaf-checkbox h-4 w-4 align-middle hidden'

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
  authorsTable.className = cn('w-full table-fixed')
  const thd = document.createElement('thead')
  const thr = document.createElement('tr')
  const th1 = document.createElement('th')
  th1.className = cn(
    'utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  th1.textContent = '用户'
  const th3 = document.createElement('th')
  th3.className = cn(
    'utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  th3.textContent = '分数'
  const th4 = document.createElement('th')
  th4.className = cn(
    'utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  th4.append(authorsMasterChk)
  thr.append(th1)
  thr.append(th3)
  thr.append(th4)
  thd.append(thr)
  const tb = document.createElement('tbody')
  authorsTable.append(thd)
  authorsTable.append(tb)
  authorsSection.append(authorsTable)
  authorsSection.append(authorsActions)
  authorsSection.append(authorsPicker)
  panel.append(authorsSection)

  let auEventsBound = false
  function bindAuthorRowEvents() {
    if (auEventsBound) return
    auEventsBound = true
    tb.addEventListener('click', async (e) => {
      if (!authorsEnabled) return
      const t = e.target as HTMLElement
      const del = t.closest('.utaf-au-delete')
      if (del) {
        const row = t.closest('.utaf-au-row')
        if (!row) return
        const idx = Number(row.dataset.auIndex || '-1')
        if (idx < 0) return
        blockedAuthors.splice(idx, 1)
        await saveFilterSettings({ blockedAuthors })
        renderAuthorsTable()
        applyAndUpdateStatus()
        updateAuthorsMasterChk()
        return
      }

      const labelId = t.closest('.utaf-au-id-label')
      if (labelId) {
        const row = labelId.closest('.utaf-au-row')!
        const input = row.querySelector('.utaf-au-id-input')!
        labelId.style.display = 'none'
        input.classList.remove('hidden')
        input.focus()
        input.select()
        return
      }

      const labelName = t.closest('.utaf-au-name-label')
      if (labelName) {
        const row = labelName.closest('.utaf-au-row')!
        const input = row.querySelector('.utaf-au-name-input')!
        labelName.style.display = 'none'
        input.classList.remove('hidden')
        input.focus()
        input.select()
        return
      }

      const row = t.closest('.utaf-au-row')
      if (
        row &&
        !authorsEditing &&
        !t.closest('input,button,select,textarea,svg')
      ) {
        const chk = row.querySelector('.utaf-au-toggle')!
        chk.checked = !chk.checked
        chk.dispatchEvent(new Event('change'))
      }
    })
    tb.addEventListener('change', async (e) => {
      if (!authorsEnabled) return
      const t = e.target as HTMLElement
      const row = t.closest('.utaf-au-row')
      if (!row) return
      const idx = Number(row.dataset.auIndex || '-1')
      if (idx < 0) return
      const a = blockedAuthors[idx]
      const input = t as HTMLInputElement
      if (input.classList.contains('utaf-au-toggle')) {
        a.enabled = input.checked
        await saveFilterSettings({ blockedAuthors })
        applyAndUpdateStatus()
        updateAuthorsMasterChk()
        return
      }

      if (input.classList.contains('utaf-au-score')) {
        ;(a as any).score = getNumberInputOrDefault(
          input,
          DEFAULTS.authorsDefaultScore
        )
        await saveFilterSettings({ blockedAuthors })
        applyAndUpdateStatus()
      }
    })
    tb.addEventListener(
      'blur',
      async (e) => {
        if (!authorsEnabled) return
        const t = e.target as HTMLElement
        const idInput = t.closest('.utaf-au-id-input')
        const nameInput = t.closest('.utaf-au-name-input')
        if (idInput) {
          const row = idInput.closest('.utaf-au-row')!
          const idx = Number(row.dataset.auIndex || '-1')
          if (idx < 0) return
          const v = normalizeText(idInput.value)
          if (v) {
            blockedAuthors[idx].id = v
            await saveFilterSettings({ blockedAuthors })
            applyAndUpdateStatus()
          } else {
            idInput.value = String(blockedAuthors[idx].id)
          }

          idInput.classList.add('hidden')
          const label = row.querySelector('.utaf-au-id-label')!
          label.textContent = String(blockedAuthors[idx].id)
          label.title = String(blockedAuthors[idx].id)
          label.style.display = 'block'
          return
        }

        if (nameInput) {
          const row = nameInput.closest('.utaf-au-row')!
          const idx = Number(row.dataset.auIndex || '-1')
          if (idx < 0) return
          blockedAuthors[idx].name =
            normalizeText(nameInput.value) || blockedAuthors[idx].id
          await saveFilterSettings({ blockedAuthors })
          nameInput.classList.add('hidden')
          const label = row.querySelector('.utaf-au-name-label')!
          label.textContent = String(blockedAuthors[idx].name)
          label.title = String(blockedAuthors[idx].name)
          label.style.display = 'block'
        }
      },
      true
    )
    tb.addEventListener('keydown', (e) => {
      if (!authorsEnabled) return
      if (e.key === 'Enter') {
        const t = e.target as HTMLElement
        const input = t.closest('.utaf-au-id-input, .utaf-au-name-input')
        if (input) {
          e.preventDefault()
          input.blur()
        }
      }
    })
  }

  bindAuthorRowEvents()

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
    chkSelectAll.checked = false
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
        ;(exists as any).score = Number.isFinite(Number((exists as any).score))
          ? Number((exists as any).score)
          : DEFAULTS.authorsDefaultScore
      } else {
        blockedAuthors.push({
          id,
          name,
          enabled: true,
          score: DEFAULTS.authorsDefaultScore,
        } as any)
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

  let authorsEditing = false
  const btnAuthorsEdit = document.createElement('button')
  btnAuthorsEdit.className = cn(
    'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
  )
  btnAuthorsEdit.textContent = ''
  btnAuthorsEdit.append(
    createIconElement(Pencil, { width: 12, height: 12, 'stroke-width': 2 })
  )
  usersLeft.append(btnAuthorsEdit)
  usersFilterTitle.append(authorsEnableRow)
  btnAuthorsEdit.addEventListener('click', () => {
    authorsEditing = !authorsEditing
    btnAuthorsEdit.textContent = ''
    btnAuthorsEdit.replaceChildren(
      createIconElement(authorsEditing ? Check : Pencil, {
        width: 12,
        height: 12,
        'stroke-width': 2,
      })
    )
    renderAuthorsTable()
  })

  function renderAuthorsTable() {
    tb.textContent = ''
    for (const [i, a] of blockedAuthors.entries()) {
      const tr = document.createElement('tr')
      tr.className = cn('utaf-au-row cursor-pointer hover:bg-gray-50')
      tr.dataset.auIndex = String(i)
      const tdUser = document.createElement('td')
      tdUser.className = cn(
        'utaf-col-user border-b border-gray-100 px-2 py-1 pr-3 align-middle'
      )
      const tdScore = document.createElement('td')
      tdScore.className = cn(
        'utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle'
      )
      const tdPick = document.createElement('td')
      tdPick.className = cn(
        'utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle whitespace-nowrap'
      )

      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'utaf-au-toggle utaf-checkbox utaf-toggle'
      chk.checked = Boolean(a.enabled)
      chk.disabled = !authorsEnabled

      const idLabel = document.createElement('span')
      idLabel.className = cn(
        'utaf-au-id-label utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      idLabel.textContent = String(a.id)
      idLabel.title = String(a.id)
      const idInput = document.createElement('input')
      idInput.type = 'text'
      idInput.className = cn(
        'utaf-au-id-input hidden h-5 w-full max-w-[10rem] min-w-[5rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      idInput.value = String(a.id)
      idInput.disabled = !authorsEnabled

      const userWrap = document.createElement('div')
      userWrap.className = cn('flex min-w-0 flex-col')
      userWrap.append(idLabel)
      userWrap.append(idInput)

      const nameLabel = document.createElement('span')
      nameLabel.className = cn(
        'utaf-au-name-label utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      nameLabel.textContent = String(a.name || '')
      nameLabel.title = String(a.name || '')
      const nameInput = document.createElement('input')
      nameInput.type = 'text'
      nameInput.className = cn(
        'utaf-au-name-input hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      nameInput.value = String(a.name || '')
      nameInput.disabled = !authorsEnabled

      userWrap.append(nameLabel)
      userWrap.append(nameInput)
      tdUser.append(userWrap)

      const scoreInput = document.createElement('input')
      scoreInput.type = 'number'
      scoreInput.step = '1'
      scoreInput.value = String(
        parseNumberOrDefault((a as any).score, DEFAULTS.authorsDefaultScore)
      )
      scoreInput.className = cn(
        'utaf-au-score h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
      )
      scoreInput.disabled = !authorsEnabled
      tdScore.append(scoreInput)

      const btnDel = document.createElement('button')
      btnDel.className = cn('utaf-au-delete utaf-btn-circle utaf-btn-danger')
      btnDel.title = '删除'
      btnDel.setAttribute('aria-label', '删除')
      btnDel.textContent = ''
      btnDel.append(
        createIconElement(Trash2, { width: 12, height: 12, 'stroke-width': 2 })
      )
      btnDel.disabled = !authorsEnabled

      chk.classList.toggle('hidden', authorsEditing)
      btnDel.classList.toggle('hidden', !authorsEditing)
      btnDel.style.display = authorsEditing ? 'inline-flex' : 'none'
      idLabel.classList.toggle('cursor-not-allowed', !authorsEnabled)
      nameLabel.classList.toggle('cursor-not-allowed', !authorsEnabled)
      scoreInput.classList.toggle('opacity-50', !authorsEnabled)
      scoreInput.classList.toggle('cursor-not-allowed', !authorsEnabled)
      btnDel.classList.toggle('opacity-50', !authorsEnabled)
      btnDel.classList.toggle('cursor-not-allowed', !authorsEnabled)
      tdPick.append(chk)
      tdPick.append(btnDel)

      tr.append(tdUser)
      tr.append(tdScore)
      tr.append(tdPick)
      tb.append(tr)
    }

    updateAuthorsMasterChk()
  }

  const auAddBtn = document.createElement('button')
  auAddBtn.className =
    'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
  auAddBtn.textContent = ''
  auAddBtn.append(
    createIconElement(Plus, { width: 12, height: 12, 'stroke-width': 2 })
  )
  function openAuthorsModal() {
    openPanelModal({
      shadow,
      panel,
      title: '新增作者',
      build({ content, btnCancel, btnOk }) {
        const form = buildAuthorForm(DEFAULTS.authorsDefaultScore)
        form.appendTo(content)
        const onConfirm = async () => {
          const { id, name, score } = form.getValues()
          if (!id) return
          const exists = blockedAuthors.find((x) => String(x.id) === id)
          if (exists) {
            exists.name = name || exists.name
            exists.enabled = true
            ;(exists as unknown as { score: number }).score = score
          } else {
            blockedAuthors.push({ id, name: name || id, enabled: true, score })
          }

          await saveFilterSettings({ blockedAuthors })
          renderAuthorsTable()
          const lastRow = tb.lastElementChild as HTMLElement | undefined
          if (lastRow)
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          applyAndUpdateStatus()
        }

        return {
          focusables: [...form.focusables, btnCancel, btnOk],
          initialFocus: form.initialFocus,
          onConfirm,
        }
      },
    })
  }

  auAddBtn.addEventListener('click', openAuthorsModal)
  btnAuthorsEdit.before(auAddBtn)

  renderAuthorsTable()
  function updateAuthorsControlsDisabled() {
    const disabled = !authorsEnabled
    btnOpenPicker.disabled = disabled
    btnRefreshPicker.disabled = disabled
    btnAddSelected.disabled = disabled
    btnClosePicker.disabled = disabled
    btnAuthorsEdit.disabled = disabled
    btnAuthorsEdit.className = disabled
      ? cn(
          'utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50'
        )
      : cn(
          'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
        )
    auAddBtn.className = disabled
      ? cn(
          'utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50'
        )
      : cn(
          'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
        )
    authorsTable.className = disabled
      ? cn('pointer-events-none w-full table-fixed opacity-50')
      : cn('w-full table-fixed')
    auAddBtn.disabled = disabled
    btnOpenPicker.className = disabled
      ? cn(
          'inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 opacity-50'
        )
      : cn(
          'inline-flex shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 hover:bg-gray-200'
        )
  }

  updateAuthorsControlsDisabled()

  panel.append(createDivider())

  const keywordsSection = document.createElement('div')
  keywordsSection.className = cn('space-y-2')
  const keywordsTitle = document.createElement('div')
  keywordsTitle.className = cn(
    'flex items-center justify-between text-sm font-semibold text-gray-900'
  )
  const keywordsLeft = document.createElement('div')
  keywordsLeft.className = cn('flex items-center gap-2')
  const keywordsTitleText = document.createElement('span')
  keywordsTitleText.textContent = '包含关键字'
  keywordsLeft.append(keywordsTitleText)
  keywordsTitle.append(keywordsLeft)
  keywordsSection.append(keywordsTitle)
  let keywordsEditing = false
  const btnKeywordsEdit = document.createElement('button')
  btnKeywordsEdit.className = cn(
    'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
  )
  btnKeywordsEdit.textContent = ''
  btnKeywordsEdit.append(
    createIconElement(Pencil, { width: 12, height: 12, 'stroke-width': 2 })
  )
  keywordsLeft.append(btnKeywordsEdit)
  btnKeywordsEdit.addEventListener('click', () => {
    keywordsEditing = !keywordsEditing
    btnKeywordsEdit.textContent = ''
    btnKeywordsEdit.replaceChildren(
      createIconElement(keywordsEditing ? Check : Pencil, {
        width: 12,
        height: 12,
        'stroke-width': 2,
      })
    )
    renderKeywordsTable()
  })

  const keywordsControls = document.createElement('div')
  keywordsControls.className = cn('space-y-2')
  const chkKeywords = document.createElement('input')
  chkKeywords.type = 'checkbox'
  chkKeywords.className = 'utaf-checkbox utaf-toggle'
  chkKeywords.checked = keywordsEnabled
  chkKeywords.id = 'utaf-keywords-enable'
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
  const lblEnable = document.createElement('label')
  lblEnable.className = cn('utaf-label text-xs leading-5')
  lblEnable.htmlFor = 'utaf-keywords-enable'
  lblEnable.textContent = '启用'
  rowEnable.append(lblEnable)
  rowEnable.append(chkKeywords)

  const rowScope = document.createElement('div')
  rowScope.className = cn('flex items-center justify-end gap-2')
  rowScope.append(lblScopePre)
  rowScope.append(selectScope)
  const chkCaseSensitive = document.createElement('input')
  chkCaseSensitive.type = 'checkbox'
  chkCaseSensitive.className = 'utaf-checkbox utaf-toggle'
  chkCaseSensitive.checked = keywordsCaseSensitive
  chkCaseSensitive.id = 'utaf-keywords-case'
  const lblCaseSensitive = document.createElement('label')
  lblCaseSensitive.className = cn('utaf-label text-xs leading-5')
  lblCaseSensitive.htmlFor = 'utaf-keywords-case'
  lblCaseSensitive.textContent = '大小写敏感'
  const rowCase = document.createElement('div')
  rowCase.className = cn('flex items-center justify-end gap-2')
  rowCase.append(lblCaseSensitive)
  rowCase.append(chkCaseSensitive)
  keywordsTitle.append(rowEnable)
  keywordsControls.append(rowScope)
  keywordsControls.append(rowCase)
  keywordsSection.append(keywordsControls)

  const keywordsTable = document.createElement('table')
  keywordsTable.className = cn('w-full table-fixed')
  const keywordsMasterChk = document.createElement('input')
  keywordsMasterChk.type = 'checkbox'
  keywordsMasterChk.className = 'utaf-checkbox h-4 w-4 align-middle hidden'
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
  const kwTh1 = document.createElement('th')
  kwTh1.className = cn(
    'utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700'
  )
  kwTh1.textContent = '关键字'
  const kwTh2 = document.createElement('th')
  kwTh2.className = cn(
    'utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  kwTh2.textContent = '分数'
  const kwTh3 = document.createElement('th')
  kwTh3.className = cn(
    'utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700'
  )
  kwTh3.append(keywordsMasterChk)
  kwThr.append(kwTh1)
  kwThr.append(kwTh2)
  kwThr.append(kwTh3)
  kwThd.append(kwThr)
  const kwTb = document.createElement('tbody')
  keywordsTable.append(kwThd)
  keywordsTable.append(kwTb)
  keywordsSection.append(keywordsTable)
  panel.append(keywordsSection)

  let kwEventsBound = false
  function bindKeywordRowEvents() {
    if (kwEventsBound) return
    kwEventsBound = true
    kwTb.addEventListener('click', async (e) => {
      if (!keywordsEnabled) return
      const t = e.target as HTMLElement
      const del = t.closest('.utaf-kw-delete')
      if (del) {
        const row = t.closest('.utaf-kw-row')
        if (!row) return
        const idx = Number(row.dataset.kwIndex || '-1')
        if (idx < 0) return
        keywords.splice(idx, 1)
        await saveFilterSettings({ keywords })
        renderKeywordsTable()
        applyAndUpdateStatus()
        updateKeywordsMasterChk()
        return
      }

      const label = t.closest('.utaf-kw-label')
      if (label) {
        const row = label.closest('.utaf-kw-row')!
        const input = row.querySelector('.utaf-kw-input')!
        label.style.display = 'none'
        input.classList.remove('hidden')
        input.focus()
        input.select()
        return
      }

      const row = t.closest('.utaf-kw-row')
      if (
        row &&
        !keywordsEditing &&
        !t.closest('input,button,select,textarea,svg')
      ) {
        const chk = row.querySelector('.utaf-kw-toggle')!
        chk.checked = !chk.checked
        chk.dispatchEvent(new Event('change'))
      }
    })
    kwTb.addEventListener('change', async (e) => {
      if (!keywordsEnabled) return
      const t = e.target as HTMLElement
      const row = t.closest('.utaf-kw-row')
      if (!row) return
      const idx = Number(row.dataset.kwIndex || '-1')
      if (idx < 0) return
      const k = keywords[idx]
      const input = t as HTMLInputElement
      if (input.classList.contains('utaf-kw-toggle')) {
        k.enabled = input.checked
        await saveFilterSettings({ keywords })
        applyAndUpdateStatus()
        updateKeywordsMasterChk()
        return
      }

      if (input.classList.contains('utaf-kw-score')) {
        k.score = getNumberInputOrDefault(input, DEFAULTS.keywordsDefaultScore)
        await saveFilterSettings({ keywords })
        applyAndUpdateStatus()
      }
    })
    kwTb.addEventListener(
      'blur',
      async (e) => {
        if (!keywordsEnabled) return
        const t = e.target as HTMLElement
        const input = t.closest('.utaf-kw-input')
        if (!input) return
        const row = input.closest('.utaf-kw-row')!
        const idx = Number(row.dataset.kwIndex || '-1')
        if (idx < 0) return
        const v = normalizeText(input.value)
        if (v) {
          keywords[idx].keyword = v
          await saveFilterSettings({ keywords })
          applyAndUpdateStatus()
        } else {
          input.value = String(keywords[idx].keyword || '')
        }

        input.classList.add('hidden')
        const label = row.querySelector('.utaf-kw-label')!
        label.textContent = String(keywords[idx].keyword || '')
        label.title = String(keywords[idx].keyword || '')
        label.style.display = 'block'
      },
      true
    )
    kwTb.addEventListener('keydown', (e) => {
      if (!keywordsEnabled) return
      if (e.key === 'Enter') {
        const t = e.target as HTMLElement
        const input = t.closest('.utaf-kw-input')
        if (input) {
          e.preventDefault()
          input.blur()
        }
      }
    })
  }

  bindKeywordRowEvents()

  function renderKeywordsTable() {
    kwTb.textContent = ''
    for (const [i, k] of keywords.entries()) {
      const tr = document.createElement('tr')
      tr.className = cn('utaf-kw-row cursor-pointer hover:bg-gray-50')
      tr.dataset.kwIndex = String(i)
      const td1 = document.createElement('td')
      td1.className = cn(
        'utaf-col-user min-w-0 border-b border-gray-100 px-2 py-1 pr-3 align-middle'
      )
      const td2 = document.createElement('td')
      td2.className = cn(
        'utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle'
      )
      const td3 = document.createElement('td')
      td3.className = cn(
        'utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle whitespace-nowrap'
      )

      const rowWrap = document.createElement('div')
      rowWrap.className = cn('flex min-w-0 items-center gap-2')
      const chk = document.createElement('input')
      chk.type = 'checkbox'
      chk.className = 'utaf-kw-toggle utaf-checkbox utaf-toggle'
      chk.checked = Boolean(k.enabled)
      chk.disabled = !keywordsEnabled

      const kwLabel = document.createElement('span')
      kwLabel.className = cn(
        'utaf-kw-label utaf-label block cursor-pointer truncate text-sm text-gray-800'
      )
      kwLabel.textContent = String(k.keyword || '')
      kwLabel.title = String(k.keyword || '')
      const kwInput = document.createElement('input')
      kwInput.type = 'text'
      kwInput.className = cn(
        'utaf-kw-input hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs'
      )
      kwInput.value = String(k.keyword || '')
      kwInput.disabled = !keywordsEnabled

      rowWrap.append(kwLabel)
      rowWrap.append(kwInput)
      td1.append(rowWrap)

      const scoreInput = document.createElement('input')
      scoreInput.type = 'number'

      scoreInput.step = '1'
      scoreInput.value = String(
        parseNumberOrDefault(k.score, DEFAULTS.keywordsDefaultScore)
      )
      scoreInput.className = cn(
        'utaf-kw-score h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs'
      )
      scoreInput.disabled = !keywordsEnabled
      td2.append(scoreInput)

      const btnDel = document.createElement('button')
      btnDel.className = cn('utaf-kw-delete utaf-btn-circle utaf-btn-danger')
      btnDel.title = '删除'
      btnDel.setAttribute('aria-label', '删除')
      btnDel.textContent = ''
      btnDel.append(
        createIconElement(Trash2, { width: 12, height: 12, 'stroke-width': 2 })
      )
      btnDel.disabled = !keywordsEnabled

      chk.classList.toggle('hidden', keywordsEditing)
      btnDel.classList.toggle('hidden', !keywordsEditing)
      btnDel.style.display = keywordsEditing ? 'inline-flex' : 'none'
      kwLabel.classList.toggle('cursor-not-allowed', !keywordsEnabled)
      scoreInput.classList.toggle('opacity-50', !keywordsEnabled)
      scoreInput.classList.toggle('cursor-not-allowed', !keywordsEnabled)
      btnDel.classList.toggle('opacity-50', !keywordsEnabled)
      btnDel.classList.toggle('cursor-not-allowed', !keywordsEnabled)
      td3.append(chk)
      td3.append(btnDel)

      tr.append(td1)
      tr.append(td2)
      tr.append(td3)

      kwTb.append(tr)
    }
  }

  const kwAddBtn = document.createElement('button')
  kwAddBtn.className = cn(
    'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
  )
  kwAddBtn.textContent = ''
  kwAddBtn.append(
    createIconElement(Plus, { width: 12, height: 12, 'stroke-width': 2 })
  )

  function openKeywordsModal() {
    openPanelModal({
      shadow,
      panel,
      title: '新增关键字',
      build({ content, btnCancel, btnOk }) {
        const form = buildKeywordForm(DEFAULTS.keywordsDefaultScore)
        form.appendTo(content)
        const onConfirm = async () => {
          const { kw, score } = form.getValues()
          if (!kw) return
          const exists = keywords.find(
            (x) => String(x.keyword).toLowerCase() === kw.toLowerCase()
          )
          if (exists) {
            exists.score = score
            exists.enabled = true
          } else {
            keywords.push({ keyword: kw, score, enabled: true })
          }

          await saveFilterSettings({ keywords })
          renderKeywordsTable()
          const lastRow = kwTb.lastElementChild as HTMLElement | undefined
          if (lastRow)
            lastRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          applyAndUpdateStatus()
        }

        return {
          focusables: [...form.focusables, btnCancel, btnOk],
          initialFocus: form.initialFocus,
          onConfirm,
        }
      },
    })
  }

  kwAddBtn.addEventListener('click', openKeywordsModal)
  btnKeywordsEdit.before(kwAddBtn)

  renderKeywordsTable()
  updateKeywordsMasterChk()

  function updateKeywordsControlsDisabled() {
    selectScope.disabled = !chkKeywords.checked
    chkCaseSensitive.disabled = !chkKeywords.checked
    kwAddBtn.disabled = !chkKeywords.checked
    btnKeywordsEdit.disabled = !chkKeywords.checked
    btnKeywordsEdit.className = btnKeywordsEdit.disabled
      ? cn(
          'utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50'
        )
      : cn(
          'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
        )
    kwAddBtn.className = kwAddBtn.disabled
      ? cn(
          'utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50'
        )
      : cn(
          'utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
        )
    keywordsTable.className = chkKeywords.checked
      ? cn('w-full table-fixed')
      : cn('pointer-events-none w-full table-fixed opacity-50')
    lblScopePre.className = selectScope.disabled
      ? cn('utaf-label cursor-not-allowed text-xs leading-5 opacity-50')
      : cn('utaf-label text-xs leading-5')
    selectScope.className = selectScope.disabled
      ? 'h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs'
    lblCaseSensitive.className = chkCaseSensitive.disabled
      ? 'utaf-label text-xs leading-5 opacity-50 cursor-not-allowed'
      : 'utaf-label text-xs leading-5'
  }

  updateKeywordsControlsDisabled()
  // initial quick/authors disabled state
  updateControlsDisabled()
  chkKeywords.addEventListener('change', async () => {
    keywordsEnabled = chkKeywords.checked
    await saveFilterSettings({ keywordsEnabled })
    updateKeywordsControlsDisabled()
    renderKeywordsTable()
    applyAndUpdateStatus()
  })
  chkCaseSensitive.addEventListener('change', async () => {
    keywordsCaseSensitive = chkCaseSensitive.checked
    await saveFilterSettings({ keywordsCaseSensitive })
    applyAndUpdateStatus()
  })
  // threshold handled globally
  selectScope.addEventListener('change', async () => {
    const v = String(selectScope.value || 'both') as
      | 'title'
      | 'description'
      | 'both'
    keywordsScope = v
    await saveFilterSettings({ keywordsScope })
    applyAndUpdateStatus()
  })

  chkQuick.addEventListener('change', async () => {
    quickEnabled = chkQuick.checked
    await saveFilterSettings({ quickEnabled })
    updateControlsDisabled()
    applyAndUpdateStatus()
  })

  chkAuthorsEnable.addEventListener('change', async () => {
    authorsEnabled = chkAuthorsEnable.checked
    await saveFilterSettings({ authorsEnabled })
    updateAuthorsControlsDisabled()
    renderAuthorsTable()
    applyAndUpdateStatus()
  })

  function updateControlsDisabled() {
    const quickOff = !quickEnabled
    inputTotal.disabled = quickOff || !chkTotal.checked
    inputDaily.disabled = quickOff || !chkDaily.checked
    inputTotalScore.disabled = quickOff || !chkTotal.checked
    inputDailyScore.disabled = quickOff || !chkDaily.checked
    chkTotal.disabled = quickOff
    chkDaily.disabled = quickOff
    if (inputUpdatedScore) {
      inputUpdatedScore.disabled = quickOff || !updatedEnabled
    }

    if (inputOlderScore) {
      inputOlderScore.disabled = quickOff || !createdOlderEnabled
    }

    if (inputRecentScore) {
      inputRecentScore.disabled = quickOff || !createdRecentEnabled
    }

    if (updatedPresetChk) updatedPresetChk.disabled = quickOff
    if (updatedPresetInput) updatedPresetInput.disabled = quickOff
    if (olderPresetChk) olderPresetChk.disabled = quickOff
    if (olderPresetInput) olderPresetInput.disabled = quickOff
    if (recentPresetChk) recentPresetChk.disabled = quickOff
    if (recentPresetInput) recentPresetInput.disabled = quickOff

    inputTotal.className = inputTotal.disabled
      ? 'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs'
    inputDaily.className = inputDaily.disabled
      ? 'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed'
      : 'h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs'
    inputTotalScore.className = inputTotalScore.disabled
      ? 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed'
      : 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right'
    inputDailyScore.className = inputDailyScore.disabled
      ? 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed'
      : 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right'
    if (inputUpdatedScore) {
      inputUpdatedScore.className = inputUpdatedScore.disabled
        ? 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed'
        : 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right'
    }

    if (inputOlderScore) {
      inputOlderScore.className = inputOlderScore.disabled
        ? 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed'
        : 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right'
    }

    if (inputRecentScore) {
      inputRecentScore.className = inputRecentScore.disabled
        ? 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed'
        : 'h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right'
    }

    quickTable.className = quickOff
      ? cn('pointer-events-none w-full table-fixed text-sm opacity-50')
      : cn('w-full table-fixed text-sm')
  }

  updateControlsDisabled()
  chkTotal.addEventListener('change', updateControlsDisabled)
  chkDaily.addEventListener('change', updateControlsDisabled)

  async function resetAll() {
    try {
      await setValue(CONFIG.FILTERS_KEY, { uiCollapsed: false })
    } catch {}

    const prevHost = document.querySelector('#utaf-host')
    if (prevHost && prevHost.parentNode) prevHost.remove()
    await injectGreasyForkFilters()
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
