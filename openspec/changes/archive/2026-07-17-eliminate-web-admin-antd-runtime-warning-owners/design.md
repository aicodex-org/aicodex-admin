## Context

`web-admin` 已精确锁定 AntD 5.29.3、React 18.2 与 Jest 27。最新 `origin/hfl-test-base@5b66c580` 上，以 `BABEL_ENV=test`、`NODE_ENV=test`、空 `PUBLIC_URL`、`CI=true`、non-silent、`--runInBand` 执行 7 个候选 suite，结果为 7/7 suites、125/125 tests、0 failure，同时稳定输出 47 条 AntD warning。日志只保留在 ignored `.planning`，OpenSpec 记录脱敏计数、message 类别和 owner，不复制原始 stack。

47 条 warning 可由消息、suite 与源码唯一映射到 6 个生产文件；没有需要跨包架构改造或猜测 owner 的类别。Admin-2 并行持有 Provider 未挂载 setState 与两个 unique-key owner，本 change 不读取其结果来扩大写集，也不修改它持有的三个页面。

已安装 AntD 5.29.3 的官方 package source/type 是版本真值：InputNumber 声明 `suffix` 并将 addon 标为 deprecated；Card/Descriptions 提供 semantic `styles`；Collapse 提供 `destroyOnHidden`；Typography.Text 类型排除 `rows/expandable`、Paragraph 支持 block ellipsis；Table 明确拒绝二参 rowKey；Spin 只在 nested/fullscreen 模式显示 tip。

## Goals / Non-Goals

**Goals:**

- 将最新 7-suite 基线中的 AntD warning 从 47 降为 0，同时保持 125 个既有测试和用户可观察交互。
- 以 AntD 5.29.3 当前 prop/组件语义完成最小 owner 迁移，不建设兼容层。
- 为每个 suite 建立不静默 console 的局部 RED/GREEN guard，并以 non-silent focused/full Jest 复核真实计数。
- 保持输入精度/单位、商品卡布局与两行省略、订单标签宽度、购物车条目身份、付款处理中状态、飞书折叠销毁和 1440/390 响应式可用性。

**Non-Goals:**

- 不升级 AntD、React、Router、Jest、Vite、Playwright 或任何依赖，不修改 package/lock。
- 不扫描或迁移未被最新 47 条基线触发的其它历史 deprecated prop；不做全局样式重写。
- 不修改 `ProviderEditPage`、`ApplicationAccessMenuPages`、`RolePermissionListPages`、Signup、Go/schema、TLS、CI workflow或运行时配置。
- 不建立 Jest 全局 console policy，不使用 suppression/filter、mock AntD、silent、skip/only、任意 sleep、提高 timeout或弱化断言。

## Decisions

### 1. 采用逐 owner 当前 API 迁移，不引入通用兼容 wrapper

采用方案是将每个 warning 迁移到其组件已经提供的当前 API，并保持原 handler/state/数据契约。通用 `DeprecatedAntdCompat` wrapper 会隐藏 owner、扩大生产抽象并让未来升级更难定位；全仓 deprecated 扫描会越过本 change 的证据和写集；仅在测试侧过滤 warning 明确违反主规格与用户约束，三者均拒绝。

### 2. InputNumber 单位使用 `suffix`，空 addon 直接删除

`ApplicationEditForm` 的 7 处 source owner在测试中被重复渲染为 23 条 warning。其中 `order` 的 addon 是空字符串，没有可见语义，直接删除。其余 6 处只显示小时/次数/分钟/秒单位，不是独立交互控件；使用 5.29.3 当前 `suffix` 比为每处增加第二个 Input 的 `Space.Compact` 更能保持 150px 宽度、焦点、键盘输入、min/step/precision、数值格式化和 `onChange`。测试继续断言中文/英文单位、数值与回调。

备选 `Space.Compact + readOnly Input` 虽与 warning 通用建议一致，但会新增 focusable/disabled DOM、改变宽度分配和移动布局，收益不足；不采用。

### 3. 展示组件使用 semantic styles 与匹配的 Typography 组件

- Card `bodyStyle` 一对一迁移为 `styles={{body: ...}}`，flex 布局对象不变。
- 产品 detail 从 `Typography.Text` 改为 `Typography.Paragraph`，保留 secondary、两行 ellipsis、13px/1.5 和 12px 下间距；移除现有为绕过类型而使用的 `LegacyAny` assertion。
- Descriptions `labelStyle` 一对一迁移为 `styles={{label: ...}}`，150px label width、2列与 item span不变。
- Collapse `destroyInactivePanel` 一对一迁移为 `destroyOnHidden`，items、key、label、compact 条件和展开交互不变。

### 4. Cart row key 使用完整条目身份，Payment loading 使用明确 status 结构

购物车合并逻辑以 `name + recharge price + pricingName + planName` 判断同一条目，允许相同产品用不同充值金额形成不同记录。rowKey SHALL 使用同一四元组生成单参数稳定 key，不使用数组 index，也不丢失 price 维度。

PaymentResult 的旧 `Spin tip` 在无 children 模式下不会显示，只有 warning。迁移为带 `role=status`/可访问名称的局部容器，内部保留 `Spin` 并显示现有“处理中”文案；Result title/subtitle和跳转分支不变。相比传入空 child伪造 nested pattern，该结构的可见与辅助技术语义更明确。

### 5. 局部 warning guard 保留原 console 行为

扩展 `testUtils/reactAsyncWarnings.ts` 增加只分类 `Warning: [antd:` 调用的 `getAntdWarnings`，不替换或吞掉 console。7 个直接 suite 使用默认 `jest.spyOn(console, "error")` 收集 calls，在 cleanup 后读取、恢复 spy，再断言 AntD warnings 为空；既有 act guard继续独立断言。helper contract证明 AntD分类不会吞掉 React/其它 warning。

TDD RED 在生产代码修改前运行：7 个 suite 应因目标 warning guard失败，原 warning仍出现在 non-silent输出；GREEN 才修改生产 owner。最终还必须运行相同 fixed environment全量 non-silent Jest重新分类，目标 AntD为0，Admin-2或其它非目标类别仍保持可见并单独计数。

### 6. 验证与浏览器边界

- 自动化：focused/non-silent、全量 non-silent、`test:ci`、changed production coverage、三类 typecheck、增量TS、lint、public scripts、Vite build与19/22 discovery。
- 依赖真值：实施前后比较 `package.json`/`yarn.lock` SHA-256并执行 frozen Yarn，hash必须不变。
- 浏览器：production preview + 脱敏 fixture覆盖 Application单位输入、Product card/detail、Order/Cart/Payment状态与Feishu Collapse中的代表路径；1440/390检查交互、文本省略、稳定行、焦点、页面overflow、console/pageerror/requestfailed。不得连接60、真实支付或企业凭据。
- 覆盖率：以6个 changed production文件的本次可执行 statements/lines为统计对象，目标不低于85%；纯 prop行不被instrument时记录与最近可执行statement的映射，不以字符串guard制造覆盖。

## Risks / Trade-offs

- [InputNumber `suffix` 与旧 addon视觉细节可能不同] → 保持原宽度/数值props，补中英文单位DOM与1440/390浏览器检查，不增加第二个输入控件。
- [Paragraph默认block margin可能改变卡片高度] → 显式保留原 margin/font/line-height并检查同排卡片、两行省略与按钮对齐。
- [Cart key遗漏price会合并不同充值金额] → key使用与业务合并逻辑相同的四元组，并补同产品不同price同时渲染测试。
- [局部guard误把非目标warning当目标] → helper只分类`Warning: [antd:`，默认console继续输出；完整non-silent运行单独分类其它warning。
- [并行base前进] → closeout前fetch/rebase最新base；若触及禁改owner或改变warning基线，重新运行focused/full分类后再决定，不覆盖Admin-2改动。

## Migration Plan

1. 固化最新基线、hash、message/suite/owner矩阵与官方5.29.3 API证据。
2. 先加入局部 warning helper/guard并运行7-suite non-silent RED。
3. 按 Input、展示、Table/Spin、Collapse 四组做最小生产迁移，每组运行对应GREEN与业务断言。
4. 运行覆盖率、完整静态/测试/build/discovery和Chromium production preview，更新技术债基线与verification。
5. pre-archive READY后sync-specs archive，rebase最新base并普通非强制push；回滚仅需revert单个最终commit。

## Open Questions

无。最新 warning 均已稳定映射，当前 API 与交互等价可由仓库和已安装官方类型保守确定；若 rebase 后出现新的不可映射 warning，只停止该新增范围并回传主控，不扩展本设计。
