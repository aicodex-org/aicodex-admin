## 1. Implementation

- [x] 1.1 更新 Admin 交接包生成逻辑，使 keep-in-env 只作为 fallback evidence，而不是默认阻断项或下一步动作。
- [x] 1.2 更新缺 resolver/Gateway 凭据引用时的默认 next action，使其指向 Insight manual/secretRef 绑定。
- [x] 1.3 如触达 UI / 默认诊断文案，避免把机器 `.env` / `config.yaml` 作为主路径。
- [x] 1.4 降级 `keep_in_env` group 的 label / nextAction，避免导出包继续出现部署配置或外部 secret system 动作文案。

## 2. Tests and Validation

- [x] 2.1 补充或更新 focused tests，覆盖 copy-safe package type、无 secure grant 字段、Insight 绑定 next action、keep-in-env fallback 优先级。
- [x] 2.2 运行 OpenSpec strict validate、focused Jest、TS gate/typecheck 和 `git diff --check`。
