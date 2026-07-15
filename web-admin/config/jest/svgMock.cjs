const React = require("react");

/** 同时兼容 SVG default filename 与 CRA 的 ReactComponent named export。 */
const ReactComponent = React.forwardRef(function SvgMock(props, ref) {
  return React.createElement("svg", {...props, ref});
});

module.exports = {
  __esModule: true,
  default: "test-file-stub.svg",
  ReactComponent,
};
