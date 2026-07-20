import {expect, test, vi} from "vitest";
import KeyListPage from "./KeyListPage";
import * as KeyBackend from "./backend/KeyBackend";
import * as Setting from "./Setting";

const KeyListPageClass = KeyListPage as unknown as new (props: any) => any;

test("opens a key draft without creating it on the backend", () => {
  const history = {push: vi.fn()};
  vi.spyOn(Setting, "getRandomName").mockReturnValue("draft123");
  vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
  const addKey = vi.spyOn(KeyBackend, "addKey").mockResolvedValue({status: "ok"} as any);
  const page = new KeyListPageClass({account: {owner: "engineering"}, history, match: {path: "/keys", params: {}}} as any);

  page.addKey();

  expect(addKey).not.toHaveBeenCalled();
  expect(history.push).toHaveBeenCalledWith({
    pathname: "/keys/engineering/key_draft123",
    mode: "add",
    keyDraft: expect.objectContaining({
      owner: "engineering",
      name: "key_draft123",
      type: "Organization",
      accessKey: "",
      accessSecret: "",
    }),
  });
});
