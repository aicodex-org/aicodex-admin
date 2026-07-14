# 实施计划

## 目标与边界

在不修改生产组件、路由、权限、API 契约、依赖和 `yarn.lock` 的前提下，恢复 `web-admin` 全量 Jest 绿灯，并把 Jest、typecheck 与增量 TypeScript gate 纳入 GitHub Actions。

## 1. 修复稳定契约断言

1. 修改 `web-admin/src/AccessCredentialEditLayout.test.ts`，将 className 精确字符串改为 token 集合断言。
2. 修改 `web-admin/src/GroupListPage.test.tsx`，业务页只验证传给 `ListPageTable` 的业务属性；公共 wrapper 继续由 `ListPageTable.test.tsx` 负责。
3. 修改 `web-admin/src/TransactionPages.test.tsx`，按 token 集合验证 embedded table class，并保留列、链接与操作断言。
4. 修改 `web-admin/src/StyleModuleTopology.test.ts`，将 `syncer-edit.less` 与 `credential-edit.less` 纳入当前大型编辑页样式入口清单。
5. RED 证据使用已复现的四个失败 suite；每完成一类修改运行对应聚焦测试，期望从相关断言失败变为通过。

聚焦命令：

```powershell
yarn test --watchAll=false --runInBand AccessCredentialEditLayout.test.ts GroupListPage.test.tsx TransactionPages.test.tsx StyleModuleTopology.test.ts
yarn test --watchAll=false --runInBand ListPageTable.test.tsx
```

## 2. 收敛 Application Access 超时

1. 修改 `web-admin/src/ApplicationAccessMenuPages.test.tsx`，把成功 add/delete 与批量失败 mega tests 按资源、证书/密钥、webhook/event 职责拆分。
2. 对证书/密钥新增验证当前本地 draft 路由 payload；对不返回 Promise 的实际 backend 页面方法，先创建并交给 backend mock 一个 request promise，触发方法后等待该 request，再刷新后续 microtask；不为测试修改生产方法返回值。
3. 将 `wait()` 只保留给没有稳定 request promise 或需要观察最终状态的路径，不提高 Jest timeout。
4. RED 证据为该文件聚焦运行时两个用例稳定超过默认 5 秒；GREEN 后连续运行两次，确认默认 timeout 下稳定通过。
5. 随后执行一次全量 Jest。仅当 `OrganizationEditPage.test.tsx` 仍稳定复现超时，才按新证据调整其明确完成条件。

聚焦命令：

```powershell
yarn test --watchAll=false --runInBand ApplicationAccessMenuPages.test.tsx
yarn test --watchAll=false --runInBand ApplicationAccessMenuPages.test.tsx
```

## 3. 增加 CI 契约与配置

1. 新增 `web-admin/src/FrontendCiGates.test.ts`，读取 `web-admin/package.json` 与 `.github/workflows/build.yml`，验证：
   - `test:ci` 为固定 CI、非 watch、单进程入口；
   - 存在独立 `frontend-checks` job；
   - job 执行 frozen-lockfile install、`yarn typecheck`、事件感知的增量 TS gate 和 `yarn test:ci`；
   - frontend build 同时依赖 `go-tests` 与 `frontend-checks`。
2. 先运行新测试，确认因配置缺失而 RED。
3. 修改 `web-admin/package.json`，只增加 `test:ci` script，不修改依赖和 lockfile。
4. 修改 `.github/workflows/build.yml`，加入 `frontend-checks`；PR 使用 base SHA，push 使用 before SHA，无效时回退 `HEAD^`；checkout 使用足够历史以解析 base。
5. 重跑契约测试，确认 GREEN，并执行 TypeScript typecheck。

聚焦命令：

```powershell
yarn test --watchAll=false --runInBand FrontendCiGates.test.ts
yarn typecheck
```

## 4. 全量验证与记录

在 `web-admin` 目录执行：

```powershell
yarn test:ci
yarn typecheck
node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base --json
yarn typecheck:build-tooling
yarn public-scripts:check
yarn build
```

在仓库根目录执行：

```powershell
openspec validate "stabilize-web-admin-test-baseline-and-ci-gates" --strict
git diff --check
git diff --name-only origin/hfl-test-base...HEAD
git status --short
```

确认 `web-admin/yarn.lock` 与生产组件无 diff，创建中文 `verification.md`。本 change 只改测试、脚本、workflow 与 OpenSpec 文档，生产实现覆盖率门槛记为 N/A。
