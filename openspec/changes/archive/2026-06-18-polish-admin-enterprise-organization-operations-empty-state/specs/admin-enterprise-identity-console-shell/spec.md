## ADDED Requirements

### Requirement: 组织运营空态与目录质量诊断保持业务可读
Admin 企业认证中心的组织树运营页和组织目录质量页 SHALL 将后端实现 alias 转换为管理员可理解的业务文案，保持只读边界可见，并让移动端状态摘要足够紧凑，使核心列表或诊断区域容易到达。

#### Scenario: 无可管理部门时不直出 raw alias
- **WHEN** 管理员打开组织树运营页或组织目录质量页，且后端返回 `scope_has_no_manageable_departments` 或等价的无可管理部门 alias
- **THEN** 主空态或诊断文案 SHALL 说明当前组织在当前范围内暂无可管理部门
- **AND** 文案 SHALL 包含只读边界或下一步核对建议，引导核对组织范围、来源连接或管理员权限
- **AND** 页面 SHALL NOT 将 raw implementation alias 作为主 Alert、表格、筛选、标签或空态文案展示

#### Scenario: 目录质量原因筛选保持稳定值但展示可读标签
- **WHEN** 组织目录质量返回稳定的 `reasonAliases`、`reasonCodes`、修复动作 alias、blocked reasons 或 cannot-infer aliases
- **THEN** UI SHALL 在 API 筛选和导出 payload 中保留原始稳定值
- **AND** 可见筛选标签、表格标签、摘要标记和空态/诊断文案 SHALL 使用业务可读文案或可读兜底标签，而不是 raw snake-case implementation aliases

#### Scenario: 移动端组织运营摘要让位于诊断区域
- **WHEN** 管理员在窄移动视口打开组织树运营页
- **THEN** 状态摘要 SHALL 使用紧凑的响应式间距和卡片尺寸
- **AND** 当存在数据或空态诊断时，组织节点列表或诊断区域 SHALL NOT 被过高的状态卡堆叠压到过深位置
- **AND** 技术 lineage 字段 SHALL 继续在详情区域可用，但不主导默认摘要
