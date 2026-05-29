# admin-local-dev-workflow Specification

## Purpose
定义 `aicodex-admin` 在 Windows 本机连接远端 PostgreSQL、可选 Redis，并统一启动、停止、重启、查看状态和日志的本地开发工作流。
## Requirements
### Requirement: Repository SHALL provide a dedicated local-dev workspace for admin local development
仓库 SHALL 提供独立的 `local-dev/` 工作区，用于承载 `aicodex-admin` 的本机联调脚本、说明文档、私有运行模板和运行态忽略规则，而不是要求开发者直接修改部署配置文件。

#### Scenario: Local-dev workspace is available in the repository
- **WHEN** 开发者打开仓库根目录
- **THEN** 仓库中必须存在 `local-dev/` 目录
- **THEN** 目录中必须至少包含 `README.md`、`runtime.toml.example`、Windows 启动脚本和针对运行态文件的 `.gitignore`

#### Scenario: Runtime artifacts stay out of version control
- **WHEN** 开发者按照模板生成本机私有运行配置，或脚本产生日志、PID、缓存等运行态文件
- **THEN** 这些运行态文件不得要求纳入 Git 跟踪
- **THEN** 仓库必须通过 `local-dev/.gitignore` 明确忽略这些本地工件

### Requirement: Local-dev runtime profiles SHALL support remote dependency configuration
本地开发工作流 SHALL 提供基于 profile 的运行配置模板，使开发者可以在不修改追踪文件的前提下，为本机源码运行配置远端 PostgreSQL，并可选配置 Redis session。

#### Scenario: Developer configures remote dependencies from the template
- **WHEN** 开发者复制 `local-dev/runtime.toml.example` 为 `local-dev/runtime.toml` 并选择 `remote` profile
- **THEN** 模板中必须提供填写远端 PostgreSQL 连接信息的结构
- **THEN** 模板中必须提供可选启用 Redis session 的结构
- **THEN** 真实密码或私有连接串只能写入未跟踪的 `runtime.toml`

#### Scenario: Active profile drives backend startup values
- **WHEN** 本地启动脚本读取 `local-dev/runtime.toml` 中的 active profile
- **THEN** 脚本必须根据该 profile 组装后端运行所需的数据库配置
- **THEN** 未启用 Redis 时不得设置 `redisEndpoint`
- **THEN** 开发者不需要手工编辑 `deploy/app.conf`、`deploy/.env` 或其他追踪中的部署模板

### Requirement: Windows local-dev entrypoint SHALL manage backend and web lifecycle
系统 SHALL 提供一个 Windows PowerShell 本地开发入口，统一管理 `admin` 后端与 `web-admin` 前端的启动、停止、重启、状态查看和日志查看行为。

#### Scenario: Start action boots both backend and frontend
- **WHEN** 开发者执行 `local-dev/start-windows-local-dev.ps1 start`
- **THEN** 脚本必须先将后端构建到 `local-dev/cache/` 下的固定本地开发 exe，而不是直接运行 `go run` 临时 exe
- **THEN** 脚本必须启动本机 Go 后端并监听当前前端代理约定使用的 `8000` 端口
- **THEN** 脚本必须启动 `web-admin` 开发服务器并保持当前 `7002` 端口约定
- **THEN** 脚本必须记录后端和前端的日志与 PID 信息，便于后续状态查询和停止

#### Scenario: Stop and restart actions operate on tracked local-dev processes
- **WHEN** 开发者执行 `stop` 或 `restart`
- **THEN** 脚本必须优先根据 `local-dev` 记录的 PID 停止本次脚本启动的进程
- **THEN** 脚本不得依赖开发者手工关闭终端窗口来回收进程

#### Scenario: Status and logs actions expose current runtime state
- **WHEN** 开发者执行 `status` 或 `logs`
- **THEN** 脚本必须展示后端和前端的运行状态
- **THEN** 脚本必须能够输出或跟随对应日志，帮助开发者定位启动失败或运行期错误

### Requirement: Startup workflow SHALL fail fast on missing or unreachable remote dependencies
本地启动入口 SHALL 在启动应用进程前检查必需配置和远端依赖可达性，避免在应用半启动状态下才暴露基础配置错误。

#### Scenario: Missing runtime configuration blocks startup
- **WHEN** 开发者尚未创建 `local-dev/runtime.toml`，或 active profile 缺少必需的远端 PostgreSQL 配置
- **THEN** `start` 和 `restart` 必须直接失败
- **THEN** 脚本必须输出可操作的提示，说明缺失的是哪个配置文件或字段

#### Scenario: Unreachable dependency blocks startup
- **WHEN** active profile 中配置的远端 PostgreSQL 无法建立基础连通性，或显式启用的 Redis 无法建立基础连通性
- **THEN** 脚本必须在启动 Go 后端和前端前终止
- **THEN** 错误输出必须明确指出是哪个依赖检查失败
