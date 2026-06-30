// Bruno helper 源文件保持 CommonJS 入口，声明 Node 全局以便独立 tsconfig 可编译。
declare const require: NodeRequire;
declare const module: NodeModule;

type LooseRecord = Record<string, any>;

// 这些 Bruno handoff helper 大量消费脱敏 JSON envelope；迁移期先把 `{}` 默认入参视作宽松记录。
interface Object {
  [key: string]: any;
}
