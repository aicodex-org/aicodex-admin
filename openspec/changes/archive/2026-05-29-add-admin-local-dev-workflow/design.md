## Context

当前仓库已经具备本地源码运行的基本前提，但入口并不统一：

- `admin/main.go` 与 `admin/conf/conf.go` 已支持通过环境变量覆盖运行配置，后端可以从环境变量读取 `driverName`、`dataSourceName`、`dbName` 和 `redisEndpoint`，说明本地开发不必修改追踪中的配置文件就能接远端依赖。
- `web-admin/package.json` 使用 `cross-env PORT=7002 craco start` 启动开发服务器，`web-admin/craco.config.js` 默认把 `/api`、`/swagger`、`/files` 等请求代理到 `http://localhost:8000`。
- `deploy/app.conf` 仍是本地 MySQL 占位配置，`deploy/docker-compose.remote-db.yml` 与 `deploy/.env.ex` 才体现远端 PostgreSQL 的容器化部署方式，但这套方式不适合“Windows 本机跑 Go + React 源码”的日常开发。
- 参考仓库 `aicodex-api/local-dev` 已经沉淀出 `local-dev/` 目录、`runtime.toml.example` 私有模板和 `start-windows-local-dev.ps1` 启停脚本的模式，适合作为当前仓库的直接参考。

因此，这次变更的重点不是发明新的本地开发体系，而是把 `aicodex-admin` 已有的启动约束收敛到一套可复制、可切换、可排障的本地开发工作流中。

## Goals / Non-Goals

**Goals:**

- 为 `aicodex-admin` 提供与 `aicodex-api/local-dev` 风格一致的 `local-dev/` 目录入口。
- 让开发者可以在 Windows 本机直接启动 `admin` 和 `web-admin` 源码，同时连接远端 PostgreSQL；Redis session 可按需启用。
- 用私有 `runtime.toml` profile 承载真实连接信息，不要求修改 `deploy/app.conf`、`deploy/.env` 或其他追踪文件。
- 通过单一 PowerShell 脚本统一前后端的 `start`、`stop`、`restart`、`status`、`logs` 生命周期。
- 在启动前做远端依赖预检，尽量把“配置错了/连不上”暴露在脚本入口，而不是等到应用半启动后再排查。

**Non-Goals:**

- 不在本次设计中引入新的容器编排或替代现有 `deploy/docker-compose*.yml` 的部署用途。
- 不覆盖 Linux/macOS 的完整本地开发体验；本次主入口先以 Windows PowerShell 为准。
- 不自动创建或修改远端数据库、Redis、网络策略或服务器环境。
- 不在本次变更中重构 `web-admin` 的代理端口约定，也不调整后端默认 `8000` 监听口。

## Decisions

### 1. 采用独立 `local-dev/` 目录承载本地开发工件，而不是继续把说明散落在根 README 与 deploy 模板中

`aicodex-api` 已经证明，把脚本、运行模板、日志目录和说明集中到 `local-dev/`，比“README + 手工命令 + deploy 配置文件”的组合更适合日常联调。对当前仓库也一样：

- `local-dev/README.md` 负责讲清楚入口命令、运行约定和常见问题。
- `local-dev/runtime.toml.example` 提供被 Git 追踪的模板。
- `local-dev/runtime.toml`、`run/`、`logs/` 等运行态内容由 `local-dev/.gitignore` 忽略。

备选方案是只更新根 `README.md` 并要求开发者手工设置环境变量。该方案可读但不可执行，且容易再次分散知识，不采用。

### 2. 采用单个 `start-windows-local-dev.ps1` 作为本机联调入口，并覆盖完整生命周期

当前本地开发至少涉及两个长运行进程：Go 后端和 React 开发服务器。把它们交给一个统一脚本管理，能避免残留进程、日志丢失和“忘记在哪个窗口启动了哪个服务”的问题。

脚本设计上应覆盖：

- `start`：预检依赖、准备日志/PID、启动后端和前端。
- `stop`：按 PID 文件优先终止本次脚本启动的进程，不误杀无关服务。
- `restart`：组合执行停止与重新启动。
- `status`：展示 PID、端口和健康探测结果。
- `logs`：查看或跟随后端/前端日志。

备选方案是分别提供 `start-admin.ps1` 和 `start-web.ps1`。该方案拆分了职责，但会把状态、日志和停止逻辑再次分散，不采用。

### 3. 运行时配置采用 `runtime.toml` active profile 映射到环境变量，而不是直接改 `deploy/app.conf`

后端当前已经支持从环境变量读配置，因此最稳妥的方案是让脚本解析 `runtime.toml`，再把当前 active profile 翻译成启动进程需要的环境变量：

- 数据库部分：`driverName=postgres`、`dbName`、`dataSourceName`
- Redis 部分：仅在显式启用时设置 `redisEndpoint`；未启用时保持空值并使用本地文件 session
- 必要时可附带 `httpport`、`origin`、`originFrontend` 等与本地访问有关的变量

这样做的好处：

- 不污染 `deploy/app.conf` 这种被 Git 跟踪的文件
- 不要求开发者混用容器部署模板和源码运行入口
- 与 `aicodex-api/local-dev/runtime.toml.example` 的 profile 设计保持一致

备选方案是让开发者每次手工执行一串 `set`/`$env:` 命令，或直接复制修改 `deploy/.env.ex`。前者不稳定，后者语义偏部署环境，都不采用。

### 4. 保持前端 `7002 -> 8000` 的现有代理约定，不新增本次不必要的端口重构

`web-admin` 当前 `yarn start` 已固定在 `7002`，代理目标已固定在 `localhost:8000`。只要本地脚本确保后端起在 `8000`，就可以零改动复用现有前端配置。

因此本次设计默认：

- 后端本机监听 `8000`
- 前端本机监听 `7002`
- 脚本只负责保证这两个端口的进程状态和对应日志输出

备选方案是允许脚本任意改端口，并动态重写前端代理配置。该方案弹性更高，但会显著增加脚本复杂度，不作为首版目标。

### 5. 后端使用固定本地开发 exe 启动，而不是 `go run` 临时 exe

Windows 防火墙或 SmartScreen 可能会按 exe 路径/签名识别本地程序。`go run` 每次会生成新的临时 exe，容易导致每次重启都弹出确认窗口。脚本应先把后端构建到 `local-dev/cache/admin-server-local-dev.exe`，再运行这个固定路径的 exe。

这样做的好处：

- 保留源码即时构建体验，每次启动仍会先执行 `go build`
- 固定 exe 路径，降低 Windows 反复确认“新程序”的概率
- 构建输出和 exe 都位于 `local-dev/` 忽略目录，不污染 Git 工作区

备选方案是继续使用 `go run`。该方案命令短，但会把 Windows 安全确认问题交给每次启动，不采用。

### 6. 对远端依赖做启动前预检，并在缺配置或连通性失败时立即退出

用户明确要求“数据库连接等用远端的”。在这种模式下，最常见的问题不是代码本身，而是 profile 漏填、密码错误或网络不通。因此脚本应该在启动进程前：

- 校验 `runtime.toml` 是否存在
- 校验 active profile 是否包含必需的 PostgreSQL 配置
- 若 profile 显式启用 Redis，则校验 Redis TCP 连通性
- 依赖不可达时直接失败，并给出明确错误信息

备选方案是完全不预检，让后端自己报错。该方案实现简单，但会把失败信号分散到 Go 日志里，排障效率低，不采用。

## Risks / Trade-offs

- [远端 PostgreSQL 联调依赖网络质量，脚本本身无法消除延迟和偶发连通性波动] → 在启动前暴露清晰的预检失败信息，并通过 `logs/status` 缩短排查路径。
- [本地开发脚本需要持有真实连接信息，存在误提交风险] → 真实配置只落在 `local-dev/runtime.toml`，并通过 `local-dev/.gitignore` 明确忽略。
- [统一脚本会承担更多生命周期逻辑，维护成本高于单纯 README] → 限定首版范围，只覆盖当前仓库实际需要的前后端进程和远端依赖预检。
- [Windows 入口优先意味着跨平台体验暂不一致] → 文档中明确本次只保证 Windows 主路径，后续如有必要再补其他系统入口。

## Migration Plan

1. 新建 `local-dev/` 目录与忽略规则，补齐 `README` 与 `runtime.toml.example`。
2. 实现 `start-windows-local-dev.ps1`，先完成 profile 读取、依赖预检、日志/PID 目录管理。
3. 将后端环境变量注入和前端 `yarn start` / `npm run start` 启动收敛到统一脚本中。
4. 补充 `status/logs/stop/restart` 行为，并验证脚本不会修改追踪中的部署配置文件。
5. 更新仓库文档，说明远端依赖填写方式和本地联调入口。

回滚策略：

- 若脚本实现存在问题，可先保留 `local-dev/README.md` 与模板文件，仅回退脚本入口，开发者继续使用手工命令。
- 若远端依赖 profile 设计不合适，可保留 `local-dev/` 目录结构，回退具体字段命名，不影响仓库其他功能。

## Open Questions

- 这次 `runtime.toml.example` 是否要同时提供 `local` profile，还是首版只保留 `remote` 为主的模板？
- Redis 在当前本地开发中保持可选；未启用时通过空 `redisEndpoint` 回退到文件会话模式。
- 是否需要在脚本中增加 `-BackendOnly` / `-WebOnly` 之类的可选参数，还是先把完整前后端联调主路径做稳？
