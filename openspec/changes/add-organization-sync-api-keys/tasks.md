## 1. 后端模型与鉴权

- [x] 1.1 新增 `OrganizationSyncApiKey` Xorm 对象、表注册、明文生成、哈希校验和脱敏返回逻辑
- [x] 1.2 实现组织同步 API Key 的创建、列表、禁用、删除、轮换和使用审计更新方法
- [x] 1.3 扩展 Bearer 鉴权链路，识别 `osak_` 专用 Key 并写入请求上下文，不创建普通用户 session

## 2. 后端 API

- [x] 2.1 新增组织同步 API Key 管理接口和路由，限制为全局管理员或目标组织管理员
- [x] 2.2 新增 `/api/organization-sync/export` 只读导出接口，返回绑定组织、群组和组织应用
- [x] 2.3 让旧组织读取接口在同步 Key 主体下仅返回绑定组织数据，并拒绝组织不匹配访问

## 3. 前端管理入口

- [x] 3.1 新增 `web-admin` 后端请求封装和组织同步 API Key 列表/操作页面
- [x] 3.2 在管理导航中增加“组织同步密钥”入口，并提供创建、轮换、禁用、删除和一次性复制明文交互

## 4. 验证

- [x] 4.1 增加后端单元测试覆盖 Key 生命周期、哈希存储、过期/禁用/组织不匹配拒绝和导出读取
- [x] 4.2 运行 OpenSpec 校验和针对性 Go/前端构建检查，记录结果

## 5. Gateway 兼容性回归

- [x] 5.1 让旧组织读取接口在组织同步 API Key 主体下支持 `p/pageSize` 分页，并在 `data2` 返回总数
- [x] 5.2 实现 `/api/get-groups`、`/api/get-organization-applications` 和 `/api/get-organizations` 的同步 Key 兼容返回语义
- [x] 5.3 增加针对分页 slice 逻辑和 legacy paginator 边界语义的单元测试
