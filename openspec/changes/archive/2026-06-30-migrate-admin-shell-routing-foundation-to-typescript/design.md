## Context

`App`、`ManagementPage`、`Setting`、`BaseListPage` 和入口初始化文件是 Admin 前端的 root shell / routing / config foundation。它们连接登录守卫、菜单、路由、i18n、service worker、设置 helper、列表页基类和大量未迁移页面，类型扇出明显大于普通业务页面。

当前任务要求趁暂无新功能时扩大迁移步幅，但并行 worker 仍在处理 Application、backend wrappers、shared UI primitives、auth、Provider 和 basic/entry/account 批次。本 change 必须保守处理这些边界，不回头修改刚完成的 Syncer 文件，也不触碰并行写集。

## Goals / Non-Goals

**Goals:**

- 将指定 root shell、routing、config 和基础测试文件机械迁移到 `.ts` / `.tsx` / `.test.tsx`。
- 使用局部类型、`LegacyAny` 或窄接口描述当前文件实际消费的 props/state、路由、菜单、配置和历史动态值。
- 保持所有现有无后缀 import、路由 path、菜单 key、登录守卫、workspace tabs、setting helper、service worker 注册和测试 setup 行为兼容。
- 运行 root shell / Management / Setting 聚焦 Jest、typecheck、增量 TS gate 和 build，证明 JS/TS 共存路径仍可构建。

**Non-Goals:**

- 不做 UI polish、组件结构重写、菜单重组、路由语义调整、认证/权限变更或后端 API 契约变更。
- 不迁移 `ApplicationEditPage*`、`SyncerEditPage*`、`web-admin/src/table/SyncerTableColumnTable*`、`web-admin/src/backend/*`、`web-admin/src/common/*`、低耦合 `web-admin/src/table/*`、`web-admin/src/auth/*`、`ProviderEditPage*`、`web-admin/src/provider/*`、`EntryPage*`、`CaptchaPage*`、`QrCodePage*`、`web-admin/src/basic/*`、`account/WeComProfileSyncPanel*`、`AccountAvatar*`、`IframeEditor*`、`ToolTable*` 或 `TourConfig*`。
- 不新增或修改 locales 文案，不引入新依赖，不调整 TypeScript 基建配置。

## Decisions

### 1. 保守迁移高扇出边界

`App`、`ManagementPage`、`Setting` 和 `BaseListPage` 会被大量 legacy 页面和 helper 调用。本 change 不为它们设计全局模型；只在文件内补充当前实现需要的 props/state、菜单项、路由项、配置值和 helper 类型。第三方库、未迁移页面和动态后端值使用命名清晰的 legacy boundary 类型承接。

### 2. 按源码语义选择 `.ts` 或 `.tsx`

不含 JSX 的初始化、配置和工具文件使用 `.ts`。包含 JSX 或 React component/render 的文件使用 `.tsx`；包含 JSX 的测试迁移为 `.test.tsx`。保留现有无后缀 import，不要求调用方同步改 import 后缀。

### 3. 不扩大并行写集

迁移 root shell 时可能经过大量 import，但不得顺手编辑并行 worker 范围。类型洞优先在本文件用局部类型或导入现有类型解决；若必须修改被避让文件才能继续，则记录 deferred，并保持本 change 可验证。

### 4. 验证以 root shell 导入链为重点

聚焦 Jest 必须真实跑到迁移后的 `App.test.tsx`、`ManagementPage.test.tsx`、`ManagementPage.navigation.test.tsx` 和 `Setting.test.tsx`。如果 `.codex` worktree 下 CRA/Jest discovery 异常，使用显式 `--testMatch`；`0 tests` 不作为通过证据。

## Risks / Trade-offs

- **类型扇出过大**：通过局部 legacy boundary 类型限制影响面，避免重写全局模型。
- **高扇出文件迁移可能暴露历史动态用法**：优先修补当前文件的真实消费类型；对超出本 change 的 shared UI、backend wrapper 或业务页面不做联动迁移。
- **root shell 行为回归风险**：保留机械 diff，运行指定 Jest、typecheck、增量 TS gate 和 build；如发现登录或路由行为疑似变化，再补本地浏览器 smoke。
- **测试 discovery 在 junction/worktree 环境不稳定**：验证记录必须说明实际命令、suites/tests 数量和是否使用显式 `--testMatch`。
