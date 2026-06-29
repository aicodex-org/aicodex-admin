## 1. 后端统一状态模型

- [x] 1.1 梳理现有 WeCom 和 Feishu/Lark 组织同步配置 store、响应字段和冲突 guard，确定统一 Provider adapter 输入。
- [x] 1.2 新增统一组织通讯录来源模型，包含 source type `wecom`、`lark` 和预留 `dingtalk`，状态 `available`、`owned`、`occupied`、`ambiguous`，以及 reason code `source_occupied`、`source_ambiguous`、`source_status_unavailable`。
- [x] 1.3 实现 WeCom 和 Feishu/Lark 的统一 Provider adapter，返回脱敏后的已配置来源摘要，不包含 secret、token、Cookie 或原始外部 API 响应。
- [x] 1.4 实现统一状态 service，按业务组织聚合已注册 Provider adapter，并分类 `available`、`owned`、`occupied` 和 `ambiguous`。
- [x] 1.5 暴露统一后端状态 API，返回当前组织状态和当前 Provider 候选组织摘要，同时保留既有 WeCom/Feishu 响应字段兼容前端 rollout。

## 2. 后端执行判定接入

- [x] 2.1 实现保存配置、手动同步和定时同步共用的执行判定方法，返回 `allowed`、安全 reason code 和脱敏来源摘要。
- [x] 2.2 将 WeCom 同步配置保存 guard 替换为统一执行判定，在持久化配置前拒绝不允许的写入。
- [x] 2.3 将 WeCom 手动同步 guard 替换为统一执行判定，在创建 sync run 前拒绝不允许的请求。
- [x] 2.4 将 Feishu/Lark 同步配置保存 guard 替换为统一执行判定，在持久化配置前拒绝不允许的写入。
- [x] 2.5 将 Feishu/Lark 手动同步 guard 替换为统一执行判定，在创建 sync run 前拒绝不允许的请求。
- [x] 2.6 更新组织同步 scheduler dispatch，在创建 Provider sync run 前调用统一执行判定，并记录安全的 skipped/failed reason code。
- [x] 2.7 确保状态查询失败时所有写入和执行路径均 fail closed，且不会暴露 Provider 凭据或原始 Provider 响应。

## 3. 前端共享状态消费

- [x] 3.1 新增统一组织通讯录来源状态契约的前端类型、API client 逻辑和 helper 函数。
- [x] 3.2 新增共享状态展示 helper/component，用一致的中英文用户可见文案渲染 available、owned、occupied、ambiguous 和 unavailable 状态。
- [x] 3.3 更新企业微信组织同步页，使用统一状态处理默认组织恢复、候选组织过滤、冲突/异常提示和操作禁用。
- [x] 3.4 更新飞书/Lark 组织同步页，使用统一状态处理默认组织恢复、候选组织过滤、冲突/异常提示和操作禁用。
- [x] 3.5 确保 `ambiguous` 组织在已选中时保持可见，并展示为数据异常而非普通占用，同时保持保存、手动同步和 scheduler 相关操作禁用。
- [x] 3.6 保持当前页面导航不变，本 change 不新增独立组织通讯录来源状态菜单页。

## 4. 测试

- [x] 4.1 补充后端 service 测试，覆盖无来源、当前来源独占、被其他来源占用、异常双来源和预留 DingTalk source type。
- [x] 4.2 补充后端 controller/API 测试，验证安全响应形态且不包含 secret、token、Cookie 或原始外部 Provider payload。
- [x] 4.3 补充 WeCom 和 Feishu/Lark 配置保存、手动同步拒绝路径测试，覆盖 `source_occupied`、`source_ambiguous` 和 `source_status_unavailable`。
- [x] 4.4 补充 scheduler 测试，验证 occupied、ambiguous 和 unavailable source state 不会创建 Provider sync run，并记录安全 reason code。
- [x] 4.5 补充前端测试，覆盖共享状态 helper/component 以及 WeCom/Feishu 页面在 occupied 和 ambiguous 组织上的行为。
- [x] 4.6 运行被触碰 `web-admin` 模块需要的 TypeScript、lint 和聚焦前端测试命令。

## 5. 验证与交付

- [x] 5.1 运行 `openspec validate "unify-organization-directory-source-status" --strict` 和 `openspec validate --changes --strict`。
- [x] 5.2 运行后端聚焦测试，覆盖统一状态 service、Provider 保存/手动同步 guard 和 scheduler dispatch guard。
- [x] 5.3 运行前端聚焦测试，并针对 WeCom 和 Feishu/Lark 同步页做本地浏览器 smoke。
- [x] 5.4 验证异常双配置 fixture 展示数据异常，并在 UI、API 响应和日志中 fail closed 且不泄漏敏感数据。
- [x] 5.5 记录 60 环境 rollout 说明和人工 smoke 步骤，不提交 secret 或环境专属凭据。
