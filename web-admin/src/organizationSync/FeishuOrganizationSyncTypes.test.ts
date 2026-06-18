import {expect} from "@jest/globals";
import {getFeishuEndpointContextText} from "./FeishuOrganizationSyncTypes";

describe("Feishu organization sync typed helpers", () => {
  test("formats endpoint context without leaking provider payload details", () => {
    expect(getFeishuEndpointContextText("feishu")).toBe("当前为飞书（中国大陆）。");
    expect(getFeishuEndpointContextText("lark")).toBe("当前为 Lark（海外）。");
    expect(getFeishuEndpointContextText("")).toBe("服务区域待配置。");
  });
});
