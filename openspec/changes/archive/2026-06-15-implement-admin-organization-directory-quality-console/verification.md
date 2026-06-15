## 验证记录

### OpenSpec

- `openspec validate implement-admin-organization-directory-quality-console --strict`：通过。
- `openspec validate --changes --strict`：4 个 active changes 通过。
- `openspec validate --specs --strict`：15 个主规格通过。
- `git diff --check`：通过。
- `openspec archive implement-admin-organization-directory-quality-console -y`：通过；同步 `admin-organization-master-model` 主规格并归档为 `2026-06-15-implement-admin-organization-directory-quality-console`。
- 归档后 `openspec validate --specs --strict`：15 个主规格通过。

### Go

- `cd admin && go test ./object -run TestOrganizationDirectoryQuality -count=1`：通过，覆盖 department/user/membership 质量分类、blocked/warning/ready、筛选、分页、脱敏、空组织和 store error。
- `cd admin && go test ./controllers -run TestNewOrganizationDirectoryQualityQueryParsesOperatorFilters -count=1`：通过，覆盖 controller query 参数转换。
- `cd admin && go test ./routers -run TestGetOrganizationDirectoryQualityObjectUsesOrganizationQuery -count=1`：通过，覆盖新 API path 的 organization scoped authz 解析。
- `cd admin && go test "-coverprofile=organization_directory_quality.cover" ./object -run TestOrganizationDirectoryQuality -count=1`：通过；`organization_directory_quality.go` statement coverage = 85.28%。包总覆盖率 1.2% 是 `admin/object` 大包平均值，不代表新增文件覆盖。

### Frontend

- `cd web-admin && yarn test --runInBand src/backend/PlatformApiMappingBackend.test.js src/OrganizationDirectoryQualityPage.test.js src/Setting.test.js --watchAll=false`：通过，9 个测试通过。测试输出包含项目现有 React 18 `ReactDOM.render` warning。
- `cd web-admin && yarn build`：通过。输出包含既有依赖警告：`fs.F_OK` deprecation、Browserslist 数据过期和 bundle size 提示。

### 边界验证

- 未触发 gateway projection publish。
- 未写 gateway authorization facts。
- 未读取 API/Gateway/Insight 内部库。
- 未修改飞书/企业微信同步实现。
- 未写真实 60 fixture、真实租户 payload、token、Cookie、Secret、私有 URL、手机号或邮箱。
