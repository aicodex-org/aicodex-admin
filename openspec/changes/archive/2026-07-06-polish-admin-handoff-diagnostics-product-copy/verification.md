## 验证摘要

本 change 只收敛 Admin `Insight Admin Provider 交接` 页默认层和诊断展开层的产品文案/渲染条件，不改后端 contract、不新增 API、不改变 copy-safe package schema。

## RED / GREEN

- RED：先更新 `web-admin/src/ApplicationUsageAccessPage.test.tsx`，断言默认层不出现 `Admin secure handoff 不在 P0`、`copy-safe metadata` 和红框重复说明，展开诊断不出现 `环境维护项`、`部署配置`、`外部 secret system` 作为用户动作；旧实现下相关断言失败。
- GREEN：调整 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、zh/en locale 后，聚焦测试通过。

## 自动化验证

- `openspec validate polish-admin-handoff-diagnostics-product-copy --strict`：通过。
- `git diff --check`：通过。
- `yarn test ApplicationUsageAccessPage.test.tsx --watchAll=false --runInBand`：通过。
- `yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.tsx --watchAll=false --runInBand`：通过，共 3 个 test suites / 29 个 tests。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `yarn test ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --watchAll=false --runInBand`：通过；`ApplicationAccessServiceCredentialGovernancePanel.tsx` statements 88.95%、branches 80.72%、functions 97.5%、lines 88.99%。
- `NODE_OPTIONS=--max-old-space-size=3072 yarn build`：通过。前两次 `yarn build` 在本机 Windows 环境被系统以 `3221226505` 终止且没有编译错误栈；清理残留 `build-temp` 后使用较保守 heap 上限重跑，最终 exit 0，项目脚本成功将 `build-temp` 移动为 `build`。

## Browser Smoke

未执行本地 browser smoke。依据：本 change 只移除/替换默认层文案、过滤诊断 owner evidence 中的 `keep_in_env` 行，不改 CSS、布局、路由、交互结构或 API 调用；相关 UI 可观察行为已由 Jest 覆盖。390px/1440px 运行态截图验证留给部署后 spot。

## 覆盖率

已运行聚焦 coverage，统计对象为受影响实施组件 `src/ApplicationAccessServiceCredentialGovernancePanel.tsx`。结果：statements 88.95%、branches 80.72%、functions 97.5%、lines 88.99%，达到归档前 85% 行覆盖率门槛。

## 脱敏与边界

- 默认层不展示 `P0`、`secure handoff 不在 P0`、`copy-safe metadata` 等内部路线/实现语言。
- 默认层不展示 `部署 Secret`、`外部 secret system`、`.env`、`K8s Secret`、`Vault/KMS` 等底层运维落点。
- 展开诊断不展示 `环境维护项`，不把 `在部署配置或外部 secret system 中维护` 表达为用户动作。
- 不输出 token、Cookie、Authorization、client secret、DSN、raw payload、完整私有 URL、真实账号或完整组织树。

## 剩余风险

- 本 change 未做 60 环境浏览器 smoke；需要由部署后 spot 确认最终截图默认层红框说明已消失。
- locale 中仍保留部分历史 key（例如未渲染的边界说明 key），本 change 不扩大到 locale schema 清理，避免影响其它页面或测试 fixture。
