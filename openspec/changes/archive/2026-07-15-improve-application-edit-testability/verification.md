## 已完成验证

### 关联回归与覆盖率

```powershell
cd web-admin
yarn test ApplicationEditPage.test.tsx ApplicationEditPageUiCustomization.test.tsx applicationEditRules.test.ts LargeEditFormLayout.test.ts ManagementPage.shell.test.tsx --watchAll=false --runInBand --coverage --collectCoverageFrom=src/ApplicationEditPage.tsx --collectCoverageFrom=src/ApplicationEditForm.tsx --collectCoverageFrom=src/applicationEditRules.ts --silent
```

- 结果：5 个测试套件、104 个用例全部通过。
- `ApplicationEditForm.tsx`：行覆盖率 88.46%。
- `ApplicationEditPage.tsx`：行覆盖率 90.39%。
- `applicationEditRules.ts`：行覆盖率 100%。
- 统计包含所有直接引用应用编辑页或本次规则模块的测试文件，未排除受影响生产文件。

### 静态检查

```powershell
cd web-admin
yarn typecheck
yarn eslint src/ApplicationEditPage.tsx src/ApplicationEditForm.tsx src/ApplicationEditPage.test.tsx src/ApplicationEditPageUiCustomization.test.tsx src/LargeEditFormLayout.test.ts src/applicationEditRules.ts src/applicationEditRules.test.ts

cd ..
openspec validate "improve-application-edit-testability" --strict
git diff --check
```

- 结果：全部通过。
- ESLint 仅输出现有 Browserslist 数据库过期提示，未报告 lint 问题。

### 本地前端代理 60 测试后台浏览器 smoke

```powershell
.\local-dev\start-frontend-remote-backend.ps1 restart -Port 7005 -BackendUrl "<60-admin-backend>"
npx.cmd --yes --package @playwright/cli playwright-cli -s=application-testability open http://127.0.0.1:7005 --headed
```

- 授权边界：按用户授权读取本机私有测试环境说明，仅用于获取 60 Admin 测试后台地址和登录账号；本记录不写账号、密码、Cookie、token、完整后台地址或原始敏感响应。
- 启动结果：当前 worktree 前端在本机 `7005` 启动，健康检查确认代理目标的 `/api/get-account` 返回 JSON；验证结束后已关闭 Playwright 会话并执行 `stop -Port 7005`。
- 登录结果：首次使用不匹配组织的账号登录返回业务错误，未进入后台；随后使用 60 Admin 测试账号登录成功进入管理后台。该失败尝试未产生配置写入。
- 应用列表：`/applications` 列表加载成功，目标应用行可见，点击后进入应用编辑页。
- Tab 切换：目标应用编辑页八个 Tab 均可渲染并更新 hash 路由：基础、身份验证、OIDC/OAuth、SAML、提供商、界面定制、安全设置、反向代理。
- 关键区块：基础信息、身份验证设置、OIDC/OAuth 设置、SAML 设置、Provider 表与目标组织绑定表、界面定制设置、安全设置和反向代理设置均出现对应字段或表格。
- 校验保护：清空“显示名称”后点击“保存”，页面显示“此字段是必需的”和“未保存”；网络请求列表未出现 `update-application`，没有向后台提交更新。
- 离开保护：点击“取消”后出现“当前应用配置有未保存修改，确认不保存并离开？”弹窗；确认丢弃后返回应用列表。重新打开同一应用后，“显示名称”仍为原值。
- Console 结果：未见业务运行时异常或 webpack overlay；存在既有开发态/依赖警告，包括 AntD `Spin`/`Form.Item`/`message`/`Modal` 静态函数上下文警告，以及 branding favicon 404。这些不由本 change 引入，本次未处理。

## 剩余风险

- 本次 smoke 是本地前端代理 60 测试后台的 UI 运行态验证，不是部署后端或真实保存契约验收；保存 payload 语义已由 Jest 用例覆盖。
- 八个 Tab 的展示与字段回调已迁入 `ApplicationEditForm.tsx`；历史 class 页面继续负责状态、异步与保存协调，没有改写为 hooks，也没有改变后端契约。
