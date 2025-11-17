export const messages = {
  'settings.enable': '在所有网站启用',
  'settings.enableCurrentSite': '在当前网站启用',
  'settings.enableCustomRulesForTheCurrentSite': '在当前网站启用自定义规则',
  'settings.customRulesPlaceholder': '/* 内部链接的自定义规则，匹配的链接会在新窗口打开 */',
  'settings.customRulesTipTitle': '示例',
  'settings.customRulesTipContent': `<p>内部链接的自定义规则，匹配的链接会在新窗口打开</p>
  <p>
  - 每行一条规则<br>
  - 所有包含 '/posts' 或 '/users/' 的链接<br>
  <pre>/posts/
/users/</pre>

  - 支持正则表达式<br>
  <pre>^/(posts|members)/d+</pre>

  - '*' 代表匹配所有链接<br>
  - 排除规则：以 '!' 开头，匹配则排除（不在新窗口打开）<br>
  <pre>!/posts/
!^/users/\\d+
!*</pre>
  </p>`,
  'settings.enableLinkToImgForCurrentSite': '在当前网站启用将图片链接自动转换为图片标签',
  'settings.enableTextToLinksForCurrentSite': '在当前网站启用将文本链接自动转换为超链接',
  'settings.enableTreatSubdomainsAsSameSiteForCurrentSite': '在当前网站启用将二级域名视为同一网站',
  'settings.enableOpenNewTabInBackgroundForCurrentSite': '在当前网站启用在后台打开新标签页',
  'settings.eraseLinks': '去除指定区域的链接',
  'settings.restoreLinks': '恢复去除的链接',

  'settings.title': 'UTags Advanced Filter',
  'settings.information': '更改设置后，重新加载页面即可生效',
  'settings.report': '反馈问题',
}

export default messages
