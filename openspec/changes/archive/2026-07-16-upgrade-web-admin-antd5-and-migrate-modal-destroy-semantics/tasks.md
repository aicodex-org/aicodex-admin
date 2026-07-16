## 1. 基线、提案与实施前门禁

- [x] 1.1 记录 latest base、active change、5.24.1 package/lock/actual类型、11/0 prop计数、直接测试、升级前 build/warning/bundle与19 files / 22 tests discovery基线。
- [x] 1.2 记录官方5.25.0 changelog/API/PR #53739、npm `latest-5=5.29.3`、5.25.4/5.29.3 peer/type与5.24.1→5.29.3直接依赖变化，确认AntD6和无关依赖在非目标内。
- [x] 1.3 完成 proposal/design/两份delta spec/tasks/verification的中文、脱敏、strict validation与pre-implementation review，取得READY后再写生产代码。

## 2. TDD RED与生命周期characterization

- [x] 2.1 新增类型安全contract test/fixture，在5.24.1上确认`ModalProps`/`DrawerProps.destroyOnHidden`产生预期typecheck RED，且不使用`any`、assertion或ignore。
- [x] 2.2 新增11-owner迁移guard，在旧源码上确认`destroyOnClose=11` / `destroyOnHidden=0`产生预期Jest RED，并逐项绑定proposal owner清单。
- [x] 2.3 补Captcha/Face close-reopen characterization，覆盖fresh captcha、media track/interval cleanup、new media session与现有upload callback语义。
- [x] 2.4 补普通Drawer与WeCom lifecycle characterization，覆盖隐藏后DOM卸载/新selection、Session close清理、preview/history/detail重开刷新与父state边界。

## 3. 依赖升级与最小实现

- [x] 3.1 将`antd`精确pin到5.29.3并生成唯一Yarn lock；审计lock diff只包含AntD/rc-*所需解析，不修改其它直接依赖。
- [x] 3.2 执行`yarn install --frozen-lockfile`、`yarn why antd`、实际package/peer/type检查，证明只安装5.29.3且当前React18满足peer。
- [x] 3.3 将IdentityAsset/Record/Session/Webhook四处Drawer的旧prop机械迁移为`destroyOnHidden`，不改变selection/close handler/权限/脱敏语义。
- [x] 3.4 将Captcha/Face四处Modal位置机械迁移为`destroyOnHidden`，保持token、media、interval、model与callback语义。
- [x] 3.5 将WeCom preview/history/detail三处Modal机械迁移为`destroyOnHidden`，保持打开时清理/refresh与父缓存语义。
- [x] 3.6 只处理5.29.3在目标owner/直接测试中暴露的阻断性兼容问题；不做无关deprecated扫仓、样式重写或SignupPage改动。

## 4. 聚焦测试与覆盖率

- [x] 4.1 运行contract、Captcha/Face、IdentityAsset/Record/Session/Webhook、WeCom聚焦Jest，确认GREEN且无新增console/act/AntD warning。
- [x] 4.2 精确扫描证明生产`destroyOnClose=0`、`destroyOnHidden=11`，无类型逃逸、suppression、skip或任意sleep。
- [x] 4.3 对changed executable production statements/lines运行coverage并达到85%，不得以纯字符串guard、排除目标文件或弱断言制造达标。

## 5. 完整质量、bundle与浏览器门禁

- [x] 5.1 运行全量`yarn test:ci`并确认全部discovered suites/tests以0failure完成，记录升级前后warning/deprecated差异。
- [x] 5.2 运行app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts check/build/smoke与Vite production build。
- [x] 5.3 运行Playwright discovery，确认19 files / 22 tests；以相同Node/Yarn/Vite口径记录升级后总asset字节、关键chunk与warning，并解释任何明显回退。
- [x] 5.4 使用production preview和脱敏fixture/mock media完成真实Chromium smoke：Captcha/Face、一个普通Drawer、一个WeCom modal的关闭/重开、资源/异步清理、焦点、1440/390布局，console/pageerror/requestfailed=0。
- [x] 5.5 清理build/coverage/browser/report/process临时产物，更新技术债基线与`verification.md`，运行target/all changes/all specs strict、`git diff --check`、中文/TBD/敏感值/EOF/禁改写集审计。

## 6. Review与self-closeout

- [x] 6.1 完成`aicodex-admin-ui-review`与pre-archive review循环，确认实现、覆盖率、注释、文档、浏览器证据和主规格同步均READY。
- [x] 6.2 fetch/rebase latest `origin/hfl-test-base`，收敛为latest base + 1 logical commit并重跑受影响final gate。
- [x] 6.3 使用sync-specs归档change，修复主规格Purpose/TBD/语言问题并验证archive与两份主规格。
- [ ] 6.4 普通非强制push最终HEAD到`hfl-test-base`，不push/merge`test`；删除本地/远端工作分支，固定workspace回clean/aligned base。
- [ ] 6.5 清理本任务planning/build/coverage/browser/report/process残留，释放resource locks/lease并向主控回传`lifecycle_state=RELEASED`、`push_test=false`。
