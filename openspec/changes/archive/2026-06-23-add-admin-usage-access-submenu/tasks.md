## 1. 现状阅读与测试先行

- [x] 1.1 阅读 `ApplicationAccessCenter`、服务凭据治理前端 client、导航、路由、workspace tab、相关测试和 zh/en locale，确认可复用边界。
- [x] 1.2 先新增或扩展聚焦测试，覆盖 `用量接入` 路由、导航标签、服务凭据治理配置、保存、诊断、交接包、加载/错误/空态和脱敏展示，并确认测试按预期失败。

## 2. 页面与导航实现

- [x] 2.1 新增 `/application-usage-access` TSX 页面和抽出的服务凭据治理面板，复用既有治理契约承接状态、治理配置、保存配置、诊断/预检、交接包预览、owner 边界和基础状态。
- [x] 2.2 更新路由、企业导航配置、组织导航配置树、workspace tab 标题和权限过滤所需 route key。
- [x] 2.3 同步 zh/en locale 和必要样式，确保页面不硬编码新增用户可见文案，且桌面/移动布局不溢出。

## 3. 验证与交付记录

- [x] 3.1 运行 focused Jest/coverage、增量 TypeScript 门禁、`yarn typecheck`、必要 build、`openspec validate` 和 `git diff --check`。
- [x] 3.2 启动本地预览并完成浏览器验证，记录 preview URL、截图、桌面/移动路由检查、console/overflow 结果。
- [x] 3.3 更新 `verification.md`，记录命令、结果、覆盖率、浏览器证据、剩余风险和 release-candidate-only 状态。
