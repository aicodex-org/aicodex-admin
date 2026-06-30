/* eslint-env jest */
import {expect as jestExpect} from "@jest/globals";
import {formatRecordJson} from "./recordJsonFormatter";

const expect = jestExpect;

describe("RecordListPage JSON formatting", () => {
  test("formats audit detail JSON without throwing on empty or malformed values", () => {
    expect(formatRecordJson("")).toBe("");
    expect(formatRecordJson(undefined)).toBe("");
    expect(formatRecordJson("not-json")).toBe("not-json");
    expect(formatRecordJson("{\"status\":\"ok\"}")).toBe("{\n  \"status\": \"ok\"\n}");
  });
});
