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
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

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

func TestExportOrganizationSyncSnapshotNegotiatesLegacyAndV2(t *testing.T) {
	previousLegacy := organizationSyncLegacyExportBuilder
	previousV2 := organizationSyncV2ExportBuilder
	t.Cleanup(func() {
		organizationSyncLegacyExportBuilder = previousLegacy
		organizationSyncV2ExportBuilder = previousV2
	})
	legacyCalls := 0
	v2Calls := 0
	organizationSyncLegacyExportBuilder = func(organization string) (*object.OrganizationSyncSnapshot, error) {
		legacyCalls++
		return &object.OrganizationSyncSnapshot{Organization: &object.Organization{Name: organization}, Groups: []*object.OrganizationSyncExportGroup{}, Applications: []*object.Application{}}, nil
	}
	organizationSyncV2ExportBuilder = func(organization string, sourceConnectionID string, _ time.Time) (*object.OrganizationSyncContractV2Snapshot, error) {
		v2Calls++
		if organization != "engineering" || sourceConnectionID != "src-wecom" {
			t.Fatalf("v2 scope = %q/%q", organization, sourceConnectionID)
		}
		return &object.OrganizationSyncContractV2Snapshot{
			ContractVersion: object.OrganizationSyncContractV2, SourceConnectionID: sourceConnectionID,
			SourceOrgVersion: "orgv-42", BatchID: "batch-42",
			Diagnostics: object.OrganizationSyncContractV2Diagnostics{MemberRelationCount: 2, DepartmentLeaderCount: 1},
		}, nil
	}

	legacy, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/organization-sync/export", "")
	setOrganizationSyncApiKeyTestAuth(legacy, "engineering")
	legacy.ExportOrganizationSyncSnapshot()
	legacyResp := legacy.Data["json"].(*Response)
	if legacyResp.Status != "ok" || legacyCalls != 1 || v2Calls != 0 {
		t.Fatalf("legacy response=%#v legacyCalls=%d v2Calls=%d", legacyResp, legacyCalls, v2Calls)
	}
	if _, ok := legacyResp.Data.(*organizationSyncExportResponse); !ok {
		t.Fatalf("legacy shape changed: %T", legacyResp.Data)
	}

	v2, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/organization-sync/export?contractVersion=v2&sourceConnectionId=src-wecom", "")
	setOrganizationSyncApiKeyTestAuth(v2, "engineering")
	v2.ExportOrganizationSyncSnapshot()
	v2Resp := v2.Data["json"].(*Response)
	if v2Resp.Status != "ok" || legacyCalls != 1 || v2Calls != 1 {
		t.Fatalf("v2 response=%#v legacyCalls=%d v2Calls=%d", v2Resp, legacyCalls, v2Calls)
	}
	v2Data, ok := v2Resp.Data.(*object.OrganizationSyncContractV2Snapshot)
	if !ok || v2Data.ContractVersion != "v2" || v2Data.SourceConnectionID != "src-wecom" {
		t.Fatalf("v2 payload = %#v", v2Resp.Data)
	}
}

func TestExportOrganizationSyncSnapshotRejectsUnknownVersionAndV2SourceConflict(t *testing.T) {
	previousV2 := organizationSyncV2ExportBuilder
	t.Cleanup(func() { organizationSyncV2ExportBuilder = previousV2 })
	v2Calls := 0
	organizationSyncV2ExportBuilder = func(string, string, time.Time) (*object.OrganizationSyncContractV2Snapshot, error) {
		v2Calls++
		return nil, &object.OrganizationSyncContractError{Code: object.OrganizationSyncContractErrorSourceSelection}
	}

	unknown, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/organization-sync/export?contractVersion=v3", "")
	setOrganizationSyncApiKeyTestAuth(unknown, "engineering")
	unknown.ExportOrganizationSyncSnapshot()
	unknownResp := unknown.Data["json"].(*Response)
	if unknownResp.Status != "error" || unknownResp.Msg != object.OrganizationSyncContractErrorUnsupportedVersion || v2Calls != 0 {
		t.Fatalf("unknown response=%#v calls=%d", unknownResp, v2Calls)
	}

	conflict, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/organization-sync/export?contractVersion=v2", "")
	setOrganizationSyncApiKeyTestAuth(conflict, "engineering")
	conflict.ExportOrganizationSyncSnapshot()
	conflictResp := conflict.Data["json"].(*Response)
	if conflictResp.Status != "error" || conflictResp.Msg != object.OrganizationSyncContractErrorSourceSelection || v2Calls != 1 {
		t.Fatalf("conflict response=%#v calls=%d", conflictResp, v2Calls)
	}
}

func TestExportOrganizationSyncSnapshotDoesNotExposeInternalV2Error(t *testing.T) {
	previousV2 := organizationSyncV2ExportBuilder
	t.Cleanup(func() { organizationSyncV2ExportBuilder = previousV2 })
	organizationSyncV2ExportBuilder = func(string, string, time.Time) (*object.OrganizationSyncContractV2Snapshot, error) {
		return nil, errors.New("database connection contains sensitive details")
	}

	controller, _ := newOrganizationSyncApiKeyTestController(t, http.MethodGet, "/api/organization-sync/export?contractVersion=v2", "")
	setOrganizationSyncApiKeyTestAuth(controller, "engineering")
	controller.ExportOrganizationSyncSnapshot()
	response := controller.Data["json"].(*Response)
	if response.Status != "error" || response.Msg != object.OrganizationSyncContractErrorInternal {
		t.Fatalf("internal failure response = %#v", response)
	}
}

func TestPaginateOrganizationSyncItemsReturnsRequestedPageAndTotal(t *testing.T) {
	items := []string{"g1", "g2", "g3", "g4", "g5"}

	got, total := paginateOrganizationSyncItems(items, "2", "2")

	if total != 5 {
		t.Fatalf("total = %d, want 5", total)
	}
	if len(got) != 2 || got[0] != "g3" || got[1] != "g4" {
		t.Fatalf("page items = %#v, want [g3 g4]", got)
	}
}

func TestPaginateOrganizationSyncItemsKeepsFullListWithoutPagination(t *testing.T) {
	items := []string{"g1", "g2", "g3"}

	got, total := paginateOrganizationSyncItems(items, "", "")

	if total != 3 {
		t.Fatalf("total = %d, want 3", total)
	}
	if len(got) != 3 {
		t.Fatalf("items = %#v, want full list", got)
	}
}

func TestPaginateOrganizationSyncItemsClampsBeyondLastPage(t *testing.T) {
	items := []string{"g1", "g2", "g3", "g4", "g5"}

	got, total := paginateOrganizationSyncItems(items, "100", "2")

	if total != 5 {
		t.Fatalf("total = %d, want 5", total)
	}
	if len(got) != 1 || got[0] != "g5" {
		t.Fatalf("page items = %#v, want [g5]", got)
	}
}

func TestPaginateOrganizationSyncItemsUsesLegacyDefaultsForInvalidPagination(t *testing.T) {
	items := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}

	got, total := paginateOrganizationSyncItems(items, "invalid", "0")

	if total != 11 {
		t.Fatalf("total = %d, want 11", total)
	}
	if len(got) != 10 || got[0] != 1 || got[9] != 10 {
		t.Fatalf("page items = %#v, want first 10 items", got)
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

func setOrganizationSyncApiKeyTestAuth(controller *ApiController, organization string) {
	controller.Ctx.Input.SetData(object.OrganizationSyncApiKeyContextKey, &object.OrganizationSyncApiKeyAuth{
		Owner: organization, Name: "gateway-sync", Organization: organization,
	})
}
