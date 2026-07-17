## MODIFIED Requirements

### Requirement: CI 真实执行 Playwright 并保留有限失败证据
GitHub Actions SHALL 精确安装Bun 1.3.14、通过统一Linux frozen入口安装依赖、显式安装Chromium、验证backend/Vite readiness并运行完整Playwright suite；仅安装Playwright或只执行discovery SHALL NOT 视为E2E通过。

#### Scenario: CI 执行完整 Playwright suite
- **WHEN** E2E job运行
- **THEN** job SHALL 使用唯一 `bun.lock`、统一Linux frozen安装入口、显式Chromium安装、E2E TypeScript检查和完整Playwright run
- **AND** Chromium run SHALL 执行22个测试且失败时阻止依赖该job的release流程
- **AND** CI retries SHALL 保持2，本地retries SHALL 保持0，workers SHALL 保持1

#### Scenario: CI 上传失败诊断工件
- **WHEN** Playwright E2E失败
- **THEN** CI SHALL 上传HTML report、trace和screenshot的可用子集
- **AND** 工件 SHALL 只包含一次性fixture数据、使用有限保留期并在无文件时安全结束上传步骤
- **AND** verification SHALL 只记录脱敏摘要、计数和相对路径，不复制原始trace、Cookie或响应体

## REMOVED Requirements

### Requirement: Cypress 路径一次性移除且 Yarn 保持单一真值
**Reason**: Cypress退役已经完成，但本change将package manager单一真值从Yarn迁移为Bun，旧Yarn真值要求不再成立。

**Migration**: 使用新增的“Cypress路径保持退役且Bun成为单一真值”要求；保持Cypress资产退役、Playwright行为、19 files/22 tests和依赖边界不变。

## ADDED Requirements

### Requirement: Cypress路径保持退役且Bun成为单一真值
仓库 SHALL 继续删除Cypress dependency、config、support、spec、专用TypeScript配置和GitHub Action，并 SHALL 以Bun与 `bun.lock`作为唯一package manager真值。

#### Scenario: 审计最终dependency tree
- **WHEN** package manager迁移完成后检查package与lockfile
- **THEN** `cypress`、`@cypress/request`、`@cypress/xvfb`和仅由Cypress引入的 `bluebird` SHALL 不再出现在有效依赖路径
- **AND** `@playwright/test` SHALL 由 `package.json`和唯一 `bun.lock`确定性解析
- **AND** change SHALL NOT 升级React、Router、Jest、Vite或恢复Web3

#### Scenario: 审计最终仓库资产
- **WHEN** 全仓搜索Cypress与Playwright接入点
- **THEN** 运行时E2E资产与CI SHALL 只引用Playwright
- **AND** 历史OpenSpec证据 MAY 保留Cypress与Yarn技术术语
- **AND** Admin Go runtime、fixture/schema和生产业务源码 SHALL 无行为修改
