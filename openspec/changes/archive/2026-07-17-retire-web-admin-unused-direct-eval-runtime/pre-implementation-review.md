# Pre-Implementation Review

## 结论

状态：`READY`

- proposal、design、delta spec与tasks描述同一最小交付：删除零调用的 `Setting.parseObject`，使自有 production TypeScript/TSX不再包含 direct `eval`，并建立AST与真实build双层防回退。
- 最新源码证据完整：`parseObject`全仓限定源码扩展名搜索仅命中定义；production direct `eval`仅命中 `Setting.tsx`一处；`new Function`为0；不存在需要保留的真实消费者契约。
- 未修改基线的 `yarn build`成功并稳定输出1条Rolldown `[EVAL]`，同时存在与本 change无关的 `fs` browser external和chunk-size warning，可形成清晰前后对照。
- TDD顺序明确：先新增TypeScript AST契约并确认因唯一 direct `eval` RED；`parseJson`行为先GREEN固定；再删除6行死导出并取得GREEN。不会通过console suppression、build suppression、shim或替代parser绕过。
- 新capability只约束项目自有production `.ts/.tsx`中的direct `eval`与`new Function`；不外推到第三方依赖、全局CSP header或任意动态加载，范围与写集一致。
- coverage口径可辩护：删除后的changed production executable statements为0；相邻保留的 `parseJson`覆盖空串、合法JSON、非法JSON，coverage JSON用于证明该函数/分支被执行，不用大型 `Setting.tsx`全文件平均值制造门槛。
- 完整门禁覆盖frozen Yarn、三类typecheck、增量TS、lint、完整Jest、public scripts、Vite build、Playwright discovery与本地build browser smoke；不访问60、不修改服务。
- 没有依赖、lock、workflow、其它业务页、路线文档、API、认证、Provider或共享环境改动；上游最新提交也未触碰本 change文件。
- 文档以简体中文说明为主，保留的TypeScript、AST、direct `eval`、Vite/Rolldown、CSP等为技术术语；没有真实URL、凭据、token、Cookie或环境敏感信息。
- change可收敛为latest `origin/hfl-test-base` + 1个逻辑commit，并按self-closeout授权sync-specs、普通非强制push base和清理工作分支；绝不push/merge `test`。

## 非阻塞实施注意

- AST walker必须排除 `.test.ts(x)`、声明文件与生成目录，并把诊断限制为仓库相对路径和行列。
- `new Function`当前为0，契约中的合成parser测试要证明识别能力，避免只有“空结果”而未证明guard有效。
- 本地build browser smoke如遇到未连接后端的预期请求失败，只能证明静态入口与bundle加载；不得表述为登录/API/部署环境验收。
- 若实施或rebase后发现 `parseObject`真实调用、需要依赖升级或写集扩张，停止并回传主控，不引入兼容实现。

## 验证

- `openspec validate retire-web-admin-unused-direct-eval-runtime --strict`：通过。
- `openspec validate --changes --strict`：通过，1/1 active change。
- `git diff --check`：通过。
- 起始base：`origin/hfl-test-base@1b6356e99574e1d131aeb4e7ae40746709cdcfd9`；`origin/test@5420c8c386de7daee84b7df41de65ba1c404bf2a`只读。
- `package.json` SHA-256：`E21C24F093F1DD555AE9B5C03BAD6D17B49A2773DF0137C1C3CADD69AD6AD5F5`。
- `yarn.lock` SHA-256：`E1C335C5AD66C8F3B1B126C72ABCDFD316B7F93ECEA62E020ACE285BC2C213ED`。
