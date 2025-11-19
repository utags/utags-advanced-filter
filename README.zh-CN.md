# UTags Advanced Filter

一个在任意网站对列表型内容进行实时过滤与隐藏的工具，提供用户脚本和浏览器扩展两种版本。区别于站点自身的搜索/筛选，它在页面内直接隐藏不满足条件的条目，支持即时切换与叠加条件查看过滤后的结果。

当前已适配 Greasy Fork 的脚本列表，后续将通过“规则”适配更多站点。

![screenshots](https://wsrv.nl/?url=https://raw.githubusercontent.com/utags/utags-advanced-filter/refs/heads/main/assets/screenshot-2025-11-19-13-21-06.png)

## 已实现功能 (Implemented Features)

### UI & UX

- **样式隔离**: 使用 `ShadowRoot` 承载 UI，完全避免目标网站的 CSS 样式污染。
- **悬浮面板**: 筛选器 UI 以一个可拖拽的悬浮面板形式呈现，固定在页面右侧。
- **可折叠设计**: 面板可折叠为一个半透明的 UTags 品牌图标，鼠标悬停时不透明；折叠状态会被持久化。
- **优化的布局**:
  - **双行结构**: 顶部为标题和操作区（重置、折叠），下方为统计和总开关。
  - **安全重置**: “重置”按钮默认隐藏，鼠标悬停 3 秒后才显示，且点击后有二次确认弹窗，防止误操作。
  - **主控开关**: 在统计信息左侧提供一个主复选框，可一键启用/禁用所有筛选器，并在部分启用时显示为“半选”状态。
  - **快捷控制**: 将“更新/创建”日期筛选以统一的行形式呈现，支持复选框启用、模式切换（天/月）、预设与自定义天数；右侧统计会实时显示“显示 X | 隐藏 X”。
- **统一的组件**:
  - **日期预设组件**: 将日期筛选（更新日期、创建日期）封装为可复用的 `createDatePresetInput` 组件，支持“半年/一年/两年”等预设及自定义天数。
  - **下拉菜单**: 支持按 `Esc` 键关闭，拥有独立的边框和阴影样式。
  - **统一的复选框样式**: 所有复选框使用统一的 `utaf-checkbox` CSS 类，增大了点击区域。

### 过滤能力 (Filtering) - Greasy Fork

- **更新日期**: 隐藏超过指定时间（如 N 天/月/年）未更新的脚本。
- **创建日期**:
  - 隐藏创建于指定日期之前的脚本。
  - 隐藏创建于指定日期之内的脚本。
- **安装量**:
  - 隐藏总安装量小于 N 的脚本。
  - 隐藏日安装量小于 N 的脚本。
- **关键字**:
  - 以列表管理关键字（逐项开关、编辑、删除、分数设置，默认 5）。
  - 支持设置隐藏阈值（如 15），当脚本标题/描述出现多个关键字且分数累计 ≥ 阈值时隐藏。
  - 重复出现的同一关键字只记一次分数。
  - 支持范围选择：仅标题、仅描述、标题+描述。
  - 支持大小写敏感与正则匹配（输入 `/regex/flags` 格式，如 `/foo/i`）。
  - 支持负分抵消：负分可用于为“有价值的关键字”降低总分，避免被隐藏。示例：阈值为 4，`foo` 5 分、`bar` -2 分；两者同时命中时总分为 3，不会隐藏；仅命中 `foo` 时总分为 5，会隐藏。
- **作者**:
  - **作者表格管理**: 以表格形式管理作者（ID、用户名），支持逐项启用/禁用、删除，支持内联编辑 ID/用户名，以及“添加”行快速录入。
  - **主复选框**: 表头提供主复选框，支持全启用/全禁用，并显示“半选”状态。
  - **作者采集器**: 可从当前页面采集作者列表，支持“全选/全不选”“刷新”“添加选中”“关闭”等操作，避免手动输入。
  - **即时持久化**: 所有作者相关变更即时保存，并与其他筛选器共同实时更新统计。
- **即时生效**: 所有筛选条件的变更都会立即应用，并实时更新“显示/隐藏”统计。

### 数据与状态 (Data & State)

- **按站点存储**: 过滤设置按域名独立存储，键名格式为 `utaf_{hostname}_filters`，确保不同站点的配置互不干扰。
- **首次使用检测**: 通过全局状态 `utaf_global_state` 中的 `isFirstUse` 字段判断，首次在任意网站使用时，面板默认为展开状态，之后默认为折叠。
- **性能缓存**: 使用 `WeakMap` 缓存已解析的列表项指标（如时间戳、安装量），在重复过滤时避免重复的 DOM 查询和解析，提升性能。

## 安装与使用

- 类 Chrome 浏览器: [Chrome 应用商店](https://chromewebstore.google.com/detail/utags-add-usertags-to-lin/kofjcnaphffjoookgahgjidofbdplgig)
- Edge 浏览器: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/utags-advanced-filter/ndhiahnkcnongmecnaamaampfelobblg)
- Firefox 浏览器: [Firefox Addon 商店](https://addons.mozilla.org/zh-CN/firefox/addon/utags-advanced-filter/)
- 用户脚本 / 油猴脚本: [Greasy Fork](https://greasyfork.org/zh-CN/scripts/556095-utags-advanced-filter), [ScriptCat](https://scriptcat.org/zh-CN/script-show-page/4653), [GitHub](https://github.com/utags/utags-advanced-filter/raw/refs/heads/main/build/userscript-prod/utags-advanced-filter.user.js)
- [手动安装浏览器扩展](https://github.com/utags/utags-advanced-filter/blob/main/manual-installation.zh-CN.md)
- **使用**:
  - 打开 Greasy Fork 脚本列表页（如搜索、用户页等）。
  - 筛选器面板将自动出现在页面右侧。
  - 调整筛选条件，列表将实时过滤。

## 未来规划 (Future Plans)

- **规则引擎**: 抽象统一的站点适配接口，通过外部规则配置（如 JSON）即可轻松适配新网站，而无需修改主脚本。规划中的规则将包含：
  - **站点检测**: 域名、路径匹配。
  - **列表项选择器**: 定义列表容器与条目。
  - **指标解析器**: 如何从条目中提取更新时间、创建时间、安装量等数据。
- **适配更多站点**:
  - **论坛类**: Discourse, Flarum 等。
  - **代码托管**: GitHub Issues/PRs。
  - **社区**: Reddit, V2EX 等。
- **功能增强**:
  - **设置同步**: 提供导入/导出功能，或通过云服务同步配置。
  - **单项隐藏**: 为列表中的每个项目添加独立的“隐藏”按钮，并持久化记录。

## License

Copyright (c) 2025 [Pipecraft](https://www.pipecraft.net). Licensed under the [MIT License](https://github.com/utags/utags-advanced-filter/blob/main/LICENSE).
