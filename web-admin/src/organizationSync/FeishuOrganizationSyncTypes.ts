export type FeishuEndpointMode = "feishu" | "lark" | string;

export function getFeishuEndpointContextText(mode?: FeishuEndpointMode | null): string {
  switch (mode) {
  case "feishu":
    return "当前为飞书（中国大陆）。";
  case "lark":
    return "当前为 Lark（海外）。";
  default:
    return "服务区域待配置。";
  }
}
