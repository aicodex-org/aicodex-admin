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
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/casbin/casbin/v2"
	casbinmodel "github.com/casbin/casbin/v2/model"
	"github.com/xorm-io/xorm"
)

func TestOrganizationSyncApiKeyLifecycleStoresHashAndRotates(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	result, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "gateway-sync",
		Organization: "engineering",
		DisplayName:  "Gateway Sync",
		ExpireTime:   time.Now().Add(time.Hour).UTC().Format(time.RFC3339),
	}, "built-in/admin")
	if err != nil {
		t.Fatalf("AddOrganizationSyncApiKey() error = %v", err)
	}
	if result == nil || result.Key == nil {
		t.Fatalf("AddOrganizationSyncApiKey() result = %#v", result)
	}
	if !strings.HasPrefix(result.Secret, OrganizationSyncApiKeyPrefix) {
		t.Fatalf("secret = %q, want %s prefix", result.Secret, OrganizationSyncApiKeyPrefix)
	}
	if result.Key.Organization != "engineering" || result.Key.Owner != "engineering" {
		t.Fatalf("key target = %s/%s", result.Key.Owner, result.Key.Organization)
	}
	if result.Key.KeyHash == "" || result.Key.KeyHash == result.Secret {
		t.Fatalf("key hash = %q, secret = %q", result.Key.KeyHash, result.Secret)
	}

	keyJSON, err := json.Marshal(result.Key)
	if err != nil {
		t.Fatalf("json marshal key error = %v", err)
	}
	if strings.Contains(string(keyJSON), "keyHash") || strings.Contains(string(keyJSON), result.Key.KeyHash) {
		t.Fatalf("key JSON leaked hash: %s", keyJSON)
	}
	if strings.Contains(string(keyJSON), result.Secret) {
		t.Fatalf("key JSON leaked plaintext secret: %s", keyJSON)
	}

	stored, err := GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() error = %v", err)
	}
	if stored == nil {
		t.Fatalf("stored key is nil")
	}
	if stored.KeyHash != result.Key.KeyHash || stored.KeyHash == result.Secret {
		t.Fatalf("stored key hash = %q, secret = %q", stored.KeyHash, result.Secret)
	}
	if stored.KeyPrefix != getOrganizationSyncApiKeyPrefix(result.Secret) {
		t.Fatalf("stored key prefix = %q", stored.KeyPrefix)
	}

	auth, err := AuthenticateOrganizationSyncApiKey(result.Secret, "10.0.0.1", "gateway-sync-test/1.0")
	if err != nil {
		t.Fatalf("AuthenticateOrganizationSyncApiKey() error = %v", err)
	}
	if auth.Organization != "engineering" || auth.Owner != "engineering" || auth.Name != "gateway-sync" {
		t.Fatalf("auth = %#v", auth)
	}

	stored, err = GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() after auth error = %v", err)
	}
	if stored.LastUsedTime == "" || stored.LastUsedIp != "10.0.0.1" || stored.LastUsedUserAgent != "gateway-sync-test/1.0" {
		t.Fatalf("last used fields = %#v", stored)
	}

	rotated, err := RotateOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("RotateOrganizationSyncApiKey() error = %v", err)
	}
	if rotated.Secret == result.Secret {
		t.Fatalf("rotated secret reused old secret")
	}
	if rotated.Key.KeyHash == result.Key.KeyHash || rotated.Key.KeyPrefix == result.Key.KeyPrefix {
		t.Fatalf("rotated key did not replace hash/prefix")
	}
	if _, err = AuthenticateOrganizationSyncApiKey(result.Secret, "10.0.0.2", "old"); err == nil {
		t.Fatalf("old secret authenticated after rotation")
	}
	if _, err = AuthenticateOrganizationSyncApiKey(rotated.Secret, "10.0.0.3", "new"); err != nil {
		t.Fatalf("new secret authenticate error = %v", err)
	}

	if ok, err := DisableOrganizationSyncApiKey("engineering/gateway-sync"); err != nil || !ok {
		t.Fatalf("DisableOrganizationSyncApiKey() ok = %v, error = %v", ok, err)
	}
	if _, err = AuthenticateOrganizationSyncApiKey(rotated.Secret, "10.0.0.4", "disabled"); err == nil || !strings.Contains(err.Error(), "disabled") {
		t.Fatalf("disabled key auth error = %v, want disabled", err)
	}

	if ok, err := DeleteOrganizationSyncApiKey(&OrganizationSyncApiKey{Owner: "engineering", Name: "gateway-sync"}); err != nil || !ok {
		t.Fatalf("DeleteOrganizationSyncApiKey() ok = %v, error = %v", ok, err)
	}
	deleted, err := GetOrganizationSyncApiKey("engineering/gateway-sync")
	if err != nil {
		t.Fatalf("GetOrganizationSyncApiKey() after delete error = %v", err)
	}
	if deleted != nil {
		t.Fatalf("deleted key = %#v, want nil", deleted)
	}
}

func TestOrganizationSyncApiKeyRejectsInvalidStates(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	if _, err := AuthenticateOrganizationSyncApiKey(OrganizationSyncApiKeyPrefix+"unknown", "10.0.0.1", "unknown"); err == nil || !strings.Contains(err.Error(), "invalid") {
		t.Fatalf("unknown key error = %v, want invalid", err)
	}

	expired, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "expired-sync",
		Organization: "engineering",
		ExpireTime:   time.Now().Add(-time.Hour).UTC().Format(time.RFC3339),
	}, "built-in/admin")
	if err != nil {
		t.Fatalf("Add expired key error = %v", err)
	}
	if _, err = AuthenticateOrganizationSyncApiKey(expired.Secret, "10.0.0.1", "expired"); err == nil || !strings.Contains(err.Error(), "expired") {
		t.Fatalf("expired key auth error = %v, want expired", err)
	}
}

func TestOrganizationSyncApiKeyRejectsBuiltInTarget(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	if _, err := AddOrganizationSyncApiKey(&OrganizationSyncApiKey{
		Name:         "built-in-sync",
		Organization: "built-in",
	}, "built-in/admin"); err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("AddOrganizationSyncApiKey() error = %v, want built-in rejection", err)
	}

	secret, err := GenerateOrganizationSyncApiKeySecret()
	if err != nil {
		t.Fatalf("GenerateOrganizationSyncApiKeySecret() error = %v", err)
	}
	_, err = ormer.Engine.Insert(&OrganizationSyncApiKey{
		Owner:        "built-in",
		Name:         "manual-built-in-sync",
		Organization: "built-in",
		KeyPrefix:    getOrganizationSyncApiKeyPrefix(secret),
		KeyHash:      GetOrganizationSyncApiKeyHash(secret),
		State:        OrganizationSyncApiKeyStateActive,
	})
	if err != nil {
		t.Fatalf("insert manual built-in key error = %v", err)
	}
	if _, err = RotateOrganizationSyncApiKey("built-in/manual-built-in-sync"); err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("RotateOrganizationSyncApiKey() error = %v, want built-in rejection", err)
	}
}

func TestGetOrganizationSyncSnapshotReturnsBoundDataAndMasksApplications(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)
	_, err := ormer.Engine.Insert(&Group{
		Owner:       "engineering",
		Name:        "rd",
		DisplayName: "研发部",
		IsTopGroup:  true,
	})
	if err != nil {
		t.Fatalf("insert group error = %v", err)
	}
	_, err = ormer.Engine.Insert(&Application{
		Owner:        "admin",
		Name:         "gateway",
		DisplayName:  "Gateway",
		Organization: "engineering",
		ClientSecret: "plaintext-secret",
	})
	if err != nil {
		t.Fatalf("insert application error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if snapshot.Organization == nil || snapshot.Organization.Name != "engineering" {
		t.Fatalf("snapshot organization = %#v", snapshot.Organization)
	}
	if len(snapshot.Groups) != 1 || snapshot.Groups[0].Name != "rd" {
		t.Fatalf("snapshot groups = %#v", snapshot.Groups)
	}
	if len(snapshot.Applications) != 1 || snapshot.Applications[0].Name != "gateway" {
		t.Fatalf("snapshot applications = %#v", snapshot.Applications)
	}
	if snapshot.Applications[0].ClientSecret != "***" {
		t.Fatalf("application client secret = %q, want masked", snapshot.Applications[0].ClientSecret)
	}
}

func TestGetOrganizationSyncSnapshotExportsStableMemberReferences(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	group := &Group{
		Owner:       "engineering",
		Name:        "wecom-dept-ww123-2",
		DisplayName: "研发部",
		IsTopGroup:  true,
		IsEnabled:   true,
	}
	if _, err := ormer.Engine.Insert(group); err != nil {
		t.Fatalf("insert group error = %v", err)
	}
	sourceConnectionId := GetSourceConnectionId("engineering", SourceTypeWecom, "ww123")
	records := []any{
		&SourceConnection{Owner: "admin", Name: sourceConnectionId, OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, SourceType: SourceTypeWecom, SourceTenantId: "ww123", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", group.GetId()), OrganizationId: "engineering", DepartmentId: group.GetId(), ExternalDepartmentId: "2", DisplayName: "研发部", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-zhang", OrganizationId: "engineering", AdminSubject: "engineering/local-zhang", UserOwner: "engineering", UserName: "local-zhang", DisplayName: "张三", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/local-zhang", group.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/local-zhang", DepartmentId: group.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&ExternalIdentity{Owner: "admin", Name: GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "zhangsan"), OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "zhangsan", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/local-zhang", MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-a"},
	}
	if _, err := ormer.Engine.Insert(records...); err != nil {
		t.Fatalf("insert platform projection records error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if len(snapshot.Groups) != 1 {
		t.Fatalf("snapshot groups = %#v, want one group", snapshot.Groups)
	}
	if len(snapshot.Groups[0].Users) != 1 {
		t.Fatalf("snapshot group users = %#v, want one member reference", snapshot.Groups[0].Users)
	}
	member := snapshot.Groups[0].Users[0]
	if member.AdminSubject != "engineering/local-zhang" {
		t.Fatalf("adminSubject = %q", member.AdminSubject)
	}
	if member.WecomCorpId != "ww123" || member.WecomUserId != "zhangsan" || member.WecomExternalId != "wecom:ww123:zhangsan" {
		t.Fatalf("wecom member reference = %#v", member)
	}
	if member.SourceUserId != "engineering/local-zhang" || member.DisplayName != "张三" {
		t.Fatalf("member display fields = %#v", member)
	}
}

func TestGetOrganizationSyncSnapshotFallsBackToGroupMembers(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)
	setupOrganizationSyncApiKeyTestUserEnforcer(t)

	group := &Group{
		Owner:       "engineering",
		Name:        "wecom-dept-ww123-3",
		DisplayName: "产品部",
		IsTopGroup:  true,
		IsEnabled:   true,
	}
	user := &User{
		Owner:       "engineering",
		Name:        "local-alice",
		Id:          "local-alice-id",
		DisplayName: "Alice",
		Wecom:       "alice",
		ExternalId:  GetWecomUserFullExternalId("ww123", "alice"),
		Properties: map[string]string{
			WecomUserPropertyCorpId: "ww123",
			WecomUserPropertyUserId: "alice",
		},
	}
	if _, err := ormer.Engine.Insert(group, user); err != nil {
		t.Fatalf("insert group and user error = %v", err)
	}
	if _, err := userEnforcer.AddGroupForUser(user.GetId(), group.GetId()); err != nil {
		t.Fatalf("add user to group error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if len(snapshot.Groups) != 1 {
		t.Fatalf("snapshot groups = %#v, want one group", snapshot.Groups)
	}
	if len(snapshot.Groups[0].Users) != 1 {
		t.Fatalf("snapshot group users = %#v, want legacy group member fallback", snapshot.Groups[0].Users)
	}
	member := snapshot.Groups[0].Users[0]
	if member.AdminSubject != "engineering/local-alice" || member.SourceUserId != "engineering/local-alice" {
		t.Fatalf("fallback admin subject = %#v", member)
	}
	if member.WecomExternalId != "wecom:ww123:alice" || member.WecomCorpId != "ww123" || member.WecomUserId != "alice" {
		t.Fatalf("fallback wecom identity = %#v", member)
	}
}

func TestGetOrganizationSyncSnapshotFallsBackToUserGroups(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)
	setupOrganizationSyncApiKeyTestUserEnforcer(t)

	group := &Group{
		Owner:       "engineering",
		Name:        "wecom-dept-ww123-4",
		DisplayName: "市场部",
		IsTopGroup:  true,
		IsEnabled:   true,
	}
	user := &User{
		Owner:       "engineering",
		Name:        "local-bob",
		Id:          "local-bob-id",
		DisplayName: "Bob",
		Wecom:       "bob",
		ExternalId:  GetWecomUserFullExternalId("ww123", "bob"),
		Groups:      []string{group.GetId()},
		Properties: map[string]string{
			WecomUserPropertyCorpId: "ww123",
			WecomUserPropertyUserId: "bob",
		},
	}
	if _, err := ormer.Engine.Insert(group, user); err != nil {
		t.Fatalf("insert group and user error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if len(snapshot.Groups) != 1 {
		t.Fatalf("snapshot groups = %#v, want one group", snapshot.Groups)
	}
	if len(snapshot.Groups[0].Users) != 1 {
		t.Fatalf("snapshot group users = %#v, want user.Groups fallback", snapshot.Groups[0].Users)
	}
	member := snapshot.Groups[0].Users[0]
	if member.AdminSubject != "engineering/local-bob" || member.WecomExternalId != "wecom:ww123:bob" {
		t.Fatalf("fallback user group member = %#v", member)
	}
}

func TestGetOrganizationSyncSnapshotEnrichesPlatformMembersFromLegacyUser(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)
	setupOrganizationSyncApiKeyTestUserEnforcer(t)

	group := &Group{
		Owner:       "engineering",
		Name:        "wecom-dept-ww123-5",
		DisplayName: "运营部",
		IsTopGroup:  true,
		IsEnabled:   true,
	}
	user := &User{
		Owner:       "engineering",
		Name:        "local-carol",
		Id:          "local-carol-id",
		DisplayName: "Carol",
		Wecom:       "carol",
		ExternalId:  GetWecomUserFullExternalId("ww123", "carol"),
		Groups:      []string{group.GetId()},
		Properties: map[string]string{
			WecomUserPropertyCorpId: "ww123",
			WecomUserPropertyUserId: "carol",
		},
	}
	sourceConnectionId := GetSourceConnectionId("engineering", SourceTypeWecom, "ww123")
	records := []any{
		group,
		user,
		&SourceConnection{Owner: "admin", Name: sourceConnectionId, OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, SourceType: SourceTypeWecom, SourceTenantId: "ww123", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", group.GetId()), OrganizationId: "engineering", DepartmentId: group.GetId(), ExternalDepartmentId: "5", DisplayName: "运营部", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-carol", OrganizationId: "engineering", AdminSubject: user.GetId(), UserOwner: "engineering", UserName: user.Name, DisplayName: "Carol", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", user.GetId(), group.GetId()), OrganizationId: "engineering", AdminSubject: user.GetId(), DepartmentId: group.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
	}
	if _, err := ormer.Engine.Insert(records...); err != nil {
		t.Fatalf("insert platform and legacy records error = %v", err)
	}

	snapshot, err := GetOrganizationSyncSnapshot("engineering")
	if err != nil {
		t.Fatalf("GetOrganizationSyncSnapshot() error = %v", err)
	}
	if len(snapshot.Groups) != 1 {
		t.Fatalf("snapshot groups = %#v, want one group", snapshot.Groups)
	}
	if len(snapshot.Groups[0].Users) != 1 {
		t.Fatalf("snapshot group users = %#v, want merged member reference", snapshot.Groups[0].Users)
	}
	member := snapshot.Groups[0].Users[0]
	if member.AdminSubject != "engineering/local-carol" || member.SourceUserId != "engineering/local-carol" {
		t.Fatalf("merged admin subject = %#v", member)
	}
	if member.WecomExternalId != "wecom:ww123:carol" || member.WecomCorpId != "ww123" || member.WecomUserId != "carol" {
		t.Fatalf("merged wecom identity = %#v", member)
	}
}

func TestBuildOrganizationSyncExportGroupsFiltersAndDeduplicatesMembers(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)
	insertOrganizationSyncApiKeyTestOrganizations(t)

	rd := &Group{Owner: "engineering", Name: "rd", DisplayName: "研发部", IsEnabled: true}
	qa := &Group{Owner: "engineering", Name: "qa", DisplayName: "测试部", IsEnabled: true}
	if _, err := ormer.Engine.Insert(rd, qa); err != nil {
		t.Fatalf("insert groups error = %v", err)
	}
	sourceConnectionId := GetSourceConnectionId("engineering", SourceTypeWecom, "ww123")
	records := []any{
		&SourceConnection{Owner: "admin", Name: sourceConnectionId, OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, SourceType: SourceTypeWecom, SourceTenantId: "ww123", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", rd.GetId()), OrganizationId: "engineering", DepartmentId: rd.GetId(), DisplayName: "研发部", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", rd.Name), OrganizationId: "engineering", DepartmentId: rd.Name, DisplayName: "研发部别名", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", "engineering/orphan"), OrganizationId: "engineering", DepartmentId: "engineering/orphan", DisplayName: "孤立部门", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("engineering", qa.GetId()), OrganizationId: "engineering", DepartmentId: qa.GetId(), DisplayName: "测试部", LifecycleStatus: PlatformLifecycleStatusDisabled, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-active", OrganizationId: "engineering", AdminSubject: "engineering/active", UserOwner: "engineering", UserName: "active", DisplayName: "Active", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-beta", OrganizationId: "engineering", AdminSubject: "engineering/beta", UserOwner: "engineering", UserName: "beta", DisplayName: "Beta", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-pending", OrganizationId: "engineering", AdminSubject: "engineering/pending", UserOwner: "engineering", UserName: "pending", DisplayName: "Pending", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusPendingReview, OrgVersion: "orgv-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-disabled", OrganizationId: "engineering", AdminSubject: "engineering/disabled", UserOwner: "engineering", UserName: "disabled", DisplayName: "Disabled", LifecycleStatus: PlatformLifecycleStatusDisabled, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/active", rd.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/active", DepartmentId: rd.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/active", rd.Name), OrganizationId: "engineering", AdminSubject: "engineering/active", DepartmentId: rd.Name, LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/beta", rd.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/beta", DepartmentId: rd.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/pending", rd.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/pending", DepartmentId: rd.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/disabled", rd.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/disabled", DepartmentId: rd.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("engineering", "engineering/active", qa.GetId()), OrganizationId: "engineering", AdminSubject: "engineering/active", DepartmentId: qa.GetId(), LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&ExternalIdentity{Owner: "admin", Name: GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "active-wecom"), OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "active-wecom", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/active", MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-a"},
		&ExternalIdentity{Owner: "admin", Name: GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "beta-wecom"), OrganizationId: "engineering", SourceConnectionId: sourceConnectionId, ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "beta-wecom", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/beta", MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-a"},
	}
	if _, err := ormer.Engine.Insert(records...); err != nil {
		t.Fatalf("insert projection records error = %v", err)
	}

	exportGroups, err := BuildOrganizationSyncExportGroups("engineering", []*Group{rd, qa})
	if err != nil {
		t.Fatalf("BuildOrganizationSyncExportGroups() error = %v", err)
	}
	rdExport := findOrganizationSyncExportGroupForTest(exportGroups, "rd")
	if rdExport == nil {
		t.Fatalf("rd export group missing: %#v", exportGroups)
	}
	if len(rdExport.Users) != 2 {
		t.Fatalf("rd users = %#v, want two active users with duplicates removed", rdExport.Users)
	}
	if rdExport.Users[0].AdminSubject != "engineering/active" || rdExport.Users[0].WecomExternalId != "wecom:ww123:active-wecom" {
		t.Fatalf("rd active user reference = %#v", rdExport.Users[0])
	}
	if rdExport.Users[1].AdminSubject != "engineering/beta" || rdExport.Users[1].WecomExternalId != "wecom:ww123:beta-wecom" {
		t.Fatalf("rd beta user reference = %#v", rdExport.Users[1])
	}
	qaExport := findOrganizationSyncExportGroupForTest(exportGroups, "qa")
	if qaExport == nil {
		t.Fatalf("qa export group missing: %#v", exportGroups)
	}
	if len(qaExport.Users) != 0 {
		t.Fatalf("qa users = %#v, want disabled department filtered", qaExport.Users)
	}
}

func TestOrganizationSyncExportHelperEdgeCases(t *testing.T) {
	setupOrganizationSyncApiKeyTestDB(t)

	exportGroups, err := BuildOrganizationSyncExportGroups("", []*Group{nil, {Owner: "engineering", Name: "empty"}})
	if err != nil {
		t.Fatalf("BuildOrganizationSyncExportGroups() blank org error = %v", err)
	}
	if len(exportGroups) != 1 || len(exportGroups[0].Users) != 0 {
		t.Fatalf("blank org export groups = %#v", exportGroups)
	}

	departmentIndex := buildOrganizationSyncGroupDepartmentIndex([]*Group{
		nil,
		{Owner: "engineering", Name: ""},
		{Owner: "engineering", Name: "rd"},
	})
	if departmentIndex["rd"] != "rd" || departmentIndex["engineering/rd"] != "rd" {
		t.Fatalf("department index = %#v", departmentIndex)
	}

	sourceConnections := map[string]*SourceConnection{
		"src-a":       {SourceConnectionId: "src-a", SourceType: SourceTypeWecom, SourceTenantId: "ww-a", Status: SourceConnectionStatusActive},
		"src-b":       {SourceConnectionId: "src-b", SourceType: SourceTypeWecom, SourceTenantId: "ww-b", Status: SourceConnectionStatusActive},
		"src-custom":  {SourceConnectionId: "src-custom", SourceType: SourceTypeCustom, SourceTenantId: "tenant", Status: SourceConnectionStatusActive},
		"src-no-corp": {SourceConnectionId: "src-no-corp", SourceType: SourceTypeWecom, Status: SourceConnectionStatusActive},
	}
	refsBySubject := buildOrganizationSyncExternalIdentityIndex([]*ExternalIdentity{
		nil,
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "pending", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/pending", MappingStatus: PlatformMappingStatusPendingReview},
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeDepartment, ExternalSubjectId: "dept", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/dept", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "bad-platform", PlatformSubjectType: PlatformSubjectTypeDepartment, PlatformSubject: "engineering/bad", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/empty-external", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "empty-subject", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-custom", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "custom-user", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/custom", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-no-corp", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "no-corp-user", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/no-corp", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-b", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "bob", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/bob", MappingStatus: PlatformMappingStatusConfirmed},
		{OrganizationId: "engineering", SourceConnectionId: "src-a", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "alice", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "engineering/bob", MappingStatus: PlatformMappingStatusConfirmed},
	}, sourceConnections)
	refs := refsBySubject["engineering/bob"]
	if len(refs) != 2 {
		t.Fatalf("refs for bob = %#v, want two valid wecom refs", refs)
	}
	if refs[0].SourceConnectionId != "src-a" || refs[0].WecomExternalId != "wecom:ww-a:alice" {
		t.Fatalf("refs not sorted by source/external id: %#v", refs)
	}
	if _, ok := refsBySubject["engineering/custom"]; ok {
		t.Fatalf("custom source should not be exported: %#v", refsBySubject["engineering/custom"])
	}
	if _, ok := refsBySubject["engineering/no-corp"]; ok {
		t.Fatalf("wecom source without corp should not be exported: %#v", refsBySubject["engineering/no-corp"])
	}
	if _, ok := refsBySubject["engineering/pending"]; ok {
		t.Fatalf("pending identity should not be exported: %#v", refsBySubject["engineering/pending"])
	}

	selected, ok := selectOrganizationSyncExternalIdentityRef(refs, "src-b")
	if !ok || selected.WecomExternalId != "wecom:ww-b:bob" {
		t.Fatalf("selected src-b ref = %#v ok=%v", selected, ok)
	}
	selected, ok = selectOrganizationSyncExternalIdentityRef(refs, "missing")
	if !ok || selected.WecomExternalId != "wecom:ww-a:alice" {
		t.Fatalf("fallback ref = %#v ok=%v", selected, ok)
	}
	if _, ok = selectOrganizationSyncExternalIdentityRef(nil, "src-a"); ok {
		t.Fatalf("empty refs should not select")
	}
	if got := organizationSyncMemberReferenceSortKey(OrganizationSyncGroupMemberReference{WecomExternalId: "wecom:ww-a:alice"}); got != "wecom:ww-a:alice" {
		t.Fatalf("sort key = %q", got)
	}
}

func findOrganizationSyncExportGroupForTest(groups []*OrganizationSyncExportGroup, name string) *OrganizationSyncExportGroup {
	for _, group := range groups {
		if group != nil && group.Name == name {
			return group
		}
	}
	return nil
}

func setupOrganizationSyncApiKeyTestDB(t *testing.T) {
	t.Helper()

	oldOrmer := ormer
	dbPath := filepath.Join(t.TempDir(), "organization-sync-api-key.db")
	engine, err := xorm.NewEngine("sqlite", dbPath)
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(
		new(Organization),
		new(User),
		new(Group),
		new(Application),
		new(OrganizationSyncApiKey),
		new(PlatformDepartment),
		new(PlatformUser),
		new(PlatformMembership),
		new(SourceConnection),
		new(ExternalIdentity),
	); err != nil {
		t.Fatalf("sync tables error = %v", err)
	}
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}

func setupOrganizationSyncApiKeyTestUserEnforcer(t *testing.T) {
	t.Helper()

	modelText := `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
`
	m, err := casbinmodel.NewModelFromString(modelText)
	if err != nil {
		t.Fatalf("new casbin model error = %v", err)
	}
	enforcer, err := casbin.NewEnforcer(m)
	if err != nil {
		t.Fatalf("new casbin enforcer error = %v", err)
	}
	oldUserEnforcer := userEnforcer
	userEnforcer = NewUserGroupEnforcer(enforcer)
	t.Cleanup(func() {
		userEnforcer = oldUserEnforcer
	})
}

func insertOrganizationSyncApiKeyTestOrganizations(t *testing.T) {
	t.Helper()

	_, err := ormer.Engine.Insert(&Organization{
		Owner:       "admin",
		Name:        "engineering",
		DisplayName: "Engineering",
	})
	if err != nil {
		t.Fatalf("insert engineering organization error = %v", err)
	}
	_, err = ormer.Engine.Insert(&Organization{
		Owner:       "admin",
		Name:        "built-in",
		DisplayName: "Built In",
	})
	if err != nil {
		t.Fatalf("insert built-in organization error = %v", err)
	}
}
