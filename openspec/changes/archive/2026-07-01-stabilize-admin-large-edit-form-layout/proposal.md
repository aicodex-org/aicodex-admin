# 稳定 Admin 大编辑页内部表单布局

## Why

组织编辑页双卡片壳修复后，外层 Shell 已不再叠加内容 Card，但组织、用户、应用、Provider、Syncer 等大编辑页内部仍大量使用手写 `Row` / `Col span` 作为 label 与内容列。不同页面的 label 宽度、内容列伸缩和窄屏换行规则不一致，容易继续出现长中文 label 挤压、按钮区偏移、页面级横向溢出或后续页面修补各自为政。

## What Changes

- 为组织、用户、应用、Provider、Syncer 主编辑 Card 增加统一稳定样式边界。
- 将大编辑页主表单行的 label 列改为稳定宽度，内容列使用剩余空间并允许长内容在局部容器内处理。
- 窄屏下恢复单列换行，避免页面级横向滚动。
- 补充聚焦测试，约束统一 class hook 与样式契约。

## Non-Goals

- 不修改编辑页保存、删除、上传、Provider 配置、Syncer 配置、应用主题或认证相关 payload 语义。
- 不重写这些页面为 AntD `Form` 布局。
- 不改变 ManagementPage 已完成的 cardless route 规则。
- 不处理其它未纳入本次范围的列表页、详情页或独立工具页视觉问题。

## Impact

- 前端范围：`web-admin/src` 大编辑页主 Card class 与 `App.less` scoped CSS。
- 验证范围：OpenSpec validate、聚焦 Jest、增量 TS gate、typecheck；CSS 可见风险通过本地浏览器 smoke 覆盖核心页面。
