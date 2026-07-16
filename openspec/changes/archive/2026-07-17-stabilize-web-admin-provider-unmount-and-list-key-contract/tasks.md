## 1. 基线与实施前门禁

- [x] 1.1 对齐最新 base、确认 active change 与写集锁，并用 non-silent focused 组合记录三条 warning 的 stack、DOM 元素与 production owner
- [x] 1.2 完成 proposal、design、delta spec 与 tasks 的 strict validation 和 pre-implementation review，取得 READY

## 2. Provider 生命周期 TDD

- [x] 2.1 用真实 render、deferred promise 与保留原 console 的 warning guard 建立 pending-unmount 和尚未挂载更新 RED
- [x] 2.2 为 Provider 路由切换/乱序、证书 owner 乱序、保存/删除/SAML metadata 成功失败与 loading 恢复补充行为 RED
- [x] 2.3 实施 didMount/didUpdate/willUnmount 与 route/request generation guard，保持当前请求成功失败、保存、删除及导航语义

## 3. 列表 key TDD

- [x] 3.1 为 Webhook events、角色关联对象与 Permission resources/actions 的重复数据、稳定重排、可见顺序和链接行为建立 RED
- [x] 3.2 实施页面局部 domain composite key renderer，使 unique-key warning 归零且保持翻译、颜色、链接与排序

## 4. 自动化与 UI 验证

- [x] 4.1 运行 focused non-silent Jest，证明 Provider unmounted 与两类 unique-key warning 为 0
- [x] 4.2 运行 changed production coverage 并达到 statements/lines 不低于 85%，再运行全量 non-silent Jest 与 `test:ci`
- [x] 4.3 运行 frozen Yarn、三类 typecheck、增量 TypeScript、production lint、public scripts、Vite build 与 Playwright 19 files/22 tests discovery
- [x] 4.4 用脱敏 Chromium 在 1440px/390px 覆盖 Provider 快速离开/返回及两个列表代表页，确认无本 change console/page/request error 与布局回归

## 5. 归档与 Closeout

- [x] 5.1 完成 Admin UI review、OpenSpec strict、diff/脱敏/中文/EOF 检查和 pre-archive READY
- [x] 5.2 以 sync-specs archive，同步主规格并收敛为 latest base + 1 logical commit
- [x] 5.3 普通非强制 push `HEAD:hfl-test-base`，核验 test 未动，删除工作分支与临时产物并释放 resource locks/lease
