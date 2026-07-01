## Why

Insight 用量页的真实验收必须通过 `aicodex-admin` OIDC 登录取得 admin 当前用户与 scope；当前从 Insight 发起授权后，Admin OAuth 授权页因前端 translator TypeError 白屏，导致无法完成授权和回跳。

## What Changes

- 修复 Admin OAuth/OIDC 显式授权入口在 authorize flow 下的前端渲染白屏问题。
- 将修复范围优先限制在登录/授权页的 i18n/translator 初始化边界，避免改变普通后台管理页、OIDC 签发、scope、token 或 provider contract。
- 补充聚焦测试，覆盖白屏触发路径，确保授权页在 i18n 资源缺失、未初始化或兼容 fallback 场景下仍能渲染关键登录/授权控件。
- 在 60 测试环境以脱敏浏览器 smoke 验证 Insight 入口发起 Admin OIDC 登录后不再停在 Admin 授权页白屏。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `admin-login-entry-routing`: 显式 OAuth/OIDC 授权入口除正确解析 application/organization 外，还必须在前端 i18n/translator 边界异常时保持非白屏并可继续登录/授权。

## Impact

- 主要影响 `web-admin` 登录/授权页、i18n 初始化或 translator 调用边界，以及对应 focused Jest/组件测试。
- 不修改生产/类生产配置、OIDC client secret、真实 token/cookie、OIDC 签发后端契约或 Insight provider API。
- 运行态验证仅记录 60 测试环境的脱敏页面状态、HTTP 状态和错误 alias。
