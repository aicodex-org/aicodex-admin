/* eslint-env jest */

import fs from "fs";
import path from "path";
import {expect} from "@jest/globals";

const modalDestroyProps: Pick<import("antd").ModalProps, "destroyOnHidden"> = {destroyOnHidden: true};
const drawerDestroyProps: Pick<import("antd").DrawerProps, "destroyOnHidden"> = {destroyOnHidden: true};

const srcRoot = path.resolve(__dirname, "../..");
const ownerPropCounts = [
  {file: "IdentityAssetRelationshipDrawer.tsx", expected: 1},
  {file: "common/modal/CaptchaModal.tsx", expected: 1},
  {file: "common/modal/FaceRecognitionCommonModal.tsx", expected: 1},
  {file: "common/modal/FaceRecognitionModal.tsx", expected: 2},
  {file: "RecordListPage.tsx", expected: 1},
  {file: "SessionListPage.tsx", expected: 1},
  {file: "WebhookEventListPage.tsx", expected: 1},
  {file: "WecomOrganizationSyncPage.tsx", expected: 3},
];

function countProp(source: string, prop: string): number {
  return source.match(new RegExp(`\\b${prop}\\b`, "g"))?.length ?? 0;
}

test("AntD exposes typed destroyOnHidden props for Modal and Drawer", () => {
  expect(modalDestroyProps.destroyOnHidden).toBe(true);
  expect(drawerDestroyProps.destroyOnHidden).toBe(true);
});

for (const owner of ownerPropCounts) {
  test(`${owner.file} uses only its expected destroyOnHidden props`, () => {
    const source = fs.readFileSync(path.join(srcRoot, owner.file), "utf8");

    expect(countProp(source, "destroyOnClose")).toBe(0);
    expect(countProp(source, "destroyOnHidden")).toBe(owner.expected);
  });
}

test("the production owner manifest contains exactly eleven migrated overlays", () => {
  expect(ownerPropCounts.reduce((total, owner) => total + owner.expected, 0)).toBe(11);
});
