## 1. 契约与行为测试

- [x] 1.1 在 `ApplicationUsageAccessPage.test.tsx` 补充 RED：选择器在主 CTA 之前、无默认选择、未选择 CTA 禁用且提示选择组织。
- [x] 1.2 补充 RED：loading、empty、error、submitting 状态可感知且生成不可重复。
- [x] 1.3 补充 RED：成功回读生成时的组织展示名/alias；更换组织立即清除旧 success/result 并恢复重新生成要求。
- [x] 1.4 保留并验证 runtime capability warning 不阻断 package generation，且敏感 material 不出现在页面或测试证据。

## 2. 页面操作流实施

- [x] 2.1 将授权目标组织选择器、范围说明、状态提示和唯一主 CTA 组合为线性操作区，保证 DOM/视觉/键盘顺序为选择后生成。
- [x] 2.2 生成成功时保存 copy-safe 组织快照并显示“本接入包授权给”；长展示名/alias 使用省略与 Tooltip。
- [x] 2.3 组织变化、重新提交或加载失败时清除旧 package success/result；页面刷新仍保持无默认选择。
- [x] 2.4 用既有 AntD 与同页样式收口 1440/390 布局、自然换行、页面级 overflow 和反馈可感知性。

## 3. 文案与安全复核

- [x] 3.1 同步 zh/en locale：授权目标组织、范围说明、生成/重新生成、下一步与成功授权摘要语义一致。
- [x] 3.2 复核服务端请求参数、target 校验、grant/packageHash/runtime claims、审计 actor、Provider scope 以及 package/runtime warning 语义无变化。
- [x] 3.3 复核 UI、测试、截图和验证记录不包含 raw package、grant、token、Cookie、credential、完整 secretRef、私有 URL 或 raw row。

## 4. 自动化与 UI 验证

- [x] 4.1 运行 focused Jest（必要时 coverage）、incremental TypeScript gate、`yarn typecheck` 与 `yarn build`。
- [x] 4.2 运行 OpenSpec change/changes strict、`git diff --check`，并确认任务外文件和生成残留为零。
- [x] 4.3 使用本地前端代理或获准的 60 Admin 部署完成真实 UI review：1440/390、Tab/Enter、loading/empty/error/success、console、失败网络和页面级 overflow。
- [x] 4.4 若验证成功状态生成测试接入包，只记录脱敏状态；能够撤销时立即撤销并记录 cleanup，否则记录 TTL 风险。

## 5. RC 交付

- [x] 5.1 更新 `verification.md`，记录分层验证、浏览器证据、60 部署记录边界、fixture cleanup 与剩余风险。
- [x] 5.2 确认最新 `origin/hfl-test-base` 上正好 1 个逻辑 commit，准备普通非强制 push 工作分支；不 archive、不合入 base/test、不删除分支。
