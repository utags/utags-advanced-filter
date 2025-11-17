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
}

export default messages
