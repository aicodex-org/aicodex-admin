/* eslint-env jest */
import {render} from "@testing-library/react";
import {renderOAuthProviderFields} from "./OAuthProviderFields";

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

describe("renderOAuthProviderFields Lark endpoint mode guidance", () => {
  beforeEach(() => {
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders domestic Feishu endpoint mode details", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: false,
    };

    const {getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null));

    expect(getByText("Endpoint mode")).toBeInTheDocument();
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/accounts\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/open\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/Feishu open platform/)).toBeInTheDocument();
  });

  test("renders global Lark endpoint mode details", () => {
    const provider = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: true,
    };

    const {getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null));

    expect(getByText(/Global Lark/)).toBeInTheDocument();
    expect(getByText(/accounts\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/open\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/Lark open platform/)).toBeInTheDocument();
  });
});
