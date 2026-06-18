## Context

当前组织树运营页已经把技术 lineage 放到可选详情区域，但空树和诊断原因仍可能直接来自后端 alias。后端返回 `scope_has_no_manageable_departments` 时，UI 可能在 Alert、表格、筛选和标签中直出该 alias。组织目录质量页也会在主表和修复计划中直接渲染 reason/action alias。

本 worker 仅限组织运营和目录质量界面，不修改总览页、同步页、导航、后端契约、认证授权、Gateway projection 或 OAuth/OIDC 行为。

## Goals / Non-Goals

**Goals:**

- 将已知稳定 reason/action alias 转换为简洁的管理员业务标签。
- 在 API 请求、导出 payload 和技术证据中保留稳定后端 alias，避免在主 UI 文案中直出 raw alias。
- 增加清晰的“当前组织暂无可管理部门”空态说明，包含只读边界和下一步核对建议。
- 降低组织运营摘要卡高度和移动端堆叠压力，让节点列表和诊断表更早出现。
- 在实现前用聚焦测试约束行为。

**Non-Goals:**

- 不修改后端 API 或数据模型。
- 不新增路由、导航入口、总览卡片、同步页改动或修复执行流程。
- 不对本次新增/修改文案之外的 legacy 硬编码文本做大范围 i18n 迁移。
- 不重写全局视觉系统或 `App.less`。

## Decisions

1. 使用小型前端 label helper 转换 reason/action alias。
   - 理由：后端需要保留稳定 alias 作为契约和筛选值，主 UI 可以把已知 alias 映射成本地化业务标签。
   - 备选方案：修改后端 message。拒绝原因：本任务是前端 polish，不能改变后端契约行为。

2. 筛选和请求继续使用 alias value，仅本地化 option label。
   - 理由：筛选必须继续发送稳定 reason code；本次只改变可见标签。
   - 备选方案：在 UI state 中提前替换 alias。拒绝原因：会增加破坏现有接口筛选和测试的风险。

3. 在 `OrganizationTreeOperationsPage` 内做局部摘要卡密度收紧。
   - 理由：当前页面使用较高的 AntD 卡片，移动端单列堆叠。降低 body 高度、移动端双列和更紧凑标题可以改善密度，不需要改全局设计系统。
   - 备选方案：新增共享摘要组件。拒绝原因：本 worker 范围很窄，新增共享组件不必要且可能越过允许写集。

## Risks / Trade-offs

- [Risk] 未知后端 alias 可能没有显式映射。-> Mitigation：增加 snake_case 可读化兜底，并显式映射无可管理部门场景。
- [Risk] 测试可能过度耦合视觉实现。-> Mitigation：断言稳定 DOM class/style 信号和业务文案，不断言像素坐标。
- [Risk] zh/en locale 可能不一致。-> Mitigation：成对新增 locale key，并保持语义等价。
