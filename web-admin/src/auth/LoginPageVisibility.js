export function shouldHidePasswordRecoveryForLoginMethod(loginMethod) {
  return loginMethod === "wechat" || loginMethod === "wecom";
}
