# 实施前 Review

## 结论

`stabilize-web-admin-react18-async-test-boundaries` 可以进入实施，状态为 **READY**。

## 检查结果

- Artifacts 闭环：proposal、design、tasks 与两个 delta spec 描述同一 test-only 交付目标；没有模板残留、未收口 Open Question 或隐含生产行为变更。
- 立项证据成立：fixed environment non-silent 全量 Jest 为 153 suites / 1450 tests / 0 failure，稳定暴露 326 条 act 文本命中和 1 组 `PaymentPages` native timer 提示；no-op 门禁未触发。
- Root cause 路径可执行：组织同步类 owner 表现为 full-run/跨 suite 未完成 promise 或 timer，suppression owner 有明确文本过滤，timer owner 已由单 suite 对照定位；design 明确先等待真实完成条件，不机械包裹同步 `fireEvent`。
- TDD 矩阵完整：suppression、组织同步、timer、portal/lazy/legacy class 四类均定义 RED、GREEN 和代表 owner；单 suite 偶然 0 warning 不替代相邻 suite/全量证据。
- No-suppression 契约清楚：局部 guard 必须保留原始 console 并恢复 spy，只做失败断言；禁止按文本返回、全局 setup、skip/only、扩大 mock、timeout 放宽、空 `act` 和 legacy ReactDOM。
- 写集 fail-closed：默认只改 warning owner 测试与必要 test-only helper；若必须修改 production、依赖/lock、Jest 全局 config/setup、Signup、Go/schema/workflow，则停止为 `RC_READY` 请求扩写集。
- 兼容与交付：保持最新 discovery 或增加、默认 timeout、现有断言、Vite、Playwright 19/22 和 Yarn 真值；最终可收敛为 latest base + 1 test-only/OpenSpec commit。
- 安全与文档：不涉及真实环境、认证链路、数据写入或凭据；原始长日志只保存在 ignored planning 目录，仓库文档只记录脱敏计数与 owner。

## 验证

- `openspec validate stabilize-web-admin-react18-async-test-boundaries --strict`：通过。
- `openspec validate --changes --strict`：通过。
- `git diff --check`：通过。

## 非阻塞实施注意事项

- Jest console 汇总与单 suite 退出时机不同，最终 act/FakeTimers 目标必须以 fixed environment non-silent 全量运行复核。
- AntD deprecated API、unique key 与未挂载 class `setState` 等生产/runtime owner保持分类可见；本 change 不以修改生产代码清零所有 console warning。
- 本 change 没有 production implementation，changed implementation coverage 和浏览器 smoke 预计为 N/A；仍需完整 Jest、类型、lint、public scripts、Vite build 与 Playwright discovery 行为门禁。
