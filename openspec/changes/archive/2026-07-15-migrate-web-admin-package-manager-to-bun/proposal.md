## Why

`web-admin` 已完成 Vite 构建与显式 Jest 解耦，但依赖安装、CI cache、Docker 和开发入口仍绑定 Yarn Classic。Bun 只有在受控 benchmark 证明安装阶段有显著收益且完整工具链保持兼容时才值得成为新的单一 package manager 真值；本 change 的隔离验证已复现 Bun frozen lifecycle 安装失败，因此结论为 NO-GO。

## What Changes

- 建立可复现、多次运行的 Yarn/Bun 对照 benchmark，覆盖冷安装、缓存安装、script startup、完整 Jest、Vite production build 和 Docker build；记录固定工具版本、样本原始值、中位数、噪声控制与脱敏限制。
- 固化 GO 阈值：Yarn 对照下，Bun 的隔离冷安装中位数必须至少改善 20%；若另有同边界的真实 CI dependency 多次样本，可作为补充证据但不替代冷安装门禁。完整 Jest 与 Vite build 的中位数均不得出现超过 10% 且无法解释的回退；frozen lock、Jest discovery、postinstall/native/Web3/Cypress、public scripts 或构建兼容门禁任一失败即 NO-GO。
- 本次 NO-GO 停止迁移，保留 Yarn、`yarn.lock` 和可复核证据，不把未达标候选包装为完成迁移。
- 固化未来重新评估的 GO 约束：只有收益与全部兼容门禁成立时，后续独立 change 才可把 package metadata、唯一 lockfile、CI、Docker、本地入口和维护文档切换到 pin Bun，且不得长期双真值。
- 保持 Vite + Jest；Bun 只负责 package management 和 npm scripts orchestration，不迁移到 `bun test` 或 Vitest。
- 不升级 React、React Router、Testing Library、Jest、Vite 或业务依赖，不修改业务页面、认证/Provider 契约和 Go 后端。

## Capabilities

### New Capabilities
- `web-admin-package-manager-toolchain`: 定义 package manager 候选的量化决策、单 lockfile 真值、frozen install、CI/Docker/本地入口和兼容验证契约。

### Modified Capabilities

无。本次 NO-GO 不修改现有 Vite、Jest、CI、TypeScript、local-dev 或业务 capability 的活动命令契约。

## Impact

- 新增 OpenSpec package-manager 评估门禁与脱敏 benchmark/compatibility 证据，不修改生产业务代码。
- `web-admin/package.json`、`yarn.lock`、CI workflow、Dockerfile、Makefile、local-dev/deploy、维护文档和契约测试均保持当前 Yarn 实现。
- 不改变浏览器 API、后端 API、路由、认证 callback、静态产物目录 `web-admin/build`、开发端口 `7002` 或真实 provider 数据语义。
- 本机没有 Docker CLI，且 Bun clean install 已在进入 build 前失败；Dockerfile/build-context 只完成静态审计，不声称真实 Docker build 已通过。
