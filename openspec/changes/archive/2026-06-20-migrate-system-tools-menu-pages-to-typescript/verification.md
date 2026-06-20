## 验证记录

### OpenSpec

- `openspec validate migrate-system-tools-menu-pages-to-typescript --strict`：通过。
- `openspec validate --changes --strict`：通过，5 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，26 个 specs 全部 valid。

### 代码与前端门禁

- `git diff --check`：通过。
- `web-admin> node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
- `web-admin> yarn typecheck --pretty false`：通过。
- `web-admin> yarn build`：通过；输出既有 `Browserslist: caniuse-lite is outdated`、`fs.F_OK is deprecated` 和 bundle size warning，本 change 未修改构建配置或依赖。

### 聚焦测试与覆盖率

- `web-admin> yarn test --watchAll=false --runInBand --silent SystemToolsMenuPages.test.tsx`：通过，18 个测试全部通过。
- `web-admin> yarn test --watchAll=false --runInBand --silent SystemToolsMenuPages.test.tsx --coverage --collectCoverageFrom=src/SystemInfo.tsx --collectCoverageFrom=src/FormListPage.tsx --collectCoverageFrom=src/FormEditPage.tsx --collectCoverageFrom=src/TicketListPage.tsx --collectCoverageFrom=src/TicketEditPage.tsx`：通过。

覆盖率统计对象为本 change 触碰的 5 个生产 TSX 页面，均达到 85% 门槛：

| 文件 | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `FormEditPage.tsx` | 86.20% | 62.50% | 69.56% | 86.20% |
| `FormListPage.tsx` | 90.62% | 78.94% | 82.75% | 90.00% |
| `SystemInfo.tsx` | 93.82% | 74.64% | 88.46% | 95.00% |
| `TicketEditPage.tsx` | 92.95% | 65.62% | 88.88% | 92.95% |
| `TicketListPage.tsx` | 94.33% | 78.57% | 90.47% | 94.11% |
| All files | 91.74% | 71.02% | 84.12% | 91.87% |

新增测试覆盖了本次迁移的主要行为风险：TSX 文件存在且旧 JS 不存在、系统信息渲染、轮询、timer 清理、Tour、移动端和错误分支、表单列表增删查和拒绝/失败响应、表单编辑加载、输入更新、类型切换、预览、保存成功/失败/异常、工单列表状态、增删查和拒绝/失败响应、工单编辑加载、字段更新、保存成功/失败/异常、消息发送成功/失败/异常、404/空消息/null guard，以及 `/swagger` 外链边界。

### 剩余风险

- 未做浏览器截图或完整手工走查；本 change 不做视觉重设计，核心行为由 focused Jest、coverage、typecheck 和 build 覆盖。

### Archive 后验证

- `openspec validate --changes --strict`：通过，4 个 active changes 全部 valid。
- `openspec validate --specs --strict`：通过，26 个 specs 全部 valid。
- `git diff --check`：通过。
