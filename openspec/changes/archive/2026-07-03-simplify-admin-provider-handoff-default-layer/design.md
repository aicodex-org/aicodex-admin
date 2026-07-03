## 目标

- 让默认首屏更像实施交接工作台，而不是 wrapper/owner/capability 巡检报告。
- 保留诊断能力，但把技术细节放到用户主动展开的位置。
- 继续遵守 Admin P0 边界：copy-safe metadata handoff + owner/readiness/diagnostic 摘要 + manual/secretRef binding 指引。

## 非目标

- 不新增或修改 Admin handoff API contract。
- 不实现 Admin secure handoff、token broker、短链、扫码、凭据发行/撤销或 secretRef 生命周期。
- 不把 Admin 做成 API/Gateway 用量 provider 配置中心。
- 不改 API、Gateway 或 Insight 项目契约。

## 设计决策

### 默认层只保留决策信息

页面默认层保留一个状态摘要区域和主动作区域：

- 交接状态：可生成、部分缺失、不可生成或加载/错误态。
- 目标消费方：Insight。
- 包类型：copy-safe metadata。
- 下一步：用人话描述生成、导入 Insight Profile、补齐 manual/secretRef binding 或查看阻断原因。
- 主 CTA：`生成 Admin 交接包`。

### 诊断信息默认收起

逐项 capability、wrapper route、owner alias、stable/blocked alias 和 owner evidence 明细保留给诊断使用，但默认折叠在 `诊断详情` 或 `技术细节` 下。这样实现不丢失排障证据，也不会把首屏变成技术巡检清单。

### 缺失项用单一摘要表达

当状态为 partial/missing/blocked 时，默认层只展示一条阻断摘要和一条修复建议，例如“缺少 resolver 凭据引用，需要在部署配置或外部 secret system 维护”。内部 reason code 和 alias 只在详情里出现，避免操作者先理解内部 key 才能行动。

### 安全与脱敏

页面继续只展示 copy-safe metadata。默认层和详情区都不得展示 token、Cookie、Authorization、client secret、DSN、raw payload、完整私有 URL、真实账号或完整组织树。生成/复制交接包仍使用既有脱敏结果。

## 发布与验证

这是前端呈现层收敛。验证重点为：

- 默认层不出现旧入口和技术巡检卡片。
- 展开详情后仍可查看必要诊断信息。
- copy-safe package 生成/复制行为不回退。
- 390px 和桌面视口无页面级横向溢出，console error=0。
