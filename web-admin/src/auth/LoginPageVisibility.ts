export function shouldHidePasswordRecoveryForLoginMethod(loginMethod: string | null | undefined): boolean {
  return loginMethod === "wechat" || loginMethod === "wecom";
}

export function getLoginPanelClassName(isDarkTheme: boolean, loginMethod: string | null | undefined): string {
  const classNames = [isDarkTheme ? "login-panel-dark" : "login-panel"];
  if (loginMethod === "wecom") {
    classNames.push("login-panel-wecom-compact");
  }
  return classNames.join(" ");
}
