export function getAdminLoginRedirectPath() {
  // 后台管理入口必须固定回到内置登录页，避免浏览器记住的业务组织影响管理员入口。
  return "/login";
}
