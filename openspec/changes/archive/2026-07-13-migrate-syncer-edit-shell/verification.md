# 验证记录

## 自动化验证

- `openspec validate migrate-syncer-edit-shell --strict`：通过。
- `git diff --check`：通过。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn eslint src/table/SyncerTableColumnTable.tsx src/SyncerEditPage.tsx src/SyncerEditPage.test.tsx src/LargeEditFormLayout.test.ts`：通过。
- `yarn stylelint src/styles/edit/syncer-edit.less`：通过。
- `yarn test src/SyncerEditPage.test.tsx src/table/SyncerTableColumnTable.test.tsx src/SyncerListPage.test.tsx src/backend/SyncerBackend.test.ts src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`：通过，5 个 suite / 39 个 test。
- `yarn build`：通过；输出仅包含既有 Browserslist、bundle size 和 Node deprecation 提示。
- RC hotfix 后补充验证：`yarn test src/SyncerListPage.test.tsx src/SyncerEditPage.test.tsx --watchAll=false --runInBand` 通过，2 个 suite / 17 个 test；`yarn typecheck` 通过；`yarn eslint src/BaseListPage.tsx src/SyncerListPage.tsx src/SyncerEditPage.tsx src/SyncerListPage.test.tsx src/SyncerEditPage.test.tsx` 通过；`yarn build` 通过；`git diff --check` 通过。
- RC hotfix 后补充验证：`yarn test src/common/select/LanguageSelect.test.tsx --watchAll=false --runInBand` 通过，覆盖语言选择器首屏不批量预加载外部国旗图标；`yarn eslint src/common/select/LanguageSelect.tsx src/common/select/LanguageSelect.test.tsx` 通过；`yarn typecheck` 通过；`git diff --check` 通过。
- 多 tabs RC 补充验证：`yarn test src/SyncerEditPage.test.tsx src/table/SyncerTableColumnTable.test.tsx src/SyncerListPage.test.tsx src/backend/SyncerBackend.test.ts src/LargeEditFormLayout.test.ts src/common/select/LanguageSelect.test.tsx --watchAll=false --runInBand` 通过，6 个 suite / 42 个 test；输出仅有既有 React 18 测试栈 warning。
- 多 tabs RC 补充验证：`yarn typecheck --pretty false`、`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`、聚焦 ESLint、聚焦 Stylelint、`yarn build`、OpenSpec strict validate 和 `git diff --check` 均通过；构建仅有既有 Browserslist、bundle size 和 Node deprecation 提示。
- 归档前覆盖率补测：同一组 6 个 suite / 47 个 test 通过；补充覆盖新增草稿装载、数据库/SSH/映射字段回调、模拟连接测试三类结果、列表卸载保护及表格增删移动操作。`yarn typecheck --pretty false` 通过，测试输出仍只有既有 React 18 测试栈 warning。
- 归档前 final gate：聚焦 ESLint、聚焦 Stylelint、增量 TypeScript gate、`yarn typecheck --pretty false` 和 `yarn build` 通过；构建仍只有既有 Browserslist、bundle size 和 Node deprecation 提示。

## 覆盖率说明

- 本 change 新增 `SyncerEditPage.test.tsx` 覆盖共享壳、唯一动作栏、组织显示名/标识提交、类型切换、保存 payload、保存并返回、添加态取消返回等用户可见行为。
- 多 tabs RC 继续覆盖三个 tab、已知 hash 恢复、未知 hash 回退、tab 切换写入 hash、tab 内公共分类标题、空错误信息轻量空态和真实错误信息编辑器呈现。
- RC hotfix 调整添加语义：列表页点击添加只打开本地草稿，不调用 `/api/add-syncer`；添加编辑页只有点击保存或保存并返回时才调用 `addSyncer`；取消只返回列表。同步补充 `BaseListPage` 异步回写 guard，避免列表页卸载后继续写入 `formItems`。
- 本 change 新增 `SyncerTableColumnTable.test.tsx` 覆盖后端返回的无 key 表格字段在 AntD Table 中使用稳定渲染 key，避免 RC 浏览器验收出现 React key warning。
- 本 change 新增 `LanguageSelect.test.tsx` 覆盖语言选择器初始渲染不再通过 `new Image()` 批量预加载 `cdn.casbin.org/flag-icons/*.svg`，避免首屏控制台被外部 CDN 超时污染。
- 归档前基于最终 `origin/hfl-test-base` diff 与 Jest Istanbul statement map 重新统计 5 个受影响实现文件：新增可执行行覆盖 `95/102`，即 `93.14%`，超过 85% 门槛。整文件覆盖率仍会被 `SyncerEditPage.tsx` 中 600 多行历史 `getSyncerTableColumns` fixture 和动态 JSX 拉低，不作为本 change 的有效质量指标。
- 覆盖率命令使用 6 个聚焦 suite 的 `--coverage --coverageReporters=json`，统计范围为 `SyncerEditPage.tsx`、`SyncerListPage.tsx`、`BaseListPage.tsx`、`SyncerTableColumnTable.tsx` 和 `LanguageSelect.tsx`；随后将 Git 新增行与 Istanbul 可执行 statement 起始行求交集并计算命中。

## 浏览器验证

- 本地前端预览：`http://127.0.0.1:7003`。
- 预览方式：使用项目本地 dev 脚本代理 60 测试后台，不启动本地后端。
- 初版视觉 RC 使用 Playwright 干净上下文 mock 接口；多 tabs RC 已使用本机私有测试配置登录 60 测试后台，并继续只读访问 `/api/get-account`、`/api/get-syncer`、`/api/get-organizations`、`/api/get-organization-names`、`/api/get-certs`，未输出凭据，也未点击测试连接、保存、保存并返回、同步或删除。
- 添加语义 hotfix 使用 Playwright mock `/api/add-syncer` 验证：点击列表页添加后 `addSyncer=0`，进入添加页点击底栏保存后 `addSyncer=1`，提交 payload 保持默认 owner、organization 和 type。
- Playwright 视觉验收命令：`npx --yes --package @playwright/test playwright test syncer-rc-check.spec.js --browser=chromium --reporter=line --timeout=60000`；添加语义验收命令：`npx --yes --package @playwright/test playwright test syncer-add-flow.spec.js --browser=chromium --reporter=line --timeout=60000`；均在 ignored 目录 `local-dev/tmp/playwright` 下运行。
- 桌面浅色 1440、窄屏 768、桌面暗色 1440 均通过；控制台 error 和 page error 均为空。
- 多 tabs RC 逐项检查基础信息、连接配置、映射与状态，覆盖 1440 浅色、1440 暗色、1024 和 768；tab hash 刷新后恢复，tab 内公共分类标题可见，空表格和空错误信息均使用轻量空态，底部动作栏固定在共享壳底部。
- 多 tabs RC 在 1024 下记录 `document clientWidth=1024/scrollWidth=1024`、编辑壳 `clientWidth=800/scrollWidth=800`、正文 `clientWidth=785/scrollWidth=785`，未发现页面级横向 overflow；正文高度不足时只在共享滚动区产生纵向滚动。
- 关键指标：1440 页面 `clientWidth=1440`、`scrollWidth=1440`，表格 `clientWidth=943`、`scrollWidth=943`；768 页面 `clientWidth=768`、`scrollWidth=768`，表格 `clientWidth=719`、`scrollWidth=719`。
- 截图保留在 ignored 目录 `local-dev/tmp/playwright/`：`syncer-rc-clean-1440-top.png`、`syncer-rc-clean-1440-table.png`、`syncer-rc-clean-768-table.png`、`syncer-rc-clean-dark-1440-top.png` 等。

## 剩余风险

- 60 测试后台仍有运行态抖动：真实登录验收中 `/api/get-certs` 偶发约 21 秒后由本地代理返回 504，随后前端产生非 JSON 解析错误；该现象已通过本地代理与直连对照定位为 60 后台/主机运行态，不是本次 tabs 或样式改动导致。
- 本次没有执行真实 Syncer 连接测试、保存、保存并返回、同步或删除，避免触碰测试后台外部系统和写操作。
- Syncer 编辑页正文仍保留 legacy Row/Col 动态字段结构；本 change 只统一页面壳、分区、底栏和表格 key warning，不做大规模字段组件化。
