## 1. 提案和规格

- [x] 1.1 核对已归档 admin projection publisher 和 API projection-status 语义，确认 refresh 只补 freshness 稳定性
- [x] 1.2 编写 proposal/design/spec/tasks，明确 admin 只负责 projection producer/refresh，不承担 gateway 授权事实或 Insight 补算
- [x] 1.3 运行 `openspec validate stabilize-admin-gateway-projection-refresh-worker --strict`

## 2. Refresh worker 实现

- [x] 2.1 增加 refresh worker 配置读取与安全默认值，包括 enable、interval、initial delay、batch size
- [x] 2.2 实现 organizationId 枚举 store，只返回存在同步批次来源版本的组织
- [x] 2.3 实现 gateway projection refresh worker，复用 `GatewayProjectionService.BuildAndPublishOrganization`
- [x] 2.4 在 admin 进程启动时启动 worker，并保持 publisher disabled 时不执行发布
- [x] 2.5 确保 worker 日志脱敏，不输出 endpoint、token、Cookie、完整认证头或私有 URL

## 3. 测试

- [x] 3.1 补充配置单测，覆盖默认 900 秒、小于 TTL、非法 interval 回退或禁用
- [x] 3.2 补充 organization 枚举和 worker 单测，覆盖只刷新有同步批次来源版本的组织、同轮去重和非重入
- [x] 3.3 补充 refresh 续期单测，覆盖组织未变化时同 `orgVersion` + 新 `projectionBatchId/projectionVersion/freshness`
- [x] 3.4 补充 tombstone 单测，覆盖 active subjects 和 disabled/deleted/conflicted lifecycle subjects 同批全量输出
- [x] 3.5 补充 worker 发布单测，覆盖 accepted/idempotent、provider unavailable、配置缺失和日志脱敏边界
- [x] 3.6 回归 WeCom 同步成功后触发 publish 的既有单测

## 4. 验证和 60 环境

- [x] 4.1 运行聚焦 Go 测试
- [x] 4.2 运行 `openspec validate stabilize-admin-gateway-projection-refresh-worker --strict`
- [x] 4.3 运行 `git diff --check`
- [x] 4.4 更新 `verification.md`，用中文记录本地验证、60 环境验证步骤和脱敏证据
- [x] 4.5 部署到 60 测试环境，验证 projection-status 在超过 1800 秒后仍保持 ok
