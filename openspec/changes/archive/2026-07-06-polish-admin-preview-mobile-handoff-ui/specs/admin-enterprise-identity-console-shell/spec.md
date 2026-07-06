## ADDED Requirements

### Requirement: Admin shell 响应式导航

Admin shell SHALL 保持桌面导航密度和稳定性，同时避免全局侧栏在窄视口挤压业务内容。

#### Scenario: 窄视口使用 compact shell 导航

- **WHEN** the Admin shell renders at a narrow viewport such as 390px
- **THEN** 桌面侧栏 SHALL NOT 占用横向页面宽度
- **AND** shell SHALL 暴露现有 drawer/menu 导航入口
- **AND** 桌面侧栏折叠偏好 SHALL 仍只作用于桌面布局
- **AND** route content SHALL 保持 `min-width: 0` 并避免页面级横向溢出
