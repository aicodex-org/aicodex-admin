## 1. OpenSpec

- [x] 1.1 严格校验目标 OpenSpec change。
- [x] 1.2 将 spec delta 范围限定在企业微信/飞书 Admin UI 展示层，不改变同步执行契约。

## 2. Frontend Implementation

- [x] 2.1 围绕共享基础同步流程，对齐企业微信和飞书配置区。
- [x] 2.2 飞书 dry-run 历史、身份匹配和交接资料默认紧凑展示，同时保留详情、复制和导出入口。
- [x] 2.3 对齐飞书正式同步记录表和企业微信表格语义，保留飞书成员关系影响和必要的紧凑诊断。
- [x] 2.4 保留 provider 专有字段、API 调用、脱敏行为、禁用态和运行中状态。

## 3. Tests and Validation

- [x] 3.1 更新聚焦前端测试，覆盖对齐后的布局、紧凑辅助区域和同步记录列。
- [x] 3.2 运行 incremental TypeScript gate、typecheck、聚焦 Jest、前端 build、OpenSpec strict validation 和 git diff checks。
