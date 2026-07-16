# 验证记录

## 当前结论

- 状态：实现、TDD、完整前端门禁、真实 Chromium UI review与pre-archive review均已完成；change已以sync-specs模式归档并创建主规格，等待最终rebase/push/cleanup。
- 基线：`origin/hfl-test-base@5b66c580`，Node 24.14.0、Yarn 1.22.22、AntD 5.29.3。
- 边界：只修改 6 个 production owner、7 个直接 suite、局部 warning helper/contract、当前 OpenSpec 与技术债基线；未修改 package/lock、Jest 全局配置、workflow、后端或 Admin-2 的 3 个并行 owner。
- 证据层级：浏览器使用本地 production fixture 与脱敏数据，不连接 60、真实后端、支付、企业账号或凭据，不表述为第三方 E2E。

## 最新 owner 基线与 TDD

| 阶段 | 命令边界 | 结果 |
| --- | --- | --- |
| 变更前 focused 基线 | 7 个目标 suite，non-silent、`--runInBand` | 7/7 suites、125/125 tests 通过；AntD warning 47 条：InputNumber 23、Card 7、Typography.Text 7、Descriptions 6、Table 2、Collapse 1、Spin 1。 |
| helper contract | `React18AsyncBoundaryContract.test.ts` | 4/4 tests 通过；`getAntdWarnings`只分类`Warning: [antd:`，React 与其它诊断保持可见。 |
| TDD RED | production owner 尚未修改时运行同一 7-suite 组合 | 预期 exit 1；7/7 suites 因局部 guard 失败，原 warning 仍输出；精确计数仍为 47。失败样本不计为 GREEN。 |
| TDD GREEN | owner 最小迁移后运行同一 7-suite 组合 | 7/7 suites、128/128 tests 通过，目标 AntD warning=0。 |

RED/GREEN guard 使用默认 `jest.spyOn(console, "error")`，没有 mock implementation；cleanup 后先分类 calls，再恢复 spy并断言，因此不会吞掉 console。

## 生产迁移与交互等价

| Owner | 当前实现 | 等价证据 |
| --- | --- | --- |
| `ApplicationEditForm.tsx` | 空 addon删除；6个单位改用`suffix` | 150px、value/min/step/precision、Hours/Times/Minutes/Seconds 与更新回调由直接测试覆盖；中英文单位 DOM 保持。 |
| `ProductStorePage.tsx` | `Card.styles.body`；detail使用`Typography.Paragraph`两行ellipsis | Card body仍为flex列；detail保持secondary、13px/1.5、12px下间距和两行clamp；操作区仍位于底部。 |
| `OrderPayPage.tsx` | `Descriptions.styles.label` | label 150px、column=2及普通/订阅item span保持。 |
| `CartListPage.tsx` | 单参rowKey使用`name + price + pricingName + planName` JSON tuple | 同产品不同价格生成不同key，reorder不改变key；原购物车渲染、数量、删除和下单断言通过。 |
| `PaymentResultPage.tsx` | `Spin`与可见处理中说明置于`role=status`、`aria-live=polite`容器 | Created title/subtitle、spinner、可见说明与其它状态跳转保持；不再向非nested Spin传`tip`。 |
| `FeishuOrganizationSyncPage.tsx` | `Collapse.destroyOnHidden` | 展开后detail child挂载，关闭后DOM销毁；items/key/label与安全别名边界保持。 |

## 覆盖率与完整前端门禁

| 验证 | 结果 |
| --- | --- |
| focused coverage | 7/7 suites、128/128 tests；6个 changed production 文件合计 statements 88.71%（1140/1285）、lines 88.64%（1109/1251），达到85%门槛；branches 75.81%、functions 84.26%仅记录，不作为本 change 规定门槛。 |
| frozen Yarn | `yarn install --frozen-lockfile --non-interactive`通过；依赖树已是最新。 |
| package/lock hash | package SHA-256=`E21C24F093F1DD555AE9B5C03BAD6D17B49A2773DF0137C1C3CADD69AD6AD5F5`；lock SHA-256=`E1C335C5AD66C8F3B1B126C72ABCDFD316B7F93ECEA62E020ACE285BC2C213ED`，与开工基线逐字一致。 |
| 全量 non-silent Jest | 154/154 suites、1458/1458 tests通过，耗时378.837秒；AntD warning=0。仍可见4条非目标React warning：Admin-2写集中的unique-key 2、Provider未挂载setState 1，以及本轮ModelPages出现的act warning 1；没有过滤或接管这些owner。 |
| `yarn test:ci` | 154/154 suites、1458/1458 tests通过，耗时375.8秒。该脚本自身带`--silent`，只作为仓库CI门禁；warning分类以上述独立non-silent运行作为真值。 |
| TypeScript | app、build-tooling、E2E三类typecheck均exit 0；增量TypeScript gate exit 0。 |
| lint | production lint exit 0；只保留既有`caniuse-lite`更新提示。 |
| public scripts | check、build、smoke均通过，无tracked产物diff。 |
| Vite production build | 5536 modules，exit 0；仍为既有face-api `fs` external、`Setting.tsx` direct eval与大chunk三类warning，无新增AntD warning。 |
| Playwright discovery | 19 files / 22 tests。 |

## 真实 Chromium UI Review

**UI Review 状态：READY**

- 使用Vite production fixture build/preview和真实Chromium；fixture与图片均脱敏，公开静态旗帜请求在最终复验中由Playwright route返回本地SVG。
- 1440px：页面overflow=0；Application三个单位控件外层均为150px；Product card宽360px、body为flex、detail两行clamp=2；Order label为150px；Cart显示两条不同价格记录；Payment可见`role=status`与“Processing...”。
- 390px：6个review panel均位于left=8/right=382，页面overflow=0；Product card宽352px、detail仍为两行；Cart保持2个可见业务row并在组件容器内横向滚动；Payment status可见。
- Feishu Collapse：点击展开后脱敏detail挂载且`aria-expanded=true`；再次关闭后detail DOM不存在且`aria-expanded=false`，证明`destroyOnHidden`运行语义。
- 最终全新reload：console warning=0、console error=0、`pageErrors=[]`、`requestFailures=[]`；本地production静态资源均成功。
- 截图目视未发现重叠、裁切或页面级横向溢出。390px Order两列内容会按既有语义密集换行，但未重叠/溢出；本 change明确保持column/span，不扩大为响应式Descriptions重设计。
- 未运行axe：本 change没有新增依赖或新的交互控件类型；已人工核对Spin status语义、Collapse expanded状态与可见文本。全局axe基线应由独立change建立。

## 实施过程中的无效样本与修正

- 首次 GREEN 命令被1秒工具超时终止，没有形成有效样本；随后以相同命令和正常超时重跑。
- 首次 GREEN 完整组合中两条新增测试断言不符合当前组件现实：Typography.Paragraph根DOM不是`P`，Order fixture未带订阅字段。修正为验证官方多行ellipsis class，并给Order显式订阅fixture；先复核2个suite，再得到最终7-suite GREEN。
- Playwright旧参考中的`network`命令不被当前CLI识别；改用当前`requests --static`。
- 首次`run-code`未按当前CLI要求传入函数，语法错误且没有执行页面代码；改为`async (page) => {...}`后完成最终pageerror/requestfailed捕获。

## OpenSpec、文档与卫生

- active change已归档至`openspec/changes/archive/2026-07-17-eliminate-web-admin-antd-runtime-warning-owners`，`openspec list --json`为空。
- 新主规格`web-admin-antd-runtime-warning-owners`已同步；Purpose已改为中文长期契约，archive delta与主规格没有TBD或英文业务模板残留。
- all changes/all specs strict与`git diff --check`均通过；中文/TBD/敏感值/EOF与禁改写集审计无阻断命中，详见`pre-archive-review.md`。
- production build、coverage、浏览器fixture/截图/session、preview日志和进程已清理；最终closeout前还会清理本change `.planning`恢复资料。
- 浏览器与测试证据不包含账号、token、Cookie、client secret、私有URL、raw config或真实外部业务数据。

## Final closeout gate

- 归档与单提交amend后再次fetch，`origin/hfl-test-base`仍为`5b66c580`，当前分支为latest base + 1 logical commit，无需rebase。
- 根目录执行`openspec validate --changes --strict`返回无active items；`openspec validate --specs --strict`为54/54通过；`git diff --check origin/hfl-test-base...HEAD`通过。
- 最终focused non-silent Jest为7/7 suites、128/128 tests通过，目标AntD warning=0；随后`yarn typecheck`通过。
- package/lock hash仍与开工基线一致。archive后只变更OpenSpec文档与主规格，生产源码未再变化，因此复用同一源码状态下的全量Jest、coverage、完整typecheck/lint/build/discovery和Chromium证据。

## 剩余风险

- 390px下原有两列Descriptions会产生密集文本换行；本 change保持既有column/span契约且未出现重叠或页面overflow。若要改变移动信息架构，应建立独立响应式change。
- 全量non-silent仍有4条非目标React warning；其中3条属于主控明确分配给Admin-2的禁改owner，ModelPages act warning未在本change基线中稳定映射，因此保持可见、不猜测修改。
- 浏览器fixture验证生产组件/API和本地运行语义，不替代真实支付、企业同步或后端E2E；本 change也不需要这些外部验证。
