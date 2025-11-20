# UTags Advanced Filter

A tool that filters and hides list-style content in real time on any website. It is available as both a userscript and a browser extension. Unlike a site's own search or filtering, it hides items directly on the page and supports instant toggling and stacking conditions to view filtered results.

Currently adapted for Greasy Fork script lists. More sites will be supported via a rules system.

![screenshots](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags-advanced-filter/refs/heads/main/assets/screenshot-2025-11-20-09-44-00.png)

## Key Features

- Real-time in-page filtering with condition stacking and instant stats.
- Master switch and safe reset with delayed reveal and second confirmation.
- Per-site persistent settings; performance cache avoids repeated parsing.
- Keyword filter: list management, per-item toggle, editable scores, threshold; title/description scope; case sensitivity and regex (`/regex/flags`); negative scores to offset hiding.
- Author filter: table management (ID, name) with per-author enable/disable, inline edit, delete, and a dedicated “Add” row; header master checkbox; author picker from the current page.
- Date filters: Updated and Created (older/recent) with mode (days/months), presets, and custom days.
- Install counts: hide by total installs and daily installs thresholds.
- Style isolation via ShadowRoot; unified components (date preset, dropdown).
- Dark-mode compatibility: the panel and form controls are forced to light scheme for consistent visuals.
- Debug toggle: a switch next to stats that swaps shown/hidden items to inspect filtered results.

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
- Keywords:
  - Manage keywords in a list with per-item toggle, edit, delete, and score (default 5).
  - Configure a hide threshold (e.g., 15); when the sum of matched keyword scores in the checked scope ≥ threshold, the script is hidden.
  - Duplicate occurrences of the same keyword are counted once.
  - Scope options: Title only, Description only, Title + Description.
  - Case sensitivity and regex support (use `/regex/flags`, e.g., `/foo/i`).
  - Negative scores as offsets: Assign negative scores to “valuable keywords” to reduce the total and avoid hiding. Example: Threshold 4; `foo` is 5 points and `bar` is -2 points. When both match, the total is 3 and the item is not hidden; when only `foo` matches, the total is 5 and the item is hidden.
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

- Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/utags-advanced-filter/ecchlopcngakjedfccnhmfhbphdpceaj)
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
