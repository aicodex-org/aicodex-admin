import {test as base, expect, type Page} from "@playwright/test";
import {loginAsFixtureAdmin} from "../support/auth";
import {assertDisposableE2EEnvironment} from "../support/runtime";

interface AdminFixtures {
  adminPage: Page;
  disposableEnvironment: void;
}

export const test = base.extend<AdminFixtures>({
  disposableEnvironment: [async ({}, use) => {
    assertDisposableE2EEnvironment(process.env.AICODEX_ADMIN_E2E_DISPOSABLE_DB);
    await use();
  }, {auto: true}],
  adminPage: async ({page}, use) => {
    await loginAsFixtureAdmin(page);
    await use(page);
  },
});

export {expect};
