export type FeishuEndpointMode = "feishu" | "lark" | string;

export function getFeishuEndpointContextText(mode?: FeishuEndpointMode | null): string {
  switch (mode) {
  case "feishu":
    return "当前为国内飞书 endpoint。";
  case "lark":
    return "当前为海外 Lark endpoint。";
  default:
    return "Endpoint 模式待配置。";
  }
}
