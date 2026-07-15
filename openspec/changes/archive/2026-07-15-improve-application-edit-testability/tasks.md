## 1. 基线与测试边界

- [x] 1.1 已固化应用编辑页完整关联测试集合和 48.41% 覆盖率基线；未覆盖区域主要分为纯规则、异步协调和八个 Tab 内容，首批 Provider、SAML、安全和反向代理 Tab 渲染测试已将覆盖率提高到 56.13%。
- [x] 1.2 已为详情默认值、字段规范化、必填校验、自定义 scope 校验、保存 payload、成功跳转、重复提交保护及保存失败补充行为测试。
- [x] 1.3 已审查现有 `ApplicationEditPage` 相关测试，保留配置结果、错误提示和保存语义断言；新增用例未出现 React `act` 警告。旧版 Testing Library 在 React 18 下的 `ReactDOM.render` 兼容提示属于测试基础设施遗留问题，本 change 未升级依赖。

## 2. 可测试性拆分

- [x] 2.1 已提取低耦合的应用字段规范化、自定义 scope 校验和必填字段识别规则为 `applicationEditRules.ts`；页面保留保存 payload、错误定位和副作用语义。
- [x] 2.2 已提取 Provider 保存过滤、SAML metadata URL 和《使用条款》资源路径等可独立测试边界；反向代理配置保持页面内交互并由字段回写测试保护，未改变路由、Tab、i18n 或 API 调用顺序。
- [x] 2.3 已将八个 Tab 的展示与字段回调迁入 `ApplicationEditForm.tsx`；`ApplicationEditPage` 保留路由、状态、异步加载、保存、导航与跨 Tab 预览协调，并以中文注释说明展示层委托和保存保护边界。

## 3. 验证与收口

- [x] 3.1 已运行完整关联 Jest 套件和覆盖率统计：104 个用例全部通过，`ApplicationEditForm.tsx` 行覆盖率为 88.46%，`ApplicationEditPage.tsx` 为 90.39%，`applicationEditRules.ts` 为 100%。
- [x] 3.2 已运行 `yarn typecheck`、聚焦 ESLint、OpenSpec strict validation 和 `git diff --check`，均通过。
- [x] 3.3 使用本地前端代理测试后台做只读浏览器验证：应用详情加载、Tab 切换、校验提示和无保存离开流程保持兼容；记录脱敏证据与剩余风险。
