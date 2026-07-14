## ADDED Requirements

### Requirement: 证书和密钥编辑页使用统一凭据编辑壳
应用接入中心 SHALL 让证书和密钥新增/编辑页复用共享大型编辑页壳，同时保持后端作为凭据生成与持久化事实 owner 的既有边界。

#### Scenario: 证书编辑页使用双 tabs
- **WHEN** 管理员打开证书新增或编辑页
- **THEN** 页面 SHALL 使用共享头部、路径、滚动正文和固定底部动作栏
- **AND** 页面 SHALL 提供“基础配置”和“证书材料”两个 tabs
- **AND** 当前 tab SHALL 写入 URL hash，并在正式编辑页刷新后恢复
- **AND** 证书与私钥复制、下载和编辑能力 SHALL 保持可用
- **AND** 页面 SHALL NOT 保留 Card title 或正文末尾的重复保存按钮

#### Scenario: 密钥编辑页使用单正文分区
- **WHEN** 管理员打开密钥新增或编辑页
- **THEN** 页面 SHALL 使用共享头部、路径、滚动正文和固定底部动作栏
- **AND** 页面 SHALL 使用“基础信息”和“凭据与状态”两个正文区块
- **AND** 页面 SHALL NOT 为当前字段量渲染空泛 tabs
- **AND** 页面 SHALL NOT 保留 Card title 或正文末尾的重复保存按钮

#### Scenario: 添加入口只打开本地草稿
- **WHEN** 管理员在证书或密钥列表点击添加
- **THEN** 前端 SHALL 使用既有默认值打开对应新增编辑页
- **AND** 前端 SHALL NOT 在进入页面时调用 `addCert`、`addKey`、`deleteCert` 或 `deleteKey`
- **AND** 草稿 SHALL NOT 写入 URL、localStorage 或日志

#### Scenario: 添加态只在保存时创建凭据
- **WHEN** 管理员在证书或密钥添加页点击保存或保存并返回
- **THEN** 前端 SHALL 分别调用既有 `addCert` 或 `addKey`，并保持既有新增 payload
- **AND** 普通保存成功后页面 SHALL 切换到正式编辑路由并重新读取后端记录
- **AND** 页面 SHALL 展示后端返回的证书、私钥、Access key 或 Access secret，而不是在前端生成替代值
- **AND** 保存并返回成功后页面 SHALL 返回对应列表

#### Scenario: 添加态取消不产生后端写入
- **WHEN** 管理员在尚未保存的证书或密钥添加页点击返回或取消
- **THEN** 页面 SHALL 返回对应列表
- **AND** 页面 SHALL NOT 调用新增或删除 API

#### Scenario: 编辑态保存和凭据业务行为保持兼容
- **WHEN** 管理员编辑并保存现有证书或密钥
- **THEN** 前端 SHALL 继续调用既有 update API，并保持 payload、路由标识回滚和错误提示语义
- **AND** 证书类型切换、算法参数、SSL 配置、域名刷新、复制、下载及密钥归属字段行为 SHALL 保持兼容
- **AND** 系统 SHALL NOT 修改凭据生成算法、权限模型、后端 API 或列表显式删除行为

#### Scenario: 保存期间阻止重复提交
- **WHEN** 证书或密钥保存请求尚未完成
- **THEN** 页面 SHALL 展示提交中状态并阻止重复保存请求
- **AND** 请求失败后页面 SHALL 恢复可提交状态并展示既有本地化错误信息

#### Scenario: 凭据页面不泄露敏感验证数据
- **WHEN** 前端测试或浏览器 smoke 验证证书和密钥编辑页
- **THEN** 验证材料 SHALL 使用脱敏 fixture 或只记录结构性证据
- **AND** 日志、截图和验证文档 SHALL NOT 包含完整证书私钥、Access secret、Cookie 或其它可复用凭据
