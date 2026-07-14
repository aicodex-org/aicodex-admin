## Context

`web-admin` 已完成 TypeScript 稳态迁移，但测试和 CI 没有形成同等稳定的回归闭环。当前全量 Jest 在 135 个 suite 中有 6 个失败：部分测试把 CSS class 顺序、公共组件旧返回结构或样式聚合精确数组当作稳定契约；`ApplicationAccessMenuPages.test.tsx` 则在单个测试中串联多个 legacy class 页面和大量异步分支，单文件运行也会超过 Jest 默认 5 秒。

GitHub Actions 的 frontend job 当前依赖 Go tests，执行 `yarn install && CI=false yarn run build`；全量 Jest、独立 `yarn typecheck` 和增量 TypeScript gate 不在 CI 中。近期 change 即使通过聚焦测试，也可能在公共壳或样式拓扑上留下全量回归。

## Goals / Non-Goals

**Goals:**

- 在不改变生产页面行为的前提下恢复全部已提交 Jest suite 通过。
- 让测试断言稳定的用户/组件契约，不依赖无语义的源码 token 顺序或已经变化的组件内部包装结构。
- 从根因上收敛超时测试，使其在默认单测 timeout 下稳定完成。
- 提供统一的 `yarn test:ci` 非 watch 入口。
- 让 TypeScript gate、typecheck 和全量 Jest 成为独立 CI gate，并与 Go tests 并行取得反馈。

**Non-Goals:**

- 不升级 React、Testing Library、CRACO、React Router 或其它依赖。
- 不清理全仓 React 18 warning、测试 `any` 或 class component。
- 不修改 Go 测试、数据库 fixture、Cypress 流程或 60 测试环境。
- 不修改生产 UI、路由、权限、API payload 或后端契约。

## Decisions

### 1. 以稳定契约修复测试，不回滚生产实现

采用行为/语义契约修复：className 使用 token 集合语义，公共表格通过其专用测试验证 wrapper 与内部 Table，业务页测试只验证业务传入属性；样式 topology 测试同步当前明确聚合入口。

备选方案一是把生产组件或 className 顺序改回测试期望。该方案会为了陈旧测试回滚已验收 UI，拒绝采用。备选方案二是只把旧字符串替换为当前精确字符串，虽然改动最小，但仍保留对无语义顺序和内部结构的脆弱依赖，也不采用。

### 2. 拆分超大异步用例并等待已知 backend promise

`ApplicationAccessMenuPages.test.tsx` 的超时用例按资源/证书/密钥/webhook 等职责拆分。证书与密钥新增当前通过本地 draft 路由到编辑页，测试验证路由 payload，不再等待已经不存在的列表页 backend add 请求。对于删除、刷新、上传、webhook 新增和事件重放等实际 backend 路径，现有 legacy 页面方法不会把 backend promise 返回给调用方，因此测试捕获 mock backend 返回的 request promise：先触发页面方法，再 `await` request，并刷新随后注册的 microtask；只有没有可捕获 promise 的 callback 路径才保留条件等待。不得为了测试给生产 class method 新增返回值。每个用例只覆盖一组紧密相关分支，并在默认 5 秒内完成。`OrganizationEditPage.test.tsx` 聚焦运行当前可通过，因此不预设修改；只有修复确定性红灯后的全量运行再次稳定复现超时，才基于新的证据调整其完成条件。

全量复跑若继续暴露其它只在完整队列中超时的 mega test，则按同一原则处理：将跨多个抽屉/步骤的 UI 链路拆为职责测试，将 backend 请求契约、局部渲染和复制/导出行为分层，并移除文件级 timeout 豁免。不得仅因初始失败清单未包含该 suite 就保留新的全量红灯。

备选方案是增加 `jest.setTimeout` 或全局 timeout。该方案掩盖串行轮询和用例步幅问题，拒绝采用。另一个备选是立即重构生产 class component 让所有方法返回 promise；这会扩大到生产行为重构，留待业务触达时处理。

### 3. 新增独立 frontend-checks CI job

新增 `test:ci` script，固定以 CI、非 watch、单进程方式运行全量 Jest。GitHub Actions 新增不依赖 Go tests 的 `frontend-checks` job，执行 frozen-lockfile install、`yarn typecheck`、根据事件解析 base revision 的增量 TypeScript gate、`yarn test:ci`。现有 frontend build 同时依赖 `go-tests` 和 `frontend-checks`，保留 build artifact 行为。

增量 gate 在 pull request 使用目标分支 SHA，在普通 push 优先使用 `github.event.before`，无有效 before 时回退 `HEAD^`，避免硬编码私有 `origin/hfl-test-base` 导致上游 GitHub workflow 不可用。

备选方案是把所有检查串在现有 frontend build job 中。该方案会等待 Go tests 后才反馈前端错误，并让 build job 继续承担过多职责，因此不采用。

### 4. 不把 console warning 清零作为本 change 门禁

当前旧 Testing Library 会输出 React 18 兼容 warning。`test:ci` 使用 `--silent` 控制 CI 日志量，但测试失败信息仍正常输出。warning 根治需要独立依赖升级 change，不与本次红灯修复混合。

## Risks / Trade-offs

- [Risk] 全量 Jest 单进程耗时较长。→ Mitigation：与 Go tests 并行执行；本 change 优先稳定性，后续可基于证据评估安全并行度。
- [Risk] 拆分 mega test 可能遗漏原有分支。→ Mitigation：拆分前逐项映射原断言，保持测试数量和分支意图，聚焦运行后再跑全量。
- [Risk] CI base revision 在特殊事件中不可用。→ Mitigation：PR 使用 base SHA 且无效时明确失败；push 优先 before SHA、无效时回退 `HEAD^`，回退仍无有效 commit 时明确失败。
- [Risk] `--silent` 隐藏现有 console warning。→ Mitigation：该开关只用于 CI 日志控制；React 18 测试工具链升级作为显式后续债务，不宣称 warning 已解决。

## Migration Plan

1. 先修复确定性陈旧断言并运行六个失败文件。
2. 拆分可聚焦复现或经全量复跑确认的超时测试，验证每个新用例在默认 timeout 下通过；移除测试文件级 timeout 豁免。
3. 新增 `test:ci` 和 `frontend-checks` workflow，运行 YAML/脚本静态检查。
4. 运行全量 Jest、typecheck、增量 gate 和 build。
5. CI 变更可通过回滚 workflow job 和 `test:ci` script 独立撤销，不影响生产产物或数据。

## Open Questions

无。React 18 测试依赖升级和 Go 测试基线治理明确留给后续独立 change。
