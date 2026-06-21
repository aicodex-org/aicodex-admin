## 1. OpenSpec 与实施前 review

- [x] 1.1 启动门禁：fetch、clean/aligned、ff-only 对齐最新 `origin/hfl-test-base`、创建工作分支。
- [x] 1.2 创建 proposal、design、tasks 和 `admin-enterprise-identity-console-shell` delta spec。
- [x] 1.3 完成实施前 review，确认 scope、写集和验证计划没有阻塞问题。

## 2. TDD 实施

- [x] 2.1 先写失败测试覆盖 persisted `/404`、旧快捷访问路径、未知 path 过滤和 mixed restore fallback。
- [x] 2.2 先写失败测试覆盖重复打开/点击已有标签不重排。
- [x] 2.3 先写失败测试覆盖关闭当前标签右侧优先、否则左侧、否则总览。
- [x] 2.4 实现 workspace tab 状态 helper 的 fail-closed 过滤、稳定顺序和关闭规则。
- [x] 2.5 轻量打磨标签栏 active/hover/focus-visible/关闭按钮/长文本截断，不改变业务页面布局。

## 3. 验证

- [x] 3.1 运行目标 OpenSpec strict、仓库 changes/specs strict 和 `git diff --check`。
- [x] 3.2 运行 web-admin 增量 TypeScript gate 和 `yarn typecheck`。
- [x] 3.3 运行 workspace tabs focused Jest 和覆盖率，记录受影响文件覆盖率。
- [x] 3.4 运行 `yarn build`。
- [x] 3.5 完成桌面与移动浏览器验证，记录坏历史标签、未知 URL、顺序稳定、console/pageerror、页面级横向溢出结果。
- [x] 3.6 更新 `verification.md`，记录命令、覆盖率、浏览器证据和剩余风险。

## 4. 归档与 closeout

- [x] 4.1 完成归档前 review，确认文档、测试、覆盖率、注释、脱敏和主规格同步无阻塞。
- [x] 4.2 Archive change 并重跑 strict/diff check。
- [x] 4.3 收敛为单个逻辑 commit，push 工作分支，ff-only 合入并 push `hfl-test-base`。
- [x] 4.4 删除本地/远端工作分支，确认固定 workspace clean/aligned，写最终 report。
