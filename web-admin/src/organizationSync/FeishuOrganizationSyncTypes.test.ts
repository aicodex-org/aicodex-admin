import {expect} from "@jest/globals";
import {getFeishuEndpointContextText} from "./FeishuOrganizationSyncTypes";

describe("Feishu organization sync typed helpers", () => {
  test("formats endpoint context without leaking provider payload details", () => {
    expect(getFeishuEndpointContextText("feishu")).toBe("当前为国内飞书 endpoint。");
    expect(getFeishuEndpointContextText("lark")).toBe("当前为海外 Lark endpoint。");
    expect(getFeishuEndpointContextText("")).toBe("Endpoint 模式待配置。");
  });
});
