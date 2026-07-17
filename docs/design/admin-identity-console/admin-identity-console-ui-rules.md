# Admin 身份控制台 UI 规则

本文档固化 `aicodex-admin` 身份控制台路线的前端 UI 取舍，供后续 agent 和开发者执行。它不是新的视觉系统；实现仍以当前 React + Ant Design 项目风格为准。

## 设计来源与边界

- 主准则：Ant Design / Ant Design Pro。Admin 是 React + AntD 风格，中后台页面优先复用 AntD 组件、Ant Design Pro 的信息密度、导航、表格工具栏、表单、状态反馈和 Copywriting 规则。参考：https://ant.design/docs/spec/introduce、https://pro.ant.design/docs/overview/
- 补充准则：IBM Carbon 只用于 data table、toolbar、搜索/筛选、列设置、批量操作和数据密度判断。不要迁移 Carbon 视觉。参考：https://carbondesignsystem.com/components/data-table/usage/
- 补充准则：Microsoft Fluent 2 只用于可访问性、焦点顺序、对比度、内容设计和工具型产品的清晰决策路径。不要迁移 Fluent 视觉。参考：https://fluent2.microsoft.design/
- 通用参考：Material Design 3 与 Apple HIG 只用于通用导航、层级、响应式和平台一致性检查，不作为 Admin 主视觉来源。参考：https://m3.material.io/foundations、https://developer.apple.com/design/human-interface-guidelines
- 质量 checklist：Vercel Web Interface Guidelines 只用于语义 button/link、`aria-label`、`focus-visible`、长文本、overflow、URL 状态和 i18n 等前端质量检查，不作为主设计指导。

## 命名与文案

- 用户可见域名使用“身份控制台”，不要再把“企业认证中心”作为本路线产品名。
- 一级菜单优先四字中文业务名，必要时保留短技术词，例如“API 网关”。不要新增抽象“中心”“工作台”“任务中心”“快捷操作”作为显眼主入口。
- 四个 AICodex 产品域使用业务名作为主标签，仓库名只作为二级 code tag：`应用规格 / aicodex-app-spec`、`用量洞察 / aicodex-insight`、`身份控制台 / aicodex-admin`、`API 网关 / aicodex-api`。
- 禁止在用户可见 UI 中出现内部设计术语或实现痕迹，例如“国内云控制台式密度”“对象上下文”“deep link”“只读推导”“当前列表视图”。
- 不用“企业级”堆文案；企业感来自结构、密度、证据链、稳定状态和可操作路径。

## 总览页结构

- 总览首屏优先呈现状态和证据：身份运行状态、接入覆盖、用量归因、授权映射、待核对事项、审计证据。
- `身份资产关系`、`治理任务中心`、`接入预检中心` 等可保留为低噪上下文入口，但不能在总览首屏堆叠成入口墙。
- 没有真实后端处理流时，不写“待处理”；使用“待核对”“待关注”“核对建议”“核对中”“正常”等状态。
- 左侧第一个一级菜单为“身份总览”。如果壳层已有二级结构且该组只有一个子项，应优先收敛为一级项显示。
- 不新增独立“快捷操作”菜单；动作放在标题区、表格工具栏、状态卡或证据行上下文中。

## 表格与工具栏密度

- 数据区优先使用表格、列表、分组工具栏和状态标签，不把核心数据拆成过多小卡片。
- 表格列标题短文案优先；长 ID、仓库名、回调地址等长文本必须支持截断、换行或 tooltip，不得撑破布局。
- 搜索、筛选、列设置、批量操作和导出等工具应位于表格上方工具栏或行上下文，不放到独立入口页。
- AntD `Table` 必须有稳定 `rowKey`；列表、Menu、Tree、状态卡同样避免使用不稳定 index key。

## 首屏与响应式

- 桌面端首屏不得用大 hero 或营销式空白压低核心内容；1440px 宽度下应能同时看到摘要、产品域、待核对事项和至少一组证据/健康信息。
- 移动端以单列流式布局为准，表格可横向滚动，但页面级不得横向溢出。
- 固定格式控件、卡片、表格和工具栏需要明确 `min/max`、grid track 或 overflow 策略，避免状态、标签、长文本导致布局跳动。
- 字体不随 viewport 宽度缩放，按钮和标签要保证中英文长文本可读。

## TypeScript 稳态

- 新增 React 页面、工作台、业务组件、展示组件默认 `.tsx`。
- 新增共享逻辑、类型定义、接口模型、请求/响应结构和数据转换工具默认 `.ts`。
- 新增组件测试默认 `.test.tsx`；新增纯逻辑测试默认 `.test.ts`。
- `web-admin/src` 业务源码不再新增 `.js/.jsx`；保留的 public raw script、CRACO/Node 构建入口等 runtime JS 按现有生成链路或 build-tooling typecheck 管控。
- 不再为了单个 UI change 做全量迁移、格式化或重命名；后续重点是防止业务源码回退到 JS。
- 收口时运行 `web-admin/scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`，并按改动风险运行 `bun run typecheck`、聚焦 Jest、`bun run build`、coverage 和浏览器验证；coverage/build 不作为低风险 UI/文案/样式任务的机械默认项。
