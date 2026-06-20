# 验证记录

## 2026-06-21 rebase 刷新

- 基线：`origin/hfl-test-base` = `830cfda08f721ae45d6fce5bcf5d51c4a450538a`。
- 验证时提交（更新本记录前）：`d8b869dbbc2c48df9505c4a7e296b562a84397a5`。
- 本轮将 MCP Server release candidate rebase 到最新基线后重新执行以下验证；验证结论只覆盖本 change 的前端 TSX 迁移、测试、OpenSpec 和构建层级。
- 最新基线新增 Admin 服务凭据归属边界和组织同步 API Key 归档文档，与本 change 写集无冲突。

## TDD 证据

- RED：`cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/ServerListPage.test.tsx src/ServerEditPage.test.tsx`
  - 结果：失败，`ServerListPage.tsx` 和 `ServerEditPage.tsx` 尚不存在，旧 `.js` 文件仍存在；编辑页 null server guard 也按预期失败，证明测试能捕获迁移前缺口。
- GREEN：`cd web-admin; yarn test --watchAll=false --runInBand --runTestsByPath src/ServerListPage.test.tsx src/ServerEditPage.test.tsx`
  - 结果：rebase 后通过，2 个 test suites / 21 个 tests。

## OpenSpec 校验

- `openspec validate migrate-llm-ai-gateway-mcp-server-to-typescript --strict`
  - 结果：rebase 后通过，change valid。
- `openspec validate --changes --strict`
  - 结果：rebase 后通过，4 个 active changes 全部通过。
- `openspec validate --specs --strict`
  - 结果：rebase 后通过，28 个 specs 全部通过。

## 前端 TypeScript 与构建

- `cd web-admin; node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  - 结果：rebase 后通过；未新增 React `.js/.jsx` 或 JSX `.test.js`。
- `cd web-admin; yarn typecheck`
  - 结果：rebase 后通过，`tsc --noEmit` 成功。
- `cd web-admin; yarn build`
  - 结果：rebase 后通过，生产构建成功；仅见既有 Browserslist 过期、bundle size 偏大和 `fs.F_OK` deprecation warning。

## 单测覆盖率

- 命令：`cd web-admin; yarn test --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ServerListPage.tsx --collectCoverageFrom=src/ServerEditPage.tsx --runTestsByPath src/ServerListPage.test.tsx src/ServerEditPage.test.tsx`
- 统计对象：本 change 迁移后的 `ServerListPage.tsx` 和 `ServerEditPage.tsx`。
- rebase 后结果：
  - `ServerListPage.tsx`：statements 100%，branches 95.65%，functions 100%，lines 100%。
  - `ServerEditPage.tsx`：statements 100%，branches 93.33%，functions 100%，lines 100%。
- 结论：两个受影响实现文件均超过 85% 覆盖率门槛。

## Git 与文档卫生

- `git diff --check`
- `git diff --check origin/hfl-test-base...HEAD`
  - 结果：rebase 后均通过，无 whitespace error。

## 证据层级与剩余风险

- 本 change 是前端 TSX 迁移，验证覆盖源码、类型检查、单测、覆盖率和生产构建层级。
- 未执行浏览器人工验证或真实后端运行态 smoke；本 change 未修改后端 API、权限、认证、Gateway projection、MCP Store、站点范围、治理规则、规则表格、真实密钥或生产/类生产配置。
- `MCP Store` 迁移当前仍在独立 release candidate 分支，未纳入本分支；后续 archive/合入顺序需要主控协调。
