# UTags Advanced Filter

A tool that filters and hides list-style content in real time on any website. It is available as both a userscript and a browser extension. Unlike a site's own search or filtering, it hides items directly on the page and supports instant toggling and stacking conditions to view filtered results.

Currently adapted for Greasy Fork script lists. More sites will be supported via a rules system.

![screenshots](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags-advanced-filter/refs/heads/main/assets/screenshot-2025-11-19-13-21-06.png)

## Implemented Features

### UI & UX

- Style isolation: The UI is hosted inside a `ShadowRoot` to completely avoid CSS pollution from the target website.
- Floating panel: The filter UI appears as a draggable floating panel fixed to the right side of the page.
- Collapsible design: The panel collapses into a semi-transparent UTags brand icon and becomes opaque on hover; the collapsed state is persisted.
- Optimized layout:
  - Two-row structure: The top row contains the title and actions (Reset, Collapse), and the bottom row shows stats and the master switch.
  - Safe reset: The “Reset” button is hidden by default, appears only after hovering for 3 seconds, and shows a second-confirmation dialog before applying, preventing misclicks.
  - Master switch: A main checkbox next to the stats can enable/disable all filters at once and shows an indeterminate state when partially enabled.
  - Quick controls: Unified rows for Updated/Created date filters with enable checkboxes, mode switch (days/months), presets and custom days; the stats on the right update in real time as “Shown X | Hidden X”.
- Unified components:
  - Date preset component: Date filters (Updated date, Created date) are encapsulated into a reusable `createDatePresetInput` component, supporting presets like half-year, one year, two years, and custom days.
  - Dropdown menu: Supports closing with `Esc`, and has its own border and shadow styles.
  - Unified checkbox style: All checkboxes use the `utaf-checkbox` CSS class to enlarge the hit area.

### Filtering — Greasy Fork

- Updated date: Hide scripts that have not been updated within a specified time (e.g., N days/months/years).
- Created date:
  - Hide scripts created before a specified date.
  - Hide scripts created within a specified date range.
- Install counts:
  - Hide scripts with total installs less than N.
  - Hide scripts with daily installs less than N.
- Authors:
  - Author table management: Manage authors (ID, name) in a table with per-author enable/disable, deletion, inline editing of ID/name, and a dedicated “Add” row.
  - Master checkbox: A header master checkbox supports enable-all/disable-all and shows an indeterminate state.
  - Author picker: Collect authors from the current page, with “Select all/none”, “Refresh”, “Add selected”, and “Close” actions to avoid manual typing.
  - Immediate persistence: All author changes are saved instantly and integrated with the live stats updates.
- Immediate effect: All filter changes take effect instantly and the “shown/hidden” stats update in real time.

### Data & State

- Per-site storage: Filter settings are stored per domain, using the key format `utaf_{hostname}_filters`, ensuring configurations do not interfere across sites.
- First-use detection: Using the global state `utaf_global_state.isFirstUse`, the panel defaults to expanded on first use on any site, and collapses by default afterward.
- Performance cache: A `WeakMap` caches parsed metrics for list items (e.g., timestamps, install counts) to avoid repeated DOM queries and parsing during subsequent filtering.

## Installation & Usage

- Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/utags-advanced-filter/kofjcnaphffjoookgahgjidofbdplgig)
- Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/utags-advanced-filter/ndhiahnkcnongmecnaamaampfelobblg)
- Firefox: [Firefox Addon Store](https://addons.mozilla.org/firefox/addon/utags-advanced-filter/)
- User Script: [Greasy Fork](https://greasyfork.org/scripts/556095-utags-advanced-filter), [ScriptCat](https://scriptcat.org/en/script-show-page/4653), [GitHub](https://github.com/utags/utags-advanced-filter/raw/refs/heads/main/build/userscript-prod/utags-advanced-filter.user.js)
- [Manually install browser extensions](https://github.com/utags/utags-advanced-filter/blob/main/manual-installation.md)
- Usage:
  - Open a Greasy Fork script list page (e.g., search results, user page).
  - The filter panel will automatically appear on the right side of the page.
  - Adjust filter conditions; the list will be filtered in real time.

## Future Plans

- Rules engine: Abstract a unified site-adaptation interface so that new websites can be adapted via external rule configuration (e.g., JSON) without modifying the main script. Planned rules include:
  - Site detection: Domain and path matching.
  - List item selectors: Define the list container and items.
  - Metric parsers: How to extract updated time, created time, install counts, etc., from items.
- Adapt more sites:
  - Forums: Discourse, Flarum, etc.
  - Code hosting: GitHub Issues/PRs.
  - Communities: Reddit, V2EX, etc.
- Feature enhancements:
  - Settings sync: Provide import/export or sync via cloud services.
  - Per-item hide: Add a “Hide” button to each list item, with persistent records.

## License

Copyright (c) 2025 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](https://github.com/utags/utags-advanced-filter/blob/main/LICENSE).
