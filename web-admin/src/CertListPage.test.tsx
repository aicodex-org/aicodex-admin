import {expect, test, vi} from "vitest";
import CertListPage from "./CertListPage";
import * as CertBackend from "./backend/CertBackend";
import * as Setting from "./Setting";

const CertListPageClass = CertListPage as unknown as new (props: any) => any;

test("opens a certificate draft without creating it on the backend", () => {
  const history = {push: vi.fn()};
  vi.spyOn(Setting, "getRandomName").mockReturnValue("draft123");
  vi.spyOn(Setting, "isDefaultOrganizationSelected").mockReturnValue(false);
  vi.spyOn(Setting, "getRequestOrganization").mockReturnValue("engineering");
  const addCert = vi.spyOn(CertBackend, "addCert").mockResolvedValue({status: "ok"} as any);
  const page = new CertListPageClass({account: {owner: "engineering"}, history, match: {path: "/certs", params: {}}} as any);

  page.addCert();

  expect(addCert).not.toHaveBeenCalled();
  expect(history.push).toHaveBeenCalledWith({
    pathname: "/certs/engineering/cert_draft123",
    mode: "add",
    cert: expect.objectContaining({
      owner: "engineering",
      name: "cert_draft123",
      type: "x509",
      certificate: "",
      privateKey: "",
    }),
  });
});
