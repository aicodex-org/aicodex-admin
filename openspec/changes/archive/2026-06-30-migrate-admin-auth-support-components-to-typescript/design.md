## Approach

本迁移采用保守的 rename + narrow typing 策略：

- 含 JSX 的 React 组件迁移为 `.tsx`，纯逻辑或只导出常量/helper 的模块迁移为 `.ts`。
- 保留 extensionless imports，避免调用方因为后缀变化产生额外 diff。
- 对 legacy JS 边界使用局部类型和有限 `unknown` 收窄；只在 SDK 或动态 Provider payload 无法静态确定时使用带说明的窄 `any`。
- 不重构登录流程、不改 UI 布局、不调整接口路径、不改变授权 URL 拼接或回调参数。

## Typing Boundaries

- Provider 记录和登录方式类型以当前组件实际读取字段为准，不在本 change 中定义全局认证领域模型。
- `window` 第三方 SDK 对象、二维码登录回调和 Web3 provider 只声明当前文件需要的最小字段。
- 测试 mock 以现有断言为准迁移到 TypeScript，不扩大到真实 OAuth/OIDC、WeCom 或第三方 SDK 调用。

## Deferred Policy

如果某个小型登录按钮组件牵出主登录页、回调页、后端 wrapper 或第三方 SDK 大型类型洞，则该组件保留 JS，并在任务/交付说明中列入 deferred。P0 support 组件优先完成。
