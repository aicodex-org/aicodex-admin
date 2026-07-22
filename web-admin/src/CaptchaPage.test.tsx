import {expect, test} from "vitest";

import React from "react";
import CaptchaPage from "./CaptchaPage";

test("passes the always-on captcha state through the open prop", () => {
  const page = new CaptchaPage({location: {search: "?state=app&redirect_uri=https%3A%2F%2Fexample.test%2Fcallback"}});
  const modal = page.renderCaptchaModal({
    providers: [{rule: "Always", provider: {owner: "built-in", name: "captcha", category: "Captcha"}}],
  }) as React.ReactElement<{open?: boolean; visible?: boolean}>;

  expect(modal.props.open).toBe(true);
  expect(modal.props.visible).toBeUndefined();
});
