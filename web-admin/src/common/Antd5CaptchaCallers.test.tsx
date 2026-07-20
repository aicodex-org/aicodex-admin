import {afterEach, expect, test, vi} from "vitest";

import React from "react";
import {fireEvent, render, waitFor} from "@testing-library/react";
import {SendCodeInput} from "./SendCodeInput";
import {CaptchaPreview} from "./CaptchaPreview";
import * as UserBackend from "../backend/UserBackend";

vi.mock("./modal/CaptchaModal", () => ({
  CaptchaModal: (props: {open?: boolean; onOk?: (captchaType: string, captchaToken: string, clientSecret: string) => void; onCancel?: () => void}) => (
    <div data-testid="captcha-modal" data-open={String(Boolean(props.open))}>
      {props.open ? (
        <>
          <button type="button" onClick={() => props.onOk?.("Default", "12345", "secret")}>confirm captcha</button>
          <button type="button" onClick={props.onCancel}>close captcha</button>
        </>
      ) : null}
    </div>
  ),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

test("SendCodeInput opens, confirms and closes CaptchaModal through the open prop", async() => {
  const sendCode = vi.spyOn(UserBackend, "sendCode").mockResolvedValue(false as never);
  const view = render(<SendCodeInput application={{owner: "built-in", name: "app"}} />);
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false");

  fireEvent.click(view.container.querySelector(".ant-input-search-button") as HTMLButtonElement);
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("true");

  fireEvent.click(view.getByRole("button", {name: "close captcha"}));
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false");

  fireEvent.click(view.container.querySelector(".ant-input-search-button") as HTMLButtonElement);
  fireEvent.click(view.getByRole("button", {name: "confirm captcha"}));
  await waitFor(() => expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false"));
  expect(sendCode).toHaveBeenCalledWith("Default", "12345", "secret", undefined, undefined, undefined, undefined, undefined, undefined);
});

test("CaptchaPreview opens, cancels and confirms CaptchaModal through the open prop", async() => {
  const verifyCaptcha = vi.spyOn(UserBackend, "verifyCaptcha").mockResolvedValue({status: "ok"} as never);
  const view = render(<CaptchaPreview
    owner="built-in"
    name="captcha"
    provider={{}}
    captchaType="Default"
    clientId="client"
    clientSecret="secret"
  />);
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false");

  fireEvent.click(view.getByRole("button", {name: /Preview|预\s*览/}));
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("true");

  fireEvent.click(view.getByRole("button", {name: "close captcha"}));
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false");

  fireEvent.click(view.getByRole("button", {name: /Preview|预\s*览/}));
  fireEvent.click(view.getByRole("button", {name: "confirm captcha"}));
  await waitFor(() => expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("false"));
  expect(verifyCaptcha).toHaveBeenCalledWith("built-in", "captcha", "Default", "12345", "secret");
});

test("CaptchaPreview still opens when the stored client secret is masked", () => {
  const view = render(<CaptchaPreview
    owner="built-in"
    name="captcha"
    provider={{}}
    captchaType="Default"
    clientId="client"
    clientSecret="***"
  />);

  fireEvent.click(view.getByRole("button", {name: /Preview|预\s*览/}));
  expect(view.getByTestId("captcha-modal").getAttribute("data-open")).toBe("true");
});
