# UTags Advanced Filter 项目规则（初稿）

## 包管理与环境

- 默认包管理器：优先使用 `pnpm`，若不可用则使用 `npm`。
- Node 环境：建议使用当前 LTS 版本；类型检查依赖 `typescript`（见 `devDependencies`）。

## 安装依赖

- `pnpm install`
- 备用：`npm install`

## 代码质量检查

- 格式化与静态检查：`pnpm run lint`
- 类型检查（不输出编译产物）：`pnpm run lint:type`

## 开发预览

- 浏览器扩展（Chrome）：`pnpm dev:chrome`
- 浏览器扩展（Firefox）：`pnpm dev:firefox`
- 用户脚本（Watch 模式）：`pnpm dev:userscript`

## 构建与打包

- 浏览器扩展（Chrome）：`pnpm build:chrome`
- 浏览器扩展（Firefox）：`pnpm build:firefox`
- 用户脚本（生产构建）：`pnpm build:userscript`

## Staging 预览（用户脚本）

- 一键构建并本地预览：`pnpm staging:userscript`
- 说明：构建输出到 `build/userscript-staging/` 并启动本地服务器自动打开预览。

## 变更验证流程（必须）

- 每次代码改动后：
  - 运行 `pnpm run lint`。
  - 运行 `pnpm run lint:type`。
- 助手操作约定：每次修改代码后，自动执行一次 `pnpm run lint` 与 `pnpm run lint:type`。
- 涉及 UI 布局或交互改动：
  - 运行 `pnpm build:userscript` 或 `pnpm staging:userscript` 并在浏览器中验证实际效果。

## 提交与发布（约定）

- 不自动提交代码或发布版本；仅在获得明确指示后执行相关操作。

---

## 版本与变更日志规范

- 版本号：遵循 SemVer（`MAJOR.MINOR.PATCH`）
  - 修复问题（不破坏向后兼容）：`PATCH`（例如 `0.0.7 → 0.0.8`）
  - 新增功能（不破坏向后兼容）：`MINOR`（例如 `0.0.7 → 0.1.0`）
  - 破坏性变更：`MAJOR`（例如 `0.0.7 → 1.0.0`）
- 提交信息：遵循 Conventional Commits
  - 格式：`<type>(<scope>): <subject>`
  - 常用类型：
    - `feat` 新功能
    - `fix` 修复缺陷
    - `docs` 文档变更
    - `style` 代码风格（不影响逻辑）
    - `refactor` 重构（不修复也不新增功能）
    - `perf` 性能优化
    - `test` 测试相关
    - `build` 构建系统或外部依赖变更
    - `ci` CI 流程变更
    - `chore` 其他维护性变更
    - `revert` 回滚提交
  - 破坏性变更：在类型后加 `!` 或在提交正文/页脚中加入 `BREAKING CHANGE: ...`
  - 示例：
    - `feat(content): 关键词分数输入统一为流式宽度`
    - `fix(filter): 修复作者负分未正确累加的问题`
    - `refactor(ui): 去除魔法数字，改为 DEFAULTS`
- 变更日志：建议使用 Conventional Changelog 工具自动生成（可后续引入）；暂按版本手动维护关键变更列表。

## 常见任务快捷清单

- 安装依赖：`pnpm install`（或 `npm install`）
- 格式化与静态检查：`pnpm run lint`
- 类型检查：`pnpm run lint:type`
- 开发（Chrome 扩展）：`pnpm dev:chrome`
- 开发（Firefox 扩展）：`pnpm dev:firefox`
- 用户脚本 Watch：`pnpm dev:userscript`
- 构建用户脚本（生产）：`pnpm build:userscript`
- 用户脚本 Staging 预览：`pnpm staging:userscript`
- 仅格式化代码（Prettier）：`pnpm p`

## 故障排查

- `pnpm` 或 `npm` 不可用
  - 解决：安装对应包管理器；或临时切换至可用的另一种（本项目优先 `pnpm`）。
- 类型检查失败（`tsc --noemit` 报错）
  - 解决：根据报错定位到具体文件修复类型；必要时在合适位置添加类型提示而非 `any`。
- Prettier 或 XO 报错
  - 解决：运行 `pnpm run lint` 自动修复；仍失败时按提示修复风格或导入顺序。
- `plasmo dev` 启动失败或端口冲突
  - 解决：关闭占用端口的进程或修改端口；必要时清理缓存后重试。
- `http-server` 端口被占用（staging 预览）
  - 解决：选择其他端口或终止占用端口的进程。
- 构建产物与源代码不一致
  - 说明：`build/` 为生成目录；请以 `src/` 为准修改，重新运行构建命令覆盖产物。
