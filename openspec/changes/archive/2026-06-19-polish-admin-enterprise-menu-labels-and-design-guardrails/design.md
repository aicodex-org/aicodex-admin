## Context

企业认证中心当前左侧一级菜单已经收敛到业务域分组，但中文标签仍混有“组织与账号”“身份源”“权限与角色”等长度和语气不统一的命名。路线台账和 `reframe-admin-enterprise-ia-visual-system` 已明确后续不应再通过新增“中心/工作台/任务中心/快捷入口”等抽象主入口表达能力，本 change 负责把该规则落到仓库规则和导航自动化测试。

## Goals / Non-Goals

**Goals:**
- 将常规中文一级菜单统一为四字业务名，保持侧栏和组织导航配置树一致。
- 保留 `LLM AI/Gateway` 这类专有技术词的可识别性，通过测试 allowlist 明确例外。
- 用测试阻止新增明显抽象一级入口，避免后续 worker 只靠菜单扩张表达能力。
- 同步 `zh` / `en` locale，不让中文模式或英文模式出现硬编码 fallback。

**Non-Goals:**
- 不新增、删除或重新分配路由。
- 不改动 OAuth/OIDC、Provider、Gateway、同步或审计写链路。
- 不接管 `reframe-admin-enterprise-ia-visual-system` 或 `propose-admin-enterprise-identity-governance-experience-layer` 的 active change 写集。
- 不做大视觉重构或新的工作台页面。

## Decisions

1. **仅改 locale 标签，不改 group key 和路由 key。**
   - Rationale: `navItems` / `userNavItems` 依赖稳定叶子 key，一级 group key 也被测试用于 selection；本次只是用户可见命名收敛。
   - Alternative considered: 重命名 group key。该做法会扩大兼容风险，不服务本次目标。

2. **测试规则基于运行时导航和配置树的顶层标签。**
   - Rationale: 后续 worker 无论改侧栏还是配置树，都应触发同一 IA 门禁；测试能直接覆盖真实 i18n 输出。
   - Alternative considered: 只在文档约束。文档无法在 PR/worker 验证中自动失败。

3. **专有技术词使用显式 allowlist。**
   - Rationale: `LLM AI/Gateway` 是已有产品术语，强行改成四字中文会降低识别度；allowlist 让例外可审查。
   - Alternative considered: 允许任意英文或斜杠菜单。该做法会放松中文 IA 规则。

## Risks / Trade-offs

- [Risk] 四字规则过硬可能误伤未来确有必要的专有业务域。→ Mitigation: 测试 allowlist 必须显式添加并解释例外，迫使 reviewer 看到取舍。
- [Risk] 只改一级菜单不会解决所有页面标题或叶子文案问题。→ Mitigation: 本 change 范围只覆盖一级菜单；页面标题和叶子文案保留给后续业务域 polish。
- [Risk] 浏览器验证依赖本地 tooling，可能受登录态或端口占用影响。→ Mitigation: 保留自动化门禁为主证据，浏览器 tooling blocker 在 verification/report 中明确记录。
