## MODIFIED Requirements

### Requirement: Vite 作为 web-admin 默认应用开发与构建工具链
`web-admin` SHALL 使用 typed Vite 配置作为应用开发与 production build 的唯一默认工具链，同时 SHALL 保持 `bun run start`、`bun run build` 和静态交付目录的外部契约。

#### Scenario: 开发者启动默认前端开发服务器
- **WHEN** 开发者在 `web-admin` 执行 `bun run start`
- **THEN** Vite dev server SHALL 默认监听 `7002`
- **AND** `PORT` SHALL 能覆盖默认端口
- **AND** 端口被占用时命令 SHALL 明确失败而不是静默改用其它端口

#### Scenario: 构建生产静态产物
- **WHEN** 开发者或CI执行 `bun run build`
- **THEN** Vite SHALL 生成production静态产物到 `web-admin/build`
- **AND** Docker与现有静态发布流程 SHALL 不需要改变复制目标路径
- **AND** 仓库 SHALL NOT 长期维护第二个默认CRA production build
