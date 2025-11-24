import { getPrefferedLocale, initAvailableLocales, initI18n } from 'browser-extension-i18n'

import messagesEn from './en'
import messagesZh from './zh-cn'

export const availableLocales = /** @type {const} */ ['en', 'zh']

initAvailableLocales(availableLocales)

export const localeMap = {
  zh: messagesZh,
  'zh-cn': messagesZh,
  en: messagesEn,
}

// eslint-disable-next-line import-x/no-mutable-exports
export let i = initI18n(localeMap, getPrefferedLocale())

export function resetI18n(locale?: string) {
  i = initI18n(localeMap, locale || getPrefferedLocale())
}

/**
 * Get the list of currently available locales.
 *
 * @returns Array of available locale strings
 * @example
 *   const locales = getAvailableLocales();
 *   console.log('Supported languages:', locales);
 */
export function getAvailableLocales(): readonly string[] {
  return availableLocales
}
