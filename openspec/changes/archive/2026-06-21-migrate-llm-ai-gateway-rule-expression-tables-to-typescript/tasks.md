## 1. OpenSpec

- [x] 1.1 补齐 `migrate-llm-ai-gateway-rule-expression-tables-to-typescript` 的 proposal、design、tasks 和 spec delta。
- [x] 1.2 运行 `openspec validate migrate-llm-ai-gateway-rule-expression-tables-to-typescript --strict`。
- [x] 1.3 完成实施前 review，并修复 proposal/design/tasks/spec 中清晰可修的问题。

## 2. TDD 测试

- [x] 2.1 先新增 `.test.tsx` 迁移门禁测试，确认四个 `.tsx` 文件存在且 legacy `.js` 文件不存在；迁移前该测试应按预期失败。
- [x] 2.2 新增 WAF 表格测试，覆盖默认规则/restore、添加、删除、上下移动和字段编辑。
- [x] 2.3 新增 IP 表格测试，覆盖默认规则/restore、tags trim + 逗号拼接、操作符编辑、添加、删除和上下移动。
- [x] 2.4 新增 User-Agent 表格测试，覆盖默认 UA、blur 空白归一化、操作符编辑、添加、删除和上下移动。
- [x] 2.5 新增 IP Rate 表格测试，覆盖 restore、name 编辑、rate/block duration 的字符串化回写，并确认不出现添加/删除/上下移动操作。

## 3. TypeScript 迁移

- [x] 3.1 将 `web-admin/src/table/WafRuleTable.js` 重命名为 `WafRuleTable.tsx`，补充局部类型并保持行为不变。
- [x] 3.2 将 `web-admin/src/table/IpRuleTable.js` 重命名为 `IpRuleTable.tsx`，补充局部类型并保持行为不变。
- [x] 3.3 将 `web-admin/src/table/UaRuleTable.js` 重命名为 `UaRuleTable.tsx`，补充局部类型并保持行为不变。
- [x] 3.4 将 `web-admin/src/table/IpRateRuleTable.js` 重命名为 `IpRateRuleTable.tsx`，补充局部类型并保持行为不变。
- [x] 3.5 确认 `RuleEditPage` 的无后缀 import、表格 props、规则行 shape、i18n key、按钮和 `onUpdateTable(table)` 回调语义保持兼容。

## 4. 验证

- [x] 4.1 运行 OpenSpec strict 校验、`openspec validate --changes --strict` 和 `git diff --check`。
- [x] 4.2 在 `web-admin` 运行增量 TypeScript gate：`node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`。
- [x] 4.3 在 `web-admin` 运行 `yarn typecheck`。
- [x] 4.4 在 `web-admin` 运行表达式表格 focused Jest/coverage，覆盖率统计对象为迁移后的四个表格组件。
- [x] 4.5 如导入边界或构建行为受迁移影响，运行 `yarn build`。
- [x] 4.6 在 `verification.md` 记录命令、覆盖率对象、结果、证据层级和剩余风险，验证记录保持脱敏。

## 5. Release Candidate 收口

- [x] 5.1 完成归档前 review，确认文档语言、主规格同步、注释、覆盖率、无越界写集和交付单元边界。
- [x] 5.2 已获得 `self-closeout=true` 授权后，按顺序执行 archive、单 commit 收敛、工作分支 push、ff-only 合入 `hfl-test-base`；不 push/merge `test`。
