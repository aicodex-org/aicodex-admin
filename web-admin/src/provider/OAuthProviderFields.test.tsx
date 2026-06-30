/* eslint-env jest */
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ReactElement} from "react";
import {jest, expect as jestExpect} from "@jest/globals";
import {render} from "@testing-library/react";
import {renderOAuthProviderFields} from "./OAuthProviderFields";
// eslint-disable-next-line unused-imports/no-unused-imports
import type {ProviderConfig} from "./ProviderFieldTypes";

type DomMatcherResult = ReturnType<typeof jestExpect> & {
  toBeInTheDocument: () => void;
};

const expect = jestExpect as unknown as (actual: unknown) => DomMatcherResult;

jest.mock("i18next", () => {
  const mockI18next = {
    t: (key: string) => {
      const [, value] = key.split(":");
      return value || key;
    },
    init: () => Promise.resolve(),
    use: () => mockI18next,
  };

  return {
    __esModule: true,
    default: mockI18next,
    ...mockI18next,
  };
});

describe("renderOAuthProviderFields Lark endpoint mode guidance", () => {
  beforeEach(() => {
    window.matchMedia = ((query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList)) as typeof window.matchMedia;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders domestic Feishu endpoint mode details", () => {
    const provider: ProviderConfig = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: false,
    };

    const {getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null) as ReactElement);

    expect(getByText("Endpoint mode")).toBeInTheDocument();
    expect(getByText(/Domestic Feishu/)).toBeInTheDocument();
    expect(getByText(/accounts\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/open\.feishu\.cn/)).toBeInTheDocument();
    expect(getByText(/Feishu open platform/)).toBeInTheDocument();
  });

  test("renders global Lark endpoint mode details", () => {
    const provider: ProviderConfig = {
      category: "OAuth",
      type: "Lark",
      clientId: "cli_xxx",
      disableSsl: true,
    };

    const {getByText} = render(renderOAuthProviderFields(provider, jest.fn(), () => null) as ReactElement);

    expect(getByText(/Global Lark/)).toBeInTheDocument();
    expect(getByText(/accounts\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/open\.larksuite\.com/)).toBeInTheDocument();
    expect(getByText(/Lark open platform/)).toBeInTheDocument();
  });
});
