## 1. 基线与实施前门禁

- [x] 1.1 记录latest base、active change、Node/Yarn/AntD版本、package/lock SHA-256、7-suite/125-test non-silent结果和47条message→suite→production owner矩阵。
- [x] 1.2 用已安装AntD 5.29.3官方package source/type核对InputNumber、Card、Typography、Descriptions、Table、Collapse、Spin当前API，并记录`suffix`等价选择、Cart四元组身份和Payment可访问结构的理由。
- [x] 1.3 完成proposal/design/spec/tasks的中文、脱敏、并行禁改、回滚、浏览器与覆盖率边界，运行target/all changes strict和`git diff --check`，取得pre-implementation review `READY`后再写测试/生产代码。

## 2. TDD RED warning guard

- [x] 2.1 扩展局部console分类helper与contract test：只识别`Warning: [antd:`，保留原console调用，并证明React/其它warning不会被吞掉。
- [x] 2.2 在ProductCatalog、ApplicationEdit、Order、ProductBuyCart、Payment、ApplicationEditPageUiCustomization、Feishu七个suite接入局部guard；不得修改Jest全局config/setup或使用filter/silent。
- [x] 2.3 在生产owner未修改时运行固定环境non-silent 7-suite组合，确认guard因47条目标AntD warning产生预期RED且原warning仍可见；保存脱敏计数，不把失败样本计为GREEN。

## 3. 最小production GREEN

- [x] 3.1 将`ApplicationEditForm.tsx`空addon删除、6个单位迁移到`suffix`；补测试证明150px、value/min/step/precision、中文/英文单位和onChange保持，并使Application两个suite的InputNumber warning归零。
- [x] 3.2 将`ProductStorePage.tsx`迁移到`Card.styles.body`和支持两行ellipsis的`Typography.Paragraph`；补商品卡flex/按钮对齐、详情省略和无类型逃逸断言，使ProductCatalog两类warning归零。
- [x] 3.3 将`OrderPayPage.tsx`迁移到`Descriptions.styles.label`并补150px/column/span断言，使Order warning归零。
- [x] 3.4 将`CartListPage.tsx`rowKey改为record单参的`name+price+pricingName+planName`稳定身份；补同产品不同充值金额、reorder和原下单payload断言，使Table warning归零。
- [x] 3.5 将`PaymentResultPage.tsx`无效Spin tip改为spinner+可见`role=status`处理说明，保持Result状态/跳转并使Spin warning归零。
- [x] 3.6 将`FeishuOrganizationSyncPage.tsx`迁移到`Collapse.destroyOnHidden`，补展开/隐藏后child销毁与原安全别名边界断言，使Collapse warning归零。
- [x] 3.7 运行固定环境non-silent 7-suite GREEN，确认7/7 suite全部业务断言通过且本change目标AntD warning=0；精确扫描只用于辅助review，不替代runtime guard。

## 4. 覆盖率、完整门禁与浏览器

- [x] 4.1 对6个changed production文件运行直接suite coverage，按changed executable statements/lines统计并达到85%；记录prop/JSX行的instrumentation边界，不以源码字符串测试制造覆盖。
- [x] 4.2 运行frozen Yarn并比较package/lock SHA-256逐字不变；运行全量non-silent Jest重新分类，确认本change AntD目标47→0、Admin-2/其它非目标类别未被静默。
- [x] 4.3 运行`yarn test:ci`、app/build-tooling/E2E typecheck、增量TypeScript gate、production lint、public scripts check/build/smoke、Vite production build和Playwright discovery 19 files / 22 tests。
- [x] 4.4 使用production preview与脱敏fixture在1440/390完成Application单位、Product card/detail、Order/Cart/Payment状态和Feishu Collapse代表交互；检查焦点、可访问名称、两行省略、行身份、页面overflow及console/pageerror/requestfailed。
- [x] 4.5 更新技术债基线与`verification.md`，清理任务日志/coverage/build/browser/report/process残留，运行target/all changes/all specs strict、`git diff --check`、中文/TBD/敏感值/EOF/禁改写集审计。

## 5. Review 与 self-closeout

- [x] 5.1 完成`aicodex-admin-ui-review`与pre-archive review循环，复核实现、覆盖率、注释、文档、证据层级与主规格同步，取得`READY`。
- [x] 5.2 使用sync-specs归档并检查archive与`web-admin-antd-runtime-warning-owners`主规格Purpose、中文、TBD和strict validation。
- [x] 5.3 fetch/rebase latest `origin/hfl-test-base`，收敛为latest base + 1 logical commit并重跑受影响final gate；若并行owner改变warning分类则重新审计。
- [x] 5.4 普通非强制push最终HEAD到`hfl-test-base`，不得push/merge`test`；删除本地/远端工作分支，固定workspace回clean/aligned base。
- [x] 5.5 清理本任务`.planning`与生成产物，释放resource locks/lease并向主控回传`lifecycle_state=RELEASED`、`push_test=false`、validation/coverage/remaining risk。
