/* eslint-env jest */
import {validateWeComProviderFields} from "./provider/WeComProviderUtils";

describe("validateWeComProviderFields", () => {
  test("requires Agent ID for Internal + Normal mode", () => {
    const result = validateWeComProviderFields({
      type: "WeCom",
      subType: "Internal",
      method: "Normal",
      clientId: "wx-corp-id",
      clientSecret: "corp-secret",
      appId: "",
      scopes: "snsapi_privateinfo",
    }, key => key === "provider:This field is required" ? "is required" : key);

    expect(result).toBe("Agent ID is required");
  });

  test("passes when required Internal + Normal fields are present", () => {
    const result = validateWeComProviderFields({
      type: "WeCom",
      subType: "Internal",
      method: "Normal",
      clientId: "wx-corp-id",
      clientSecret: "corp-secret",
      appId: "1000001",
      scopes: "snsapi_privateinfo",
    }, key => key);

    expect(result).toBe("");
  });
});
