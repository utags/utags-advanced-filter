import { getPrefferedLocale } from 'browser-extension-i18n'
import {
  getSettingsValue,
  hideSettings,
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
import {
  ChevronUp,
  createElement as createIconElement,
  createIcons,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide'
import type { PlasmoCSConfig } from 'plasmo'

import { getAvailableLocales, i, resetI18n } from './messages'
import { createDatePresetInput } from './ui/date-preset-input'
import { extractCanonicalId, getBaseDomain } from './utils/index'

const origin = location.origin
const host = location.host
const hostname = location.hostname

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
  DEBUG: false,
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
  dailyLessThan
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
  panel.className = 'bg-white shadow-xl rounded-xl p-3 w-80 font-sans'
  const header = document.createElement('div')
  header.className = 'mb-2 space-y-1'
  const title = document.createElement('div')
  title.className = 'font-semibold text-gray-900 text-sm'
  title.textContent = 'UTags Advanced Filter'
  const headerRow1 = document.createElement('div')
  headerRow1.className = 'flex items-center'
  headerRow1.append(title)
  const headerRow2 = document.createElement('div')
  headerRow2.className = 'flex items-center gap-2'
  const masterChk = document.createElement('input')
  masterChk.type = 'checkbox'
  masterChk.className = 'utaf-checkbox'
  masterChk.setAttribute('title', '反选')
  masterChk.setAttribute('aria-label', '反选')
  const stats = document.createElement('div')
  stats.className = 'text-xs text-gray-500'
  headerRow2.append(masterChk)
  headerRow2.append(stats)
  const headerRight = document.createElement('div')
  headerRight.className = 'ml-auto flex items-center gap-2'
  const btnCollapse = document.createElement('button')
  btnCollapse.className =
    'px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs hover:bg-gray-200'
  btnCollapse.setAttribute('title', '折叠')
  btnCollapse.setAttribute('aria-label', '折叠')
  const iconCollapse = createIconElement(ChevronUp, {
    width: 16,
    height: 16,
    'stroke-width': 2,
  })
  btnCollapse.append(iconCollapse)
  const btnReset = document.createElement('button')
  btnReset.className =
    'utaf-reset-btn px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs hover:bg-gray-200'
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
  content.className = 'space-y-2'
  panel.append(content)

  const fab = document.createElement('button')
  fab.className = 'utaf-fab'
  fab.setAttribute('title', '打开筛选')
  fab.setAttribute('aria-label', '打开筛选')
  const iconFab = createIconElement(SlidersHorizontal, {
    width: 18,
    height: 18,
    'stroke-width': 2,
  })
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
    const counts = applyCombinedFilters(
      updatedDays,
      olderDays,
      recentDays,
      totalLess,
      dailyLess
    )
    stats.textContent = `显示 ${counts.visible} | 隐藏 ${counts.hidden}`
    const states = [
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
    ]
    const any = states.some(Boolean)
    const all = states.every(Boolean)
    masterChk.indeterminate = any && !all
    masterChk.checked = all
  }

  masterChk.addEventListener('change', async () => {
    const states = [
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
    ]
    const any = states.some(Boolean)
    const next = !any
    updatedEnabled = next
    createdOlderEnabled = next
    createdRecentEnabled = next
    totalInstallsEnabled = next
    dailyInstallsEnabled = next
    updatedComp.setEnabledSilently(next)
    olderComp.setEnabledSilently(next)
    recentComp.setEnabledSilently(next)
    chkTotal.checked = next
    chkDaily.checked = next
    await saveFilterSettings({
      updatedEnabled,
      createdOlderEnabled,
      createdRecentEnabled,
      totalInstallsEnabled,
      dailyInstallsEnabled,
    })
    updateControlsDisabled()
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
  panel.append(updatedComp.root)

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
  panel.append(olderComp.root)

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
  panel.append(recentComp.root)

  const blockInstTotal = document.createElement('div')
  blockInstTotal.className = 'flex items-center'
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
  inputTotal.className = 'w-20 px-2 py-1 border border-gray-300 rounded-md'
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
  blockInstTotal.append(chkTotal)
  blockInstTotal.append(lblTotalPre)
  blockInstTotal.append(inputTotal)
  blockInstTotal.append(lblTotalSuf)
  panel.append(blockInstTotal)

  const blockInstDaily = document.createElement('div')
  blockInstDaily.className = 'flex items-center'
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
  inputDaily.className = 'w-20 px-2 py-1 border border-gray-300 rounded-md'
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
  blockInstDaily.append(chkDaily)
  blockInstDaily.append(lblDailyPre)
  blockInstDaily.append(inputDaily)
  blockInstDaily.append(lblDailySuf)
  panel.append(blockInstDaily)

  function updateControlsDisabled() {
    inputTotal.disabled = !chkTotal.checked
    inputDaily.disabled = !chkDaily.checked
    inputTotal.className = inputTotal.disabled
      ? 'w-20 px-2 py-1 border border-gray-300 rounded-md opacity-50 cursor-not-allowed'
      : 'w-20 px-2 py-1 border border-gray-300 rounded-md'
    inputDaily.className = inputDaily.disabled
      ? 'w-20 px-2 py-1 border border-gray-300 rounded-md opacity-50 cursor-not-allowed'
      : 'w-20 px-2 py-1 border border-gray-300 rounded-md'
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

    inputTotal.value = String(totalInstallsLimit)
    inputDaily.value = String(dailyInstallsLimit)
    updateControlsDisabled()
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
