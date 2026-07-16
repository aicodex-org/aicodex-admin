import React from "react";
import {cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {expect, jest} from "@jest/globals";
import i18next from "i18next";
import "../i18n";
import EnterpriseTlsPolicyFields from "./EnterpriseTlsPolicyFields";
import en from "../locales/en/data.json";
import zh from "../locales/zh/data.json";

async function useTestLanguage(language: string): Promise<void> {
  if (!i18next.isInitialized) {
    await i18next.init({
      lng: language,
      fallbackLng: "en",
      resources: {en, zh},
      ns: Object.keys(en),
      keySeparator: false,
    });
    return;
  }
  Object.entries(en).forEach(([namespace, values]) => i18next.addResourceBundle("en", namespace, values, true, true));
  Object.entries(zh).forEach(([namespace, values]) => i18next.addResourceBundle("zh", namespace, values, true, true));
  await i18next.changeLanguage(language);
}

beforeEach(async() => {
  await useTestLanguage("en");
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

test("renders legacy_unmigrated as an explicit text state without changing it", () => {
  const view = render(
    <EnterpriseTlsPolicyFields
      policy=""
      cert=""
      certOptions={[{name: "enterprise-ca"}]}
      onPolicyChange={jest.fn()}
      onCertChange={jest.fn()}
    />
  );

  expect(screen.getByText("TLS policy pending migration")).not.toBeNull();
  expect(screen.getByText("This connection keeps its pre-upgrade TLS behavior until you select and save an explicit policy.")).not.toBeNull();
  expect(screen.getByRole("combobox", {name: "TLS policy"})).not.toBeNull();
  expect(screen.queryByLabelText("Custom CA certificate")).toBeNull();
  const feedbackRow = view.container.querySelector(".enterprise-tls-policy-feedback-row");
  expect(feedbackRow?.children).toHaveLength(2);
});

test("selects custom CA through the rendered AntD controls and lists names only", async() => {
  const onPolicyChange = jest.fn();
  const onCertChange = jest.fn();
  const view = render(
    <EnterpriseTlsPolicyFields
      policy="system"
      cert=""
      certOptions={[{name: "enterprise-ca"}]}
      onPolicyChange={onPolicyChange}
      onCertChange={onCertChange}
    />
  );

  fireEvent.mouseDown(screen.getByRole("combobox", {name: "TLS policy"}));
  fireEvent.click(await screen.findByText("Custom CA"));
  await waitFor(() => expect(onPolicyChange).toHaveBeenCalledWith("custom-ca"));

  view.rerender(
    <EnterpriseTlsPolicyFields
      policy="custom-ca"
      cert=""
      certOptions={[{name: "enterprise-ca"}]}
      onPolicyChange={onPolicyChange}
      onCertChange={onCertChange}
    />
  );
  expect(screen.getByRole("combobox", {name: "Custom CA certificate"})).not.toBeNull();
  fireEvent.mouseDown(screen.getByRole("combobox", {name: "Custom CA certificate"}));
  fireEvent.click(await screen.findByText("enterprise-ca"));
  await waitFor(() => expect(onCertChange).toHaveBeenCalledWith("enterprise-ca"));
  expect(view.container.textContent).not.toContain("certificate-sentinel");
  expect(view.container.textContent).not.toContain("private-key-sentinel");
});

test("shows actionable errors for invalid policy and unavailable custom CA without echoing values", () => {
  const invalid = render(
    <EnterpriseTlsPolicyFields
      policy="future-mode"
      cert=""
      certOptions={[]}
      onPolicyChange={jest.fn()}
      onCertChange={jest.fn()}
    />
  );
  expect(screen.getByText("Select a supported TLS policy before saving.")).not.toBeNull();
  expect(invalid.container.textContent).not.toContain("future-mode");

  invalid.rerender(
    <EnterpriseTlsPolicyFields
      policy="custom-ca"
      cert="missing-ca"
      certOptions={[]}
      onPolicyChange={jest.fn()}
      onCertChange={jest.fn()}
    />
  );
  expect(screen.getByText("The selected SSL certificate is unavailable. Select an available certificate.")).not.toBeNull();
  expect(invalid.container.textContent).not.toContain("missing-ca");
  expect(screen.getByText("No SSL certificates available")).not.toBeNull();
});

test("keeps Chinese policy and warning copy semantically complete", async() => {
  await useTestLanguage("zh");
  render(
    <EnterpriseTlsPolicyFields
      policy="legacy-insecure"
      cert=""
      certOptions={[]}
      onPolicyChange={jest.fn()}
      onCertChange={jest.fn()}
    />
  );

  expect(screen.getAllByText("旧版不安全兼容").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText("此策略会关闭服务端证书校验，仅用于受控兼容场景。")).not.toBeNull();
});
