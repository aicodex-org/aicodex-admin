# 实施前审查

## 结论

- 状态：`READY`
- Blocking：0
- Fixable：0（本轮已修复1项）
- Decision Needed：0

## 已修复问题

1. 初稿只要求“本change触达的”增量TypeScript命令使用Bun，可能在未来sync-specs后保留仍代表当前入口的Yarn字面量。现已收紧为：现行标准命令全部迁移为Bun runner，验证层级保持不变，历史archive不追溯改写；对应tasks增加主规格一致性审计。

## 审查摘要

- Artifacts：proposal、design、7个delta capability specs和tasks描述同一平台化cache交付目标，未保留模板、TODO、未决产品问题或写集外设计文档。
- 基线与版本：新分支基于 `origin/hfl-test-base@51359c78`；本机Bun为1.3.14。base与reference candidate均为38个production dependency、34个devDependency和1个resolution，名称/版本差异为0；candidate精确声明 `bun@1.3.14`并只trust Husky。
- 平台边界：Windows标准入口使用普通install、默认持久cache并拒绝显式custom cache；Linux CI/Docker使用frozen install。两端最多5次同workspace/cache重试，逐次错误可见，lock漂移立即停止，tree不完整不得成功。
- 证据层级：用户手工结果作为manual evidence记录，不冒充自动矩阵；worker仍须完成3个默认持久cache fresh `node_modules`样本。历史空/隔离cache失败保留为已知压力限制，不作为标准路径单点否决。
- 复用边界：design已按A直接复用/B修改复用/C废弃列出lock、package、安装器、CI/Docker/Makefile/local-dev/Playwright、Husky、tests、docs与旧OpenSpec。实施先恢复tests形成RED，再选择性恢复production候选，禁止从零重写等价产出。
- TDD：先恢复/调整reference测试并确认base因缺少安装器/平台策略而RED；再恢复候选主体并只修改Windows普通install、Linux frozen、custom-cache guard与日志。版本、lock、完整性、Husky和owner迁移测试继续复用。
- CI/运行态：GitHub Actions与Docker均从统一入口自动走Linux frozen；本地质量完成后必须跨线程发送 `RUNTIME_GATE_READY`，controller时点授权前禁止访问60。60只使用同一RC branch/lock、production Dockerfile、独立Compose/端口/临时DB和定向清理。
- 失败处理：标准路径失败先按systematic-debugging完成错误链、稳定复现、工作/失败路径对照、单一假设、RED、可逆修复和重验；只有无可控修复或涉及产品/安全/数据/现有60服务时才请求controller决策。
- 安全与卫生：不输出registry、credential、token、Cookie、DSN、私有URL或raw payload；不删除用户完整 `node_modules`、默认全局cache、证据cache或旧reference branch；不修改业务页面、Go/schema/auth/provider、旧archive、技术债路线或test分支。
- 收敛：release-candidate-only阶段保持active，不archive、不push base/test、不删除新/旧工作分支或释放lease；最终RC为latest base + 1逻辑commit并只push新工作分支。

## 验证

- `openspec validate adopt-web-admin-bun-with-platform-cache-policy --strict`：通过。
- `openspec validate --changes --strict`：1/1通过。
- `git diff --check`：通过。
- Placeholder扫描仅命中tasks中的“TBD审计”字面量，不是占位符；proposal/design/specs无模板注释、TODO、FIXME或未决问题。
- 当前tracked diff仅为新change artifacts，旧NO-GO archive和技术债路线未修改。

## 非阻塞实施注意事项

- fixed workspace当前有用户保留的ignored完整Bun `node_modules`；聚焦TDD可使用它运行Jest，但真实Windows安装证据必须来自后续固定candidate commit的独立无 `node_modules` worktree。
- 3个Windows样本共享现实默认持久cache，证明日常支持路径而非冷cache性能；不得与历史空cache失败耗时计算性能收益。
- 本机不承担60 Docker证据；真实no-cache production build只在controller后续明确授权的60隔离阶段执行。
- `docs/admin-technical-debt-baseline-2026-07-14.md`在RC阶段保持不变，后续仅在明确closeout授权时依据最终采用状态更新。
