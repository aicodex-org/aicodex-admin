export function shouldHidePasswordRecoveryForLoginMethod(loginMethod) {
  return loginMethod === "wechat" || loginMethod === "wecom";
}

export function getLoginPanelClassName(isDarkTheme, loginMethod) {
  const classNames = [isDarkTheme ? "login-panel-dark" : "login-panel"];
  if (loginMethod === "wecom") {
    classNames.push("login-panel-wecom-compact");
  }
  return classNames.join(" ");
}
