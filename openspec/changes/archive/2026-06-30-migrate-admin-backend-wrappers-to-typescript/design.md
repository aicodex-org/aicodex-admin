## Context

`web-admin/src/backend` 是 Admin 前端页面访问后端 API 的主要薄封装层。当前该目录已经存在部分 `.ts` backend wrapper，但仍有大量 `.js` 文件被 TSX 页面以无后缀路径导入，导致页面迁移时需要反复在组件层处理动态 response、record、filter 和分页类型。

本 change 的写集限定在 `web-admin/src/backend/*` 和对应 backend tests，不迁移页面组件，不改变后端接口语义。

## Goals / Non-Goals

**Goals:**

- 将仍为 `.js` 的 backend API wrapper 批量迁移为 `.ts`，保持 extensionless import 兼容。
- 用窄类型表达通用 API response、record、pagination/filter 和动态查询参数边界。
- 将触碰的 backend tests 迁移为 `.test.ts` 并保持真实 Jest suite/test 通过。
- 保持现有 HTTP method、URL、query/body shape、错误处理和导出形态不变。

**Non-Goals:**

- 不迁 `web-admin/src/auth/AuthBackend.js`。
- 不迁页面组件、Provider 配置、Application/Syncer 页面、common/table/select/modal、`ManagementPage`、`App`、`Setting`、`BaseListPage`。
- 不重构 wrapper 架构，不替换请求库，不改变后端 API contract。

## Decisions

1. **机械迁移优先**

   使用 `git mv` 将 `backend/*.js` 改为 `.ts`，优先保留原函数名、导出方式和调用顺序。这样降低页面 import 断裂和运行时行为变化风险。

2. **局部宽边界而非全局重构**

   对动态响应使用 `BackendResponse<T>`、`BackendRecord`、`BackendQuery` 等窄类型集中表达。对无法在本轮精确建模的后端字段，允许保留命名清楚的 `unknown`/record 边界，不把类型压力上推到页面。

3. **测试迁移跟随触碰文件**

   只迁移 backend 目录内 `.test.js`，并运行迁移后的 backend focused Jest。已有 `.test.ts` 保持原状，除非 import 路径或类型必须最小调整。

4. **deferred 策略**

   如果某个 wrapper 牵出页面行为、auth owner、Provider/Syncer/Application 页面或跨模块大改，则记录 deferred，不扩大本 change。

## Risks / Trade-offs

- [Risk] 一次性迁移文件多，可能暴露历史动态字段类型洞 → 使用命名清楚的 backend 边界类型，先保持行为兼容。
- [Risk] 并行任务可能推进 `origin/hfl-test-base` → closeout 前再次 fetch；如 base 前进，rebase 后重跑必要 final gate。
- [Risk] Jest 发现重复 `.test.js` / `.test.ts` 遗留 → 只迁移/清理本目录 backend 测试的重复入口，确保 focused Jest 运行真实 tests。
