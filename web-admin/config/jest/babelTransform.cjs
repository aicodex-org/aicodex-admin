const babelJest = require("babel-jest").default;

/**
 * 使用固定 CRA Babel preset 保留现有 JSX/TS/Jest hoist/CommonJS 语义，
 * 并隔离仓库面向浏览器 production target 的 Babel 配置。
 */
module.exports = babelJest.createTransformer({
  babelrc: false,
  configFile: false,
  presets: [[require.resolve("babel-preset-react-app"), {runtime: "automatic"}]],
});
