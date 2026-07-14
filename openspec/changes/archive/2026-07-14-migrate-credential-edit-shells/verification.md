# 验证记录

## 自动化验证

- 聚焦测试：
  - 命令：`yarn test src/ManagementPage.shell.test.tsx src/LargeEditFormLayout.test.ts src/CertEditPage.test.tsx src/KeyEditPage.test.tsx src/CertListPage.test.tsx src/KeyListPage.test.tsx --watchAll=false --runInBand --silent`
  - 结果：6 个 suite、69 个 test 全部通过。
  - 覆盖行为：列表添加只打开本地草稿；添加/编辑保存 API 分流；取消不删除；保存并返回；失败恢复；重复提交保护；证书 tab hash fallback；密钥创建成功后切换 edit 再回读。
- Changed implementation coverage：
  - 命令：`yarn test src/CertEditPage.test.tsx src/KeyEditPage.test.tsx src/LargeEditFormLayout.test.ts --watchAll=false --runInBand --silent --coverage --collectCoverageFrom=src/CertEditPage.tsx --collectCoverageFrom=src/KeyEditPage.tsx`。
  - 统计对象：`CertEditPage.tsx`、`KeyEditPage.tsx`、`CertListPage.tsx`、`KeyListPage.tsx`。
  - 统计口径：Jest `coverage-final.json` 的 statement map 与 `git diff --ignore-all-space --unified=0 origin/hfl-test-base` 的新增可执行行求交集，排除纯缩进变化。
  - 最新结果：证书编辑页 101/102（99.02%）、密钥编辑页 85/86（98.84%）；两个列表页此前验证均为 1/1（100%），达到 85% 门槛。
  - `ManagementPage.tsx` 新增的 2 行凭据 cardless route pattern 已由壳层测试覆盖，changed-line coverage 为 2/2（100%）；对应 Istanbul 语句执行 55 次。
- 静态与构建门禁：
  - `node scripts/check-incremental-typescript-gate.mjs --base origin/hfl-test-base`：通过。
  - `yarn typecheck --pretty false`：通过。
  - 聚焦源码与测试 ESLint：通过。
  - `yarn stylelint src/styles/edit/credential-edit.less`：通过。
  - `yarn build`：通过；仅有仓库既有的 Browserslist 数据过期、`fs.F_OK` 弃用和 bundle size 提示。
- OpenSpec 与 Git：
  - `openspec validate migrate-credential-edit-shells --strict`：通过。
  - `git diff --check`：通过。

## 浏览器 RC

- 使用 `local-dev/start-frontend-remote-backend.ps1` 在本地 `7003` 启动前端，只代理 60 测试后台；未启动、修改或重启后端。
- 使用授权测试账号登录；账号、密码、Cookie、响应体和后台完整地址未写入仓库或本记录。
- 证书编辑页：
  - 1440px 浅色与暗色下，统一头部、双 tabs、基础信息、唯一底栏和公共暗色 token 正常。
  - 切换证书材料后 hash 为 `#material`；未知 hash 在重新装载时回退基础信息。
  - 1440px 材料区为双列；768px 为单列，两个 textarea 均存在，正文内部滚动，底栏完整可见，根页面无横向溢出。
  - 材料页只测量结构；未读取、复制、下载或记录证书和私钥内容，工具自动生成的材料页快照已删除。
- 密钥编辑页：
  - 列表点击添加后仅进入本地草稿页，名称、显示名、组织、类型和状态正确带入；期间未点击保存，返回列表仍为 0 条。
  - 正文无 tabs，按“基础信息 / 凭据与状态”双区块展示，只有一个底栏。
  - 1440px、1024px、768px 均无页面级横向溢出；768px 标签左对齐、正文内部滚动且底栏完整可见。
  - 识别并修复 history 保留字段 `location.key` 覆盖草稿的问题，草稿改用 `location.keyDraft`。
- 截图复查修复：
  - 用户桌面截图暴露证书、密钥编辑页仍被旧 `content-warp-card` 包裹，页面根节点按内容收缩，导致操作栏之后出现大块无效空白。
  - 根因是 `ManagementPage.isWithoutCard()` 漏登记证书、密钥详情路由；样式层 cardless selector 已存在，因此修复路由分类而未增加页面私有高度规则。
  - 1920x900 下两页不再渲染 `content-warp-card`，编辑页根节点高度均为 804px，操作栏底边为 900px；1024px 与 768px 下操作栏完整可见，768px 仅正文内部滚动，页面级横向溢出为 0。
  - 清理组织、显示名称、应用/用户选择、过期时间和状态等复述型 tooltip；技术名称、凭据归属、算法联动和敏感材料提示改用证书/密钥专属中英文文案，不再出现 `Type - Tooltip` 等占位文本。
  - 组织下拉复用公共 Option 样式，选中值显示组织 `displayName`，展开项以 `displayName` 为主、技术标识 `name` 为次，并支持按两者搜索；证书页只保留一个 `admin（共享）` 选项。
  - 证书材料 tab 的公共 `Row/Col` 首个编辑列曾被通用表单规则压缩，导致两块材料编辑器宽度不一致。材料网格补充同路径的 scoped override 后，1920px 下左右编辑器均为 606.5px；1024px 下两组材料均为 525px 单列对齐；768px 下正文内部滚动、底栏完整可见，均无页面级横向溢出。
- Console：直接打开最终证书页、密钥页均为 0 个 error、0 个 warning；未出现 webpack overlay。

## 剩余风险

- 浏览器 RC 遵循只读边界，未点击保存、保存并返回、删除、复制或下载；真实后端生成证书/密钥及保存后回读由聚焦行为测试覆盖，但未在 60 测试后台执行写入验收。
- 添加草稿只保存在路由内存状态中；刷新未保存的添加页会进入 404，这是 proposal 已接受的取舍。
- 未新增项目级 axe 依赖；本轮以现有 Ant Design 语义、键盘可达控件和人工响应式检查为准。
