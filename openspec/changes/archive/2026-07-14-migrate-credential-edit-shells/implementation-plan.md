# 证书与密钥编辑页统一壳 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将证书和密钥编辑页迁移到统一编辑壳，并把新增流程统一为保存时创建。

**Architecture:** 列表页只构造并传递内存草稿；编辑页根据 add/edit mode 选择 add 或 update API。证书页使用 `LargeEditTabs` 双 tabs，密钥页使用同一 `LargeEditShell` 的单正文双分区；后端仍负责生成并持久化凭据，普通保存成功后通过 get API 回读。

**Tech Stack:** React 18、TypeScript、Ant Design 5、i18next、Jest、Testing Library、Less、OpenSpec。

---

### Task 1: 列表页保存前不创建凭据

**Files:**
- Modify: `web-admin/src/CertListPage.tsx`
- Modify: `web-admin/src/KeyListPage.tsx`
- Create: `web-admin/src/CertListPage.test.tsx`
- Create: `web-admin/src/KeyListPage.test.tsx`

- [ ] **Step 1: 写失败测试**

测试分别实例化列表页，mock `Setting.getRandomName`、`addCert` / `addKey` 和 `history.push`，调用 `addCert()` / `addKey()` 后断言 add API 未调用，且路由携带 `mode: "add"` 与完整 draft：

```tsx
page.addCert();
expect(CertBackend.addCert).not.toHaveBeenCalled();
expect(history.push).toHaveBeenCalledWith({
  pathname: "/certs/engineering/cert_draft123",
  mode: "add",
  cert: expect.objectContaining({owner: "engineering", name: "cert_draft123"}),
});
```

- [ ] **Step 2: 确认测试因旧的预创建调用失败**

Run: `yarn test src/CertListPage.test.tsx src/KeyListPage.test.tsx --watchAll=false --runInBand`

Expected: FAIL，`addCert` / `addKey` 被调用或路由缺少 draft。

- [ ] **Step 3: 最小实现列表草稿导航**

将新增方法收敛为：

```tsx
addCert(): void {
  const cert = this.newCert();
  this.props.history.push({pathname: `/certs/${cert.owner}/${cert.name}`, mode: "add", cert});
}
```

密钥页使用同样结构传递 `keyDraft: newKey`（避开 history 保留字段 `location.key`），删除原新增成功/失败消息和 add API 调用；列表显式删除方法不改。

- [ ] **Step 4: 运行列表测试通过**

Run: `yarn test src/CertListPage.test.tsx src/KeyListPage.test.tsx --watchAll=false --runInBand`

Expected: 2 suites PASS，点击添加不产生后端写入。

### Task 2: 证书编辑页双 tabs 和保存时创建

**Files:**
- Modify: `web-admin/src/CertEditPage.tsx`
- Create: `web-admin/src/CertEditPage.test.tsx`

- [ ] **Step 1: 写共享壳与 tabs 失败测试**

覆盖 `.cert-edit-shell`、`.cert-edit-action-bar`、“基础配置/证书材料”、hash 恢复、旧 `.ant-card-head` 和重复按钮不存在。通过 class 实例 harness 直接替换同步 `setState`，不挂载真实后端。

- [ ] **Step 2: 写添加态行为失败测试**

构造 `location: {mode: "add", cert: draft}`，断言 `getCert()` 只装载 draft；取消只 push `/certs`；普通保存只调用 `addCert`，成功后更新 owner/name/mode、push 正式 URL 并调用 `getCert()`；失败恢复 `submitting=false`。

- [ ] **Step 3: 确认测试失败**

Run: `yarn test src/CertEditPage.test.tsx --watchAll=false --runInBand`

Expected: FAIL，页面没有共享壳/tabs，添加态仍 update 或 delete。

- [ ] **Step 4: 实现状态和模式分流**

为 location 增加 `cert?: CertRecord`，state 增加 `activeTabKey` 和 `submitting`；`getCert()` 在 add + draft 时直接 setState，提交方法使用：

```tsx
const request = this.state.mode === "add"
  ? CertBackend.addCert(cert)
  : CertBackend.updateCert(this.state.owner, this.state.certName, cert);
```

成功后切换 edit；普通保存 push 正式 URL 并 `getCert()`，保存并返回 push `/certs`。finally 路径保证失败恢复 submitting。

- [ ] **Step 5: 实现证书双 tabs 共享壳**

保留现有字段 JSX 和 handlers，将组织/名称/显示名/用途/类型/算法/位数/有效期/SSL 参数放入基础 tab，将 certificate/privateKey 及复制下载放入材料 tab。`LargeEditShell.actions` 顺序固定为取消、保存、保存并返回。

- [ ] **Step 6: 运行证书测试通过**

Run: `yarn test src/CertEditPage.test.tsx --watchAll=false --runInBand`

Expected: PASS，且测试不输出或断言完整敏感材料。

### Task 3: 密钥编辑页单正文和保存时创建

**Files:**
- Modify: `web-admin/src/KeyEditPage.tsx`
- Create: `web-admin/src/KeyEditPage.test.tsx`

- [ ] **Step 1: 写共享壳与单正文失败测试**

覆盖 `.key-edit-shell`、基础信息与凭据状态分类标题、无 `.key-edit-tabs`、唯一动作栏和旧 Card title 消失。

- [ ] **Step 2: 写添加态行为失败测试**

构造 `location: {mode: "add", keyDraft: draft}`，断言进入页面不 get/add/delete；取消只返回；保存调用 `addKey`；普通保存成功后切换 edit、push 正式 URL 并 `getKey()` 回读；保存失败恢复提交状态。

- [ ] **Step 3: 确认测试失败**

Run: `yarn test src/KeyEditPage.test.tsx --watchAll=false --runInBand`

Expected: FAIL，旧页面没有共享壳且添加态仍 update。

- [ ] **Step 4: 实现共享壳和模式分流**

按证书页相同模式增加 draft 装载、add/update 分流和 submitting。正文使用两个 `admin-large-edit-content-section-title`，不传 `tabs` prop；组织/名称/显示名/类型/应用/用户进入基础区，accessKey/accessSecret/expireTime/state 进入凭据状态区。

- [ ] **Step 5: 运行密钥测试通过**

Run: `yarn test src/KeyEditPage.test.tsx --watchAll=false --runInBand`

Expected: PASS，编辑态 payload 与路由回滚测试保持通过。

### Task 4: 样式、cardless route 和 i18n

**Files:**
- Create: `web-admin/src/styles/edit/credential-edit.less`
- Modify: `web-admin/src/styles/large-edit-pages.less`
- Modify: `web-admin/src/styles/edit/large-edit-common.less`
- Modify: `web-admin/src/LargeEditFormLayout.test.ts`
- Modify when required: `web-admin/src/locales/zh/data.json`
- Modify when required: `web-admin/src/locales/en/data.json`

- [ ] **Step 1: 扩展布局契约失败断言**

要求 Cert/Key 源码导入 `LargeEditShell`，页面保留 `admin-access-edit-page` 且暴露 `cert-edit-card` / `key-edit-card`，样式聚合入口导入 `credential-edit.less`。

- [ ] **Step 2: 实现 scoped 样式**

仅在 `.cert-edit-page, .key-edit-page` 下处理 flex 高度、tab panel、材料 textarea 容器、宽字段和窄屏；公共 label/section/button 直接使用已有 `admin-large-edit-*` class/mixin，不复制颜色和按钮尺寸。

- [ ] **Step 3: 补齐 cardless route selector 与 locale**

将证书/密钥页面根 class 并入现有无外层 Card 的 route contract。新增“基础配置”“证书材料”“凭据与状态”“保存并返回”等缺失 key 时同步更新 zh/en；已有 key 直接复用。

- [ ] **Step 4: 运行布局、lint 和 typecheck 聚焦门禁**

Run: `yarn test src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`

Run: `yarn eslint src/CertEditPage.tsx src/KeyEditPage.tsx src/CertListPage.tsx src/KeyListPage.tsx`

Run: `yarn stylelint src/styles/edit/credential-edit.less`

Expected: 全部 exit 0。

### Task 5: 自动化、覆盖率和构建

**Files:**
- Modify: `openspec/changes/migrate-credential-edit-shells/tasks.md`
- Create: `openspec/changes/migrate-credential-edit-shells/verification.md`

- [ ] **Step 1: 运行全部聚焦测试**

Run: `yarn test src/CertListPage.test.tsx src/KeyListPage.test.tsx src/CertEditPage.test.tsx src/KeyEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand`

Expected: 所有 suite PASS，非 0 tests。

- [ ] **Step 2: 计算最终 changed implementation coverage**

使用 Jest JSON coverage 收集四个页面实现文件，与 `origin/hfl-test-base` Git 新增可执行 statement 行求交集。Expected: `>=85%`，不通过排除文件或低价值断言制造达标结果。

- [ ] **Step 3: 运行静态和构建门禁**

Run: `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`

Run: `yarn typecheck --pretty false`

Run: `yarn build`

Expected: exit 0，仅允许记录仓库既有非阻断 warning。

- [ ] **Step 4: 更新 OpenSpec 验证证据**

记录命令、测试数量、覆盖率、构建结果和未执行真实凭据写操作的限制；运行 `openspec validate migrate-credential-edit-shells --strict` 与 `git diff --check`。

### Task 6: 代理 60 的只读浏览器 RC

**Files:**
- Modify: `openspec/changes/migrate-credential-edit-shells/verification.md`

- [ ] **Step 1: 启动受管本地预览**

Run: `.\local-dev\start-frontend-remote-backend.ps1 restart -Port 7003`

Expected: 前端监听 7003，只代理已配置的 60 测试后台。

- [ ] **Step 2: 验证证书与密钥页面**

使用浏览器只读检查现有证书/密钥编辑路由：证书双 tabs/hash、密钥双区块、唯一底栏、1440/1024/768、浅色/暗色、正文内部滚动、根页面无横向 overflow、console/page error 为 0。

- [ ] **Step 3: 保护敏感验证材料**

不得点击保存、保存并返回、删除、刷新域名、复制或下载；截图避免完整私钥/Access secret，可停留基础 tab 或遮蔽材料区。验证记录只写结构、尺寸和错误数量。

- [ ] **Step 4: 更新 RC 证据并进入归档前 review**

将浏览器证据和剩余风险写入 verification，完成 tasks 后运行 OpenSpec pre-archive review；没有 `READY` 不 archive。
