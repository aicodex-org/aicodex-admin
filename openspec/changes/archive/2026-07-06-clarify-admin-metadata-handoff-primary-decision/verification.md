## 验证摘要

本 change 只收敛 Admin `Insight Admin Provider 交接` 页 partial 状态默认层的主决策信息、主按钮标签、首个阻断摘要和诊断按钮 aria，不改后端 contract、不新增 API、不改变 copy-safe package schema。

## RED / GREEN

- RED：先更新 `web-admin/src/ApplicationUsageAccessPage.test.tsx`，断言 partial 默认层必须显示“可生成元数据交接包；真实凭据需在 Insight Profile 中绑定 manual/secretRef 凭据解析器后补齐”、主按钮为 `生成元数据交接包`、默认可见首个阻断摘要、诊断按钮 `aria-expanded`；旧实现下测试失败。
- GREEN：调整 `web-admin/src/ApplicationAccessServiceCredentialGovernancePanel.tsx`、zh/en locale 后，聚焦测试通过。

## 自动化验证

- `openspec validate clarify-admin-metadata-handoff-primary-decision --strict`：通过。
- `git diff --check`：通过。
- `yarn test ApplicationUsageAccessPage.test.tsx --watchAll=false --runInBand`：通过，9 tests。
- `yarn test ApplicationUsageAccessPage.test.tsx ApplicationAccessCenter.test.tsx ManagementPage.navigation.test.tsx --watchAll=false --runInBand`：通过，共 3 个 test suites / 29 个 tests。
- `yarn test ApplicationUsageAccessPage.test.tsx --coverage --collectCoverageFrom=src/ApplicationAccessServiceCredentialGovernancePanel.tsx --watchAll=false --runInBand`：通过；`ApplicationAccessServiceCredentialGovernancePanel.tsx` statements 89.08%、branches 81.08%、functions 97.53%、lines 89.13%。
- `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `yarn typecheck`：通过。
- `NODE_OPTIONS=--max-old-space-size=2048 yarn build`：通过。较高 heap 配置下本机 Windows 环境曾以 `3221226505` 终止且没有编译错误栈；清理残留 `build-temp` 后用较低 heap 上限重跑，最终 exit 0，项目脚本成功将 `build-temp` 移动为 `build`。

## Browser Smoke

未执行本地 browser smoke。依据：本 change 不改 CSS、布局、路由、API 调用或导航结构；只改文案、按钮标签、默认阻断摘要和诊断按钮 aria。相关默认层和展开行为已由 Jest 覆盖。390px/1440px 运行态截图验证留给部署后 spot。

## 覆盖率

已运行聚焦 coverage，统计对象为受影响实施组件 `src/ApplicationAccessServiceCredentialGovernancePanel.tsx`。结果：statements 89.08%、branches 81.08%、functions 97.53%、lines 89.13%，达到归档前 85% 行覆盖率门槛。

## 脱敏与边界

- 默认层明确可生成的是元数据交接包，不含真实凭据；真实凭据在 Insight Profile 中绑定 `manual/secretRef` 凭据解析器后补齐。
- 默认层主按钮为 `生成元数据交接包`，不再泛化为 `生成 Admin 交接包`。
- 默认层不展示 `部署 Secret`、`外部 secret system`、`.env`、`P0`、`secure handoff 不在 P0` 等底层或内部路线文案。
- 不输出 token、Cookie、Authorization、client secret、DSN、raw payload、完整私有 URL、真实账号或完整组织树。

## 剩余风险

- 本 change 未做 60 环境浏览器 smoke；需要部署后 spot 确认截图默认层中主按钮和首个阻断摘要符合预期。

## Archive 后验证

- `openspec archive clarify-admin-metadata-handoff-primary-decision -y`：已归档到 `openspec/changes/archive/2026-07-06-clarify-admin-metadata-handoff-primary-decision`，并同步 `admin-enterprise-identity-usage-access-entry` 主规格。
- `openspec validate --changes --strict`：通过。
- `openspec validate --specs --strict`：通过。
- archive 后 final gate 继续运行聚焦 Jest、`git diff --check origin/hfl-test-base...HEAD`、单 commit 检查和 push 审计；最终结果以 closeout 回传为准。
