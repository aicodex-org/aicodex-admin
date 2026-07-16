# Pre-Implementation Review

## 结论

状态：`READY`

- proposal、design、delta spec与tasks描述同一交付目标：只收口最新7-suite基线中的47条AntD 5.29.3 runtime warning，不扩大到Admin-2或其它latent owner。
- warning message、suite、render路径和production API已稳定映射到6个生产文件；不存在需要猜测owner或跨包架构改造的类别。
- InputNumber `suffix`、Card/Descriptions semantic styles、Typography.Paragraph、Cart四元组key、Payment status结构和Collapse `destroyOnHidden`均由当前源码/类型支持，且有直接行为测试路径。
- TDD顺序明确：先让局部non-silent guard因现有warning失败，再做生产迁移；guard保留原console并与React act分类独立。
- package/lock、依赖、后端/API/schema、Jest全局配置、workflow、Signup和Admin-2三个owner均明确禁止修改。
- coverage、完整non-silent分类、`test:ci`、三类typecheck、增量TS、lint/public scripts/Vite、19/22 discovery与Chromium 1440/390验收路径完整。
- 文档以简体中文说明为主，保留的AntD/API/prop/命令属于技术术语；没有真实URL、凭据、token、Cookie或原始长日志。
- change可收敛为latest `origin/hfl-test-base` + 1个逻辑commit，并按self-closeout授权归档、普通push base和清理分支；绝不push/merge `test`。

## 非阻塞实施注意

- `InputNumber.suffix`视觉细节需通过中英文DOM和390px浏览器复核，不假设与旧addon像素完全相同。
- Cart稳定key必须包含price，避免不同充值金额碰撞。
- 完整non-silent复核必须重新分类所有剩余warning，不能只以7-suite GREEN推断全量为0。
- 若rebase后出现新AntD warning但无法稳定映射，保持可见并停止新增范围，回传主控。

## 验证

- `openspec validate eliminate-web-admin-antd-runtime-warning-owners --strict`：通过。
- `openspec validate --changes --strict`：通过，1/1 active change。
- `git diff --check`：通过。
- package SHA-256：`E21C24F093F1DD555AE9B5C03BAD6D17B49A2773DF0137C1C3CADD69AD6AD5F5`。
- yarn.lock SHA-256：`E1C335C5AD66C8F3B1B126C72ABCDFD316B7F93ECEA62E020ACE285BC2C213ED`。
