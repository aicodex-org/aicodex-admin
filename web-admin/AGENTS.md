# web-admin 前端工作指引

## 技术栈与迁移原则

- Admin 前端使用 React 18 + Ant Design + CRACO，并采用渐进 TypeScript；当前允许 `.js`、`.ts`、`.tsx` 共存。
- 新增 React 页面、工作台、业务组件、展示组件默认使用 `.tsx`。
- 新增纯逻辑、类型定义、接口模型、请求/响应结构、数据转换工具默认使用 `.ts`。
- 既有 `.js`、`.jsx`、`.test.js` 不因为后缀单独大范围迁移；只有当前需求触碰且迁移风险低时才渐进迁移，并保持 diff 可 review。
- 避免无解释的 `any`；优先使用明确接口、局部类型别名、`unknown` + 类型收窄或可辨识联合类型。

## 测试文件规则

- 新增 `.tsx` 组件对应测试默认使用 `.test.tsx`。
- 测试里包含 JSX、`render(<Component />)` 或需要校验 React 组件行为时，不要新建 `.test.js`；除非报告中明确记录 Jest/TypeScript blocker、替代验证和后续处理路径。
- 新增 `.ts` 纯逻辑对应测试默认使用 `.test.ts`。
- 既有 `.test.js` 可以在未触碰相关实现时保持不变；触碰对应 `.tsx` 或迁移组件时，优先把新测试或低风险增量测试落到 `.test.tsx`。

## UI 与 i18n

- UI 改动优先复用既有企业化布局、Ant Design 组件、状态摘要、表格/筛选/空态/错误态模式，不引入营销式大块布局。
- 企业认证中心路线新增页面或工作台时，面向管理员使用清晰业务标签；不要把内部实现术语、投影细节或 provider 原始字段直接作为主导航/主标题。
- 企业认证中心一级菜单优先四字中文业务名；专有技术词可中英混合，例如 `LLM AI/Gateway`。不要新增抽象“中心/工作台/任务中心/快捷入口”作为主入口，新增能力优先落到详情、抽屉、表格工具栏、向导步骤或对象上下文。
- 新增或修改用户可见文案、导航、菜单、按钮、状态、错误信息时，同步维护 `zh` / `en` i18n，不新增硬编码中英文菜单。
- 交互必须覆盖加载中、空数据、错误、权限不足、提交中、重复提交和长文本溢出等基础状态。

## 验证要求

- 新 change 启动或前端收口时，先在 `web-admin` 下运行：
  `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`
  该门禁会拦截新增 React `.js/.jsx`、新增 JSX `.test.js`、新增纯逻辑 `.js` 等不符合增量 TypeScript 约定的文件。
- 任何 `.ts` / `.tsx` 改动必须在 `web-admin` 下运行 `yarn typecheck`。
- 前端 UI 或行为改动按风险运行聚焦 Jest/coverage、`yarn build` 和浏览器/Playwright 验证。
- 仅文档、规则或 skill 改动不需要运行前端构建；至少运行 `git diff --check`，并人工检查 Markdown 无乱码、无 secrets。

## 禁止事项

- 不要在普通业务任务中顺手修改 `web-admin/package.json`、lockfile、`tsconfig.json`、构建基础设施或全局格式化配置。
- 不要输出或提交 secrets、账号密码、token、Cookie、client secret、私钥、完整连接串或敏感环境信息。
- 不要把 TypeScript 迁移与无关视觉重做、包升级、性能重构或大规模文件重命名混在同一个小任务里。
