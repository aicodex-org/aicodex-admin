## MODIFIED Requirements

### Requirement: Windows local-dev entrypoint SHALL manage backend and web lifecycle
系统 SHALL 提供一个Windows PowerShell本地开发入口，统一管理 `admin`后端与 `web-admin` Vite前端的启动、停止、重启、状态查看和日志查看行为；前端-only远端后台预览入口 SHALL 使用相同Vite、Bun与代理约定，并保持workspace进程归属校验。两个入口 SHALL 使用Windows默认持久Bun cache且 SHALL NOT 设置、清空或重定向 `BUN_INSTALL_CACHE_DIR`。

#### Scenario: Start action boots both backend and frontend
- **WHEN** 开发者执行 `local-dev/start-windows-local-dev.ps1 start`
- **THEN** 脚本必须先将后端构建到 `local-dev/cache/`下的固定本地开发exe，而不是直接运行 `go run`临时exe
- **THEN** 脚本必须启动本机Go后端并监听当前前端代理约定使用的 `8000`端口
- **THEN** 脚本必须通过 `bun run start`启动 `web-admin` Vite dev server并保持当前 `7002`端口约定
- **THEN** 脚本必须记录后端和前端的日志与PID信息，便于后续状态查询和停止

#### Scenario: Frontend-only preview uses Vite and remote proxy target
- **WHEN** 开发者执行 `local-dev/start-frontend-remote-backend.ps1 start`或 `restart`
- **THEN** 脚本 SHALL 直接调用当前workspace安装的Vite CLI或等价Bun package command
- **AND** `PORT`与 `AICODEX_ADMIN_DEV_PROXY_TARGET` SHALL 控制前端端口和代理target
- **AND** 日志、状态和dry-run输出 SHALL 对完整私有target脱敏

#### Scenario: Stop and restart actions operate on tracked local-dev processes
- **WHEN** 开发者执行 `stop`或 `restart`
- **THEN** 脚本必须优先根据 `local-dev`记录的PID停止本次脚本启动的进程
- **THEN** 前端-only脚本 SHALL 校验命令行属于当前workspace的Vite进程后再停止
- **THEN** 脚本不得依赖开发者手工关闭终端窗口来回收进程

#### Scenario: Status and logs actions expose current runtime state
- **WHEN** 开发者执行 `status`或 `logs`
- **THEN** 脚本必须展示后端和前端的运行状态
- **THEN** 脚本必须能够输出或跟随对应日志，帮助开发者定位启动失败或运行期错误

#### Scenario: Run actions report execution timing
- **WHEN** 开发者执行 `start`、`stop`、`restart`、`status`或非跟随模式的 `logs`
- **THEN** 脚本必须打印本次动作的开始时间、完成时间、最终状态和耗时
- **THEN** `logs -Follow`不应打印完成时间，避免在持续跟随日志时产生误导
