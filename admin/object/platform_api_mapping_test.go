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

package object

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"testing"

	"github.com/xorm-io/xorm"
)

func TestSavePlatformApiOrganizationMappingPopulatesDefaultLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	mapping := &PlatformApiOrganizationMapping{
		OrganizationId:    "org-alpha",
		ApiOrganizationId: "00000000-0000-7000-8000-000000000123",
		MappingStatus:     PlatformMappingStatusConfirmed,
		MappingSource:     PlatformApiMappingSourceManual,
		Lineage:           "{}",
	}

	if err := SavePlatformApiOrganizationMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiOrganizationMapping() error = %v", err)
	}

	stored, err := GetPlatformApiOrganizationMappingByOrganization("org-alpha")
	if err != nil {
		t.Fatalf("GetPlatformApiOrganizationMappingByOrganization() error = %v", err)
	}
	assertDefaultPlatformApiMappingLineage(t, stored.Lineage)
}

func TestSavePlatformApiUserMappingPreservesExistingLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	existingLineage := `{"source":"migration","values":["api-user-1"]}`
	mapping := &PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/alice",
		ApiUserId:      "api-user-1",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceMigration,
		Lineage:        existingLineage,
	}

	if err := SavePlatformApiUserMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	stored, err := GetPlatformApiUserMappingByAdminSubject("org-alpha", "org-alpha/alice")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingByAdminSubject() error = %v", err)
	}
	if stored.Lineage != existingLineage {
		t.Fatalf("lineage = %q, want existing lineage %q", stored.Lineage, existingLineage)
	}
}

func TestSavePlatformApiUserMappingPopulatesDefaultLineage(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	mapping := &PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/bob",
		ApiUserId:      "api-user-2",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}

	if err := SavePlatformApiUserMapping(mapping); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	stored, err := GetPlatformApiUserMappingByAdminSubject("org-alpha", "org-alpha/bob")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingByAdminSubject() error = %v", err)
	}
	assertDefaultPlatformApiMappingLineage(t, stored.Lineage)
}

func TestGetPaginationPlatformApiUserMappingsFiltersAndCounts(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)

	fixtures := []*PlatformApiUserMapping{
		{
			OrganizationId: "org-alpha",
			AdminSubject:   "org-alpha/alice",
			ApiUserId:      "api-user-alice",
			MappingStatus:  PlatformMappingStatusConfirmed,
			MappingSource:  PlatformApiMappingSourceManual,
		},
		{
			OrganizationId: "org-alpha",
			AdminSubject:   "org-alpha/bob",
			ApiUserId:      "api-user-bob",
			MappingStatus:  PlatformMappingStatusPendingReview,
			MappingSource:  PlatformApiMappingSourceMigration,
		},
		{
			OrganizationId: "org-beta",
			AdminSubject:   "org-beta/alice",
			ApiUserId:      "api-user-beta-alice",
			MappingStatus:  PlatformMappingStatusConfirmed,
			MappingSource:  PlatformApiMappingSourceManual,
		},
	}
	for _, fixture := range fixtures {
		if err := SavePlatformApiUserMapping(fixture); err != nil {
			t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
		}
	}

	count, err := GetPlatformApiUserMappingCount("org-alpha", "alice")
	if err != nil {
		t.Fatalf("GetPlatformApiUserMappingCount() error = %v", err)
	}
	if count != 1 {
		t.Fatalf("count = %d, want 1", count)
	}

	page, err := GetPaginationPlatformApiUserMappings("org-alpha", 0, 1, "")
	if err != nil {
		t.Fatalf("GetPaginationPlatformApiUserMappings() error = %v", err)
	}
	if len(page) != 1 || page[0].AdminSubject != "org-alpha/alice" {
		t.Fatalf("page = %#v, want first sorted org-alpha/alice mapping", page)
	}
}

func TestValidateApplicationUserTokenContextBindsSharedApplicationOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	if err := SavePlatformApiOrganizationMapping(&PlatformApiOrganizationMapping{
		OrganizationId:    "org-alpha",
		ApiOrganizationId: "00000000-0000-7000-8000-000000000123",
		MappingStatus:     PlatformMappingStatusConfirmed,
		MappingSource:     PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiOrganizationMapping() error = %v", err)
	}
	if err := SavePlatformApiUserMapping(&PlatformApiUserMapping{
		OrganizationId: "org-alpha",
		AdminSubject:   "org-alpha/alice",
		ApiUserId:      "api-user-alice",
		MappingStatus:  PlatformMappingStatusConfirmed,
		MappingSource:  PlatformApiMappingSourceManual,
	}); err != nil {
		t.Fatalf("SavePlatformApiUserMapping() error = %v", err)
	}

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
		ApiMappingRequired:         true,
	}
	user := &User{Owner: "org-alpha", Name: "alice"}

	if err := ValidateApplicationUserTokenContext(application, user); err != nil {
		t.Fatalf("ValidateApplicationUserTokenContext() error = %v", err)
	}
	if application.Organization != "org-alpha" {
		t.Fatalf("application organization = %q, want org-alpha", application.Organization)
	}
}

func TestValidateApplicationUserTokenContextFailsClosedWithoutConfirmedMappings(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
		ApiMappingRequired:         true,
	}
	user := &User{Owner: "org-alpha", Name: "alice"}

	err := ValidateApplicationUserTokenContext(application, user)
	if !errors.Is(err, ErrPlatformApiOrganizationMappingMissing) {
		t.Fatalf("ValidateApplicationUserTokenContext() error = %v, want organization mapping missing", err)
	}
}

func TestBindApplicationToStoredTokenOrganizationRestoresSharedOrganization(t *testing.T) {
	setupPlatformApiMappingTestOrmer(t)
	insertPlatformApiMappingTestOrganization(t, "org-alpha")

	application := &Application{
		Owner:                      "admin",
		Name:                       "shared-api",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-alpha"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
	}
	token := &Token{
		Application:  "shared-api",
		Organization: "org-alpha",
	}

	if tokenError := bindApplicationToStoredTokenOrganization(application, token); tokenError != nil {
		t.Fatalf("bindApplicationToStoredTokenOrganization() error = %#v", tokenError)
	}
	if application.Organization != "org-alpha" {
		t.Fatalf("application organization = %q, want org-alpha", application.Organization)
	}

	token.Application = "other-api"
	if tokenError := bindApplicationToStoredTokenOrganization(application, token); tokenError == nil || tokenError.Error != InvalidGrant {
		t.Fatalf("bindApplicationToStoredTokenOrganization() mismatch error = %#v, want invalid_grant", tokenError)
	}
}

func setupPlatformApiMappingTestOrmer(t *testing.T) {
	t.Helper()

	engine, err := xorm.NewEngine("sqlite", filepath.Join(t.TempDir(), "platform-api-mapping.db"))
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(new(Organization), new(PlatformApiOrganizationMapping), new(PlatformApiUserMapping)); err != nil {
		t.Fatalf("sync platform api mapping tables error = %v", err)
	}

	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}

func insertPlatformApiMappingTestOrganization(t *testing.T, name string) {
	t.Helper()

	_, err := ormer.Engine.Insert(&Organization{
		Owner: "admin",
		Name:  name,
	})
	if err != nil {
		t.Fatalf("insert organization %s error = %v", name, err)
	}
}

func assertDefaultPlatformApiMappingLineage(t *testing.T, lineage string) {
	t.Helper()

	if lineage == "" || lineage == "{}" {
		t.Fatalf("lineage = %q, want system generated lineage", lineage)
	}

	var payload map[string]any
	if err := json.Unmarshal([]byte(lineage), &payload); err != nil {
		t.Fatalf("lineage should be valid JSON, got %q: %v", lineage, err)
	}
	if payload["source"] != "admin-console" || payload["action"] != "manual-update" || payload["reason"] != "operator-maintained" {
		t.Fatalf("lineage payload = %#v, want admin-console manual-update lineage", payload)
	}
	if payload["version"] != float64(1) {
		t.Fatalf("lineage version = %#v, want 1", payload["version"])
	}
}
