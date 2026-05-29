# local-dev 本地开发入口

`local-dev/` 保存 `aicodex-admin` 的本机开发辅助文件。脚本、模板和说明可以纳入 Git；`runtime.toml`、PID、日志、缓存等运行态内容由本目录下的 `.gitignore` 忽略。

这套入口用于“Windows 本机运行 Go 后端和 React 前端，PostgreSQL 连接远端”的日常联调。Redis 是可选项；未启用时后端使用本地文件 session。它不替代 `deploy/` 下的容器部署流程。

## 首次配置

先复制私有运行配置模板：

```powershell
Copy-Item .\local-dev\runtime.toml.example .\local-dev\runtime.toml
```

编辑 `local-dev/runtime.toml`，填写远端 PostgreSQL：

- PostgreSQL 会映射为后端环境变量 `driverName=postgres`、`dbName`、`dataSourceName`。
- Redis 可选。需要共享 session 时设置 `enabled = true` 并填写连接信息；未启用时不会设置 `redisEndpoint`。
- 真实密码、私有连接串和临时环境变量只写入 `runtime.toml`，不要写入可追踪文件。

## 常用命令

启动本地前后端：

```powershell
.\local-dev\start-windows-local-dev.ps1 start
```

访问 `http://localhost:7002` 查看 React 最新源码；前端开发服务器会把 `/api`、`/swagger`、`/files`、`/cas`、`/scim` 等请求代理到本机后端 `http://localhost:8000`。

重启本地开发服务：

```powershell
.\local-dev\start-windows-local-dev.ps1 restart
```

停止脚本管理的本地进程：

```powershell
.\local-dev\start-windows-local-dev.ps1 stop
```

查看状态：

```powershell
.\local-dev\start-windows-local-dev.ps1 status
```

查看或跟随日志：

```powershell
.\local-dev\start-windows-local-dev.ps1 logs -Tail 120
.\local-dev\start-windows-local-dev.ps1 logs -Service backend -Follow
```

只检查配置解析，不启动进程：

```powershell
.\local-dev\start-windows-local-dev.ps1 start -DryRun
```

## 运行约定

- 后端源码目录：`admin/`
- 后端构建输出：`local-dev/cache/admin-server-local-dev.exe`
- 后端启动命令：先执行 `go build -o <repo>\local-dev\cache\admin-server-local-dev.exe .`，再运行该固定 exe 并加载 `<repo>\deploy\app.conf`
- 后端本机端口：`8000`
- 前端源码目录：`web-admin/`
- 前端启动命令：优先 `yarn start`，未安装 Yarn 时回退 `npm run start`
- 前端本机端口：`7002`

脚本启动前会读取 `local-dev/runtime.toml`，并预检远端 PostgreSQL 的 TCP 连通性。Redis 只有在显式启用时才会预检。后端不使用 `go run` 临时 exe 启动，避免 Windows 防火墙或 SmartScreen 因每次生成不同 exe 而反复弹确认。

## 目录说明

- `runtime.toml.example`：可追踪的运行配置模板。
- `runtime.toml`：本机私有运行配置，不纳入 Git。
- `scripts/`：脚本复用逻辑。
- `tests/`：PowerShell 脚本级测试。
- `run/`：本地后台进程 PID 文件。
- `logs/`：后端、前端和应用日志。
- `tmp/` / `cache/`：本地临时文件、缓存和后端本地开发 exe。

## 常见排障

- `Missing runtime config`：先从模板复制 `local-dev/runtime.toml`。
- `postgres connection failed`：检查远端数据库地址、端口、防火墙、安全组和本机网络。
- `redis connection failed`：仅在启用 Redis 时出现；检查 Redis 监听地址、端口、密码和防火墙策略。
- 前端无法访问接口：确认 `status` 里后端 `8000` 正在监听，并查看 `local-dev/logs/backend.log`。
- Windows 每次提示是否允许 exe 运行：确认你运行的是新版脚本。首次允许固定路径 `local-dev/cache/admin-server-local-dev.exe` 后，后续重启不应再因为 `go run` 临时 exe 反复弹窗。
- `yarn start` / `npm run start` 失败：确认 `web-admin/` 依赖已按项目约定安装。
