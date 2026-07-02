## 1. OpenSpec

- [x] 1.1 创建 repo-local OpenSpec change，固定 Admin P0 copy-safe/manual binding 边界。
- [x] 1.2 通过实施前 review 和 `openspec validate align-admin-insight-provider-handoff-ui --strict`。

## 2. 前端实现

- [x] 2.1 调整 `ApplicationUsageAccessPage` 入口标题/eyebrow，明确为 Insight Admin Provider 交接。
- [x] 2.2 调整服务凭据治理面板标题、说明、待补配置和生成成功提示，默认展示三条 wrapper 能力与 manual/secretRef binding 指引。
- [x] 2.3 保持 copy-safe 过滤和交接包生成输入不包含 raw config、secret、URL、raw payload 或 machine-only alias。
- [x] 2.4 推倒旧服务凭据治理面板结构，改为状态边界、wrapper 能力、owner evidence 摘要、copy-safe 交接操作四块固定结构。
- [x] 2.5 ready 和异常态都默认展示 owner/readiness/source/next action 摘要，不再只在待补配置时显示治理项。

## 3. 测试与验证

- [x] 3.1 更新聚焦 Jest 测试，覆盖新入口文案、wrapper 能力摘要、Admin secure handoff 非 P0 提示和敏感材料不渲染。
- [x] 3.2 运行前端 TypeScript 门禁、聚焦测试、`yarn typecheck`。
- [x] 3.3 运行 `git diff --check` 并记录验证结果。
- [x] 3.4 更新聚焦 Jest 测试，覆盖标准交接页四块结构和 ready 状态 owner evidence 摘要默认可见。
