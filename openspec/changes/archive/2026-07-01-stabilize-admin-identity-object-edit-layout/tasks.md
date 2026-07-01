## 1. OpenSpec 与范围确认

- [x] 1.1 创建并验证本 change 的 proposal、design、delta spec 和任务清单，明确只修身份对象 / 权限对象编辑页内部布局。
- [x] 1.2 完成实施前 review，确认不触碰组织、用户、应用、Provider、Syncer、Gateway、接入凭据和明确排除的业务页面。

## 2. 布局契约测试

- [x] 2.1 为 Group / Invitation 既有测试补充布局 hook 断言，并先验证缺少统一 scoped class 的失败状态。
- [x] 2.2 为 Role / Permission 以及纳入范围的相邻对象配置页增加源码或样式契约测试，覆盖页面、卡片、字段行和 CSS hook。

## 3. 实现

- [x] 3.1 为目标编辑页增加 `admin-identity-object-edit-page`、`admin-identity-object-edit-card` 和普通字段行 class hook。
- [x] 3.2 在 `App.less` 中增加限定到上述 hook 的 scoped CSS，修复普通字段行 label/control 布局并保护嵌套组件。
- [x] 3.3 评估 `FormEditPage.tsx`、`ModelEditPage.tsx` 是否纳入；若 deferred，记录原因。

## 4. 验证与收口

- [x] 4.1 运行 OpenSpec 严格校验、增量 TypeScript gate、`yarn typecheck`、聚焦 Jest、`yarn build` 和 diff check。
- [x] 4.2 使用浏览器 smoke 在 1280px 桌面宽度验证布局契约和页面级 overflow；记录它是脱敏 fixture/静态 DOM 布局验证，不是实时后端保存链路。
- [x] 4.3 更新 `verification.md`，完成归档前 review、archive、单 commit 收敛和 self-closeout。
