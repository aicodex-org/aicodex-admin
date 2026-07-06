## 1. OpenSpec

- [x] 1.1 新增 repo-local RC/preview change artifacts。
- [x] 1.2 运行 `openspec validate polish-admin-preview-mobile-handoff-ui --strict`。

## 2. Implementation

- [x] 2.1 增加窄视口不渲染桌面侧栏的 shell 回归测试。
- [x] 2.2 增加用量接入页默认层降噪和诊断层级回归测试。
- [x] 2.3 实现 Admin shell 窄视口 compact 行为。
- [x] 2.4 实现默认层文案降噪、诊断表格和技术证据二级折叠。

## 3. Preview Validation

- [x] 3.1 运行 shell 和用量接入页聚焦 Jest。
- [x] 3.2 运行 incremental TypeScript gate 和 typecheck。
- [x] 3.3 运行 build，或在预览约束下记录跳过原因。
- [x] 3.4 通过本地 dev/60 截图预览核对 UI，无法自动截图时记录验证缺口。
- [x] 3.5 在 preview 阶段保持 change active，不 archive、不推 base/test，并向主控回传。
