/* eslint-env jest */

import React from "react";
import {expect, jest} from "@jest/globals";
import {fireEvent, render} from "@testing-library/react";
import {renderSmsProviderFields} from "./SmsProviderFields";
import * as Setting from "../Setting";
import type {ProviderFieldValue} from "./ProviderFieldTypes";

jest.mock("../common/select/CountryCodeSelect", () => ({
  CountryCodeSelect: (props: {style?: React.CSSProperties; initValue?: string; onChange?: (value: string) => void}) => (
    <button type="button" data-testid="country-code" style={props.style} onClick={() => props.onChange?.("CN")}>{props.initValue}</button>
  ),
}));

jest.mock("../common/TestSmsWidget", () => ({sendTestSms: () => undefined}));

test("keeps SMS test phone controls compact and wired", () => {
  jest.spyOn(Setting, "isMobile").mockReturnValue(false);
  jest.spyOn(Setting, "getLabel").mockImplementation((label: unknown) => <span>{String(label)}</span>);
  jest.spyOn(Setting, "isValidPhone").mockReturnValue(true);
  const updateProviderField = jest.fn<void, [string, ProviderFieldValue]>();
  const provider: Parameters<typeof renderSmsProviderFields>[0] = {
    type: "Twilio SMS",
    signName: "Example",
    templateCode: "template",
    content: "US",
    receiver: "13800000000",
    enableProxy: false,
  };
  const view = render(<>{renderSmsProviderFields(provider, updateProviderField, () => null, {organization: {countryCodes: ["US", "CN"]}})}</>);
  const compact = view.container.querySelector<HTMLElement>(".ant-space-compact");

  expect(compact).not.toBeNull();
  expect(compact?.classList.contains("ant-space-compact-block")).toBe(true);
  expect(view.getByTestId("country-code").style.width).toBe("90px");
  const receiverInput = compact?.querySelector<HTMLInputElement>("input");
  expect(receiverInput?.style.width).toBe("150px");

  fireEvent.click(view.getByTestId("country-code"));
  fireEvent.change(receiverInput as HTMLInputElement, {target: {value: "13900000000"}});
  expect(updateProviderField).toHaveBeenCalledWith("content", "CN");
  expect(updateProviderField).toHaveBeenCalledWith("receiver", "13900000000");
});
