// ==UserScript==
// @name                 UTags Advanced Filter - staging
// @name:zh-CN           UTags Advanced Filter - staging
// @namespace            https://github.com/utags
// @homepageURL          https://github.com/utags/utags-advanced-filter#readme
// @supportURL           https://github.com/utags/utags-advanced-filter/issues
// @version              0.1.1
// @description          Real-time filters for list items on any website. Hides items that don't match your criteria, without reloading the page. Supports Greasy Fork and will support more sites via rules.
// @description:zh-CN    对网站的列表内容进行实时过滤与隐藏。无需刷新页面，即时隐藏不符合条件的条目。已支持 Greasy Fork，将通过规则适配更多站点。
// @icon                 https://wsrv.nl/?w=128&h=128&url=https%3A%2F%2Fraw.githubusercontent.com%2Futags%2Futags-advanced-filter%2Frefs%2Fheads%2Fmain%2Fassets%2Ficon.png
// @author               Pipecraft
// @license              MIT
// @match                https://greasyfork.org/*
// @match                https://sleazyfork.org/*
// @run-at               document-end
// @grant                GM.getValue
// @grant                GM.setValue
// @grant                GM_addValueChangeListener
// @grant                GM_removeValueChangeListener
// @grant                GM_addElement
// @grant                GM.registerMenuCommand
// ==/UserScript==
//
;(() => {
  "use strict"
  var __defProp = Object.defineProperty
  var __defProps = Object.defineProperties
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors
  var __getOwnPropSymbols = Object.getOwnPropertySymbols
  var __hasOwnProp = Object.prototype.hasOwnProperty
  var __propIsEnum = Object.prototype.propertyIsEnumerable
  var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, {
          enumerable: true,
          configurable: true,
          writable: true,
          value,
        })
      : (obj[key] = value)
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop])
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop])
      }
    return a
  }
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b))
  var availableLocales = ["en"]
  var regexCache = /* @__PURE__ */ new Map()
  function initAvailableLocales(array) {
    availableLocales = array
      .map((locale2) => locale2.trim().toLowerCase())
      .filter(Boolean)
  }
  function isLocale(locale2) {
    return locale2 ? availableLocales.includes(locale2.toLowerCase()) : false
  }
  function extractLocaleFromNavigator() {
    if (typeof navigator === "undefined") {
      return void 0
    }
    const languages = navigator.languages || [navigator.language]
    for (const language of languages) {
      const normalizedLang = language.toLowerCase()
      const baseLang = normalizedLang.split("-")[0]
      if (isLocale(normalizedLang)) {
        return normalizedLang
      }
      if (baseLang && isLocale(baseLang)) {
        return baseLang
      }
    }
    return void 0
  }
  function getParameterRegex(index) {
    const pattern = "\\{".concat(index, "\\}")
    if (!regexCache.has(pattern)) {
      regexCache.set(pattern, new RegExp(pattern, "g"))
    }
    return regexCache.get(pattern)
  }
  function initI18n(messageMaps, language) {
    const validLanguage =
      typeof language === "string" && language.trim() ? language.trim() : void 0
    const targetLanguage = (validLanguage || getPrefferedLocale()).toLowerCase()
    const baseLanguage = targetLanguage.split("-")[0]
    const { mergedMessages } = resolveMessageMaps(
      messageMaps,
      targetLanguage,
      baseLanguage
    )
    return function (key, ...parameters) {
      const text = mergedMessages[key] || key
      return parameters.length > 0 && text !== key
        ? interpolateParameters(text, parameters)
        : text
    }
  }
  function resolveMessageMaps(messageMaps, targetLanguage, baseLanguage) {
    const normalizedMaps = Object.fromEntries(
      Object.entries(messageMaps).map(([locale2, messages16]) => [
        locale2.toLowerCase(),
        messages16,
      ])
    )
    let mergedMessages = {}
    const englishMessages = normalizedMaps.en || normalizedMaps["en-us"] || {}
    mergedMessages = __spreadValues({}, englishMessages)
    if (
      isLocale(baseLanguage) &&
      normalizedMaps[baseLanguage] &&
      baseLanguage !== "en" &&
      baseLanguage !== "en-us"
    ) {
      mergedMessages = __spreadValues(
        __spreadValues({}, mergedMessages),
        normalizedMaps[baseLanguage]
      )
    }
    if (
      isLocale(targetLanguage) &&
      normalizedMaps[targetLanguage] &&
      targetLanguage !== baseLanguage
    ) {
      mergedMessages = __spreadValues(
        __spreadValues({}, mergedMessages),
        normalizedMaps[targetLanguage]
      )
    }
    return { mergedMessages }
  }
  function interpolateParameters(text, parameters) {
    let result = text
    for (const [i3, parameter] of parameters.entries()) {
      const regex = getParameterRegex(i3 + 1)
      result = result.replace(regex, String(parameter))
    }
    return result
  }
  function getPrefferedLocale() {
    return extractLocaleFromNavigator() || "en"
  }
  var listeners = {}
  var getValue = async (key) => {
    const value = await GM.getValue(key)
    return value && value !== "undefined" ? JSON.parse(value) : void 0
  }
  var setValue = async (key, value) => {
    if (value !== void 0) {
      const newValue = JSON.stringify(value)
      if (listeners[key]) {
        const oldValue = await GM.getValue(key)
        await GM.setValue(key, newValue)
        if (newValue !== oldValue) {
          for (const func of listeners[key]) {
            func(key, oldValue, newValue)
          }
        }
      } else {
        await GM.setValue(key, newValue)
      }
    }
  }
  var _addValueChangeListener = (key, func) => {
    listeners[key] = listeners[key] || []
    listeners[key].push(func)
    return () => {
      if (listeners[key] && listeners[key].length > 0) {
        for (let i3 = listeners[key].length - 1; i3 >= 0; i3--) {
          if (listeners[key][i3] === func) {
            listeners[key].splice(i3, 1)
          }
        }
      }
    }
  }
  var addValueChangeListener = (key, func) => {
    if (typeof GM_addValueChangeListener !== "function") {
      console.warn("Do not support GM_addValueChangeListener!")
      return _addValueChangeListener(key, func)
    }
    const listenerId = GM_addValueChangeListener(key, func)
    return () => {
      GM_removeValueChangeListener(listenerId)
    }
  }
  var doc = document
  if (typeof String.prototype.replaceAll !== "function") {
    String.prototype.replaceAll = String.prototype.replace
  }
  var $ = (selectors, element) =>
    (element || doc).querySelector(selectors) || void 0
  var $$ = (selectors, element) => [
    ...(element || doc).querySelectorAll(selectors),
  ]
  var getRootElement = (type) =>
    type === 1
      ? doc.head || doc.body || doc.documentElement
      : type === 2
        ? doc.body || doc.documentElement
        : doc.documentElement
  var createElement = (tagName, attributes) =>
    setAttributes(doc.createElement(tagName), attributes)
  var addElement = (parentNode, tagName, attributes) => {
    if (typeof parentNode === "string") {
      return addElement(null, parentNode, tagName)
    }
    if (!tagName) {
      return
    }
    if (!parentNode) {
      parentNode = /^(script|link|style|meta)$/.test(tagName)
        ? getRootElement(1)
        : getRootElement(2)
    }
    if (typeof tagName === "string") {
      const element = createElement(tagName, attributes)
      parentNode.append(element)
      return element
    }
    setAttributes(tagName, attributes)
    parentNode.append(tagName)
    return tagName
  }
  var addEventListener = (element, type, listener, options) => {
    if (!element) {
      return
    }
    if (typeof type === "object") {
      for (const type1 in type) {
        if (Object.hasOwn(type, type1)) {
          element.addEventListener(type1, type[type1])
        }
      }
    } else if (typeof type === "string" && typeof listener === "function") {
      element.addEventListener(type, listener, options)
    }
  }
  var removeEventListener = (element, type, listener, options) => {
    if (!element) {
      return
    }
    if (typeof type === "object") {
      for (const type1 in type) {
        if (Object.hasOwn(type, type1)) {
          element.removeEventListener(type1, type[type1])
        }
      }
    } else if (typeof type === "string" && typeof listener === "function") {
      element.removeEventListener(type, listener, options)
    }
  }
  var setAttribute = (element, name, value) =>
    element && element.setAttribute ? element.setAttribute(name, value) : void 0
  var setAttributes = (element, attributes) => {
    if (element && attributes) {
      for (const name in attributes) {
        if (Object.hasOwn(attributes, name)) {
          const value = attributes[name]
          if (value === void 0) {
            continue
          }
          if (/^(value|textContent|innerText)$/.test(name)) {
            element[name] = value
          } else if (/^(innerHTML)$/.test(name)) {
            element[name] = createHTML(value)
          } else if (name === "style") {
            setStyle(element, value, true)
          } else if (/on\w+/.test(name)) {
            const type = name.slice(2)
            addEventListener(element, type, value)
          } else {
            setAttribute(element, name, value)
          }
        }
      }
    }
    return element
  }
  var setStyle = (element, values, overwrite) => {
    if (!element) {
      return
    }
    const style = element.style
    if (typeof values === "string") {
      style.cssText = overwrite ? values : style.cssText + ";" + values
      return
    }
    if (overwrite) {
      style.cssText = ""
    }
    for (const key in values) {
      if (Object.hasOwn(values, key)) {
        style[key] = values[key].replace("!important", "")
      }
    }
  }
  if (typeof Object.hasOwn !== "function") {
    Object.hasOwn = (instance, prop) =>
      Object.prototype.hasOwnProperty.call(instance, prop)
  }
  var parseInt10 = (number, defaultValue) => {
    if (typeof number === "number" && !Number.isNaN(number)) {
      return number
    }
    if (typeof defaultValue !== "number") {
      defaultValue = Number.NaN
    }
    if (!number) {
      return defaultValue
    }
    const result = Number.parseInt(number, 10)
    return Number.isNaN(result) ? defaultValue : result
  }
  var rootFuncArray = []
  var headFuncArray = []
  var bodyFuncArray = []
  var headBodyObserver
  var startObserveHeadBodyExists = () => {
    if (headBodyObserver) {
      return
    }
    headBodyObserver = new MutationObserver(() => {
      if (doc.head && doc.body) {
        headBodyObserver.disconnect()
      }
      if (doc.documentElement && rootFuncArray.length > 0) {
        for (const func of rootFuncArray) {
          func()
        }
        rootFuncArray.length = 0
      }
      if (doc.head && headFuncArray.length > 0) {
        for (const func of headFuncArray) {
          func()
        }
        headFuncArray.length = 0
      }
      if (doc.body && bodyFuncArray.length > 0) {
        for (const func of bodyFuncArray) {
          func()
        }
        bodyFuncArray.length = 0
      }
    })
    headBodyObserver.observe(doc, {
      childList: true,
      subtree: true,
    })
  }
  var runWhenHeadExists = (func) => {
    if (!doc.head) {
      headFuncArray.push(func)
      startObserveHeadBodyExists()
      return
    }
    func()
  }
  var escapeHTMLPolicy =
    typeof trustedTypes !== "undefined" &&
    typeof trustedTypes.createPolicy === "function"
      ? trustedTypes.createPolicy("beuEscapePolicy", {
          createHTML: (string) => string,
        })
      : void 0
  var createHTML = (html) => {
    return escapeHTMLPolicy ? escapeHTMLPolicy.createHTML(html) : html
  }
  var addElement2 =
    typeof GM_addElement === "function"
      ? (parentNode, tagName, attributes) => {
          if (typeof parentNode === "string") {
            return addElement2(null, parentNode, tagName)
          }
          if (!tagName) {
            return
          }
          if (!parentNode) {
            parentNode = /^(script|link|style|meta)$/.test(tagName)
              ? getRootElement(1)
              : getRootElement(2)
          }
          if (typeof tagName === "string") {
            let attributes2
            if (attributes) {
              const entries1 = []
              const entries2 = []
              for (const entry of Object.entries(attributes)) {
                if (/^(on\w+|innerHTML)$/.test(entry[0])) {
                  entries2.push(entry)
                } else {
                  entries1.push(entry)
                }
              }
              attributes = Object.fromEntries(entries1)
              attributes2 = Object.fromEntries(entries2)
            }
            const element = GM_addElement(null, tagName, attributes)
            setAttributes(element, attributes2)
            parentNode.append(element)
            return element
          }
          setAttributes(tagName, attributes)
          parentNode.append(tagName)
          return tagName
        }
      : addElement
  var addStyle = (styleText) =>
    addElement2(null, "style", { textContent: styleText })
  var registerMenuCommand = (name, callback, options) => {
    if (globalThis !== top) {
      return
    }
    if (typeof GM.registerMenuCommand !== "function") {
      console.warn("Do not support GM.registerMenuCommand!")
      return
    }
    return GM.registerMenuCommand(name, callback, options)
  }
  var style_default =
    '#browser_extension_settings_container{--browser-extension-settings-background-color:#f2f2f7;--browser-extension-settings-text-color:#444;--browser-extension-settings-link-color:#217dfc;--sb-track-color:#00000000;--sb-thumb-color:#33334480;--sb-size:2px;--font-family:"helvetica neue","microsoft yahei",arial,sans-serif;border-radius:5px;box-shadow:0 10px 39px 10px rgba(62,66,66,.22)!important;display:none;height:600px;max-height:90%;overflow:hidden;position:fixed;right:30px;top:10px;z-index:100000}#browser_extension_settings_container .browser_extension_settings_wrapper{background-color:var(--browser-extension-settings-background-color);display:flex;font-family:var(--font-family);height:100%;overflow:hidden}#browser_extension_settings_container .browser_extension_settings_wrapper h1,#browser_extension_settings_container .browser_extension_settings_wrapper h2{border:none;color:var(--browser-extension-settings-text-color);font-family:var(--font-family);letter-spacing:normal;line-height:normal;padding:0}#browser_extension_settings_container .browser_extension_settings_wrapper h1{font-size:26px;font-weight:800;margin:18px 0}#browser_extension_settings_container .browser_extension_settings_wrapper h2{font-size:18px;font-weight:600;margin:14px 0}#browser_extension_settings_container .browser_extension_settings_wrapper footer{background-color:var(--browser-extension-settings-background-color);color:var(--browser-extension-settings-text-color);display:flex;flex-direction:column;font-family:var(--font-family);font-size:11px;justify-content:center;margin:10px auto 0}#browser_extension_settings_container .browser_extension_settings_wrapper footer a{color:var(--browser-extension-settings-link-color)!important;font-family:var(--font-family);padding:0;text-decoration:none}#browser_extension_settings_container .browser_extension_settings_wrapper footer p{color:var(--browser-extension-settings-text-color);font-family:var(--font-family);font-size:11px;line-height:13px;margin:2px;padding:0;text-align:center}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous{color:var(--browser-extension-settings-link-color);cursor:pointer;display:none}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous:before{content:"< "}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container{background-color:var(--browser-extension-settings-background-color);box-sizing:border-box;color:var(--browser-extension-settings-text-color);overflow-x:auto;padding:10px 15px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div{background-color:#fff;border-top:1px solid #ccc;font-size:14px;padding:6px 15px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited{align-items:center;color:var(--browser-extension-settings-text-color);cursor:pointer;display:flex;font-family:var(--font-family);justify-content:space-between;text-decoration:none}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited:hover{color:var(--browser-extension-settings-text-color);text-decoration:none}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div a:visited span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a span,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div a:visited span{font-family:var(--font-family);line-height:24px;margin-right:10px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:hover,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:hover{background-color:#e4e4e6}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div.active a,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div.active a{cursor:default}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:first-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:first-of-type{border-top:none;border-top-left-radius:10px;border-top-right-radius:10px}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .installed_extension_list div:last-of-type,#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container .related_extension_list div:last-of-type{border-bottom-left-radius:10px;border-bottom-right-radius:10px}#browser_extension_settings_container .thin_scrollbar{scrollbar-color:var(--sb-thumb-color) var(--sb-track-color);scrollbar-width:thin}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar{width:var(--sb-size)}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-track{background:var(--sb-track-color);border-radius:10px}#browser_extension_settings_container .thin_scrollbar::-webkit-scrollbar-thumb{background:var(--sb-thumb-color);border-radius:10px}#browser_extension_settings_main{background-color:var(--browser-extension-settings-background-color);box-sizing:border-box;color:var(--browser-extension-settings-text-color);font-family:var(--font-family);min-width:250px;overflow-x:hidden;overflow-y:auto;padding:10px 15px}#browser_extension_settings_main h2{margin:5px 0 0;text-align:center}#browser_extension_settings_main .option_groups{background-color:#fff;border-radius:10px;display:flex;flex-direction:column;margin:10px 0 0;padding:6px 15px}#browser_extension_settings_main .option_groups .action{color:var(--browser-extension-settings-link-color);cursor:pointer;font-size:14px;padding:6px 0}#browser_extension_settings_main .bes_external_link{font-size:14px;padding:6px 0}#browser_extension_settings_main .bes_external_link a,#browser_extension_settings_main .bes_external_link a:hover,#browser_extension_settings_main .bes_external_link a:visited{color:var(--browser-extension-settings-link-color);cursor:pointer;font-family:var(--font-family);text-decoration:none}#browser_extension_settings_main .option_groups textarea{border:1px solid #a9a9a9;border-radius:4px;box-sizing:border-box;font-size:12px;height:100px;margin:10px 0;width:100%}#browser_extension_settings_main .select_option,#browser_extension_settings_main .switch_option{align-items:center;display:flex;font-size:14px;justify-content:space-between;padding:6px 0}#browser_extension_settings_main .option_groups>*{border-top:1px solid #ccc}#browser_extension_settings_main .option_groups>:first-child{border-top:none}#browser_extension_settings_main .bes_option>.bes_icon{height:24px;margin-right:10px;width:24px}#browser_extension_settings_main .bes_option>.bes_title{flex-grow:1;margin-right:10px}#browser_extension_settings_main .bes_option>.bes_select{background-color:#fff;border:1px solid #ccc;border-radius:6px;box-sizing:border-box;height:24px;margin:0;padding:0 2px}#browser_extension_settings_main .option_groups .bes_tip{border:none;font-size:14px;margin:0;max-width:none;padding:0 15px 0 0;position:relative}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor{cursor:help;text-decoration:underline}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content{background-color:#fff;border-radius:5px;bottom:15px;box-shadow:0 10px 39px 10px rgba(62,66,66,.22)!important;color:var(--browser-extension-settings-text-color);display:none;left:0;padding:10px;position:absolute;text-align:left}#browser_extension_settings_main .option_groups .bes_tip .bes_tip_anchor:hover+.bes_tip_content,#browser_extension_settings_main .option_groups .bes_tip .bes_tip_content:hover{display:block}#browser_extension_settings_main .option_groups .bes_tip p,#browser_extension_settings_main .option_groups .bes_tip pre{margin:revert;padding:revert}#browser_extension_settings_main .option_groups .bes_tip pre{background-color:#f5f5f5;border:none;font-family:Consolas,panic sans,bitstream vera sans mono,Menlo,microsoft yahei,monospace;font-size:13px;letter-spacing:.015em;line-height:120%;overflow:auto;overflow-wrap:normal;padding:.5em;white-space:pre;word-break:normal}#browser_extension_settings_main .bes_switch_container{--button-width:51px;--button-height:24px;--toggle-diameter:20px;--color-off:#e9e9eb;--color-on:#34c759;flex:none;height:var(--button-height);margin:0;padding:0;position:relative;-webkit-user-select:none;-moz-user-select:none;user-select:none;width:var(--button-width)}#browser_extension_settings_main input[type=checkbox]{height:0;opacity:0;position:absolute;width:0}#browser_extension_settings_main .bes_switch{background-color:var(--color-off);border:none;border-radius:calc(var(--button-height)/2);cursor:pointer;display:block;height:100%;transition:all .2s ease-out;width:100%}#browser_extension_settings_main .bes_switch:before{display:none}#browser_extension_settings_main .bes_slider{background:#fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,.15),0 3px 1px rgba(0,0,0,.06);cursor:pointer;height:var(--toggle-diameter);left:2px;position:absolute;top:calc(50% - var(--toggle-diameter)/2);transition:all .2s ease-out;width:var(--toggle-diameter)}#browser_extension_settings_main input[type=checkbox]:checked+.bes_switch{background-color:var(--color-on)}#browser_extension_settings_main input[type=checkbox]:checked+.bes_switch .bes_slider{left:calc(var(--button-width) - var(--toggle-diameter) - 2px)}#browser_extension_side_menu{min-height:80px;opacity:0;padding-top:20px;position:fixed;right:0;top:80px;width:30px;z-index:10000}#browser_extension_side_menu:hover{opacity:1}#browser_extension_side_menu button{background-color:transparent;background-image:none;border:none;cursor:pointer;height:24px;padding:0;width:24px}#browser_extension_side_menu button svg{height:24px;width:24px}#browser_extension_side_menu button:hover{opacity:70%}#browser_extension_side_menu button:active{opacity:100%}@media(max-width:500px){#browser_extension_settings_container{right:10px}#browser_extension_settings_container .browser_extension_settings_wrapper a.navigation_go_previous{display:block}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container{display:none}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container.bes_active{display:block}#browser_extension_settings_container .browser_extension_settings_wrapper .extension_list_container.bes_active+div{display:none}}'
  function createSwitch(options = {}) {
    const container = createElement("label", { class: "bes_switch_container" })
    const checkbox = createElement(
      "input",
      options.checked ? { type: "checkbox", checked: "" } : { type: "checkbox" }
    )
    addElement2(container, checkbox)
    const switchElm = createElement("span", { class: "bes_switch" })
    addElement2(switchElm, "span", { class: "bes_slider" })
    addElement2(container, switchElm)
    if (options.onchange) {
      addEventListener(checkbox, "change", options.onchange)
    }
    return container
  }
  function createSwitchOption(icon, text, options) {
    if (typeof text !== "string") {
      return createSwitchOption(void 0, icon, text)
    }
    const div = createElement("div", { class: "switch_option bes_option" })
    if (icon) {
      addElement2(div, "img", { src: icon, class: "bes_icon" })
    }
    addElement2(div, "span", { textContent: text, class: "bes_title" })
    div.append(createSwitch(options))
    return div
  }
  var besVersion = 62
  var messages = {
    "settings.title": "Settings",
    "settings.otherExtensions": "Other Extensions",
    "settings.locale": "Language",
    "settings.systemLanguage": "System Language",
    "settings.displaySettingsButtonInSideMenu":
      "Display Settings Button in Side Menu",
    "settings.menu.settings": "\u2699\uFE0F Settings",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Add usertags to links",
    "settings.extensions.links-helper.title": "\u{1F517} Links Helper",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX Minimalist (\u6781\u7B80\u98CE\u683C)",
    "settings.extensions.replace-ugly-avatars.title": "Replace Ugly Avatars",
    "settings.extensions.more-by-pipecraft.title":
      "Find more useful userscripts",
  }
  var en_default = messages
  var messages2 = {
    "settings.title": "\u8BBE\u7F6E",
    "settings.otherExtensions": "\u5176\u4ED6\u6269\u5C55",
    "settings.locale": "\u8BED\u8A00",
    "settings.systemLanguage": "\u7CFB\u7EDF\u8BED\u8A00",
    "settings.displaySettingsButtonInSideMenu":
      "\u5728\u4FA7\u8FB9\u83DC\u5355\u4E2D\u663E\u793A\u8BBE\u7F6E\u6309\u94AE",
    "settings.menu.settings": "\u2699\uFE0F \u8BBE\u7F6E",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F \u5C0F\u9C7C\u6807\u7B7E (UTags) - \u4E3A\u94FE\u63A5\u6DFB\u52A0\u7528\u6237\u6807\u7B7E",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u94FE\u63A5\u52A9\u624B",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u6781\u7B80\u98CE\u683C",
    "settings.extensions.replace-ugly-avatars.title":
      "\u8D50\u4F60\u4E2A\u5934\u50CF\u5427",
    "settings.extensions.more-by-pipecraft.title":
      "\u66F4\u591A\u6709\u8DA3\u7684\u811A\u672C",
  }
  var zh_cn_default = messages2
  var messages3 = {
    "settings.title": "\u8A2D\u5B9A",
    "settings.otherExtensions": "\u5176\u4ED6\u64F4\u5145\u529F\u80FD",
    "settings.locale": "\u8A9E\u8A00",
    "settings.systemLanguage": "\u7CFB\u7D71\u8A9E\u8A00",
    "settings.displaySettingsButtonInSideMenu":
      "\u5728\u5074\u908A\u9078\u55AE\u4E2D\u986F\u793A\u8A2D\u5B9A\u6309\u9215",
    "settings.menu.settings": "\u2699\uFE0F \u8A2D\u5B9A",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F \u5C0F\u9B5A\u6A19\u7C64 (UTags) - \u70BA\u9023\u7D50\u6DFB\u52A0\u7528\u6236\u6A19\u7C64",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u9023\u7D50\u52A9\u624B",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u6975\u7C21\u98A8\u683C",
    "settings.extensions.replace-ugly-avatars.title":
      "\u8CDC\u4F60\u500B\u982D\u50CF\u5427",
    "settings.extensions.more-by-pipecraft.title":
      "\u66F4\u591A\u6709\u8DA3\u7684\u8173\u672C",
  }
  var zh_hk_default = messages3
  var messages4 = {
    "settings.title": "\u8A2D\u5B9A",
    "settings.otherExtensions": "\u5176\u4ED6\u64F4\u5145\u529F\u80FD",
    "settings.locale": "\u8A9E\u8A00",
    "settings.systemLanguage": "\u7CFB\u7D71\u8A9E\u8A00",
    "settings.displaySettingsButtonInSideMenu":
      "\u5728\u5074\u908A\u9078\u55AE\u4E2D\u986F\u793A\u8A2D\u5B9A\u6309\u9215",
    "settings.menu.settings": "\u2699\uFE0F \u8A2D\u5B9A",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F \u5C0F\u9B5A\u6A19\u7C64 (UTags) - \u70BA\u9023\u7D50\u65B0\u589E\u4F7F\u7528\u8005\u6A19\u7C64",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u9023\u7D50\u52A9\u624B",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u6975\u7C21\u98A8\u683C",
    "settings.extensions.replace-ugly-avatars.title":
      "\u66FF\u63DB\u919C\u964B\u7684\u982D\u50CF",
    "settings.extensions.more-by-pipecraft.title":
      "\u66F4\u591A\u6709\u8DA3\u7684\u8173\u672C",
  }
  var zh_tw_default = messages4
  var messages5 = {
    "settings.title": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "settings.otherExtensions":
      "\u0414\u0440\u0443\u0433\u0438\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F",
    "settings.locale": "\u042F\u0437\u044B\u043A",
    "settings.systemLanguage":
      "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439 \u044F\u0437\u044B\u043A",
    "settings.displaySettingsButtonInSideMenu":
      "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0443 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043A \u0432 \u0431\u043E\u043A\u043E\u0432\u043E\u043C \u043C\u0435\u043D\u044E",
    "settings.menu.settings":
      "\u2699\uFE0F \u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0442\u0435\u0433\u0438 \u043A \u0441\u0441\u044B\u043B\u043A\u0430\u043C",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u041F\u043E\u043C\u043E\u0449\u043D\u0438\u043A \u0441\u0441\u044B\u043B\u043E\u043A",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u041C\u0438\u043D\u0438\u043C\u0430\u043B\u0438\u0441\u0442\u0438\u0447\u043D\u044B\u0439 \u0441\u0442\u0438\u043B\u044C",
    "settings.extensions.replace-ugly-avatars.title":
      "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u043D\u0435\u043A\u0440\u0430\u0441\u0438\u0432\u044B\u0435 \u0430\u0432\u0430\u0442\u0430\u0440\u044B",
    "settings.extensions.more-by-pipecraft.title":
      "\u041D\u0430\u0439\u0442\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0445 \u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0445 \u0441\u043A\u0440\u0438\u043F\u0442\u043E\u0432",
  }
  var ru_default = messages5
  var messages6 = {
    "settings.title": "\uC124\uC815",
    "settings.otherExtensions":
      "\uAE30\uD0C0 \uD655\uC7A5 \uD504\uB85C\uADF8\uB7A8",
    "settings.locale": "\uC5B8\uC5B4",
    "settings.systemLanguage": "\uC2DC\uC2A4\uD15C \uC5B8\uC5B4",
    "settings.displaySettingsButtonInSideMenu":
      "\uC0AC\uC774\uB4DC \uBA54\uB274\uC5D0 \uC124\uC815 \uBC84\uD2BC \uD45C\uC2DC",
    "settings.menu.settings": "\u2699\uFE0F \uC124\uC815",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - \uB9C1\uD06C\uC5D0 \uC0AC\uC6A9\uC790 \uD0DC\uADF8 \uCD94\uAC00",
    "settings.extensions.links-helper.title":
      "\u{1F517} \uB9C1\uD06C \uB3C4\uC6B0\uBBF8",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \uBBF8\uB2C8\uBA40 \uC2A4\uD0C0\uC77C",
    "settings.extensions.replace-ugly-avatars.title":
      "\uBABB\uC0DD\uAE34 \uC544\uBC14\uD0C0 \uAD50\uCCB4",
    "settings.extensions.more-by-pipecraft.title":
      "\uB354 \uC720\uC6A9\uD55C \uC0AC\uC6A9\uC790 \uC2A4\uD06C\uB9BD\uD2B8 \uCC3E\uAE30",
  }
  var ko_default = messages6
  var messages7 = {
    "settings.title": "\u8A2D\u5B9A",
    "settings.otherExtensions":
      "\u305D\u306E\u4ED6\u306E\u62E1\u5F35\u6A5F\u80FD",
    "settings.locale": "\u8A00\u8A9E",
    "settings.systemLanguage": "\u30B7\u30B9\u30C6\u30E0\u8A00\u8A9E",
    "settings.displaySettingsButtonInSideMenu":
      "\u30B5\u30A4\u30C9\u30E1\u30CB\u30E5\u30FC\u306B\u8A2D\u5B9A\u30DC\u30BF\u30F3\u3092\u8868\u793A",
    "settings.menu.settings": "\u2699\uFE0F \u8A2D\u5B9A",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - \u30EA\u30F3\u30AF\u306B\u30E6\u30FC\u30B6\u30FC\u30BF\u30B0\u3092\u8FFD\u52A0",
    "settings.extensions.links-helper.title":
      "\u{1F517} \u30EA\u30F3\u30AF\u30D8\u30EB\u30D1\u30FC",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX \u30DF\u30CB\u30DE\u30EB\u30B9\u30BF\u30A4\u30EB",
    "settings.extensions.replace-ugly-avatars.title":
      "\u919C\u3044\u30A2\u30D0\u30BF\u30FC\u3092\u7F6E\u304D\u63DB\u3048\u308B",
    "settings.extensions.more-by-pipecraft.title":
      "\u3088\u308A\u4FBF\u5229\u306A\u30E6\u30FC\u30B6\u30FC\u30B9\u30AF\u30EA\u30D7\u30C8\u3092\u898B\u3064\u3051\u308B",
  }
  var ja_default = messages7
  var messages8 = {
    "settings.title": "Param\xE8tres",
    "settings.otherExtensions": "Autres extensions",
    "settings.locale": "Langue",
    "settings.systemLanguage": "Langue du syst\xE8me",
    "settings.displaySettingsButtonInSideMenu":
      "Afficher le bouton de param\xE8tres dans le menu lat\xE9ral",
    "settings.menu.settings": "\u2699\uFE0F Param\xE8tres",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Ajouter des balises utilisateur aux liens",
    "settings.extensions.links-helper.title": "\u{1F517} Assistant de liens",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title": "v2ex.min - Style minimaliste V2EX",
    "settings.extensions.replace-ugly-avatars.title":
      "Remplacer les avatars laids",
    "settings.extensions.more-by-pipecraft.title":
      "Trouver plus de scripts utilisateur utiles",
  }
  var fr_default = messages8
  var messages9 = {
    "settings.title": "Einstellungen",
    "settings.otherExtensions": "Andere Erweiterungen",
    "settings.locale": "Sprache",
    "settings.systemLanguage": "Systemsprache",
    "settings.displaySettingsButtonInSideMenu":
      "Einstellungsschaltfl\xE4che im Seitenmen\xFC anzeigen",
    "settings.menu.settings": "\u2699\uFE0F Einstellungen",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Benutzer-Tags zu Links hinzuf\xFCgen",
    "settings.extensions.links-helper.title": "\u{1F517} Link-Assistent",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - V2EX Minimalistischer Stil",
    "settings.extensions.replace-ugly-avatars.title":
      "H\xE4ssliche Avatare ersetzen",
    "settings.extensions.more-by-pipecraft.title":
      "Weitere n\xFCtzliche Benutzerskripte finden",
  }
  var de_default = messages9
  var messages10 = {
    "settings.title": "Impostazioni",
    "settings.otherExtensions": "Altre estensioni",
    "settings.locale": "Lingua",
    "settings.systemLanguage": "Lingua del sistema",
    "settings.displaySettingsButtonInSideMenu":
      "Mostra pulsante impostazioni nel menu laterale",
    "settings.menu.settings": "\u2699\uFE0F Impostazioni",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Aggiungi tag utente ai collegamenti",
    "settings.extensions.links-helper.title":
      "\u{1F517} Assistente collegamenti",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title": "v2ex.min - Stile minimalista V2EX",
    "settings.extensions.replace-ugly-avatars.title":
      "Sostituisci avatar brutti",
    "settings.extensions.more-by-pipecraft.title":
      "Trova pi\xF9 script utente utili",
  }
  var it_default = messages10
  var messages11 = {
    "settings.title": "Configuraci\xF3n",
    "settings.otherExtensions": "Otras extensiones",
    "settings.locale": "Idioma",
    "settings.systemLanguage": "Idioma del sistema",
    "settings.displaySettingsButtonInSideMenu":
      "Mostrar bot\xF3n de configuraci\xF3n en el men\xFA lateral",
    "settings.menu.settings": "\u2699\uFE0F Configuraci\xF3n",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Agregar etiquetas de usuario a los enlaces",
    "settings.extensions.links-helper.title": "\u{1F517} Asistente de enlaces",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title": "v2ex.min - Estilo minimalista V2EX",
    "settings.extensions.replace-ugly-avatars.title":
      "Reemplazar avatares feos",
    "settings.extensions.more-by-pipecraft.title":
      "Encontrar m\xE1s scripts de usuario \xFAtiles",
  }
  var es_default = messages11
  var messages12 = {
    "settings.title": "Configura\xE7\xF5es",
    "settings.otherExtensions": "Outras extens\xF5es",
    "settings.locale": "Idioma",
    "settings.systemLanguage": "Idioma do sistema",
    "settings.displaySettingsButtonInSideMenu":
      "Exibir bot\xE3o de configura\xE7\xF5es no menu lateral",
    "settings.menu.settings": "\u2699\uFE0F Configura\xE7\xF5es",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Adicionar tags de usu\xE1rio aos links",
    "settings.extensions.links-helper.title": "\u{1F517} Assistente de links",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title": "v2ex.min - Estilo minimalista V2EX",
    "settings.extensions.replace-ugly-avatars.title":
      "Substituir avatares feios",
    "settings.extensions.more-by-pipecraft.title":
      "Encontrar mais scripts de usu\xE1rio \xFAteis",
  }
  var pt_default = messages12
  var messages13 = {
    "settings.title": "C\xE0i \u0111\u1EB7t",
    "settings.otherExtensions": "Ti\u1EC7n \xEDch m\u1EDF r\u1ED9ng kh\xE1c",
    "settings.locale": "Ng\xF4n ng\u1EEF",
    "settings.systemLanguage": "Ng\xF4n ng\u1EEF h\u1EC7 th\u1ED1ng",
    "settings.displaySettingsButtonInSideMenu":
      "Hi\u1EC3n th\u1ECB n\xFAt c\xE0i \u0111\u1EB7t trong menu b\xEAn",
    "settings.menu.settings": "\u2699\uFE0F C\xE0i \u0111\u1EB7t",
    "settings.extensions.utags.title":
      "\u{1F3F7}\uFE0F UTags - Th\xEAm th\u1EBB ng\u01B0\u1EDDi d\xF9ng v\xE0o li\xEAn k\u1EBFt",
    "settings.extensions.links-helper.title":
      "\u{1F517} Tr\u1EE3 l\xFD li\xEAn k\u1EBFt",
    "settings.extensions.v2ex.rep.title":
      "V2EX.REP - \u4E13\u6CE8\u63D0\u5347 V2EX \u4E3B\u9898\u56DE\u590D\u6D4F\u89C8\u4F53\u9A8C",
    "settings.extensions.v2ex.min.title":
      "v2ex.min - Phong c\xE1ch t\u1ED1i gi\u1EA3n V2EX",
    "settings.extensions.replace-ugly-avatars.title":
      "Thay th\u1EBF avatar x\u1EA5u",
    "settings.extensions.more-by-pipecraft.title":
      "T\xECm th\xEAm script ng\u01B0\u1EDDi d\xF9ng h\u1EEFu \xEDch",
  }
  var vi_default = messages13
  var localeMap = {
    en: en_default,
    "en-us": en_default,
    zh: zh_cn_default,
    "zh-cn": zh_cn_default,
    "zh-hk": zh_hk_default,
    "zh-tw": zh_tw_default,
    ru: ru_default,
    "ru-ru": ru_default,
    ko: ko_default,
    "ko-kr": ko_default,
    ja: ja_default,
    "ja-jp": ja_default,
    fr: fr_default,
    "fr-fr": fr_default,
    de: de_default,
    "de-de": de_default,
    it: it_default,
    "it-it": it_default,
    es: es_default,
    "es-es": es_default,
    pt: pt_default,
    "pt-pt": pt_default,
    "pt-br": pt_default,
    vi: vi_default,
    "vi-vn": vi_default,
  }
  var localeNames = {
    en: "English",
    "en-us": "English (US)",
    zh: "\u4E2D\u6587",
    "zh-cn": "\u4E2D\u6587 (\u7B80\u4F53)",
    "zh-hk": "\u4E2D\u6587 (\u9999\u6E2F)",
    "zh-tw": "\u4E2D\u6587 (\u53F0\u7063)",
    ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    "ru-ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    ko: "\uD55C\uAD6D\uC5B4",
    "ko-kr": "\uD55C\uAD6D\uC5B4",
    ja: "\u65E5\u672C\u8A9E",
    "ja-jp": "\u65E5\u672C\u8A9E",
    fr: "Fran\xE7ais",
    "fr-fr": "Fran\xE7ais",
    de: "Deutsch",
    "de-de": "Deutsch",
    it: "Italiano",
    "it-it": "Italiano",
    es: "Espa\xF1ol",
    "es-es": "Espa\xF1ol",
    pt: "Portugu\xEAs",
    "pt-pt": "Portugu\xEAs",
    "pt-br": "Portugu\xEAs (Brasil)",
    vi: "Ti\u1EBFng Vi\u1EC7t",
    "vi-vn": "Ti\u1EBFng Vi\u1EC7t",
  }
  var locales = Object.keys(localeMap)
  initAvailableLocales(locales)
  console.log("[settings] prefferedLocale:", getPrefferedLocale())
  var i = initI18n(localeMap, getPrefferedLocale())
  function resetI18n(locale2) {
    console.log(
      "[settings] prefferedLocale:",
      getPrefferedLocale(),
      "locale:",
      locale2
    )
    i = initI18n(localeMap, locale2 || getPrefferedLocale())
  }
  var lang = navigator.language
  var locale
  if (lang === "zh-TW" || lang === "zh-HK") {
    locale = "zh-TW"
  } else if (lang.includes("zh")) {
    locale = "zh-CN"
  } else {
    locale = "en"
  }
  var relatedExtensions = [
    {
      id: "utags",
      title: i("settings.extensions.utags.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/460718-utags-add-usertags-to-links"
      ),
    },
    {
      id: "links-helper",
      title: i("settings.extensions.links-helper.title"),
      description:
        "\u5728\u65B0\u6807\u7B7E\u9875\u4E2D\u6253\u5F00\u7B2C\u4E09\u65B9\u7F51\u7AD9\u94FE\u63A5\uFF0C\u56FE\u7247\u94FE\u63A5\u8F6C\u56FE\u7247\u6807\u7B7E\u7B49",
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/464541-links-helper"
      ),
    },
    {
      id: "v2ex.rep",
      title: i("settings.extensions.v2ex.rep.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/466589-v2ex-rep-%E4%B8%93%E6%B3%A8%E6%8F%90%E5%8D%87-v2ex-%E4%B8%BB%E9%A2%98%E5%9B%9E%E5%A4%8D%E6%B5%8F%E8%A7%88%E4%BD%93%E9%AA%8C"
      ),
    },
    {
      id: "v2ex.min",
      title: i("settings.extensions.v2ex.min.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/463552-v2ex-min-v2ex-%E6%9E%81%E7%AE%80%E9%A3%8E%E6%A0%BC"
      ),
    },
    {
      id: "replace-ugly-avatars",
      title: i("settings.extensions.replace-ugly-avatars.title"),
      url: "https://greasyfork.org/".concat(
        locale,
        "/scripts/472616-replace-ugly-avatars"
      ),
    },
    {
      id: "more-by-pipecraft",
      title: i("settings.extensions.more-by-pipecraft.title"),
      url: "https://greasyfork.org/".concat(locale, "/users/1030884-pipecraft"),
    },
  ]
  var prefix = "browser_extension_settings_"
  var randomId = String(Math.round(Math.random() * 1e4))
  var settingsContainerId = prefix + "container_" + randomId
  var settingsElementId = prefix + "main_" + randomId
  var getSettingsElement = () => $("#" + settingsElementId)
  var getSettingsStyle = () =>
    style_default
      .replaceAll(/browser_extension_settings_container/gm, settingsContainerId)
      .replaceAll(/browser_extension_settings_main/gm, settingsElementId)
  var storageKey = "settings"
  var settingsOptions
  var settingsTable = {}
  var settings = {}
  async function getSettings() {
    var _a
    return (_a = await getValue(storageKey)) != null ? _a : {}
  }
  async function saveSettingsValue(key, value) {
    const settings2 = await getSettings()
    settings2[key] =
      settingsTable[key] && settingsTable[key].defaultValue === value
        ? void 0
        : value
    await setValue(storageKey, settings2)
  }
  function getSettingsValue(key) {
    var _a
    return Object.hasOwn(settings, key)
      ? settings[key]
      : (_a = settingsTable[key]) == null
        ? void 0
        : _a.defaultValue
  }
  var closeModal = () => {
    const settingsContainer = getSettingsContainer()
    if (settingsContainer) {
      settingsContainer.style.display = "none"
    }
    removeEventListener(document, "click", onDocumentClick, true)
    removeEventListener(document, "keydown", onDocumentKeyDown, true)
  }
  function destroySettings() {
    closeModal()
    const settingsContainer = getSettingsContainer()
    if (settingsContainer) {
      settingsContainer.remove()
    }
  }
  function isSettingsShown() {
    const settingsContainer = getSettingsContainer()
    if (settingsContainer) {
      return settingsContainer.style.display === "block"
    }
    return false
  }
  var onDocumentClick = (event) => {
    const target = event.target
    if (
      target == null ? void 0 : target.closest(".".concat(prefix, "container"))
    ) {
      return
    }
    closeModal()
  }
  var onDocumentKeyDown = (event) => {
    if (event.defaultPrevented) {
      return
    }
    if (event.key === "Escape") {
      closeModal()
      event.preventDefault()
    }
  }
  async function updateOptions() {
    if (!getSettingsElement()) {
      return
    }
    for (const key in settingsTable) {
      if (Object.hasOwn(settingsTable, key)) {
        const item = settingsTable[key]
        const type = item.type || "switch"
        switch (type) {
          case "switch": {
            const checkbox = $(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups .switch_option[data-key="'
                )
                .concat(key, '"] input')
            )
            if (checkbox) {
              checkbox.checked = getSettingsValue(key)
            }
            break
          }
          case "select": {
            const options = $$(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups .select_option[data-key="'
                )
                .concat(key, '"] .bes_select option')
            )
            for (const option of options) {
              option.selected = option.value === String(getSettingsValue(key))
            }
            break
          }
          case "textarea": {
            const textArea = $(
              "#"
                .concat(
                  settingsElementId,
                  ' .option_groups textarea[data-key="'
                )
                .concat(key, '"]')
            )
            if (textArea) {
              textArea.value = getSettingsValue(key)
            }
            break
          }
          default: {
            break
          }
        }
      }
    }
    if (typeof settingsOptions.onViewUpdate === "function") {
      const settingsMain = createSettingsElement()
      settingsOptions.onViewUpdate(settingsMain)
    }
  }
  function getSettingsContainer() {
    const container = $(".".concat(prefix, "container"))
    if (container) {
      const theVersion = parseInt10(container.dataset.besVersion, 0)
      if (theVersion < besVersion) {
        container.id = settingsContainerId
        container.dataset.besVersion = String(besVersion)
      }
      return container
    }
    return addElement2(doc.body, "div", {
      id: settingsContainerId,
      class: "".concat(prefix, "container"),
      "data-bes-version": besVersion,
      style: "display: none;",
    })
  }
  function getSettingsWrapper() {
    const container = getSettingsContainer()
    return (
      $(".".concat(prefix, "wrapper"), container) ||
      addElement2(container, "div", {
        class: "".concat(prefix, "wrapper"),
      })
    )
  }
  function createSettingsElement() {
    let settingsMain = getSettingsElement()
    if (!settingsMain) {
      const wrapper = getSettingsWrapper()
      for (const element of $$(".".concat(prefix, "main"))) {
        element.remove()
      }
      settingsMain = addElement2(wrapper, "div", {
        id: settingsElementId,
        class: "".concat(prefix, "main thin_scrollbar"),
      })
      if (settingsOptions.title) {
        addElement2(settingsMain, "h2", { textContent: settingsOptions.title })
      }
      const optionGroups = []
      const getOptionGroup = (index) => {
        if (index > optionGroups.length) {
          for (let i3 = optionGroups.length; i3 < index; i3++) {
            optionGroups.push(
              addElement2(settingsMain, "div", {
                class: "option_groups",
              })
            )
          }
        }
        return optionGroups[index - 1]
      }
      for (const key in settingsTable) {
        if (Object.hasOwn(settingsTable, key)) {
          const item = settingsTable[key]
          const type = item.type || "switch"
          const group = item.group || 1
          const optionGroup = getOptionGroup(group)
          switch (type) {
            case "switch": {
              const switchOption = createSwitchOption(item.icon, item.title, {
                async onchange(event) {
                  const checkbox = event.target
                  if (checkbox) {
                    let result = true
                    if (typeof item.onConfirmChange === "function") {
                      result = item.onConfirmChange(checkbox.checked)
                    }
                    if (result) {
                      await saveSettingsValue(key, checkbox.checked)
                    } else {
                      checkbox.checked = !checkbox.checked
                    }
                  }
                },
              })
              switchOption.dataset.key = key
              addElement2(optionGroup, switchOption)
              break
            }
            case "textarea": {
              let timeoutId
              const div = addElement2(optionGroup, "div", {
                class: "bes_textarea",
              })
              addElement2(div, "textarea", {
                "data-key": key,
                placeholder: item.placeholder || "",
                onkeyup(event) {
                  const textArea = event.target
                  if (timeoutId) {
                    clearTimeout(timeoutId)
                    timeoutId = void 0
                  }
                  timeoutId = setTimeout(async () => {
                    if (textArea) {
                      await saveSettingsValue(key, textArea.value.trim())
                    }
                  }, 100)
                },
              })
              break
            }
            case "action": {
              addElement2(optionGroup, "a", {
                class: "action",
                textContent: item.title,
                onclick: item.onclick,
              })
              break
            }
            case "externalLink": {
              const div4 = addElement2(optionGroup, "div", {
                class: "bes_external_link",
              })
              addElement2(div4, "a", {
                textContent: item.title,
                href: item.url,
                target: "_blank",
              })
              break
            }
            case "select": {
              const div = addElement2(optionGroup, "div", {
                class: "select_option bes_option",
                "data-key": key,
              })
              if (item.icon) {
                addElement2(div, "img", { src: item.icon, class: "bes_icon" })
              }
              addElement2(div, "span", {
                textContent: item.title,
                class: "bes_title",
              })
              const select = addElement2(div, "select", {
                class: "bes_select",
                async onchange() {
                  await saveSettingsValue(key, select.value)
                },
              })
              for (const option of Object.entries(item.options)) {
                addElement2(select, "option", {
                  textContent: option[0],
                  value: option[1],
                })
              }
              break
            }
            case "tip": {
              const tip = addElement2(optionGroup, "div", {
                class: "bes_tip",
              })
              addElement2(tip, "a", {
                class: "bes_tip_anchor",
                textContent: item.title,
              })
              const tipContent = addElement2(tip, "div", {
                class: "bes_tip_content",
                innerHTML: createHTML(item.tipContent),
              })
              break
            }
            default: {
              break
            }
          }
        }
      }
      if (settingsOptions.footer) {
        const footer = addElement2(settingsMain, "footer")
        footer.innerHTML = createHTML(
          typeof settingsOptions.footer === "string"
            ? settingsOptions.footer
            : '<p>Made with \u2764\uFE0F by\n      <a href="https://www.pipecraft.net/" target="_blank">\n        Pipecraft\n      </a></p>'
        )
      }
    }
    return settingsMain
  }
  function addCommonSettings(settingsTable2) {
    let maxGroup = 0
    for (const key in settingsTable2) {
      if (Object.hasOwn(settingsTable2, key)) {
        const item = settingsTable2[key]
        const group = item.group || 1
        if (group > maxGroup) {
          maxGroup = group
        }
      }
    }
    settingsTable2.locale = {
      title: i("settings.locale"),
      type: "select",
      defaultValue: "",
      options: {},
      group: ++maxGroup,
    }
  }
  function handleShowSettingsUrl() {
    const hashString = "#!show-settings-".concat(settingsOptions.id)
    if (location.hash === hashString) {
      setTimeout(showSettings, 100)
      history.replaceState({}, "", location.href.replace(hashString, ""))
    }
  }
  async function showSettings() {
    const settingsContainer = getSettingsContainer()
    const settingsMain = createSettingsElement()
    await updateOptions()
    settingsContainer.style.display = "block"
    addEventListener(document, "click", onDocumentClick, true)
    addEventListener(document, "keydown", onDocumentKeyDown, true)
  }
  var lastLocale
  var resetSettingsUI = (optionsProvider) => {
    lastLocale = getSettingsValue("locale") || getPrefferedLocale()
    resetI18n(lastLocale)
    const options = optionsProvider()
    settingsOptions = options
    settingsTable = options.settingsTable || {}
    addCommonSettings(settingsTable)
    const availableLocales3 = options.availableLocales
    if (availableLocales3 == null ? void 0 : availableLocales3.length) {
      initAvailableLocales(availableLocales3)
      const localeSelect = settingsTable.locale
      localeSelect.options = {
        [i("settings.systemLanguage")]: "",
      }
      for (const locale2 of availableLocales3) {
        const lowerCaseLocale = locale2.toLowerCase()
        const displayName = localeNames[lowerCaseLocale] || locale2
        localeSelect.options[displayName] = locale2
      }
    }
  }
  var initSettings = async (optionsProvider) => {
    addValueChangeListener(storageKey, async () => {
      settings = await getSettings()
      await updateOptions()
      const newLocale = getSettingsValue("locale") || getPrefferedLocale()
      console.log("lastLocale:", lastLocale, "newLocale:", newLocale)
      if (lastLocale !== newLocale) {
        const isShown = isSettingsShown()
        destroySettings()
        resetI18n(newLocale)
        lastLocale = newLocale
        setTimeout(() => {
          resetSettingsUI(optionsProvider)
        }, 50)
        if (isShown) {
          setTimeout(showSettings, 100)
        }
      }
      if (typeof settingsOptions.onValueChange === "function") {
        settingsOptions.onValueChange()
      }
    })
    settings = await getSettings()
    resetSettingsUI(optionsProvider)
    setTimeout(() => {
      resetSettingsUI(optionsProvider)
    }, 50)
    runWhenHeadExists(() => {
      addStyle(getSettingsStyle())
    })
    registerMenuCommand(i("settings.menu.settings"), showSettings, "o")
    handleShowSettingsUrl()
  }
  var content_default =
    '.bes_tip_content{max-height:300px;overflow-y:auto}.bes_textarea textarea{padding:4px 8px}:host{color:#000;--utaf-col-user:auto;--utaf-col-score:56px;--utaf-col-select:48px}.utaf-checkbox{accent-color:#3b82f6;color-scheme:light;cursor:pointer;flex:0 0 auto;height:20px;vertical-align:middle;width:20px}.shadow-xl>.flex .utaf-checkbox{margin-right:calc(var(--spacing)*2)}.utaf-label{cursor:pointer;-webkit-user-select:none;-moz-user-select:none;user-select:none}input,select,textarea{color-scheme:light}.utaf-reset-slot{align-items:center;display:inline-flex;justify-content:center;min-height:24px;min-width:24px;position:relative}.utaf-reset-btn{opacity:0;pointer-events:none;transition:opacity .2s ease}.utaf-reset-btn--visible{opacity:1;pointer-events:auto}.utaf-fab{align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.18);color:#111;display:inline-flex;height:32px;justify-content:center;opacity:.5;transition:opacity .2s ease;width:32px}.utaf-fab:hover{opacity:1}.utaf-btn-circle{align-items:center;border-radius:9999px;display:inline-flex;height:20px;justify-content:center;width:20px}.utaf-btn-danger{background:#fee2e2;border:1px solid #fecaca;color:#b91c1c}.utaf-btn-danger:hover{background:#fecaca}.utaf-col-user{width:var(--utaf-col-user)}.utaf-col-score{width:var(--utaf-col-score)}.utaf-col-select{width:var(--utaf-col-select)}.utaf-toggle{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#e5e7eb;border:1px solid #d1d5db;border-radius:9999px;cursor:pointer;display:inline-block;height:16px;outline:none;position:relative;transition:background-color .2s ease,border-color .2s ease;vertical-align:middle;width:28px}.utaf-toggle:before{background:#fff;border-radius:9999px;box-shadow:0 1px 2px rgba(0,0,0,.2);content:"";height:12px;left:1px;position:absolute;top:1px;transition:transform .2s ease;width:12px}.utaf-toggle:checked{background-color:#3b82f6;border-color:#3b82f6}.utaf-toggle:checked:before{transform:translateX(12px)}.utaf-toggle:disabled{cursor:not-allowed;opacity:.5}.utaf-toggle.hidden{display:none}.shadow-xl input[type=number]::-webkit-inner-spin-button,.shadow-xl input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.shadow-xl input[type=number]{-moz-appearance:textfield}'
  var tailwind_default =
    '/*! tailwindcss v4.1.17 | MIT License | https://tailwindcss.com */@layer properties;@layer theme, base, components, utilities;@layer theme{:host,:root{--font-sans:ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";--font-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;--color-red-100:oklch(93.6% 0.032 17.717);--color-red-200:oklch(88.5% 0.062 18.334);--color-red-700:oklch(50.5% 0.213 27.518);--color-blue-500:oklch(62.3% 0.214 259.815);--color-blue-600:oklch(54.6% 0.245 262.881);--color-blue-700:oklch(48.8% 0.243 264.376);--color-gray-50:oklch(98.5% 0.002 247.839);--color-gray-100:oklch(96.7% 0.003 264.542);--color-gray-200:oklch(92.8% 0.006 264.531);--color-gray-300:oklch(87.2% 0.01 258.338);--color-gray-500:oklch(55.1% 0.027 264.364);--color-gray-600:oklch(44.6% 0.03 256.802);--color-gray-700:oklch(37.3% 0.034 259.733);--color-gray-800:oklch(27.8% 0.033 256.848);--color-gray-900:oklch(21% 0.034 264.665);--color-black:#000;--color-white:#fff;--spacing:0.25rem;--text-xs:0.75rem;--text-xs--line-height:1.33333;--text-sm:0.875rem;--text-sm--line-height:1.42857;--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--radius-md:0.375rem;--radius-lg:0.5rem;--radius-xl:0.75rem;--default-transition-duration:150ms;--default-transition-timing-function:cubic-bezier(0.4,0,0.2,1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}}@layer base{*,::backdrop,::file-selector-button,:after,:before{border:0 solid;box-sizing:border-box;margin:0;padding:0}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:var(--default-font-family,ui-sans-serif,system-ui,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-tap-highlight-color:transparent}hr{border-top-width:1px;color:inherit;height:0}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:var(--default-mono-font-family,ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-size:1em;font-variation-settings:var(--default-mono-font-variation-settings,normal)}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{border-collapse:collapse;border-color:inherit;text-indent:0}:-moz-focusring{outline:auto}progress{vertical-align:baseline}summary{display:list-item}menu,ol,ul{list-style:none}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{height:auto;max-width:100%}::file-selector-button,button,input,optgroup,select,textarea{background-color:transparent;border-radius:0;color:inherit;font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;opacity:1}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::-moz-placeholder{opacity:1}::placeholder{opacity:1}@supports (not (-webkit-appearance:-apple-pay-button)) or (contain-intrinsic-size:1px){::-moz-placeholder{color:currentcolor;@supports (color:color-mix(in lab,red,red)){color:color-mix(in oklab,currentcolor 50%,transparent)}}::placeholder{color:currentcolor;@supports (color:color-mix(in lab,red,red)){color:color-mix(in oklab,currentcolor 50%,transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit,::-webkit-datetime-edit-day-field,::-webkit-datetime-edit-hour-field,::-webkit-datetime-edit-meridiem-field,::-webkit-datetime-edit-millisecond-field,::-webkit-datetime-edit-minute-field,::-webkit-datetime-edit-month-field,::-webkit-datetime-edit-second-field,::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}::file-selector-button,button,input:where([type=button],[type=reset],[type=submit]){-webkit-appearance:button;-moz-appearance:button;appearance:button}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer utilities{.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.visible{visibility:visible}.sr-only{border-width:0;clip-path:inset(50%);height:1px;margin:-1px;overflow:hidden;padding:0;white-space:nowrap;width:1px}.absolute,.sr-only{position:absolute}.fixed{position:fixed}.relative{position:relative}.sticky{position:sticky}.top-0{top:calc(var(--spacing)*0)}.top-1{top:calc(var(--spacing)*1)}.left-1{left:calc(var(--spacing)*1)}.z-10{z-index:10}.z-50{z-index:50}.container{width:100%;@media (width >= 40rem){max-width:40rem}@media (width >= 48rem){max-width:48rem}@media (width >= 64rem){max-width:64rem}@media (width >= 80rem){max-width:80rem}@media (width >= 96rem){max-width:96rem}}.mx-auto{margin-inline:auto}.my-4{margin-block:calc(var(--spacing)*4)}.my-5{margin-block:calc(var(--spacing)*5)}.mt-1{margin-top:calc(var(--spacing)*1)}.mt-3{margin-top:calc(var(--spacing)*3)}.mt-4{margin-top:calc(var(--spacing)*4)}.-mr-5{margin-right:calc(var(--spacing)*-5)}.mr-2{margin-right:calc(var(--spacing)*2)}.mb-1{margin-bottom:calc(var(--spacing)*1)}.mb-2{margin-bottom:calc(var(--spacing)*2)}.mb-3{margin-bottom:calc(var(--spacing)*3)}.mb-4{margin-bottom:calc(var(--spacing)*4)}.-ml-3{margin-left:calc(var(--spacing)*-3)}.ml-auto{margin-left:auto}.block{display:block}.contents{display:contents}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.table{display:table}.h-3{height:calc(var(--spacing)*3)}.h-4{height:calc(var(--spacing)*4)}.h-5{height:calc(var(--spacing)*5)}.h-6{height:calc(var(--spacing)*6)}.h-\\[0\\.5px\\]{height:.5px}.w-1{width:calc(var(--spacing)*1)}.w-1\\/3{width:33.33333%}.w-3{width:calc(var(--spacing)*3)}.w-4{width:calc(var(--spacing)*4)}.w-8{width:calc(var(--spacing)*8)}.w-10{width:calc(var(--spacing)*10)}.w-12{width:calc(var(--spacing)*12)}.w-14{width:calc(var(--spacing)*14)}.w-16{width:calc(var(--spacing)*16)}.w-20{width:calc(var(--spacing)*20)}.w-24{width:calc(var(--spacing)*24)}.w-36{width:calc(var(--spacing)*36)}.w-80{width:calc(var(--spacing)*80)}.w-\\[20rem\\]{width:20rem}.w-\\[320px\\]{width:320px}.w-full{width:100%}.max-w-\\[3rem\\]{max-width:3rem}.max-w-\\[4rem\\]{max-width:4rem}.max-w-\\[8rem\\]{max-width:8rem}.max-w-\\[10rem\\]{max-width:10rem}.max-w-\\[12rem\\]{max-width:12rem}.min-w-0{min-width:calc(var(--spacing)*0)}.min-w-\\[2\\.5rem\\]{min-width:2.5rem}.min-w-\\[3rem\\]{min-width:3rem}.min-w-\\[4rem\\]{min-width:4rem}.min-w-\\[5rem\\]{min-width:5rem}.min-w-\\[6rem\\]{min-width:6rem}.flex-1{flex:1}.shrink-0{flex-shrink:0}.table-fixed{table-layout:fixed}.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-\\[auto_1fr_auto\\]{grid-template-columns:auto 1fr auto}.grid-cols-\\[auto_minmax\\(0\\,1fr\\)\\]{grid-template-columns:auto minmax(0,1fr)}.grid-cols-\\[minmax\\(0\\,1fr\\)_auto\\]{grid-template-columns:minmax(0,1fr) auto}.grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(0\\,1fr\\)_auto\\]{grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto}.grid-rows-1{grid-template-rows:repeat(1,minmax(0,1fr))}.grid-rows-2{grid-template-rows:repeat(2,minmax(0,1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-center{align-items:center}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-1{gap:calc(var(--spacing)*1)}.gap-2{gap:calc(var(--spacing)*2)}.gap-3{gap:calc(var(--spacing)*3)}.space-y-1{:where(&>:not(:last-child)){--tw-space-y-reverse:0;margin-block-end:calc(var(--spacing)*1*(1 - var(--tw-space-y-reverse)));margin-block-start:calc(var(--spacing)*1*var(--tw-space-y-reverse))}}.space-y-2{:where(&>:not(:last-child)){--tw-space-y-reverse:0;margin-block-end:calc(var(--spacing)*2*(1 - var(--tw-space-y-reverse)));margin-block-start:calc(var(--spacing)*2*var(--tw-space-y-reverse))}}.space-y-3{:where(&>:not(:last-child)){--tw-space-y-reverse:0;margin-block-end:calc(var(--spacing)*3*(1 - var(--tw-space-y-reverse)));margin-block-start:calc(var(--spacing)*3*var(--tw-space-y-reverse))}}.space-y-4{:where(&>:not(:last-child)){--tw-space-y-reverse:0;margin-block-end:calc(var(--spacing)*4*(1 - var(--tw-space-y-reverse)));margin-block-start:calc(var(--spacing)*4*var(--tw-space-y-reverse))}}.gap-x-1{-moz-column-gap:calc(var(--spacing)*1);column-gap:calc(var(--spacing)*1)}.gap-x-2{-moz-column-gap:calc(var(--spacing)*2);column-gap:calc(var(--spacing)*2)}.gap-y-1{row-gap:calc(var(--spacing)*1)}.justify-self-end{justify-self:flex-end}.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.overflow-y-auto{overflow-y:auto}.rounded{border-radius:.25rem}.rounded-full{border-radius:calc(infinity*1px)}.rounded-lg{border-radius:var(--radius-lg)}.rounded-md{border-radius:var(--radius-md)}.rounded-xl{border-radius:var(--radius-xl)}.border{border-style:var(--tw-border-style);border-width:1px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-gray-100{border-color:var(--color-gray-100)}.border-gray-200{border-color:var(--color-gray-200)}.border-gray-300{border-color:var(--color-gray-300)}.bg-black{background-color:var(--color-black)}.bg-black\\/30{background-color:color-mix(in srgb,#000 30%,transparent);@supports (color:color-mix(in lab,red,red)){background-color:color-mix(in oklab,var(--color-black) 30%,transparent)}}.bg-blue-500{background-color:var(--color-blue-500)}.bg-blue-600{background-color:var(--color-blue-600)}.bg-gray-50{background-color:var(--color-gray-50)}.bg-gray-100{background-color:var(--color-gray-100)}.bg-gray-200{background-color:var(--color-gray-200)}.bg-red-100{background-color:var(--color-red-100)}.bg-white{background-color:var(--color-white)}.p-2{padding:calc(var(--spacing)*2)}.p-3{padding:calc(var(--spacing)*3)}.p-4{padding:calc(var(--spacing)*4)}.px-1{padding-inline:calc(var(--spacing)*1)}.px-2{padding-inline:calc(var(--spacing)*2)}.px-3{padding-inline:calc(var(--spacing)*3)}.py-0{padding-block:calc(var(--spacing)*0)}.py-0\\.5{padding-block:calc(var(--spacing)*.5)}.py-1{padding-block:calc(var(--spacing)*1)}.py-2{padding-block:calc(var(--spacing)*2)}.pt-0{padding-top:calc(var(--spacing)*0)}.pt-1{padding-top:calc(var(--spacing)*1)}.pr-1{padding-right:calc(var(--spacing)*1)}.pr-3{padding-right:calc(var(--spacing)*3)}.pr-5{padding-right:calc(var(--spacing)*5)}.pb-3{padding-bottom:calc(var(--spacing)*3)}.pl-1{padding-left:calc(var(--spacing)*1)}.pl-3{padding-left:calc(var(--spacing)*3)}.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}.align-middle{vertical-align:middle}.font-sans{font-family:var(--font-sans)}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.leading-5{--tw-leading:calc(var(--spacing)*5);line-height:calc(var(--spacing)*5)}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.whitespace-nowrap{white-space:nowrap}.text-blue-500{color:var(--color-blue-500)}.text-gray-500{color:var(--color-gray-500)}.text-gray-600{color:var(--color-gray-600)}.text-gray-700{color:var(--color-gray-700)}.text-gray-800{color:var(--color-gray-800)}.text-gray-900{color:var(--color-gray-900)}.text-red-700{color:var(--color-red-700)}.text-white{color:var(--color-white)}.opacity-50{opacity:50%}.opacity-70{opacity:70%}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,rgba(0,0,0,.1)),0 1px 2px -1px var(--tw-shadow-color,rgba(0,0,0,.1))}.shadow,.shadow-md{box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-md{--tw-shadow:0 4px 6px -1px var(--tw-shadow-color,rgba(0,0,0,.1)),0 2px 4px -2px var(--tw-shadow-color,rgba(0,0,0,.1))}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,rgba(0,0,0,.1)),0 1px 2px -1px var(--tw-shadow-color,rgba(0,0,0,.1))}.shadow-sm,.shadow-xl{box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px var(--tw-shadow-color,rgba(0,0,0,.1)),0 8px 10px -6px var(--tw-shadow-color,rgba(0,0,0,.1))}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px)}.blur,.filter{filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.transition{transition-duration:var(--tw-duration,var(--default-transition-duration));transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function))}.transition-shadow{transition-duration:var(--tw-duration,var(--default-transition-duration));transition-property:box-shadow;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function))}.outline-none{--tw-outline-style:none;outline-style:none}.select-none{-webkit-user-select:none;-moz-user-select:none;user-select:none}.last\\:border-0{&:last-child{border-style:var(--tw-border-style);border-width:0}}.hover\\:bg-blue-600{&:hover{@media (hover:hover){background-color:var(--color-blue-600)}}}.hover\\:bg-gray-50{&:hover{@media (hover:hover){background-color:var(--color-gray-50)}}}.hover\\:bg-gray-200{&:hover{@media (hover:hover){background-color:var(--color-gray-200)}}}.hover\\:bg-red-200{&:hover{@media (hover:hover){background-color:var(--color-red-200)}}}.hover\\:underline{&:hover{@media (hover:hover){text-decoration-line:underline}}}.focus\\:border-blue-500{&:focus{border-color:var(--color-blue-500)}}}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@layer properties{*,::backdrop,:after,:before{--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-space-y-reverse:0;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial}}'
  var icon_no_bg_default =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n  <path d="M10 5H3" stroke="#4285F4"></path>\n  <path d="M21 5h-7" stroke="#4285F4"></path>\n  <path d="M14 3v4" stroke="#FBBC05"></path>\n\n  <path d="M8 12H3" stroke="#EA4335"></path>\n  <path d="M21 12h-9" stroke="#EA4335"></path>\n  <path d="M8 10v4" stroke="#FBBC05"></path>\n\n  <path d="M12 19H3" stroke="#34A853"></path>\n  <path d="M21 19h-5" stroke="#34A853"></path>\n  <path d="M16 17v4" stroke="#FBBC05"></path>\n</svg>'
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }
  var createSVGElement = ([tag, attrs, children]) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag)
    Object.keys(attrs).forEach((name) => {
      element.setAttribute(name, String(attrs[name]))
    })
    if (children == null ? void 0 : children.length) {
      children.forEach((child) => {
        const childElement = createSVGElement(child)
        element.appendChild(childElement)
      })
    }
    return element
  }
  var createElement2 = (iconNode, customAttrs = {}) => {
    const tag = "svg"
    const attrs = __spreadValues(
      __spreadValues({}, defaultAttributes),
      customAttrs
    )
    return createSVGElement([tag, attrs, iconNode])
  }
  var Check = [["path", { d: "M20 6 9 17l-5-5" }]]
  var ChevronUp = [["path", { d: "m18 15-6-6-6 6" }]]
  var Pencil = [
    [
      "path",
      {
        d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      },
    ],
    ["path", { d: "m15 5 4 4" }],
  ]
  var Plus = [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "M12 5v14" }],
  ]
  var RotateCcw = [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
  ]
  var Trash2 = [
    ["path", { d: "M10 11v6" }],
    ["path", { d: "M14 11v6" }],
    ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
    ["path", { d: "M3 6h18" }],
    ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
  ]
  var messages14 = {
    "settings.enable": "Enable for all sites",
    "settings.enableCurrentSite": "Enable for the current site",
    "settings.enableCustomRulesForTheCurrentSite":
      "Enable custom rules for the current site",
    "settings.customRulesPlaceholder":
      "/* Custom rules for internal URLs, matching URLs will be opened in new tabs */",
    "settings.customRulesTipTitle": "Examples",
    "settings.customRulesTipContent":
      "<p>Custom rules for internal URLs, matching URLs will be opened in new tabs</p>\n  <p>\n  - One line per url pattern<br>\n  - All URLs contains '/posts' or '/users/'<br>\n  <pre>/posts/\n/users/</pre>\n\n  - Regex is supported<br>\n  <pre>^/(posts|members)/d+</pre>\n\n  - '*' for all URLs<br>\n  - Exclusion rules: prefix '!' to exclude matching URLs<br>\n  <pre>!/posts/\n!^/users/\\d+\n!*</pre>\n  </p>",
    "settings.enableLinkToImgForCurrentSite":
      "Enable converting image links to image tags for the current site",
    "settings.enableTextToLinksForCurrentSite":
      "Enable converting text links to hyperlinks for the current site",
    "settings.enableTreatSubdomainsAsSameSiteForCurrentSite":
      "Treat subdomains as the same site for the current site",
    "settings.enableOpenNewTabInBackgroundForCurrentSite":
      "Open new tab in background for the current site",
    "settings.eraseLinks": "Erase Links",
    "settings.restoreLinks": "Restore Links",
    "settings.title": "UTags Advanced Filter",
    "settings.information":
      "After changing the settings, reload the page to take effect",
    "settings.report": "Report and Issue...",
  }
  var en_default2 = messages14
  var messages15 = {
    "settings.enable": "\u5728\u6240\u6709\u7F51\u7AD9\u542F\u7528",
    "settings.enableCurrentSite": "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528",
    "settings.enableCustomRulesForTheCurrentSite":
      "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528\u81EA\u5B9A\u4E49\u89C4\u5219",
    "settings.customRulesPlaceholder":
      "/* \u5185\u90E8\u94FE\u63A5\u7684\u81EA\u5B9A\u4E49\u89C4\u5219\uFF0C\u5339\u914D\u7684\u94FE\u63A5\u4F1A\u5728\u65B0\u7A97\u53E3\u6253\u5F00 */",
    "settings.customRulesTipTitle": "\u793A\u4F8B",
    "settings.customRulesTipContent":
      "<p>\u5185\u90E8\u94FE\u63A5\u7684\u81EA\u5B9A\u4E49\u89C4\u5219\uFF0C\u5339\u914D\u7684\u94FE\u63A5\u4F1A\u5728\u65B0\u7A97\u53E3\u6253\u5F00</p>\n  <p>\n  - \u6BCF\u884C\u4E00\u6761\u89C4\u5219<br>\n  - \u6240\u6709\u5305\u542B '/posts' \u6216 '/users/' \u7684\u94FE\u63A5<br>\n  <pre>/posts/\n/users/</pre>\n\n  - \u652F\u6301\u6B63\u5219\u8868\u8FBE\u5F0F<br>\n  <pre>^/(posts|members)/d+</pre>\n\n  - '*' \u4EE3\u8868\u5339\u914D\u6240\u6709\u94FE\u63A5<br>\n  - \u6392\u9664\u89C4\u5219\uFF1A\u4EE5 '!' \u5F00\u5934\uFF0C\u5339\u914D\u5219\u6392\u9664\uFF08\u4E0D\u5728\u65B0\u7A97\u53E3\u6253\u5F00\uFF09<br>\n  <pre>!/posts/\n!^/users/\\d+\n!*</pre>\n  </p>",
    "settings.enableLinkToImgForCurrentSite":
      "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528\u5C06\u56FE\u7247\u94FE\u63A5\u81EA\u52A8\u8F6C\u6362\u4E3A\u56FE\u7247\u6807\u7B7E",
    "settings.enableTextToLinksForCurrentSite":
      "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528\u5C06\u6587\u672C\u94FE\u63A5\u81EA\u52A8\u8F6C\u6362\u4E3A\u8D85\u94FE\u63A5",
    "settings.enableTreatSubdomainsAsSameSiteForCurrentSite":
      "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528\u5C06\u4E8C\u7EA7\u57DF\u540D\u89C6\u4E3A\u540C\u4E00\u7F51\u7AD9",
    "settings.enableOpenNewTabInBackgroundForCurrentSite":
      "\u5728\u5F53\u524D\u7F51\u7AD9\u542F\u7528\u5728\u540E\u53F0\u6253\u5F00\u65B0\u6807\u7B7E\u9875",
    "settings.eraseLinks":
      "\u53BB\u9664\u6307\u5B9A\u533A\u57DF\u7684\u94FE\u63A5",
    "settings.restoreLinks": "\u6062\u590D\u53BB\u9664\u7684\u94FE\u63A5",
    "settings.title": "UTags Advanced Filter",
    "settings.information":
      "\u66F4\u6539\u8BBE\u7F6E\u540E\uFF0C\u91CD\u65B0\u52A0\u8F7D\u9875\u9762\u5373\u53EF\u751F\u6548",
    "settings.report": "\u53CD\u9988\u95EE\u9898",
  }
  var zh_cn_default2 = messages15
  var availableLocales2 =
    /** @type {const} */
    ["en", "zh"]
  initAvailableLocales(availableLocales2)
  console.log("[utags-advanced-filter] prefferedLocale:", getPrefferedLocale())
  var localeMap2 = {
    zh: zh_cn_default2,
    "zh-cn": zh_cn_default2,
    en: en_default2,
  }
  var i2 = initI18n(localeMap2, getPrefferedLocale())
  function resetI18n2(locale2) {
    console.log(
      "[utags-advanced-filter] prefferedLocale:",
      getPrefferedLocale(),
      "locale:",
      locale2
    )
    i2 = initI18n(localeMap2, locale2 || getPrefferedLocale())
  }
  function getAvailableLocales() {
    return availableLocales2
  }
  var base = location.origin
  var DEBUG = true
  var cn = (s) => s
  var withPerf = async (label, fn) => {
    if (!DEBUG) {
      return fn()
    }
    const t0 = performance.now()
    try {
      return await fn()
    } finally {
      const t1 = performance.now()
      console.log(
        "[UTAF] ".concat(label, ": ").concat((t1 - t0).toFixed(1), " ms")
      )
    }
  }
  var withPerfSync = (label, fn) => {
    if (!DEBUG) {
      return fn()
    }
    const t0 = performance.now()
    try {
      return fn()
    } finally {
      const t1 = performance.now()
      console.log(
        "[UTAF] ".concat(label, ": ").concat((t1 - t0).toFixed(1), " ms")
      )
    }
  }
  var withPerfV2 = DEBUG
    ? (label, fn) =>
        (...args) => {
          const t0 = performance.now()
          try {
            return fn(...args)
          } finally {
            const t1 = performance.now()
            console.log(
              "[UTAF] ".concat(label, ": ").concat((t1 - t0).toFixed(1), " ms")
            )
          }
        }
    : (_label, fn) => fn
  function monthsToDays(m) {
    if (m === 6) return 182
    if (m === 12) return 365
    if (m === 24) return 730
    return m * 30
  }
  function createDatePresetInput(opts) {
    let state = __spreadValues({}, opts.initial)
    const root = document.createElement("div")
    root.className = cn("flex items-center text-sm")
    const chk = document.createElement("input")
    chk.type = "checkbox"
    chk.className = "utaf-checkbox utaf-toggle"
    chk.checked = state.enabled
    const chkId = "utaf-datepreset-".concat(
      Math.random().toString(36).slice(2, 8)
    )
    chk.id = chkId
    const pre = document.createElement("label")
    pre.className = cn("utaf-label text-sm")
    pre.textContent = opts.preLabel
    const input = document.createElement("input")
    input.className = cn(
      "w-16 rounded-md border border-gray-300 px-1 py-0.5 text-xs"
    )
    const suf = document.createElement("span")
    suf.className = cn("text-sm")
    const dropdown = document.createElement("div")
    dropdown.className = cn(
      "rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow"
    )
    dropdown.style.position = "fixed"
    dropdown.style.zIndex = "2147483647"
    dropdown.style.display = "none"
    function setInputMode() {
      if (state.mode === "months") {
        input.type = "text"
        input.readOnly = true
        input.removeAttribute("min")
        input.removeAttribute("step")
        suf.textContent = opts.monthsSuffix
      } else {
        input.type = "number"
        input.readOnly = false
        input.min = "0"
        input.step = "1"
        suf.textContent = opts.daysSuffix
      }
      input.disabled = !state.enabled
      input.className = input.disabled
        ? cn(
            "w-16 cursor-not-allowed rounded-md border border-gray-300 px-1 py-0.5 text-xs opacity-50"
          )
        : cn("w-16 rounded-md border border-gray-300 px-1 py-0.5 text-xs")
    }
    function setInputDisplay() {
      if (state.mode === "months") {
        switch (state.months) {
          case 6: {
            input.value = "\u534A\u5E74"
            break
          }
          case 12: {
            input.value = "\u4E00\u5E74"
            break
          }
          case 24: {
            input.value = "\u4E24\u5E74"
            break
          }
          default: {
            input.value = String(monthsToDays(state.months))
          }
        }
      } else {
        input.value = String(state.days)
      }
    }
    function showDropdown() {
      const rect = input.getBoundingClientRect()
      dropdown.style.left = "".concat(rect.left, "px")
      dropdown.style.top = "".concat(rect.bottom + 4, "px")
      dropdown.style.display = "block"
    }
    function hideDropdown() {
      dropdown.style.display = "none"
    }
    const optsList = [
      { label: "\u534A\u5E74", months: 6 },
      { label: "\u4E00\u5E74", months: 12 },
      { label: "\u4E24\u5E74", months: 24 },
      { label: "\u81EA\u5B9A\u4E49", months: 0 },
    ]
    for (const o of optsList) {
      const item = document.createElement("div")
      item.className = cn(
        "cursor-pointer rounded-md px-2 py-1 hover:bg-gray-200"
      )
      item.textContent = o.label
      item.addEventListener("click", async () => {
        if (o.months > 0) {
          state.mode = "months"
          state.months = o.months
        } else {
          state.mode = "days"
        }
        setInputMode()
        setInputDisplay()
        await opts.onSave(
          __spreadProps(__spreadValues({}, state), {
            days: state.mode === "months" ? state.days : state.days,
          })
        )
        if (state.mode === "days") {
          input.focus()
          input.select()
        }
        showDropdown()
        opts.onChange(__spreadValues({}, state))
      })
      dropdown.append(item)
    }
    input.addEventListener("focus", showDropdown)
    input.addEventListener("click", showDropdown)
    input.addEventListener("input", showDropdown)
    document.addEventListener("click", (e) => {
      var _a
      const path = ((_a = e.composedPath) == null ? void 0 : _a.call(e)) || []
      const insideInput = path.includes(input)
      const insideDropdown = path.includes(dropdown)
      if (!insideInput && !insideDropdown) hideDropdown()
    })
    opts.shadow.addEventListener("click", (e) => {
      var _a
      const path = ((_a = e.composedPath) == null ? void 0 : _a.call(e)) || []
      const insideInput = path.includes(input)
      const insideDropdown = path.includes(dropdown)
      if (!insideInput && !insideDropdown) hideDropdown()
    })
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideDropdown()
    })
    input.addEventListener("change", async () => {
      if (state.mode === "days") {
        let v = Number(input.value)
        if (!Number.isFinite(v) || v < 0) v = 90
        state.days = v
        await opts.onSave(__spreadValues({}, state))
        opts.onChange(__spreadValues({}, state))
      }
    })
    chk.addEventListener("change", async () => {
      state.enabled = chk.checked
      setInputMode()
      await opts.onSave(__spreadValues({}, state))
      opts.onChange(__spreadValues({}, state))
    })
    function setState(next) {
      state = __spreadValues(__spreadValues({}, state), next)
      chk.checked = state.enabled
      setInputMode()
      setInputDisplay()
      void opts.onSave(__spreadValues({}, state))
      opts.onChange(__spreadValues({}, state))
    }
    function setEnabledSilently(enabled) {
      state.enabled = enabled
      chk.checked = enabled
      setInputMode()
    }
    setInputMode()
    setInputDisplay()
    root.append(chk)
    root.append(pre)
    root.append(input)
    root.append(suf)
    opts.shadow.append(dropdown)
    return {
      root,
      setState,
      setEnabledSilently,
      getState: () => __spreadValues({}, state),
    }
  }
  function normalizeText(value) {
    return String(value != null ? value : "").trim()
  }
  function setDefaultNumber(input, defaultValue) {
    input.value = String(defaultValue)
  }
  function parseNumberOrDefault(raw, defaultValue) {
    const n = Number(raw)
    return Number.isFinite(n) ? n : defaultValue
  }
  function getNumberInputOrDefault(input, defaultValue) {
    return parseNumberOrDefault(input.value, defaultValue)
  }
  function buildAuthorForm(defaultScore) {
    const idLabel = document.createElement("div")
    idLabel.className = cn("utaf-label text-xs")
    idLabel.textContent = "\u4F5C\u8005ID"
    const idInput = document.createElement("input")
    idInput.type = "text"
    idInput.placeholder = "\u4F5C\u8005ID"
    idInput.className = cn(
      "h-6 w-full rounded-md border border-gray-300 px-2 text-xs"
    )
    const nameLabel = document.createElement("div")
    nameLabel.className = cn("utaf-label text-xs")
    nameLabel.textContent = "\u4F5C\u8005\u540D"
    const nameInput = document.createElement("input")
    nameInput.type = "text"
    nameInput.placeholder = "\u4F5C\u8005\u540D"
    nameInput.className = cn(
      "h-6 w-full rounded-md border border-gray-300 px-2 text-xs"
    )
    const scoreLabel = document.createElement("div")
    scoreLabel.className = cn("utaf-label text-xs")
    scoreLabel.textContent = "\u5206\u6570"
    const scoreInput = document.createElement("input")
    scoreInput.type = "number"
    scoreInput.min = "0"
    scoreInput.step = "1"
    scoreInput.placeholder = "\u5206\u6570"
    scoreInput.className = cn(
      "h-6 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-2 text-right text-xs"
    )
    setDefaultNumber(scoreInput, defaultScore)
    return {
      idInput,
      nameInput,
      scoreInput,
      focusables: [idInput, nameInput, scoreInput],
      initialFocus: idInput,
      appendTo(container) {
        container.append(idLabel)
        container.append(idInput)
        container.append(nameLabel)
        container.append(nameInput)
        container.append(scoreLabel)
        container.append(scoreInput)
      },
      getValues() {
        const id = normalizeText(idInput.value)
        const name = normalizeText(nameInput.value)
        const score = getNumberInputOrDefault(scoreInput, defaultScore)
        return { id, name, score }
      },
    }
  }
  function buildKeywordForm(defaultScore) {
    const kwLabel = document.createElement("div")
    kwLabel.className = cn("utaf-label text-xs")
    kwLabel.textContent = "\u5173\u952E\u5B57"
    const kwInput = document.createElement("input")
    kwInput.type = "text"
    kwInput.placeholder = "\u5173\u952E\u5B57"
    kwInput.className = cn(
      "h-6 w-full rounded-md border border-gray-300 px-2 text-xs"
    )
    const kwHint = document.createElement("div")
    kwHint.className = cn("text-xs text-gray-500")
    kwHint.textContent =
      "\u652F\u6301\u6B63\u5219\u8868\u8FBE\u5F0F\uFF08\u683C\u5F0F\uFF1A/pattern/flags\uFF09"
    const scLabel = document.createElement("div")
    scLabel.className = cn("utaf-label text-xs")
    scLabel.textContent = "\u5206\u6570"
    const scInput = document.createElement("input")
    scInput.type = "number"
    scInput.min = "0"
    scInput.step = "1"
    scInput.placeholder = "\u5206\u6570"
    scInput.className = cn(
      "h-6 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-2 text-right text-xs"
    )
    setDefaultNumber(scInput, defaultScore)
    return {
      kwInput,
      scoreInput: scInput,
      focusables: [kwInput, scInput],
      initialFocus: kwInput,
      appendTo(container) {
        container.append(kwLabel)
        container.append(kwInput)
        container.append(kwHint)
        container.append(scLabel)
        container.append(scInput)
      },
      getValues() {
        const kw = normalizeText(kwInput.value)
        const score = getNumberInputOrDefault(scInput, defaultScore)
        return { kw, score }
      },
    }
  }
  function openPanelModal(opts) {
    var _a
    const overlay = document.createElement("div")
    overlay.className = cn(
      "fixed z-50 flex items-center justify-center bg-black/30"
    )
    overlay.tabIndex = -1
    const modal = document.createElement("div")
    modal.className = cn(
      "w-[20rem] space-y-2 rounded-md bg-white p-3 shadow-xl"
    )
    modal.setAttribute("role", "dialog")
    modal.setAttribute("aria-modal", "true")
    const titleEl = document.createElement("div")
    titleEl.className = cn("text-sm font-semibold text-gray-900")
    titleEl.textContent = opts.title
    const content = document.createElement("div")
    content.className = cn("space-y-2")
    const actions = document.createElement("div")
    actions.className = cn("flex justify-end gap-2 pt-1")
    const btnCancel = document.createElement("button")
    btnCancel.className = cn(
      "rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
    )
    btnCancel.textContent = "\u53D6\u6D88"
    const btnOk = document.createElement("button")
    btnOk.className = cn(
      "rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
    )
    btnOk.textContent = "\u786E\u8BA4"
    actions.append(btnCancel)
    actions.append(btnOk)
    modal.append(titleEl)
    modal.append(content)
    modal.append(actions)
    overlay.append(modal)
    const rect = opts.panel.getBoundingClientRect()
    overlay.style.left = "".concat(rect.left, "px")
    overlay.style.top = "".concat(rect.top, "px")
    overlay.style.width = "".concat(rect.width, "px")
    overlay.style.height = "".concat(rect.height, "px")
    opts.shadow.append(overlay)
    const close = () => {
      try {
        cleanup()
      } catch (e) {}
      overlay.remove()
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close()
    })
    btnCancel.addEventListener("click", close)
    const result = opts.build({ modal, content, btnCancel, btnOk, close })
    const focusables = result.focusables
    const first = focusables[0] || null
    const last = focusables.at(-1) || null
    const initial = (_a = result.initialFocus) != null ? _a : first
    if (initial) {
      initial.focus()
    }
    const onConfirm = async () => {
      const r = result.onConfirm()
      if (r && typeof r.then === "function") {
        await r
      }
      close()
    }
    btnOk.addEventListener("click", onConfirm)
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        e.preventDefault()
        close()
        return
      }
      if (e.key === "Tab" && focusables.length > 0) {
        const active = opts.shadow.activeElement || document.activeElement
        if (!active) return
        const idx = focusables.indexOf(active)
        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault()
            if (last) {
              last.focus()
            }
          }
        } else if (idx === focusables.length - 1) {
          e.preventDefault()
          if (first) {
            first.focus()
          }
        }
      }
      if (e.key === "Enter") {
        const target = e.target
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "SELECT" ||
            target.tagName === "TEXTAREA")
        ) {
          e.preventDefault()
          void onConfirm()
        }
      }
    }
    const docKeydown = (e) => {
      handleKeydown(e)
    }
    overlay.addEventListener("keydown", handleKeydown, true)
    opts.shadow.addEventListener("keydown", handleKeydown, true)
    document.addEventListener("keydown", docKeydown, true)
    const cleanup = () => {
      overlay.removeEventListener("keydown", handleKeydown, true)
      opts.shadow.removeEventListener("keydown", handleKeydown, true)
      document.removeEventListener("keydown", docKeydown, true)
    }
    return { close }
  }
  var host = location.host
  if (false) {
    const runtime =
      (_c = (_a = globalThis.chrome) == null ? void 0 : _a.runtime) != null
        ? _c
        : (_b = globalThis.browser) == null
          ? void 0
          : _b.runtime
    ;(_d = runtime == null ? void 0 : runtime.onMessage) == null
      ? void 0
      : _d.addListener((message) => {
          if (
            (message == null ? void 0 : message.type) ===
            "utags-advanced-filter:show-settings"
          ) {
            void showSettings2()
          }
        })
  }
  var config = {
    run_at: "document_end",
    all_frames: false,
  }
  var getSettingsTable = () => {
    const groupNumber = 1
    return {
      enable: {
        title: i2("settings.enable"),
        defaultValue: true,
      },
      ["enableCurrentSite_".concat(host)]: {
        title: i2("settings.enableCurrentSite"),
        defaultValue: true,
      },
    }
  }
  var CONFIG = {
    FILTERS_KEY: (() => {
      const host2 = location.hostname.replace(/^www\./, "")
      return "utaf_".concat(host2, "_filters")
    })(),
    GLOBAL_KEY: "utaf_global_state",
  }
  var DEFAULTS = /* @__PURE__ */ (() => {
    const base2 = {
      updatedMode: "months",
      updatedDays: 90,
      updatedMonths: 24,
      createdOlderMode: "days",
      createdOlderDays: 90,
      createdOlderMonths: 0,
      createdRecentMode: "days",
      createdRecentDays: 90,
      createdRecentMonths: 0,
      totalInstallsLimit: 100,
      dailyInstallsLimit: 10,
      blockedAuthors: [],
      keywordsEnabled: true,
      scoreThreshold: 15,
      keywordsScope: "both",
      keywordsCaseSensitive: false,
      keywords: [],
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
    return base2
  })()
  async function loadFilterSettings() {
    try {
      const saved = await getValue(CONFIG.FILTERS_KEY)
      return saved || {}
    } catch (e) {
      return {}
    }
  }
  async function saveFilterSettings(settings2) {
    try {
      const prev = await loadFilterSettings()
      await setValue(CONFIG.FILTERS_KEY, Object.assign({}, prev, settings2))
    } catch (e) {}
  }
  async function loadGlobalState() {
    try {
      const saved = await getValue(CONFIG.GLOBAL_KEY)
      return saved || {}
    } catch (e) {
      return {}
    }
  }
  async function saveGlobalState(settings2) {
    try {
      const prev = await loadGlobalState()
      await setValue(CONFIG.GLOBAL_KEY, Object.assign({}, prev, settings2))
    } catch (e) {}
  }
  function isGreasyForkSearchPage() {
    const host2 = location.hostname.replace(/^www\./, "")
    if (host2 !== "greasyfork.org" && host2 !== "sleazyfork.org") return false
    const path = location.pathname || ""
    return path.endsWith("/scripts") || path.includes("/scripts/by-site/")
  }
  function addGreasyForkFilterStyles() {
    addStyle("\n      .fsfts-hidden { display: none !important; }\n    ")
  }
  function parseTimeElementToTs(el) {
    if (!el) return null
    const dt = el.getAttribute("datetime") || el.getAttribute("title")
    if (dt) {
      const t = Date.parse(dt)
      if (!Number.isNaN(t)) return t
    }
    const txt = (el.textContent || "").trim()
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
        "dd.script-list-updated-date relative-time, dd.script-list-updated-date time, dd.script-list-updated-date [datetime]"
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
        "dd.script-list-created-date relative-time, dd.script-list-created-date time, dd.script-list-created-date [datetime]"
      ) || null
    if (el) return parseTimeElementToTs(el)
    const times = Array.from(item.querySelectorAll("time, relative-time"))
    if (times.length === 0) return null
    const ts = times
      .map((el2) => parseTimeElementToTs(el2))
      .filter((v) => v !== null)
    if (ts.length === 0) return null
    return Math.min.apply(null, ts)
  }
  function parseIntSafe(text) {
    const n = Number.parseInt(String(text).replaceAll(/\D/g, ""), 10)
    return Number.isFinite(n) ? n : null
  }
  function getTotalInstallsInItem(item) {
    const dsAttr =
      item.dataset.scriptTotalInstalls ||
      (item.dataset ? item.dataset.scriptTotalInstalls : null)
    if (dsAttr !== null && dsAttr !== void 0) {
      const n = parseIntSafe(dsAttr)
      if (n !== null) return n
    }
    const el =
      item.querySelector(
        "dd.script-list-total-installs, dd.script-list-installs-total"
      ) || null
    if (el) {
      const n2 = parseIntSafe(el.textContent || "")
      if (n2 !== null) return n2
    }
    return null
  }
  function getAuthorIdsInItem(item) {
    var _a
    const ids = []
    const raw =
      ((_a = item.dataset) == null ? void 0 : _a.scriptAuthors) || null
    if (raw) {
      let text = String(raw)
      if (text.includes("&quot;")) {
        text = text.replaceAll("&quot;", '"')
      }
      try {
        const obj = JSON.parse(text)
        for (const k of Object.keys(obj)) {
          ids.push(String(k))
        }
      } catch (e) {}
    }
    if (ids.length === 0) {
      const a = item.querySelector('dd.script-list-author a[href*="/users/"]')
      if (a) {
        const href = String(a.href || "")
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
    if (dsAttr !== null && dsAttr !== void 0) {
      const n = parseIntSafe(dsAttr)
      if (n !== null) return n
    }
    const el =
      item.querySelector(
        "dd.script-list-daily-installs, dd.script-list-installs-daily"
      ) || null
    if (el) {
      const n2 = parseIntSafe(el.textContent || "")
      if (n2 !== null) return n2
    }
    return null
  }
  function getTitleTextInItem(item) {
    const a =
      item.querySelector("a.script-link") ||
      item.querySelector('a[href^="/scripts/"]')
    const t = ((a == null ? void 0 : a.textContent) || "").trim()
    return t || void 0
  }
  function getDescriptionTextInItem(item) {
    const el =
      item.querySelector("dd.script-list-description") ||
      item.querySelector(".script-description")
    const t = ((el == null ? void 0 : el.textContent) || "").trim()
    return t || void 0
  }
  function collectScriptItems() {
    const candidates = Array.from(
      document.querySelectorAll("li[data-script-id]")
    )
    return candidates.filter((el) => {
      const hasDetailLink =
        Boolean(el.querySelector("a.script-link")) ||
        Boolean(el.querySelector('a[href^="/scripts/"]'))
      const hasUpdated =
        Object.hasOwn(el.dataset, "scriptUpdatedDate") ||
        Boolean(
          el.querySelector(
            "dd.script-list-updated-date relative-time, dd.script-list-updated-date time, dd.script-list-updated-date [datetime]"
          )
        )
      return hasDetailLink && hasUpdated
    })
  }
  var itemMetricsCache = /* @__PURE__ */ new WeakMap()
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
    authorScores,
    scoreThreshold,
    keywordsScope,
    keywordsList,
    keywordsCaseSensitive,
    swapShownHidden,
    weights
  ) {
    const items = collectScriptItems()
    if (items.length === 0) return { visible: 0, hidden: 0, total: 0 }
    const now = Date.now()
    const ud = updatedDays > 0 ? updatedDays * 24 * 60 * 60 * 1e3 : 0
    const od = createdOlderDays > 0 ? createdOlderDays * 24 * 60 * 60 * 1e3 : 0
    const rd =
      createdRecentDays > 0 ? createdRecentDays * 24 * 60 * 60 * 1e3 : 0
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
            sum += Number(sc)
          }
        }
      }
      if (keywordsList && keywordsList.length > 0) {
        const title = String(metrics.titleText || "")
        const desc = String(metrics.descriptionText || "")
        const src =
          keywordsScope === "title"
            ? title
            : keywordsScope === "description"
              ? desc
              : "".concat(title, "\n").concat(desc)
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
        item.classList.add("fsfts-hidden")
        hidden += 1
      } else {
        item.classList.remove("fsfts-hidden")
        visible += 1
      }
    }
    return { visible, hidden, total: items.length }
  }
  function createDivider() {
    const divider = document.createElement("div")
    divider.className = cn("my-5 h-[0.5px] bg-gray-200 opacity-70")
    return divider
  }
  async function injectGreasyForkFilters() {
    var _a,
      _b,
      _c,
      _d,
      _e,
      _f,
      _g,
      _h,
      _i,
      _j,
      _k,
      _l,
      _m,
      _n,
      _o,
      _p,
      _q,
      _r,
      _s
    if (!isGreasyForkSearchPage()) return
    addGreasyForkFilterStyles()
    const saved = await loadFilterSettings()
    let currentMonths = Number(
      (_a = saved.updatedThresholdMonths) != null ? _a : DEFAULTS.updatedMonths
    )
    let currentDays = Number(
      (_b = saved.updatedThresholdDays) != null ? _b : DEFAULTS.updatedDays
    )
    let currentMode =
      (_c = saved.updatedThresholdMode) != null ? _c : DEFAULTS.updatedMode
    let createdOlderDays = Number(
      (_d = saved.createdOlderThresholdDays) != null
        ? _d
        : DEFAULTS.createdOlderDays
    )
    let createdOlderMode =
      (_e = saved.createdOlderThresholdMode) != null
        ? _e
        : DEFAULTS.createdOlderMode
    let createdOlderMonths = Number(
      (_f = saved.createdOlderThresholdMonths) != null
        ? _f
        : DEFAULTS.createdOlderMonths
    )
    let createdRecentDays = Number(
      (_g = saved.createdRecentThresholdDays) != null
        ? _g
        : DEFAULTS.createdRecentDays
    )
    let createdRecentMode =
      (_h = saved.createdRecentThresholdMode) != null
        ? _h
        : DEFAULTS.createdRecentMode
    let createdRecentMonths = Number(
      (_i = saved.createdRecentThresholdMonths) != null
        ? _i
        : DEFAULTS.createdRecentMonths
    )
    let updatedEnabled = Boolean(saved.updatedEnabled)
    let createdOlderEnabled = Boolean(saved.createdOlderEnabled)
    let createdRecentEnabled = Boolean(saved.createdRecentEnabled)
    let totalInstallsEnabled = Boolean(saved.totalInstallsEnabled)
    let dailyInstallsEnabled = Boolean(saved.dailyInstallsEnabled)
    let blockedAuthors = (
      Array.isArray(saved.blockedAuthors)
        ? saved.blockedAuthors
        : DEFAULTS.blockedAuthors
    ).map((x) => {
      var _a2
      return {
        id: String(x.id),
        name: String((_a2 = x.name) != null ? _a2 : x.id),
        enabled: Boolean(x.enabled),
        score: Number(x.score),
      }
    })
    let keywordsEnabled =
      saved.keywordsEnabled === void 0
        ? DEFAULTS.keywordsEnabled
        : Boolean(saved.keywordsEnabled)
    let scoreThreshold = Number(
      (_j = saved.scoreThreshold) != null ? _j : DEFAULTS.scoreThreshold
    )
    let keywordsScope =
      (_k = saved.keywordsScope) != null ? _k : DEFAULTS.keywordsScope
    let keywordsCaseSensitive = Boolean(
      (_l = saved.keywordsCaseSensitive) != null
        ? _l
        : DEFAULTS.keywordsCaseSensitive
    )
    let keywords = (
      Array.isArray(saved.keywords) ? saved.keywords : DEFAULTS.keywords
    ).map((k) => ({
      keyword: String(k.keyword),
      score: Number(k.score),
      enabled: Boolean(k.enabled),
    }))
    let swapShownHidden = Boolean(saved.swapShownHidden)
    let quickEnabled =
      saved.quickEnabled === void 0
        ? DEFAULTS.quickEnabled
        : Boolean(saved.quickEnabled)
    let authorsEnabled =
      saved.authorsEnabled === void 0
        ? DEFAULTS.authorsEnabled
        : Boolean(saved.authorsEnabled)
    let totalInstallsLimit = Number(
      (_m = saved.totalInstallsLimit) != null ? _m : DEFAULTS.totalInstallsLimit
    )
    let dailyInstallsLimit = Number(
      (_n = saved.dailyInstallsLimit) != null ? _n : DEFAULTS.dailyInstallsLimit
    )
    let updatedScore = Number(
      (_o = saved.updatedScore) != null ? _o : DEFAULTS.updatedScore
    )
    let createdOlderScore = Number(
      (_p = saved.createdOlderScore) != null ? _p : DEFAULTS.createdOlderScore
    )
    let createdRecentScore = Number(
      (_q = saved.createdRecentScore) != null ? _q : DEFAULTS.createdRecentScore
    )
    let totalInstallsScore = Number(
      (_r = saved.totalInstallsScore) != null ? _r : DEFAULTS.totalInstallsScore
    )
    let dailyInstallsScore = Number(
      (_s = saved.dailyInstallsScore) != null ? _s : DEFAULTS.dailyInstallsScore
    )
    const globalState = await loadGlobalState()
    const isFirstUse =
      globalState.isFirstUse === void 0 ? true : Boolean(globalState.isFirstUse)
    const defaultUICollapsed = !isFirstUse
    let uiCollapsed =
      saved.uiCollapsed === void 0
        ? defaultUICollapsed
        : Boolean(saved.uiCollapsed)
    if (isFirstUse) {
      await saveGlobalState({ isFirstUse: false })
    }
    const host2 = document.createElement("div")
    host2.id = "utaf-host"
    host2.style.cssText =
      "position:fixed;top:12px;right:12px;z-index:2147483647;"
    const shadow = host2.attachShadow({ mode: "open" })
    document.body.append(host2)
    const tw = document.createElement("style")
    tw.textContent = tailwind_default
    shadow.append(tw)
    const globalCss = document.createElement("style")
    globalCss.textContent = content_default
    shadow.append(globalCss)
    const panel = document.createElement("div")
    panel.className =
      "relative bg-white shadow-xl rounded-xl px-3 pb-3 pt-0 pr-5 w-80 overflow-y-auto font-sans text-sm"
    panel.style.maxHeight = "calc(100vh - 24px)"
    panel.style.setProperty("filter", "revert", "important")
    panel.style.setProperty("color-scheme", "light")
    const header = document.createElement("div")
    header.className =
      "sticky top-0 bg-white z-10 mb-2 space-y-4 transition-shadow -ml-3 -mr-5 pl-3 pr-5 py-2"
    const title = document.createElement("div")
    title.className = cn("text-sm font-semibold text-gray-900")
    title.textContent = "UTags Advanced Filter"
    const titleIcon = new DOMParser().parseFromString(
      icon_no_bg_default,
      "image/svg+xml"
    ).documentElement
    titleIcon.setAttribute("width", "16")
    titleIcon.setAttribute("height", "16")
    titleIcon.classList.add("inline-block", "mr-2")
    title.prepend(titleIcon)
    const headerRow1 = document.createElement("div")
    headerRow1.className = cn("flex items-center")
    headerRow1.append(title)
    const headerRow2 = document.createElement("div")
    headerRow2.className = cn("flex items-center gap-2")
    const masterChk = document.createElement("input")
    masterChk.type = "checkbox"
    masterChk.className = "utaf-checkbox hidden"
    masterChk.id = "utaf-master"
    masterChk.setAttribute("title", "\u53CD\u9009")
    masterChk.setAttribute("aria-label", "\u53CD\u9009")
    const stats = document.createElement("div")
    stats.className = cn("text-xs text-gray-500")
    headerRow2.append(stats)
    const chkSwap = document.createElement("input")
    chkSwap.type = "checkbox"
    chkSwap.className = "utaf-checkbox utaf-toggle"
    chkSwap.id = "utaf-swap"
    chkSwap.checked = swapShownHidden
    chkSwap.setAttribute("title", "\u53CD\u5411\u663E\u793A")
    chkSwap.setAttribute("aria-label", "\u53CD\u5411\u663E\u793A")
    const lblSwap = document.createElement("label")
    lblSwap.className = cn("utaf-label text-xs")
    lblSwap.htmlFor = "utaf-swap"
    lblSwap.textContent = "\u53CD\u5411\u663E\u793A"
    const swapRight = document.createElement("div")
    swapRight.className = cn("ml-auto flex items-center gap-2")
    swapRight.append(lblSwap)
    swapRight.append(chkSwap)
    headerRow2.append(swapRight)
    const headerRight = document.createElement("div")
    headerRight.className = cn("ml-auto flex items-center gap-2")
    const btnCollapse = document.createElement("button")
    btnCollapse.className = cn(
      "rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
    )
    btnCollapse.setAttribute("title", "\u6298\u53E0")
    btnCollapse.setAttribute("aria-label", "\u6298\u53E0")
    const iconCollapse = createElement2(ChevronUp, {
      width: 16,
      height: 16,
      "stroke-width": 2,
    })
    btnCollapse.append(iconCollapse)
    const btnReset = document.createElement("button")
    btnReset.className = cn(
      "utaf-reset-btn rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
    )
    btnReset.setAttribute("title", "\u91CD\u7F6E")
    btnReset.setAttribute("aria-label", "\u91CD\u7F6E")
    const iconReset = createElement2(RotateCcw, {
      width: 16,
      height: 16,
      "stroke-width": 2,
    })
    btnReset.append(iconReset)
    const resetSlot = document.createElement("div")
    resetSlot.className = "utaf-reset-slot"
    resetSlot.append(btnReset)
    headerRight.append(resetSlot)
    headerRight.append(btnCollapse)
    headerRow1.append(headerRight)
    header.append(headerRow1)
    header.append(headerRow2)
    panel.append(header)
    const content = document.createElement("div")
    content.className = cn("space-y-2")
    const thresholdRow = document.createElement("div")
    thresholdRow.className = cn("flex items-center gap-2 text-xs")
    const lblGlobalThreshold = document.createElement("span")
    lblGlobalThreshold.className = cn("utaf-label text-xs")
    lblGlobalThreshold.textContent = "\u5F53\u5206\u6570 >="
    const inputScoreThreshold = document.createElement("input")
    inputScoreThreshold.type = "number"
    inputScoreThreshold.min = "0"
    inputScoreThreshold.step = "1"
    inputScoreThreshold.value = String(scoreThreshold)
    inputScoreThreshold.className = cn(
      "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
    )
    const lblThresholdAction = document.createElement("span")
    lblThresholdAction.className = cn(
      "utaf-label utaf-threshold-action text-xs"
    )
    lblThresholdAction.textContent = swapShownHidden
      ? "\u65F6\u663E\u793A"
      : "\u65F6\u9690\u85CF"
    thresholdRow.append(lblGlobalThreshold)
    thresholdRow.append(inputScoreThreshold)
    thresholdRow.append(lblThresholdAction)
    inputScoreThreshold.addEventListener("change", async () => {
      let v = Number(inputScoreThreshold.value)
      if (!Number.isFinite(v) || v < 0) v = 15
      scoreThreshold = v
      await saveFilterSettings({ scoreThreshold })
      applyAndUpdateStatus()
    })
    panel.append(content)
    content.append(thresholdRow)
    panel.addEventListener("scroll", () => {
      const scrolled = panel.scrollTop > 0
      if (scrolled) {
        header.classList.add("shadow-md", "border-b", "border-gray-200")
        header.classList.remove("shadow-sm")
      } else {
        header.classList.remove("shadow-md", "border-b", "border-gray-200")
      }
    })
    if (panel.scrollTop > 0) {
      header.classList.add("shadow-md", "border-b", "border-gray-200")
    }
    const fab = document.createElement("button")
    fab.className = "utaf-fab"
    fab.setAttribute("title", "\u6253\u5F00\u7B5B\u9009")
    fab.setAttribute("aria-label", "\u6253\u5F00\u7B5B\u9009")
    const iconFab = new DOMParser().parseFromString(
      icon_no_bg_default,
      "image/svg+xml"
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
    fab.addEventListener("click", async () => setCollapsed(false))
    btnCollapse.addEventListener("click", async () => setCollapsed(true))
    let resetHoverTimer
    resetSlot.addEventListener("mouseenter", () => {
      resetHoverTimer = globalThis.setTimeout(() => {
        btnReset.classList.add("utaf-reset-btn--visible")
      }, 3e3)
    })
    resetSlot.addEventListener("mouseleave", () => {
      if (resetHoverTimer) globalThis.clearTimeout(resetHoverTimer)
      resetHoverTimer = void 0
      btnReset.classList.remove("utaf-reset-btn--visible")
    })
    function monthsToDays2(m) {
      if (m === 6) return 182
      if (m === 12) return 365
      if (m === 24) return 730
      return m * 30
    }
    function applyAndUpdateStatusOrg() {
      const updatedDays =
        quickEnabled && updatedEnabled
          ? currentMode === "days"
            ? currentDays
            : currentMonths > 0
              ? monthsToDays2(currentMonths)
              : 0
          : 0
      const olderDays =
        quickEnabled && createdOlderEnabled
          ? createdOlderMode === "days"
            ? createdOlderDays
            : createdOlderMonths > 0
              ? monthsToDays2(createdOlderMonths)
              : 0
          : 0
      const recentDays =
        quickEnabled && createdRecentEnabled
          ? createdRecentMode === "days"
            ? createdRecentDays
            : createdRecentMonths > 0
              ? monthsToDays2(createdRecentMonths)
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
            Number.isFinite(Number(x.score))
              ? Number(x.score)
              : DEFAULTS.authorsDefaultScore,
          ])
      )
      const threshold = Math.max(scoreThreshold, 0)
      const kwScope = keywordsScope
      const caseSensitive = keywordsCaseSensitive
      const enabledKeywords = keywordsEnabled
        ? (keywords || []).filter((x) => Boolean(x.enabled))
        : []
      const map = /* @__PURE__ */ new Map()
      for (const x of enabledKeywords) {
        const raw = String(x.keyword || "").trim()
        const score = Number.isFinite(Number(x.score))
          ? Number(x.score)
          : DEFAULTS.keywordsDefaultScore
        if (!raw) continue
        if (raw.startsWith("/") && raw.lastIndexOf("/") > 1) {
          const last = raw.lastIndexOf("/")
          const pattern = raw.slice(1, last)
          let flags = raw.slice(last + 1)
          try {
            const hasI = flags.includes("i")
            if (!hasI && !caseSensitive) flags += "i"
            const re = new RegExp(pattern, flags)
            const key = "/".concat(pattern, "/").concat(flags)
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
          } catch (e) {}
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
      const counts = withPerfSync("applyCombinedFilters", () =>
        applyCombinedFilters(
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
      )
      stats.textContent = "\u663E\u793A "
        .concat(counts.visible, " | \u9690\u85CF ")
        .concat(counts.hidden)
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
    const applyAndUpdateStatus = withPerfV2(
      "applyAndUpdateStatus",
      applyAndUpdateStatusOrg
    )
    masterChk.addEventListener("change", async () => {
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
      try {
        const q = document.querySelector("#utaf-quick-enable")
        if (q) q.checked = next
        const a = document.querySelector("#utaf-authors-enable")
        if (a) a.checked = next
      } catch (e) {}
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
    chkSwap.addEventListener("change", async () => {
      swapShownHidden = chkSwap.checked
      if (lblThresholdAction !== void 0) {
        lblThresholdAction.textContent = swapShownHidden
          ? "\u65F6\u663E\u793A"
          : "\u65F6\u9690\u85CF"
      }
      await saveFilterSettings({ swapShownHidden })
      applyAndUpdateStatus()
    })
    const updatedComp = createDatePresetInput({
      shadow,
      preLabel: "\u66F4\u65B0\u65F6\u95F4 >",
      monthsSuffix: "",
      daysSuffix: "",
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
      preLabel: "\u521B\u5EFA\u65F6\u95F4 >",
      monthsSuffix: "",
      daysSuffix: "",
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
      preLabel: "\u521B\u5EFA\u65F6\u95F4 <",
      monthsSuffix: "",
      daysSuffix: "",
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
    const quickSection = document.createElement("div")
    quickSection.className = cn("space-y-2")
    const quickTitle = document.createElement("div")
    quickTitle.className = cn(
      "flex items-center justify-between text-sm font-semibold text-gray-900"
    )
    const quickTitleText = document.createElement("span")
    quickTitleText.textContent = "\u4FBF\u6377\u7B5B\u9009"
    const quickRight = document.createElement("div")
    quickRight.className = cn("flex items-center gap-2")
    const lblQuickEnable = document.createElement("label")
    lblQuickEnable.className = cn("utaf-label text-xs leading-5")
    lblQuickEnable.textContent = "\u542F\u7528"
    const chkQuick = document.createElement("input")
    chkQuick.type = "checkbox"
    chkQuick.className = "utaf-checkbox utaf-toggle"
    chkQuick.checked = quickEnabled
    chkQuick.id = "utaf-quick-enable"
    quickRight.append(lblQuickEnable)
    quickRight.append(chkQuick)
    quickTitle.append(quickTitleText)
    quickTitle.append(quickRight)
    quickSection.append(quickTitle)
    const quickTable = document.createElement("table")
    quickTable.className = cn("w-full table-fixed text-sm")
    const qthd = document.createElement("thead")
    const qthr = document.createElement("tr")
    const qth0 = document.createElement("th")
    qth0.className = cn(
      "utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    qth0.append(masterChk)
    const qth1 = document.createElement("th")
    qth1.className = cn(
      "utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm text-gray-700"
    )
    const lblMaster = document.createElement("label")
    lblMaster.textContent = "\u6761\u4EF6"
    qth1.append(lblMaster)
    const qth2 = document.createElement("th")
    qth2.className = cn(
      "utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    qth2.textContent = "\u5206\u6570"
    qthr.append(qth1)
    qthr.append(qth2)
    qthr.append(qth0)
    qthd.append(qthr)
    const qtb = document.createElement("tbody")
    quickTable.append(qthd)
    quickTable.append(qtb)
    quickSection.append(quickTable)
    panel.append(quickSection)
    panel.append(createDivider())
    let inputUpdatedScore
    let inputOlderScore
    let inputRecentScore
    let updatedPresetChk
    let updatedPresetInput
    let olderPresetChk
    let olderPresetInput
    let recentPresetChk
    let recentPresetInput
    function appendQuickRow(chkEl, labelEl, inputEl, suffixEl, scoreInputEl) {
      const tr = document.createElement("tr")
      tr.className = cn("cursor-pointer hover:bg-gray-50")
      const td0 = document.createElement("td")
      td0.className = cn(
        "utaf-col-user min-w-0 border-b border-gray-100 px-2 py-1 pr-3 align-middle"
      )
      const td1 = document.createElement("td")
      td1.className = cn(
        "utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle"
      )
      const td2 = document.createElement("td")
      td2.className = cn(
        "utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle"
      )
      const wrap = document.createElement("div")
      wrap.className = cn("flex flex-wrap items-center gap-1")
      wrap.append(labelEl)
      wrap.append(inputEl)
      wrap.append(suffixEl)
      td0.append(wrap)
      td1.append(scoreInputEl)
      td2.append(chkEl)
      tr.append(td0)
      tr.append(td1)
      tr.append(td2)
      tr.addEventListener("click", (e) => {
        const target = e.target
        if (
          target.closest("input,button,select,textarea") ||
          target.closest("svg")
        )
          return
        const box = chkEl
        box.checked = !box.checked
        box.dispatchEvent(new Event("change"))
      })
      qtb.append(tr)
    }
    {
      const [c, p, iEl, s] = Array.from(updatedComp.root.children)
      updatedPresetChk = c
      updatedPresetInput = iEl
      inputUpdatedScore = document.createElement("input")
      inputUpdatedScore.type = "number"
      inputUpdatedScore.min = "0"
      inputUpdatedScore.step = "1"
      inputUpdatedScore.value = String(updatedScore)
      inputUpdatedScore.className = cn(
        "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
      )
      inputUpdatedScore.addEventListener("change", async () => {
        let v = Number(inputUpdatedScore.value)
        if (!Number.isFinite(v) || v < 0) v = DEFAULTS.updatedScore
        updatedScore = v
        await saveFilterSettings({ updatedScore })
        applyAndUpdateStatus()
      })
      appendQuickRow(c, p, iEl, s, inputUpdatedScore)
    }
    {
      const [c, p, iEl, s] = Array.from(olderComp.root.children)
      olderPresetChk = c
      olderPresetInput = iEl
      inputOlderScore = document.createElement("input")
      inputOlderScore.type = "number"
      inputOlderScore.min = "0"
      inputOlderScore.step = "1"
      inputOlderScore.value = String(createdOlderScore)
      inputOlderScore.className = cn(
        "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
      )
      inputOlderScore.addEventListener("change", async () => {
        let v = Number(inputOlderScore.value)
        if (!Number.isFinite(v) || v < 0) v = DEFAULTS.createdOlderScore
        createdOlderScore = v
        await saveFilterSettings({ createdOlderScore })
        applyAndUpdateStatus()
      })
      appendQuickRow(c, p, iEl, s, inputOlderScore)
    }
    {
      const [c, p, iEl, s] = Array.from(recentComp.root.children)
      recentPresetChk = c
      recentPresetInput = iEl
      inputRecentScore = document.createElement("input")
      inputRecentScore.type = "number"
      inputRecentScore.min = "0"
      inputRecentScore.step = "1"
      inputRecentScore.value = String(createdRecentScore)
      inputRecentScore.className = cn(
        "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
      )
      inputRecentScore.addEventListener("change", async () => {
        let v = Number(inputRecentScore.value)
        if (!Number.isFinite(v) || v < 0) v = DEFAULTS.createdRecentScore
        createdRecentScore = v
        await saveFilterSettings({ createdRecentScore })
        applyAndUpdateStatus()
      })
      appendQuickRow(c, p, iEl, s, inputRecentScore)
    }
    const chkTotal = document.createElement("input")
    chkTotal.type = "checkbox"
    chkTotal.className = "utaf-checkbox utaf-toggle"
    chkTotal.id = "utaf-total"
    chkTotal.checked = totalInstallsEnabled
    const lblTotalPre = document.createElement("label")
    lblTotalPre.textContent = "\u603B\u5B89\u88C5\u91CF <"
    const inputTotal = document.createElement("input")
    inputTotal.type = "number"
    inputTotal.min = "0"
    inputTotal.step = "1"
    inputTotal.value = String(totalInstallsLimit)
    inputTotal.className =
      "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs"
    const lblTotalSuf = document.createElement("span")
    lblTotalSuf.textContent = ""
    const inputTotalScore = document.createElement("input")
    inputTotalScore.type = "number"
    inputTotalScore.min = "0"
    inputTotalScore.step = "1"
    inputTotalScore.value = String(totalInstallsScore)
    inputTotalScore.className = cn(
      "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
    )
    inputTotalScore.addEventListener("change", async () => {
      let v = Number(inputTotalScore.value)
      if (!Number.isFinite(v) || v < 0) v = DEFAULTS.totalInstallsScore
      totalInstallsScore = v
      await saveFilterSettings({ totalInstallsScore })
      applyAndUpdateStatus()
    })
    chkTotal.addEventListener("change", async () => {
      totalInstallsEnabled = chkTotal.checked
      await saveFilterSettings({ totalInstallsEnabled })
      applyAndUpdateStatus()
    })
    inputTotal.addEventListener("change", async () => {
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
    const chkDaily = document.createElement("input")
    chkDaily.type = "checkbox"
    chkDaily.className = "utaf-checkbox utaf-toggle"
    chkDaily.id = "utaf-daily"
    chkDaily.checked = dailyInstallsEnabled
    const lblDailyPre = document.createElement("label")
    lblDailyPre.textContent = "\u65E5\u5B89\u88C5\u91CF <"
    const inputDaily = document.createElement("input")
    inputDaily.type = "number"
    inputDaily.min = "0"
    inputDaily.step = "1"
    inputDaily.value = String(dailyInstallsLimit)
    inputDaily.className =
      "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs"
    const lblDailySuf = document.createElement("span")
    lblDailySuf.textContent = ""
    const inputDailyScore = document.createElement("input")
    inputDailyScore.type = "number"
    inputDailyScore.min = "0"
    inputDailyScore.step = "1"
    inputDailyScore.value = String(dailyInstallsScore)
    inputDailyScore.className = cn(
      "h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
    )
    inputDailyScore.addEventListener("change", async () => {
      let v = Number(inputDailyScore.value)
      if (!Number.isFinite(v) || v < 0) v = DEFAULTS.dailyInstallsScore
      dailyInstallsScore = v
      await saveFilterSettings({ dailyInstallsScore })
      applyAndUpdateStatus()
    })
    chkDaily.addEventListener("change", async () => {
      dailyInstallsEnabled = chkDaily.checked
      await saveFilterSettings({ dailyInstallsEnabled })
      applyAndUpdateStatus()
    })
    inputDaily.addEventListener("change", async () => {
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
    const authorsSection = document.createElement("div")
    authorsSection.className = cn("space-y-2")
    const usersFilterTitle = document.createElement("div")
    usersFilterTitle.className = cn(
      "flex items-center justify-between text-sm font-semibold text-gray-900"
    )
    const usersLeft = document.createElement("div")
    usersLeft.className = cn("flex items-center gap-2")
    const usersTitleText = document.createElement("span")
    usersTitleText.textContent = "\u5305\u542B\u4F5C\u8005"
    usersLeft.append(usersTitleText)
    usersFilterTitle.append(usersLeft)
    authorsSection.append(usersFilterTitle)
    const authorsEnableRow = document.createElement("div")
    authorsEnableRow.className = cn("flex items-center gap-2")
    const lblAuthorsEnable = document.createElement("label")
    lblAuthorsEnable.className = cn("utaf-label text-xs leading-5")
    lblAuthorsEnable.textContent = "\u542F\u7528"
    const chkAuthorsEnable = document.createElement("input")
    chkAuthorsEnable.type = "checkbox"
    chkAuthorsEnable.className = "utaf-checkbox utaf-toggle"
    chkAuthorsEnable.checked = authorsEnabled
    chkAuthorsEnable.id = "utaf-authors-enable"
    authorsEnableRow.append(lblAuthorsEnable)
    authorsEnableRow.append(chkAuthorsEnable)
    const authorsActions = document.createElement("div")
    authorsActions.className = cn("flex items-center gap-2")
    const btnOpenPicker = document.createElement("button")
    btnOpenPicker.className =
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
    btnOpenPicker.textContent = "\u91C7\u96C6\u9875\u9762\u4F5C\u8005"
    authorsActions.append(btnOpenPicker)
    const authorsPicker = document.createElement("div")
    authorsPicker.className = cn("space-y-2")
    authorsPicker.style.display = "none"
    const authorsPickerControls = document.createElement("div")
    authorsPickerControls.className = cn("flex items-center gap-2")
    const chkSelectAll = document.createElement("input")
    chkSelectAll.type = "checkbox"
    chkSelectAll.className = "utaf-checkbox"
    chkSelectAll.id = "utaf-authors-selectall"
    const lblSelectAll = document.createElement("label")
    lblSelectAll.className = cn("utaf-label text-xs font-semibold")
    lblSelectAll.htmlFor = "utaf-authors-selectall"
    lblSelectAll.textContent = "\u5168\u9009/\u5168\u4E0D\u9009"
    const btnRefreshPicker = document.createElement("button")
    btnRefreshPicker.className =
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
    btnRefreshPicker.textContent = "\u5237\u65B0"
    const btnAddSelected = document.createElement("button")
    btnAddSelected.className =
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
    btnAddSelected.textContent = "\u6DFB\u52A0\u9009\u4E2D"
    const btnClosePicker = document.createElement("button")
    btnClosePicker.className =
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200"
    btnClosePicker.textContent = "\u5173\u95ED"
    authorsPickerControls.append(chkSelectAll)
    authorsPickerControls.append(lblSelectAll)
    authorsPickerControls.append(btnRefreshPicker)
    authorsPickerControls.append(btnAddSelected)
    authorsPickerControls.append(btnClosePicker)
    const authorsPickerList = document.createElement("div")
    authorsPickerList.className = cn("space-y-1")
    authorsPicker.append(authorsPickerControls)
    authorsPicker.append(authorsPickerList)
    const authorsMasterChk = document.createElement("input")
    authorsMasterChk.type = "checkbox"
    authorsMasterChk.className = "utaf-checkbox h-4 w-4 align-middle hidden"
    function updateAuthorsMasterChk() {
      const list = Array.isArray(blockedAuthors) ? blockedAuthors : []
      const total = list.length
      const enabledCount = list.reduce((n, a) => n + (a.enabled ? 1 : 0), 0)
      authorsMasterChk.indeterminate = enabledCount > 0 && enabledCount < total
      authorsMasterChk.checked = total > 0 && enabledCount === total
      authorsMasterChk.disabled = total === 0
    }
    authorsMasterChk.addEventListener("change", async () => {
      const next = authorsMasterChk.checked
      blockedAuthors = (blockedAuthors || []).map((a) =>
        __spreadProps(__spreadValues({}, a), {
          enabled: next,
        })
      )
      await saveFilterSettings({ blockedAuthors })
      renderAuthorsTable()
      applyAndUpdateStatus()
      updateAuthorsMasterChk()
    })
    const authorsTable = document.createElement("table")
    authorsTable.className = cn("w-full table-fixed")
    const thd = document.createElement("thead")
    const thr = document.createElement("tr")
    const th1 = document.createElement("th")
    th1.className = cn(
      "utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700"
    )
    th1.textContent = "\u7528\u6237"
    const th3 = document.createElement("th")
    th3.className = cn(
      "utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    th3.textContent = "\u5206\u6570"
    const th4 = document.createElement("th")
    th4.className = cn(
      "utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    th4.append(authorsMasterChk)
    thr.append(th1)
    thr.append(th3)
    thr.append(th4)
    thd.append(thr)
    const tb = document.createElement("tbody")
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
      tb.addEventListener("click", async (e) => {
        if (!authorsEnabled) return
        const t = e.target
        const del = t.closest(".utaf-au-delete")
        if (del) {
          const row2 = t.closest(".utaf-au-row")
          if (!row2) return
          const idx = Number(row2.dataset.auIndex || "-1")
          if (idx < 0) return
          blockedAuthors.splice(idx, 1)
          await saveFilterSettings({ blockedAuthors })
          renderAuthorsTable()
          applyAndUpdateStatus()
          updateAuthorsMasterChk()
          return
        }
        const labelId = t.closest(".utaf-au-id-label")
        if (labelId) {
          const row2 = labelId.closest(".utaf-au-row")
          const input = row2.querySelector(".utaf-au-id-input")
          labelId.style.display = "none"
          input.classList.remove("hidden")
          input.focus()
          input.select()
          return
        }
        const labelName = t.closest(".utaf-au-name-label")
        if (labelName) {
          const row2 = labelName.closest(".utaf-au-row")
          const input = row2.querySelector(".utaf-au-name-input")
          labelName.style.display = "none"
          input.classList.remove("hidden")
          input.focus()
          input.select()
          return
        }
        const row = t.closest(".utaf-au-row")
        if (
          row &&
          !authorsEditing &&
          !t.closest("input,button,select,textarea,svg")
        ) {
          const chk = row.querySelector(".utaf-au-toggle")
          chk.checked = !chk.checked
          chk.dispatchEvent(new Event("change"))
        }
      })
      tb.addEventListener("change", async (e) => {
        if (!authorsEnabled) return
        const t = e.target
        const row = t.closest(".utaf-au-row")
        if (!row) return
        const idx = Number(row.dataset.auIndex || "-1")
        if (idx < 0) return
        const a = blockedAuthors[idx]
        const input = t
        if (input.classList.contains("utaf-au-toggle")) {
          a.enabled = input.checked
          await saveFilterSettings({ blockedAuthors })
          applyAndUpdateStatus()
          updateAuthorsMasterChk()
          return
        }
        if (input.classList.contains("utaf-au-score")) {
          a.score = getNumberInputOrDefault(input, DEFAULTS.authorsDefaultScore)
          await saveFilterSettings({ blockedAuthors })
          applyAndUpdateStatus()
        }
      })
      tb.addEventListener(
        "blur",
        async (e) => {
          if (!authorsEnabled) return
          const t = e.target
          const idInput = t.closest(".utaf-au-id-input")
          const nameInput = t.closest(".utaf-au-name-input")
          if (idInput) {
            const row = idInput.closest(".utaf-au-row")
            const idx = Number(row.dataset.auIndex || "-1")
            if (idx < 0) return
            const v = normalizeText(idInput.value)
            if (v) {
              blockedAuthors[idx].id = v
              await saveFilterSettings({ blockedAuthors })
              applyAndUpdateStatus()
            } else {
              idInput.value = String(blockedAuthors[idx].id)
            }
            idInput.classList.add("hidden")
            const label = row.querySelector(".utaf-au-id-label")
            label.textContent = String(blockedAuthors[idx].id)
            label.title = String(blockedAuthors[idx].id)
            label.style.display = "block"
            return
          }
          if (nameInput) {
            const row = nameInput.closest(".utaf-au-row")
            const idx = Number(row.dataset.auIndex || "-1")
            if (idx < 0) return
            blockedAuthors[idx].name =
              normalizeText(nameInput.value) || blockedAuthors[idx].id
            await saveFilterSettings({ blockedAuthors })
            nameInput.classList.add("hidden")
            const label = row.querySelector(".utaf-au-name-label")
            label.textContent = String(blockedAuthors[idx].name)
            label.title = String(blockedAuthors[idx].name)
            label.style.display = "block"
          }
        },
        true
      )
      tb.addEventListener("keydown", (e) => {
        if (!authorsEnabled) return
        if (e.key === "Enter") {
          const t = e.target
          const input = t.closest(".utaf-au-id-input, .utaf-au-name-input")
          if (input) {
            e.preventDefault()
            input.blur()
          }
        }
      })
    }
    bindAuthorRowEvents()
    function collectPageAuthorsMap() {
      const map = /* @__PURE__ */ new Map()
      const items = collectScriptItems()
      for (const item of items) {
        const a = item.querySelector('dd.script-list-author a[href*="/users/"]')
        if (a) {
          const href = String(a.href || "")
          const m = /\/users\/(\d+)/.exec(href)
          if (m) {
            const id = m[1]
            const name = String((a.textContent || "").trim() || id)
            if (!map.has(id)) {
              map.set(id, name)
            }
          }
        }
      }
      return map
    }
    function populateAuthorsPicker() {
      authorsPickerList.textContent = ""
      const map = collectPageAuthorsMap()
      for (const [id, name] of map) {
        const row = document.createElement("div")
        row.className = cn("flex items-center gap-2")
        const chk = document.createElement("input")
        chk.type = "checkbox"
        chk.className = "utaf-checkbox"
        chk.dataset.id = id
        chk.dataset.name = name
        const exists = (blockedAuthors || []).some((x) => String(x.id) === id)
        if (exists) {
          chk.disabled = true
        }
        const lbl = document.createElement("span")
        lbl.className = cn("utaf-label text-sm text-gray-800")
        lbl.textContent = "".concat(name, " (").concat(id, ")")
        row.append(chk)
        row.append(lbl)
        row.addEventListener("click", (e) => {
          const target = e.target
          if (target && target.tagName.toLowerCase() === "input") return
          if (!chk.disabled) chk.checked = !chk.checked
        })
        authorsPickerList.append(row)
      }
    }
    btnOpenPicker.addEventListener("click", () => {
      chkSelectAll.checked = false
      populateAuthorsPicker()
      authorsPicker.style.display = "block"
    })
    btnRefreshPicker.addEventListener("click", () => {
      populateAuthorsPicker()
    })
    btnClosePicker.addEventListener("click", () => {
      authorsPicker.style.display = "none"
    })
    chkSelectAll.addEventListener("change", () => {
      const boxes = Array.from(
        authorsPickerList.querySelectorAll('input[type="checkbox"]')
      )
      for (const b of boxes) {
        if (!b.disabled) b.checked = chkSelectAll.checked
      }
    })
    btnAddSelected.addEventListener("click", async () => {
      const boxes = Array.from(
        authorsPickerList.querySelectorAll('input[type="checkbox"]:checked')
      )
      let changed = false
      for (const b of boxes) {
        const id = String(b.dataset.id || "")
        const name = String(b.dataset.name || id)
        if (!id) continue
        const exists = (blockedAuthors || []).find((x) => String(x.id) === id)
        if (exists) {
          exists.name = exists.name || name
          exists.enabled = true
          exists.score = Number.isFinite(Number(exists.score))
            ? Number(exists.score)
            : DEFAULTS.authorsDefaultScore
        } else {
          blockedAuthors.push({
            id,
            name,
            enabled: true,
            score: DEFAULTS.authorsDefaultScore,
          })
          changed = true
        }
      }
      if (changed) {
        await saveFilterSettings({ blockedAuthors })
        renderAuthorsTable()
        applyAndUpdateStatus()
        updateAuthorsMasterChk()
      }
      authorsPicker.style.display = "none"
    })
    let authorsEditing = false
    const btnAuthorsEdit = document.createElement("button")
    btnAuthorsEdit.className = cn(
      "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
    )
    btnAuthorsEdit.textContent = ""
    btnAuthorsEdit.append(
      createElement2(Pencil, { width: 12, height: 12, "stroke-width": 2 })
    )
    usersLeft.append(btnAuthorsEdit)
    usersFilterTitle.append(authorsEnableRow)
    btnAuthorsEdit.addEventListener("click", () => {
      authorsEditing = !authorsEditing
      btnAuthorsEdit.textContent = ""
      btnAuthorsEdit.replaceChildren(
        createElement2(authorsEditing ? Check : Pencil, {
          width: 12,
          height: 12,
          "stroke-width": 2,
        })
      )
      renderAuthorsTable()
    })
    function renderAuthorsTable() {
      tb.textContent = ""
      for (const [i3, a] of blockedAuthors.entries()) {
        const tr = document.createElement("tr")
        tr.className = cn("utaf-au-row cursor-pointer hover:bg-gray-50")
        tr.dataset.auIndex = String(i3)
        const tdUser = document.createElement("td")
        tdUser.className = cn(
          "utaf-col-user border-b border-gray-100 px-2 py-1 pr-3 align-middle"
        )
        const tdScore = document.createElement("td")
        tdScore.className = cn(
          "utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle"
        )
        const tdPick = document.createElement("td")
        tdPick.className = cn(
          "utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle whitespace-nowrap"
        )
        const chk = document.createElement("input")
        chk.type = "checkbox"
        chk.className = "utaf-au-toggle utaf-checkbox utaf-toggle"
        chk.checked = Boolean(a.enabled)
        chk.disabled = !authorsEnabled
        const idLabel = document.createElement("span")
        idLabel.className = cn(
          "utaf-au-id-label utaf-label block cursor-pointer truncate text-sm text-gray-800"
        )
        idLabel.textContent = String(a.id)
        idLabel.title = String(a.id)
        const idInput = document.createElement("input")
        idInput.type = "text"
        idInput.className = cn(
          "utaf-au-id-input hidden h-5 w-full max-w-[10rem] min-w-[5rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs"
        )
        idInput.value = String(a.id)
        idInput.disabled = !authorsEnabled
        const userWrap = document.createElement("div")
        userWrap.className = cn("flex min-w-0 flex-col")
        userWrap.append(idLabel)
        userWrap.append(idInput)
        const nameLabel = document.createElement("span")
        nameLabel.className = cn(
          "utaf-au-name-label utaf-label block cursor-pointer truncate text-sm text-gray-800"
        )
        nameLabel.textContent = String(a.name || "")
        nameLabel.title = String(a.name || "")
        const nameInput = document.createElement("input")
        nameInput.type = "text"
        nameInput.className = cn(
          "utaf-au-name-input hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs"
        )
        nameInput.value = String(a.name || "")
        nameInput.disabled = !authorsEnabled
        userWrap.append(nameLabel)
        userWrap.append(nameInput)
        tdUser.append(userWrap)
        const scoreInput = document.createElement("input")
        scoreInput.type = "number"
        scoreInput.step = "1"
        scoreInput.value = String(
          parseNumberOrDefault(a.score, DEFAULTS.authorsDefaultScore)
        )
        scoreInput.className = cn(
          "utaf-au-score h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
        )
        scoreInput.disabled = !authorsEnabled
        tdScore.append(scoreInput)
        const btnDel = document.createElement("button")
        btnDel.className = cn("utaf-au-delete utaf-btn-circle utaf-btn-danger")
        btnDel.title = "\u5220\u9664"
        btnDel.setAttribute("aria-label", "\u5220\u9664")
        btnDel.textContent = ""
        btnDel.append(
          createElement2(Trash2, {
            width: 12,
            height: 12,
            "stroke-width": 2,
          })
        )
        btnDel.disabled = !authorsEnabled
        chk.classList.toggle("hidden", authorsEditing)
        btnDel.classList.toggle("hidden", !authorsEditing)
        btnDel.style.display = authorsEditing ? "inline-flex" : "none"
        idLabel.classList.toggle("cursor-not-allowed", !authorsEnabled)
        nameLabel.classList.toggle("cursor-not-allowed", !authorsEnabled)
        scoreInput.classList.toggle("opacity-50", !authorsEnabled)
        scoreInput.classList.toggle("cursor-not-allowed", !authorsEnabled)
        btnDel.classList.toggle("opacity-50", !authorsEnabled)
        btnDel.classList.toggle("cursor-not-allowed", !authorsEnabled)
        tdPick.append(chk)
        tdPick.append(btnDel)
        tr.append(tdUser)
        tr.append(tdScore)
        tr.append(tdPick)
        tb.append(tr)
      }
      updateAuthorsMasterChk()
    }
    const auAddBtn = document.createElement("button")
    auAddBtn.className =
      "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
    auAddBtn.textContent = ""
    auAddBtn.append(
      createElement2(Plus, { width: 12, height: 12, "stroke-width": 2 })
    )
    function openAuthorsModal() {
      openPanelModal({
        shadow,
        panel,
        title: "\u65B0\u589E\u4F5C\u8005",
        build({ content: content2, btnCancel, btnOk }) {
          const form = buildAuthorForm(DEFAULTS.authorsDefaultScore)
          form.appendTo(content2)
          const onConfirm = async () => {
            const { id, name, score } = form.getValues()
            if (!id) return
            const exists = blockedAuthors.find((x) => String(x.id) === id)
            if (exists) {
              exists.name = name || exists.name
              exists.enabled = true
              exists.score = score
            } else {
              blockedAuthors.push({
                id,
                name: name || id,
                enabled: true,
                score,
              })
            }
            await saveFilterSettings({ blockedAuthors })
            renderAuthorsTable()
            const lastRow = tb.lastElementChild
            if (lastRow)
              lastRow.scrollIntoView({ behavior: "smooth", block: "nearest" })
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
    auAddBtn.addEventListener("click", openAuthorsModal)
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
            "utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50"
          )
        : cn(
            "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          )
      auAddBtn.className = disabled
        ? cn(
            "utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50"
          )
        : cn(
            "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          )
      authorsTable.className = disabled
        ? cn("pointer-events-none w-full table-fixed opacity-50")
        : cn("w-full table-fixed")
      auAddBtn.disabled = disabled
      btnOpenPicker.className = disabled
        ? cn(
            "inline-flex shrink-0 cursor-not-allowed items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 opacity-50"
          )
        : cn(
            "inline-flex shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 py-0.5 text-xs whitespace-nowrap text-gray-700 hover:bg-gray-200"
          )
    }
    updateAuthorsControlsDisabled()
    panel.append(createDivider())
    const keywordsSection = document.createElement("div")
    keywordsSection.className = cn("space-y-2")
    const keywordsTitle = document.createElement("div")
    keywordsTitle.className = cn(
      "flex items-center justify-between text-sm font-semibold text-gray-900"
    )
    const keywordsLeft = document.createElement("div")
    keywordsLeft.className = cn("flex items-center gap-2")
    const keywordsTitleText = document.createElement("span")
    keywordsTitleText.textContent = "\u5305\u542B\u5173\u952E\u5B57"
    keywordsLeft.append(keywordsTitleText)
    keywordsTitle.append(keywordsLeft)
    keywordsSection.append(keywordsTitle)
    let keywordsEditing = false
    const btnKeywordsEdit = document.createElement("button")
    btnKeywordsEdit.className = cn(
      "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
    )
    btnKeywordsEdit.textContent = ""
    btnKeywordsEdit.append(
      createElement2(Pencil, { width: 12, height: 12, "stroke-width": 2 })
    )
    keywordsLeft.append(btnKeywordsEdit)
    btnKeywordsEdit.addEventListener("click", () => {
      keywordsEditing = !keywordsEditing
      btnKeywordsEdit.textContent = ""
      btnKeywordsEdit.replaceChildren(
        createElement2(keywordsEditing ? Check : Pencil, {
          width: 12,
          height: 12,
          "stroke-width": 2,
        })
      )
      renderKeywordsTable()
    })
    const keywordsControls = document.createElement("div")
    keywordsControls.className = cn("space-y-2")
    const chkKeywords = document.createElement("input")
    chkKeywords.type = "checkbox"
    chkKeywords.className = "utaf-checkbox utaf-toggle"
    chkKeywords.checked = keywordsEnabled
    chkKeywords.id = "utaf-keywords-enable"
    const lblScopePre = document.createElement("span")
    lblScopePre.className = cn("utaf-label text-xs leading-5")
    lblScopePre.textContent = "\u8303\u56F4"
    const selectScope = document.createElement("select")
    selectScope.className =
      "h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs"
    const optTitle = document.createElement("option")
    optTitle.value = "title"
    optTitle.textContent = "\u6807\u9898"
    const optDesc = document.createElement("option")
    optDesc.value = "description"
    optDesc.textContent = "\u63CF\u8FF0"
    const optBoth = document.createElement("option")
    optBoth.value = "both"
    optBoth.textContent = "\u6807\u9898+\u63CF\u8FF0"
    selectScope.append(optTitle)
    selectScope.append(optDesc)
    selectScope.append(optBoth)
    selectScope.value = keywordsScope
    const rowEnable = document.createElement("div")
    rowEnable.className = cn("flex items-center gap-2")
    const lblEnable = document.createElement("label")
    lblEnable.className = cn("utaf-label text-xs leading-5")
    lblEnable.htmlFor = "utaf-keywords-enable"
    lblEnable.textContent = "\u542F\u7528"
    rowEnable.append(lblEnable)
    rowEnable.append(chkKeywords)
    const rowScope = document.createElement("div")
    rowScope.className = cn("flex items-center justify-end gap-2")
    rowScope.append(lblScopePre)
    rowScope.append(selectScope)
    const chkCaseSensitive = document.createElement("input")
    chkCaseSensitive.type = "checkbox"
    chkCaseSensitive.className = "utaf-checkbox utaf-toggle"
    chkCaseSensitive.checked = keywordsCaseSensitive
    chkCaseSensitive.id = "utaf-keywords-case"
    const lblCaseSensitive = document.createElement("label")
    lblCaseSensitive.className = cn("utaf-label text-xs leading-5")
    lblCaseSensitive.htmlFor = "utaf-keywords-case"
    lblCaseSensitive.textContent = "\u5927\u5C0F\u5199\u654F\u611F"
    const rowCase = document.createElement("div")
    rowCase.className = cn("flex items-center justify-end gap-2")
    rowCase.append(lblCaseSensitive)
    rowCase.append(chkCaseSensitive)
    keywordsTitle.append(rowEnable)
    keywordsControls.append(rowScope)
    keywordsControls.append(rowCase)
    keywordsSection.append(keywordsControls)
    const keywordsTable = document.createElement("table")
    keywordsTable.className = cn("w-full table-fixed")
    const keywordsMasterChk = document.createElement("input")
    keywordsMasterChk.type = "checkbox"
    keywordsMasterChk.className = "utaf-checkbox h-4 w-4 align-middle hidden"
    function updateKeywordsMasterChk() {
      const list = Array.isArray(keywords) ? keywords : []
      const total = list.length
      const enabledCount = list.reduce((n, k) => n + (k.enabled ? 1 : 0), 0)
      keywordsMasterChk.indeterminate = enabledCount > 0 && enabledCount < total
      keywordsMasterChk.checked = total > 0 && enabledCount === total
      keywordsMasterChk.disabled = total === 0
    }
    keywordsMasterChk.addEventListener("change", async () => {
      const next = keywordsMasterChk.checked
      keywords = (keywords || []).map((k) =>
        __spreadProps(__spreadValues({}, k), { enabled: next })
      )
      await saveFilterSettings({ keywords })
      renderKeywordsTable()
      applyAndUpdateStatus()
      updateKeywordsMasterChk()
    })
    const kwThd = document.createElement("thead")
    const kwThr = document.createElement("tr")
    const kwTh1 = document.createElement("th")
    kwTh1.className = cn(
      "utaf-col-user border-b border-gray-100 bg-gray-50 px-2 py-1 text-left text-sm whitespace-nowrap text-gray-700"
    )
    kwTh1.textContent = "\u5173\u952E\u5B57"
    const kwTh2 = document.createElement("th")
    kwTh2.className = cn(
      "utaf-col-score border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    kwTh2.textContent = "\u5206\u6570"
    const kwTh3 = document.createElement("th")
    kwTh3.className = cn(
      "utaf-col-select border-b border-gray-100 bg-gray-50 px-2 py-1 text-right text-sm whitespace-nowrap text-gray-700"
    )
    kwTh3.append(keywordsMasterChk)
    kwThr.append(kwTh1)
    kwThr.append(kwTh2)
    kwThr.append(kwTh3)
    kwThd.append(kwThr)
    const kwTb = document.createElement("tbody")
    keywordsTable.append(kwThd)
    keywordsTable.append(kwTb)
    keywordsSection.append(keywordsTable)
    panel.append(keywordsSection)
    let kwEventsBound = false
    function bindKeywordRowEvents() {
      if (kwEventsBound) return
      kwEventsBound = true
      kwTb.addEventListener("click", async (e) => {
        if (!keywordsEnabled) return
        const t = e.target
        const del = t.closest(".utaf-kw-delete")
        if (del) {
          const row2 = t.closest(".utaf-kw-row")
          if (!row2) return
          const idx = Number(row2.dataset.kwIndex || "-1")
          if (idx < 0) return
          keywords.splice(idx, 1)
          await saveFilterSettings({ keywords })
          renderKeywordsTable()
          applyAndUpdateStatus()
          updateKeywordsMasterChk()
          return
        }
        const label = t.closest(".utaf-kw-label")
        if (label) {
          const row2 = label.closest(".utaf-kw-row")
          const input = row2.querySelector(".utaf-kw-input")
          label.style.display = "none"
          input.classList.remove("hidden")
          input.focus()
          input.select()
          return
        }
        const row = t.closest(".utaf-kw-row")
        if (
          row &&
          !keywordsEditing &&
          !t.closest("input,button,select,textarea,svg")
        ) {
          const chk = row.querySelector(".utaf-kw-toggle")
          chk.checked = !chk.checked
          chk.dispatchEvent(new Event("change"))
        }
      })
      kwTb.addEventListener("change", async (e) => {
        if (!keywordsEnabled) return
        const t = e.target
        const row = t.closest(".utaf-kw-row")
        if (!row) return
        const idx = Number(row.dataset.kwIndex || "-1")
        if (idx < 0) return
        const k = keywords[idx]
        const input = t
        if (input.classList.contains("utaf-kw-toggle")) {
          k.enabled = input.checked
          await saveFilterSettings({ keywords })
          applyAndUpdateStatus()
          updateKeywordsMasterChk()
          return
        }
        if (input.classList.contains("utaf-kw-score")) {
          k.score = getNumberInputOrDefault(
            input,
            DEFAULTS.keywordsDefaultScore
          )
          await saveFilterSettings({ keywords })
          applyAndUpdateStatus()
        }
      })
      kwTb.addEventListener(
        "blur",
        async (e) => {
          if (!keywordsEnabled) return
          const t = e.target
          const input = t.closest(".utaf-kw-input")
          if (!input) return
          const row = input.closest(".utaf-kw-row")
          const idx = Number(row.dataset.kwIndex || "-1")
          if (idx < 0) return
          const v = normalizeText(input.value)
          if (v) {
            keywords[idx].keyword = v
            await saveFilterSettings({ keywords })
            applyAndUpdateStatus()
          } else {
            input.value = String(keywords[idx].keyword || "")
          }
          input.classList.add("hidden")
          const label = row.querySelector(".utaf-kw-label")
          label.textContent = String(keywords[idx].keyword || "")
          label.title = String(keywords[idx].keyword || "")
          label.style.display = "block"
        },
        true
      )
      kwTb.addEventListener("keydown", (e) => {
        if (!keywordsEnabled) return
        if (e.key === "Enter") {
          const t = e.target
          const input = t.closest(".utaf-kw-input")
          if (input) {
            e.preventDefault()
            input.blur()
          }
        }
      })
    }
    bindKeywordRowEvents()
    function renderKeywordsTable() {
      kwTb.textContent = ""
      for (const [i3, k] of keywords.entries()) {
        const tr = document.createElement("tr")
        tr.className = cn("utaf-kw-row cursor-pointer hover:bg-gray-50")
        tr.dataset.kwIndex = String(i3)
        const td1 = document.createElement("td")
        td1.className = cn(
          "utaf-col-user min-w-0 border-b border-gray-100 px-2 py-1 pr-3 align-middle"
        )
        const td2 = document.createElement("td")
        td2.className = cn(
          "utaf-col-score border-b border-gray-100 px-2 py-1 pr-1 text-right align-middle"
        )
        const td3 = document.createElement("td")
        td3.className = cn(
          "utaf-col-select border-b border-gray-100 px-2 py-1 pl-1 text-right align-middle whitespace-nowrap"
        )
        const rowWrap = document.createElement("div")
        rowWrap.className = cn("flex min-w-0 items-center gap-2")
        const chk = document.createElement("input")
        chk.type = "checkbox"
        chk.className = "utaf-kw-toggle utaf-checkbox utaf-toggle"
        chk.checked = Boolean(k.enabled)
        chk.disabled = !keywordsEnabled
        const kwLabel = document.createElement("span")
        kwLabel.className = cn(
          "utaf-kw-label utaf-label block cursor-pointer truncate text-sm text-gray-800"
        )
        kwLabel.textContent = String(k.keyword || "")
        kwLabel.title = String(k.keyword || "")
        const kwInput = document.createElement("input")
        kwInput.type = "text"
        kwInput.className = cn(
          "utaf-kw-input hidden h-5 w-full max-w-[12rem] min-w-[6rem] rounded-md border border-gray-300 px-1 py-0.5 text-xs"
        )
        kwInput.value = String(k.keyword || "")
        kwInput.disabled = !keywordsEnabled
        rowWrap.append(kwLabel)
        rowWrap.append(kwInput)
        td1.append(rowWrap)
        const scoreInput = document.createElement("input")
        scoreInput.type = "number"
        scoreInput.step = "1"
        scoreInput.value = String(
          parseNumberOrDefault(k.score, DEFAULTS.keywordsDefaultScore)
        )
        scoreInput.className = cn(
          "utaf-kw-score h-5 w-full max-w-[3rem] min-w-[2.5rem] rounded-md border border-gray-300 px-1 py-0.5 text-right text-xs"
        )
        scoreInput.disabled = !keywordsEnabled
        td2.append(scoreInput)
        const btnDel = document.createElement("button")
        btnDel.className = cn("utaf-kw-delete utaf-btn-circle utaf-btn-danger")
        btnDel.title = "\u5220\u9664"
        btnDel.setAttribute("aria-label", "\u5220\u9664")
        btnDel.textContent = ""
        btnDel.append(
          createElement2(Trash2, {
            width: 12,
            height: 12,
            "stroke-width": 2,
          })
        )
        btnDel.disabled = !keywordsEnabled
        chk.classList.toggle("hidden", keywordsEditing)
        btnDel.classList.toggle("hidden", !keywordsEditing)
        btnDel.style.display = keywordsEditing ? "inline-flex" : "none"
        kwLabel.classList.toggle("cursor-not-allowed", !keywordsEnabled)
        scoreInput.classList.toggle("opacity-50", !keywordsEnabled)
        scoreInput.classList.toggle("cursor-not-allowed", !keywordsEnabled)
        btnDel.classList.toggle("opacity-50", !keywordsEnabled)
        btnDel.classList.toggle("cursor-not-allowed", !keywordsEnabled)
        td3.append(chk)
        td3.append(btnDel)
        tr.append(td1)
        tr.append(td2)
        tr.append(td3)
        kwTb.append(tr)
      }
    }
    const kwAddBtn = document.createElement("button")
    kwAddBtn.className = cn(
      "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
    )
    kwAddBtn.textContent = ""
    kwAddBtn.append(
      createElement2(Plus, { width: 12, height: 12, "stroke-width": 2 })
    )
    function openKeywordsModal() {
      openPanelModal({
        shadow,
        panel,
        title: "\u65B0\u589E\u5173\u952E\u5B57",
        build({ content: content2, btnCancel, btnOk }) {
          const form = buildKeywordForm(DEFAULTS.keywordsDefaultScore)
          form.appendTo(content2)
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
            const lastRow = kwTb.lastElementChild
            if (lastRow)
              lastRow.scrollIntoView({ behavior: "smooth", block: "nearest" })
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
    kwAddBtn.addEventListener("click", openKeywordsModal)
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
            "utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50"
          )
        : cn(
            "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          )
      kwAddBtn.className = kwAddBtn.disabled
        ? cn(
            "utaf-btn-circle cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-700 opacity-50"
          )
        : cn(
            "utaf-btn-circle border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200"
          )
      keywordsTable.className = chkKeywords.checked
        ? cn("w-full table-fixed")
        : cn("pointer-events-none w-full table-fixed opacity-50")
      lblScopePre.className = selectScope.disabled
        ? cn("utaf-label cursor-not-allowed text-xs leading-5 opacity-50")
        : cn("utaf-label text-xs leading-5")
      selectScope.className = selectScope.disabled
        ? "h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed"
        : "h-5 px-2 py-0.5 border border-gray-300 rounded-md text-xs"
      lblCaseSensitive.className = chkCaseSensitive.disabled
        ? "utaf-label text-xs leading-5 opacity-50 cursor-not-allowed"
        : "utaf-label text-xs leading-5"
    }
    updateKeywordsControlsDisabled()
    updateControlsDisabled()
    chkKeywords.addEventListener("change", async () => {
      keywordsEnabled = chkKeywords.checked
      await saveFilterSettings({ keywordsEnabled })
      updateKeywordsControlsDisabled()
      renderKeywordsTable()
      applyAndUpdateStatus()
    })
    chkCaseSensitive.addEventListener("change", async () => {
      keywordsCaseSensitive = chkCaseSensitive.checked
      await saveFilterSettings({ keywordsCaseSensitive })
      applyAndUpdateStatus()
    })
    selectScope.addEventListener("change", async () => {
      const v = String(selectScope.value || "both")
      keywordsScope = v
      await saveFilterSettings({ keywordsScope })
      applyAndUpdateStatus()
    })
    chkQuick.addEventListener("change", async () => {
      quickEnabled = chkQuick.checked
      await saveFilterSettings({ quickEnabled })
      updateControlsDisabled()
      applyAndUpdateStatus()
    })
    chkAuthorsEnable.addEventListener("change", async () => {
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
        ? "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed"
        : "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs"
      inputDaily.className = inputDaily.disabled
        ? "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs opacity-50 cursor-not-allowed"
        : "h-5 w-16 px-1 py-0.5 border border-gray-300 rounded-md text-xs"
      inputTotalScore.className = inputTotalScore.disabled
        ? "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed"
        : "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right"
      inputDailyScore.className = inputDailyScore.disabled
        ? "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed"
        : "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right"
      if (inputUpdatedScore) {
        inputUpdatedScore.className = inputUpdatedScore.disabled
          ? "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed"
          : "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right"
      }
      if (inputOlderScore) {
        inputOlderScore.className = inputOlderScore.disabled
          ? "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed"
          : "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right"
      }
      if (inputRecentScore) {
        inputRecentScore.className = inputRecentScore.disabled
          ? "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right opacity-50 cursor-not-allowed"
          : "h-5 w-full max-w-[3rem] min-w-[2.5rem] px-1 py-0.5 border border-gray-300 rounded-md text-xs text-right"
      }
      quickTable.className = quickOff
        ? cn("pointer-events-none w-full table-fixed text-sm opacity-50")
        : cn("w-full table-fixed text-sm")
    }
    updateControlsDisabled()
    chkTotal.addEventListener("change", updateControlsDisabled)
    chkDaily.addEventListener("change", updateControlsDisabled)
    async function resetAll() {
      try {
        await setValue(CONFIG.FILTERS_KEY, { uiCollapsed: false })
      } catch (e) {}
      const prevHost = document.querySelector("#utaf-host")
      if (prevHost && prevHost.parentNode) prevHost.remove()
      await injectGreasyForkFilters()
    }
    btnReset.addEventListener("click", async () => {
      const ok = globalThis.confirm(
        "\u786E\u5B9A\u8981\u91CD\u7F6E\u6240\u6709\u7B5B\u9009\u8BBE\u7F6E\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002"
      )
      if (!ok) return
      await resetAll()
    })
    void setCollapsed(uiCollapsed)
    applyAndUpdateStatus()
  }
  function initialize() {
    if (!isGreasyForkSearchPage()) return
    const injectGreasyForkFiltersWithPerf = () => {
      void withPerf("injectGreasyForkFilters", injectGreasyForkFilters)
    }
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        injectGreasyForkFiltersWithPerf
      )
    } else {
      injectGreasyForkFiltersWithPerf()
    }
  }
  function onSettingsChange() {
    const locale2 = getSettingsValue("locale") || getPrefferedLocale()
    resetI18n2(locale2)
  }
  async function main() {
    await initSettings(() => {
      const settingsTable2 = getSettingsTable()
      return {
        id: "utags-advanced-filter",
        title: i2("settings.title"),
        footer: "\n    <p>"
          .concat(
            i2("settings.information"),
            '</p>\n    <p>\n    <a href="https://github.com/utags/utags-advanced-filter/issues" target="_blank">\n    '
          )
          .concat(
            i2("settings.report"),
            '\n    </a></p>\n    <p>Made with \u2764\uFE0F by\n    <a href="https://www.pipecraft.net/" target="_blank">\n      Pipecraft\n    </a></p>'
          ),
        settingsTable: settingsTable2,
        availableLocales: getAvailableLocales(),
        async onValueChange() {
          onSettingsChange()
        },
        onViewUpdate(settingsMainView) {
          const group2 = $(".option_groups:nth-of-type(2)", settingsMainView)
          if (group2) {
            group2.style.display = getSettingsValue(
              "enableCustomRulesForCurrentSite_".concat(host)
            )
              ? "block"
              : "none"
          }
        },
      }
    })
    if (
      !getSettingsValue("enable") ||
      !getSettingsValue("enableCurrentSite_".concat(host))
    ) {
      return
    }
    onSettingsChange()
    addStyle(content_default)
    initialize()
  }
  runWhenHeadExists(async () => {
    if (doc.documentElement.dataset.utaf === void 0) {
      doc.documentElement.dataset.utaf = ""
      await main()
    }
  })
})()
