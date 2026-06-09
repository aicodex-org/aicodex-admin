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
	"errors"
	"testing"
)

func TestApplicationOrganizationResolutionPolicyFailsClosed(t *testing.T) {
	legacyShared := &Application{
		Owner:    "admin",
		Name:     "shared-legacy",
		IsShared: true,
	}
	legacyShared.normalizeOrganizationResolutionPolicy()
	if legacyShared.OrganizationResolutionMode != ApplicationOrganizationResolutionModeSharedApplication {
		t.Fatalf("legacy shared mode = %q", legacyShared.OrganizationResolutionMode)
	}
	if legacyShared.AllowedOrganizationStatus != ApplicationAllowedOrganizationStatusPendingReview {
		t.Fatalf("legacy shared status = %q, want pending review", legacyShared.AllowedOrganizationStatus)
	}
	if err := ResolveApplicationLoginOrganization(legacyShared, "org-a"); !errors.Is(err, ErrSharedApplicationOrganizationDenied) {
		t.Fatalf("legacy shared without allowed policy should fail closed, got %v", err)
	}

	shared := &Application{
		Owner:                      "admin",
		Name:                       "shared",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-a"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
	}
	if err := ResolveApplicationLoginOrganization(shared, ""); !errors.Is(err, ErrSharedApplicationOrganizationRequired) {
		t.Fatalf("shared application without organization should fail closed, got %v", err)
	}
	if err := ResolveApplicationLoginOrganization(shared, "org-b"); !errors.Is(err, ErrSharedApplicationOrganizationDenied) {
		t.Fatalf("shared application with denied organization should fail closed, got %v", err)
	}

	unconfirmedShared := &Application{
		Owner:                      "admin",
		Name:                       "shared-unconfirmed",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"org-a"},
	}
	if err := ResolveApplicationLoginOrganization(unconfirmedShared, "org-a"); !errors.Is(err, ErrSharedApplicationOrganizationDenied) {
		t.Fatalf("shared application without confirmed allowed policy should fail closed, got %v", err)
	}

	organizationBound := &Application{
		Owner:                      "admin",
		Name:                       "org-client",
		Organization:               "org-a",
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeOrganizationBound,
	}
	if err := ResolveApplicationLoginOrganization(organizationBound, "org-b"); err == nil {
		t.Fatal("organization-bound application must reject organization override")
	}
}

func TestDynamicClientRegistrationOrganizationResolutionMode(t *testing.T) {
	req := &DynamicClientRegistrationRequest{}
	if dcrErr := normalizeDynamicClientOrganizationResolutionMode(req); dcrErr != nil {
		t.Fatalf("default DCR mode should be accepted, got %#v", dcrErr)
	}
	if req.OrganizationResolutionMode != ApplicationOrganizationResolutionModeOrganizationBound {
		t.Fatalf("DCR default mode = %q", req.OrganizationResolutionMode)
	}

	sharedReq := &DynamicClientRegistrationRequest{OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication}
	if dcrErr := normalizeDynamicClientOrganizationResolutionMode(sharedReq); dcrErr == nil || dcrErr.Error != "invalid_client_metadata" {
		t.Fatalf("DCR shared application should be rejected, got %#v", dcrErr)
	}
}

func TestUserInfoUsesStableSubjectAndOrganizationContext(t *testing.T) {
	user := &User{
		Owner: "org-a",
		Name:  "alice",
		Email: "alice@example.invalid",
	}

	userinfo, err := GetUserInfo(user, "email", "client-web", "login.example.invalid")
	if err != nil {
		t.Fatalf("GetUserInfo() error = %v", err)
	}
	if userinfo.Sub != "org-a/alice" {
		t.Fatalf("userinfo sub = %q, want stable admin subject", userinfo.Sub)
	}
	if userinfo.Organization != "org-a" {
		t.Fatalf("userinfo organization = %q", userinfo.Organization)
	}
	if userinfo.Aud != "client-web" || userinfo.ClientId != "client-web" {
		t.Fatalf("userinfo client audience mismatch: %#v", userinfo)
	}
	if userinfo.Iss != "https://login.example.invalid" {
		t.Fatalf("userinfo issuer = %q", userinfo.Iss)
	}
}

func TestBuildPlatformApiMappingMigrationPlanUsesLegacyFieldsAsCandidatesOnly(t *testing.T) {
	users := []*User{
		{
			Owner: "org-a",
			Name:  "alice",
			Properties: map[string]string{
				"aicodexApiOrganizationId": "api-org-1",
				"aicodexApiUserId":         "api-user-1",
			},
		},
		{
			Owner: "org-a",
			Name:  "bob",
			Properties: map[string]string{
				"apiOrganizationId": "api-org-2",
				"apiUserId":         "api-user-2",
			},
		},
	}
	identities := []ExternalIdentity{
		{
			OrganizationId:      "org-a",
			PlatformSubjectType: PlatformSubjectTypeUser,
			PlatformSubject:     "org-a/alice",
			Lineage:             `{"apiSubjectId":"api-user-legacy"}`,
		},
	}

	plan := BuildPlatformApiMappingMigrationPlan("org-a", users, identities)
	if len(plan.OrganizationMappings) != 1 {
		t.Fatalf("organization mappings = %#v", plan.OrganizationMappings)
	}
	if plan.OrganizationMappings[0].MappingStatus != PlatformMappingStatusConflicted || plan.OrganizationMappings[0].ApiOrganizationId != "" {
		t.Fatalf("conflicting organization candidates must not auto-confirm: %#v", plan.OrganizationMappings[0])
	}

	userMappings := map[string]*PlatformApiUserMapping{}
	for _, mapping := range plan.UserMappings {
		userMappings[mapping.AdminSubject] = mapping
	}
	if userMappings["org-a/alice"].MappingStatus != PlatformMappingStatusConflicted || userMappings["org-a/alice"].ApiUserId != "" {
		t.Fatalf("conflicting user candidates must not auto-confirm: %#v", userMappings["org-a/alice"])
	}
	if userMappings["org-a/bob"].MappingStatus != PlatformMappingStatusPendingReview || userMappings["org-a/bob"].ApiUserId != "api-user-2" {
		t.Fatalf("single legacy user candidate should be pending review: %#v", userMappings["org-a/bob"])
	}
}
