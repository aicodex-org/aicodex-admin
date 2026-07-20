## MODIFIED Requirements

### Requirement: 迁移证据对比构建且不预设体积缩小
change SHALL 保存 CRA 切换前证据，并 SHALL 以同口径记录 Vite 入口、chunk、主要 bundle、静态资源 base 和回退项。后续单元测试 runner迁移 SHALL 继续验证Vite production边界，SHALL NOT把测试配置合入或改变production Vite config。

#### Scenario: 评估 Vite production build
- **WHEN** Vite build 完成
- **THEN** 验证记录 SHALL 列出 CRA/Vite 的入口、JS/CSS 文件数量、raw/gzip 合计和主要 bundle
- **AND** 结论 SHALL NOT 把 bundle 必然变小作为成功条件
- **AND** 任何无依据明显回退 SHALL 在 release candidate 前定位、修复或记录为阻断风险

#### Scenario: 交付 release candidate
- **WHEN** change 准备推送工作分支
- **THEN** OpenSpec strict、diff check、typecheck、build-tooling typecheck、incremental TS、全量 Vitest、public scripts、lint、production build 和浏览器 smoke SHALL 有新鲜证据
- **AND** 记录 SHALL 不包含完整私有 URL、Cookie、token、账号密码或响应体

#### Scenario: 单元 runner迁移保持Vite配置隔离
- **WHEN** `web-admin`从Jest迁移到Vitest
- **THEN** Vitest SHALL 使用独立typed config与test-only support
- **AND** `vite.config.ts`的dev server、proxy、base、production target与`web-admin/build`契约 SHALL 无行为修改
