/* eslint-env jest */
import {render} from "@testing-library/react";

jest.mock("i18next", () => {
  const mockI18next = {
    t: key => {
      const [, value] = key.split(":");
      return value || key;
    },
    init: jest.fn(() => Promise.resolve()),
  };
  mockI18next.use = jest.fn(() => mockI18next);

  return {
    __esModule: true,
    default: mockI18next,
    ...mockI18next,
  };
});

jest.mock("./Provider", () => ({
  getAuthUrl: jest.fn(() => "https://auth.example.com/callback-start"),
}));

import {renderProviderLogo} from "./ProviderButton";

describe("renderProviderLogo Lark/Feishu branding", () => {
  const application = {name: "app-built-in"};
  const location = {search: ""};

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders domestic Feishu branding in the small provider icon entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "feishu",
      displayName: "",
      disableSsl: false,
    };

    const {getByAltText} = render(renderProviderLogo(provider, application, 24, 0, "small", location));
    const image = getByAltText("Sign in with Feishu");

    expect(image).toHaveAttribute("src", expect.stringContaining("/img/social_lark.png"));
  });

  test("renders global Lark branding in the small provider icon entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "lark",
      displayName: "",
      disableSsl: true,
    };

    const {getByAltText} = render(renderProviderLogo(provider, application, 24, 0, "small", location));

    expect(getByAltText("Sign in with Lark")).toHaveAttribute("src", expect.stringContaining("/img/social_lark.png"));
  });

  test("renders domestic Feishu branding in the large provider button entry", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      name: "feishu",
      displayName: "",
      disableSsl: false,
    };

    const {getByAltText, getByText} = render(renderProviderLogo(provider, application, null, null, "large", location));

    expect(getByAltText("Sign in with Feishu")).toBeInTheDocument();
    expect(getByText("Sign in with Feishu")).toBeInTheDocument();
  });
});
