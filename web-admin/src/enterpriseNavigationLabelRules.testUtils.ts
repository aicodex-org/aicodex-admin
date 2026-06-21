type NavigationLabelRuleOptions = {
  allowlist: string[];
  existingBusinessDomainLabels: string[];
};

const ABSTRACT_PRIMARY_ENTRY_PATTERN = /(工作台|任务中心|快捷入口|中心$)/;
const FOUR_CHINESE_CHARACTERS_PATTERN = /^[\u4e00-\u9fff]{4}$/;

export const enterprisePrimaryMenuLabelRuleOptions: NavigationLabelRuleOptions = {
  allowlist: ["AI 网关"],
  existingBusinessDomainLabels: ["中心总览"],
};

export function expectEnterprisePrimaryMenuLabels(labels: string[], options: NavigationLabelRuleOptions = enterprisePrimaryMenuLabelRuleOptions): void {
  const allowedLabels = new Set([...options.allowlist, ...options.existingBusinessDomainLabels]);

  for (const label of labels) {
    if (options.allowlist.includes(label)) {
      continue;
    }

    if (!FOUR_CHINESE_CHARACTERS_PATTERN.test(label)) {
      throw new Error(`常规中文一级菜单必须为 4 个中文字符：${label}`);
    }

    if (!allowedLabels.has(label) && ABSTRACT_PRIMARY_ENTRY_PATTERN.test(label)) {
      throw new Error(`一级菜单不得使用抽象中心/工作台/任务入口命名：${label}`);
    }
  }
}
