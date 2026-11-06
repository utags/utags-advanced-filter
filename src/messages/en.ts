const messages = {
  'settings.enable': 'Enable for all sites',
  'settings.enableCurrentSite': 'Enable for the current site',
  'settings.enableCustomRulesForTheCurrentSite': 'Enable custom rules for the current site',
  'settings.customRulesPlaceholder': '/* Custom rules for internal URLs, matching URLs will be opened in new tabs */',
  'settings.customRulesTipTitle': 'Examples',
  'settings.customRulesTipContent': `<p>Custom rules for internal URLs, matching URLs will be opened in new tabs</p>
  <p>
  - One line per url pattern<br>
  - All URLs contains '/posts' or '/users/'<br>
  <pre>/posts/
/users/</pre>

  - Regex is supported<br>
  <pre>^/(posts|members)/d+</pre>

  - '*' for all URLs<br>
  - Exclusion rules: prefix '!' to exclude matching URLs<br>
  <pre>!/posts/
!^/users/\\d+
!*</pre>
  </p>`,
  'settings.enableLinkToImgForCurrentSite': 'Enable converting image links to image tags for the current site',
  'settings.enableTextToLinksForCurrentSite': 'Enable converting text links to hyperlinks for the current site',
  'settings.enableTreatSubdomainsAsSameSiteForCurrentSite': 'Treat subdomains as the same site for the current site',
  'settings.enableOpenNewTabInBackgroundForCurrentSite': 'Open new tab in background for the current site',
  'settings.eraseLinks': 'Erase Links',
  'settings.restoreLinks': 'Restore Links',

  'settings.title': 'UTags Advanced Filter',
  'settings.information': 'After changing the settings, reload the page to take effect',
  'settings.report': 'Report and Issue...',

  'popup.settings': 'Settings',
  'filter.invertSelection': 'Invert selection',
  'filter.swapShownHidden': 'Invert display',
  'filter.collapse': 'Collapse',
  'filter.reset': 'Reset',
  'filter.thresholdPrefix': 'When score >=',
  'filter.thresholdShow': 'show',
  'filter.thresholdHide': 'hide',
  'filter.openFilter': 'Open filter',
  'filter.stats': 'Shown {1} | Hidden {2}',
  'filter.updatedAfter': 'Updated >',
  'filter.createdAfter': 'Created >',
  'filter.createdBefore': 'Created <',
  'filter.quickFilters': 'Quick filters',
  'filter.enable': 'Enable',
  'filter.condition': 'Condition',
  'filter.score': 'Score',
  'filter.totalInstallsLessThan': 'Total installs <',
  'filter.dailyInstallsLessThan': 'Daily installs <',
  'filter.authors': 'Authors',
  'filter.collectAuthors': 'Collect authors from page',
  'filter.selectAll': 'Select all / none',
  'filter.refresh': 'Refresh',
  'filter.addSelected': 'Add selected',
  'filter.close': 'Close',
  'filter.user': 'User',
  'filter.delete': 'Delete',
  'filter.addAuthor': 'Add author',
  'filter.keywords': 'Keywords',
  'filter.scope': 'Scope',
  'filter.scopeTitle': 'Title',
  'filter.scopeDescription': 'Description',
  'filter.scopeTitleAndDescription': 'Title + Description',
  'filter.caseSensitive': 'Case sensitive',
  'filter.keyword': 'Keyword',
  'filter.addKeyword': 'Add keyword',
  'filter.resetConfirm': 'Are you sure you want to reset all filter settings? This action cannot be undone.',
  'form.authorId': 'Author ID',
  'form.authorName': 'Author name',
  'form.keywordHint': 'Regular expressions are supported (format: /pattern/flags)',
  'modal.cancel': 'Cancel',
  'modal.confirm': 'Confirm',
  'datePreset.halfYear': '6 months',
  'datePreset.oneYear': '1 year',
  'datePreset.twoYears': '2 years',
  'datePreset.custom': 'Custom',
}

export default messages
