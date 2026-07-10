## 1. 证据与回归复现

- [x] 1.1 使用 60 同一登录会话脱敏确认 current-user 自身 mapping=OK、组织 mapping confirmed，而 scope 返回 PROVIDER_UNAVAILABLE/MISSING
- [x] 1.2 增加 ALL_COMPANY / DEPARTMENT_TREE 在 saved resolver unavailable 且部分成员缺失时的 focused 回归测试
- [x] 1.3 运行新测试确认 RED 原因是严格 preload 提前上抛 unavailable+missing

## 2. 最小权限安全修复

- [x] 2.1 为 identity cache preload 增加 queryable policy，仅把 PROVIDER_UNAVAILABLE+MISSING 的未解析成员缓存为 MISSING
- [x] 2.2 增加或强化 SELF / CUSTOM_USERS 与 INVALID / AMBIGUOUS 继续 fail-closed 的测试
- [x] 2.3 运行 focused 测试确认 GREEN，并检查没有修改 secure handoff 或扩大 scope

## 3. 验证与 RC 交付

- [x] 3.1 运行 controllers 聚焦测试和受影响 package coverage，记录结果与 85% 门槛说明
- [x] 3.2 运行 `openspec validate fix-admin-current-user-scope-mapping --strict` 与 `git diff --check`
- [x] 3.3 更新 verification，区分本地自动化、60 pre-fix 证据和 RC 部署后剩余验收
- [x] 3.4 RC 阶段保持 active change，不 archive、不 merge base、不触碰 test；60 post-fix smoke 通过并获得 `self-closeout=true` 后再进入收口
