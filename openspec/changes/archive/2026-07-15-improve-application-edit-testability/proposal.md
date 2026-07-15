## Why

`ApplicationEditPage.tsx` 当前有 2,103 行，承载应用身份、OAuth/OIDC、SAML、Provider、UI 自定义、安全和反向代理配置。已有四套直接回归测试覆盖关键壳层与部分编辑流程，但整文件行覆盖率仍为 48.41%，难以在修改应用接入链路时判断回归风险。

当前工作页标签 change 只新增了显示名称同步行为，不应为满足覆盖率数字而向历史大页堆叠低价值测试。需要独立治理该页面的可测试边界，并优先保护管理员可观察的配置、校验和保存行为。

## What Changes

- 将应用编辑页中可独立验证的业务规则和 Tab 内容按稳定职责拆出，保留既有路由、后端 API、保存 payload 和页面交互语义。
- 为应用详情加载、必填校验、自定义 scope、Provider 绑定、SAML、安全和反向代理等高风险路径补充行为测试。
- 使用完整的应用编辑页相关回归套件统计受影响实现代码覆盖率；不通过排除统计对象或 mock 调用次数制造覆盖率。
- 在不改变管理员工作流的前提下，逐步将应用编辑页及新拆分模块的有效覆盖率提升至 85% 以上，并记录仍无法由单测覆盖的边界。

## Capabilities

### New Capabilities

- `admin-application-edit-regression-safety`: 应用编辑页在持续拆分后仍保持配置加载、校验、保存和关键 Tab 行为的可执行回归保护。

### Modified Capabilities

无。

## Impact

- 主要影响 `web-admin/src/ApplicationEditPage.tsx`、其拆分出的 TypeScript 模块及对应 `.test.ts` / `.test.tsx`。
- 可能复用现有 `ApplicationBackend`、`ProviderBackend`、`CertBackend`、`LargeEditShell` 和现有 i18n 文案；不修改后端 API、Provider 协议、认证回调、数据模型或部署配置。
