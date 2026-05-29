## Why

当前 `aicodex-admin` 的本地开发入口仍然是分散的手工命令：后端依赖 `deploy/app.conf` 中的本地 MySQL 占位配置，前端依赖 `web-admin` 的单独启动命令，而远端 PostgreSQL 只在 Docker Compose 模板里体现。这使得“本机跑源码、远端连数据库”的日常联调路径不稳定，也容易把临时配置误改进可追踪文件。

参考 `aicodex-api/local-dev` 已经形成的目录约定和启动方式，为 `aicodex-admin` 增加一套独立的 `local-dev/` 本地开发工作流，可以把远端依赖配置、Windows 启停脚本、日志/PID 管理和使用文档收敛到一个明确入口，降低启动成本和排障成本。

## What Changes

- 新增 `local-dev/` 目录，承载 `README`、`.gitignore`、`runtime.toml.example` 和 Windows 本地开发启动脚本。
- 为 `aicodex-admin` 定义可切换的运行时 profile，至少覆盖 `remote` 依赖模式，用于配置远端 PostgreSQL，并可选配置 Redis session。
- 新增 `start-windows-local-dev.ps1` 作为本机前后端联调入口，统一支持 `start`、`stop`、`restart`、`status`、`logs` 等动作。
- 启动脚本在运行本地 Go 后端前，按 active profile 组装 `driverName`、`dbName`、`dataSourceName` 等环境变量；仅在启用 Redis 时设置 `redisEndpoint`，避免要求开发者直接改 `deploy/app.conf` 或容器部署模板。
- 启动脚本先将后端构建到 `local-dev/cache/` 下的固定本地 exe，再运行该 exe，避免 `go run` 每次生成临时 exe 导致 Windows 安全确认反复出现。
- 启动脚本负责启动 `web-admin` 开发服务器，并复用当前 `craco` 代理到本机 `8000` 后端的既有约定。
- 补充本地开发文档，明确如何复制私有配置模板、如何填远端依赖、以及哪些运行态文件不会纳入 Git。

## Capabilities

### New Capabilities
- `admin-local-dev-workflow`: 定义 `aicodex-admin` 的本机源码联调目录结构、远端依赖 profile、Windows 启停脚本和使用文档要求。

### Modified Capabilities

## Impact

- 主要新增 `local-dev/` 目录及其脚本、模板、日志/PID 忽略规则和说明文档。
- 主要影响 `admin` 本地启动时的环境变量注入方式，尤其是 `driverName`、`dbName`、`dataSourceName`，以及可选 `redisEndpoint` 的配置来源。
- 需要对 `web-admin` 本地开发入口做联动约束，保持 `7002 -> 8000` 的代理关系可直接复用。
- 需要验证脚本生命周期管理、远端依赖预检、以及本地运行时文件不会污染仓库。
