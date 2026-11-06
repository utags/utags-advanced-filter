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

  'popup.settings': '设置',
  'filter.invertSelection': '反选',
  'filter.swapShownHidden': '反向显示',
  'filter.collapse': '折叠',
  'filter.reset': '重置',
  'filter.thresholdPrefix': '当分数 >=',
  'filter.thresholdShow': '时显示',
  'filter.thresholdHide': '时隐藏',
  'filter.openFilter': '打开筛选',
  'filter.stats': '显示 {1} | 隐藏 {2}',
  'filter.updatedAfter': '更新时间 >',
  'filter.createdAfter': '创建时间 >',
  'filter.createdBefore': '创建时间 <',
  'filter.quickFilters': '便捷筛选',
  'filter.enable': '启用',
  'filter.condition': '条件',
  'filter.score': '分数',
  'filter.totalInstallsLessThan': '总安装量 <',
  'filter.dailyInstallsLessThan': '日安装量 <',
  'filter.authors': '包含作者',
  'filter.collectAuthors': '采集页面作者',
  'filter.selectAll': '全选/全不选',
  'filter.refresh': '刷新',
  'filter.addSelected': '添加选中',
  'filter.close': '关闭',
  'filter.user': '用户',
  'filter.delete': '删除',
  'filter.addAuthor': '新增作者',
  'filter.keywords': '包含关键字',
  'filter.scope': '范围',
  'filter.scopeTitle': '标题',
  'filter.scopeDescription': '描述',
  'filter.scopeTitleAndDescription': '标题+描述',
  'filter.caseSensitive': '大小写敏感',
  'filter.keyword': '关键字',
  'filter.addKeyword': '新增关键字',
  'filter.resetConfirm': '确定要重置所有筛选设置吗？此操作不可撤销。',
  'form.authorId': '作者ID',
  'form.authorName': '作者名',
  'form.keywordHint': '支持正则表达式（格式：/pattern/flags）',
  'modal.cancel': '取消',
  'modal.confirm': '确认',
  'datePreset.halfYear': '半年',
  'datePreset.oneYear': '一年',
  'datePreset.twoYears': '两年',
  'datePreset.custom': '自定义',
}

export default messages
