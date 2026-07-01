# aicodex-admin 仓库工作指引

## 仓库边界

- 本仓库包含 Admin 后端、`web-admin` 前端、部署与 OpenSpec 文档；修改前先确认当前任务的子项目、分支和写集。
- 不要在无明确授权时触碰 `test`、生产/类生产配置、真实密钥、真实认证链路、OAuth/OIDC 回调执行或破坏性数据操作。
- 涉及前端 React / TypeScript 稳态的细则见 `web-admin/AGENTS.md`，以该文件作为 Admin 前端 worker 的默认约束。

## OpenSpec

- 新增或变更用户可见能力、接口契约、权限/认证边界、导航信息架构或跨模块流程时，先检查 `openspec/` 下现有 active changes 和主规格。
- 不要删除、archive、重写或接管与当前任务无关的 active change。
- 仅文档/规则固化类小改可以不创建新的 OpenSpec change，但报告中应说明未触碰 active change。
- Admin 企业认证中心一级菜单和菜单文档命名优先短中文业务名；专有技术词可在二级菜单、页面标题或说明中保留，例如 `LLM AI`、`MCP`、`Gateway`。不得新增抽象“中心/工作台/任务中心/快捷入口”式主入口，业务能力应沉到对象上下文、抽屉、工具栏、向导步骤或已有流程入口。

## 安全与交付

- 不提交 secrets、账号密码、token、Cookie、client secret、私钥、完整连接串或敏感环境细节。
- 文档、报告和验证记录应脱敏；引用环境时只保留必要的非敏感标识。
- 提交前按改动风险运行验证；文档-only 改动至少运行 `git diff --check` 并检查 Markdown 无乱码、无动态过期状态。
