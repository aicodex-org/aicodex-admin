# Archive Note

2026-07-08 清理过期 active change 时归档。

- 原 change 创建于 2026-04-02，`openspec list` 中最后状态为 `15/18 tasks`，遗留未完成项均为人工/浏览器回归验证项。
- 当前基线已由后续实现和主规格覆盖后台壳层、左侧导航、品牌与默认中文相关行为，继续保留 active change 会干扰后续 OpenSpec 判断。
- 本次归档使用 `openspec archive refactor-web-admin-auth-center-shell --skip-specs -y`，未把该历史 delta spec 同步到主规格，避免重复或过期规格进入长期契约。
