## 1. Local-dev 目录与运行时配置

- [x] 1.1 新建 `local-dev/` 目录结构，补齐 `README.md`、`.gitignore` 与运行态目录约定
- [x] 1.2 设计并添加 `runtime.toml.example`，覆盖 active profile、远端 PostgreSQL、可选 Redis 和必要环境变量映射说明
- [x] 1.3 明确 `runtime.toml` 到后端环境变量的映射规则，覆盖 `driverName`、`dbName`、`dataSourceName`、可选 `redisEndpoint` 以及本地访问相关变量

## 2. Windows 本地开发启动脚本

- [x] 2.1 实现 `local-dev/start-windows-local-dev.ps1` 的命令行入口，支持 `start`、`stop`、`restart`、`status`、`logs`
- [x] 2.2 在脚本中实现运行配置读取、远端 PostgreSQL 与可选 Redis 预检、日志/PID 管理和失败提示
- [x] 2.3 接入 `admin` 后端本地启动，并通过环境变量注入远端依赖配置，避免修改追踪中的部署配置文件
- [x] 2.4 接入 `web-admin` 开发服务器启动，保持 `7002 -> 8000` 代理链路可直接复用

## 3. 文档与验证

- [x] 3.1 更新 `local-dev/README.md`，补充首次配置、常用命令、远端依赖填写方式和常见排障说明
- [x] 3.2 视需要更新根 `README.md`，把本地开发主入口指向 `local-dev/`
- [x] 3.3 运行脚本级验证，确认帮助信息、状态查询、缺配置失败提示和日志输出路径符合预期
- [x] 3.4 运行 OpenSpec 校验，确认 proposal、design、specs、tasks 结构完整可用于后续实施
