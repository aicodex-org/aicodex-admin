// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
	webcontext "github.com/beego/beego/v2/server/web/context"
)

func TestNormalizeOrganizationSyncApiKeyRequestForcesOwnerToOrganization(t *testing.T) {
	key := &object.OrganizationSyncApiKey{
		Owner:        "finance",
		Organization: "engineering",
		Name:         "gateway-sync",
	}

	normalizeOrganizationSyncApiKeyRequest(key)

	if key.Owner != "engineering" {
		t.Fatalf("owner = %q, want engineering", key.Owner)
	}
	if key.Organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", key.Organization)
	}
}

func TestRequireOrganizationSyncApiKeyOrganizationRejectsMismatch(t *testing.T) {
	controller, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/get-groups?owner=finance", "")
	controller.Ctx.Input.SetData(object.OrganizationSyncApiKeyContextKey, &object.OrganizationSyncApiKeyAuth{
		Owner:        "engineering",
		Name:         "gateway-sync",
		Organization: "engineering",
	})

	_, ok := controller.requireOrganizationSyncApiKeyOrganization("finance")

	if ok {
		t.Fatalf("requireOrganizationSyncApiKeyOrganization() ok = true, want false")
	}
	resp := controller.Data["json"].(*Response)
	if resp.Status != "error" || !strings.Contains(resp.Msg, "not allowed") {
		t.Fatalf("response = %#v", resp)
	}
}

func TestRequireOrganizationSyncApiKeyOrganizationAllowsBoundOrganization(t *testing.T) {
	controller, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/get-groups?owner=engineering", "")
	controller.Ctx.Input.SetData(object.OrganizationSyncApiKeyContextKey, &object.OrganizationSyncApiKeyAuth{
		Owner:        "engineering",
		Name:         "gateway-sync",
		Organization: "engineering",
	})

	organization, ok := controller.requireOrganizationSyncApiKeyOrganization("engineering")

	if !ok {
		t.Fatalf("requireOrganizationSyncApiKeyOrganization() ok = false")
	}
	if organization != "engineering" {
		t.Fatalf("organization = %q, want engineering", organization)
	}
}

func newOrganizationSyncApiKeyTestController(t *testing.T, method string, target string, body string) (*ApiController, *httptest.ResponseRecorder) {
	t.Helper()

	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept-Language", "zh-CN")

	recorder := httptest.NewRecorder()
	ctx := webcontext.NewContext()
	ctx.Reset(recorder, request)
	ctx.Input.RequestBody = []byte(body)

	controller := &ApiController{}
	controller.Init(ctx, "ApiController", "OrganizationSyncApiKeyTest", controller)
	return controller, recorder
}
