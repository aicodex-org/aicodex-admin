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
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/xorm-io/xorm"
)

func TestPlatformOrganizationMasterModelsExposeStableContractFields(t *testing.T) {
	timeType := reflect.TypeOf(time.Time{})

	tests := []struct {
		name          string
		model         any
		required      []string
		timeFields    []string
		jsonFields    []string
		notNullFields []string
	}{
		{
			name:          "platform organization",
			model:         PlatformOrganization{},
			required:      []string{"Owner", "Name", "OrganizationId", "DisplayName", "LifecycleStatus", "OrgVersion", "Freshness", "SourceConnectionId", "CreatedAt", "UpdatedAt"},
			timeFields:    []string{"CreatedAt", "UpdatedAt"},
			jsonFields:    []string{"organizationId", "displayName", "lifecycleStatus", "orgVersion", "freshness", "sourceConnectionId"},
			notNullFields: []string{"Owner", "Name", "OrganizationId"},
		},
		{
			name:          "platform user",
			model:         PlatformUser{},
			required:      []string{"Owner", "Name", "OrganizationId", "AdminSubject", "UserOwner", "UserName", "DisplayName", "LifecycleStatus", "MappingStatus", "OrgVersion", "LastSeenBatchId"},
			jsonFields:    []string{"organizationId", "adminSubject", "userOwner", "userName", "displayName", "lifecycleStatus", "mappingStatus", "orgVersion", "lastSeenBatchId"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "AdminSubject"},
		},
		{
			name:          "platform department",
			model:         PlatformDepartment{},
			required:      []string{"Owner", "Name", "OrganizationId", "DepartmentId", "ParentDepartmentId", "DisplayName", "LifecycleStatus", "SourceConnectionId", "ExternalDepartmentId", "OrgVersion"},
			jsonFields:    []string{"organizationId", "departmentId", "parentDepartmentId", "displayName", "lifecycleStatus", "sourceConnectionId", "externalDepartmentId", "orgVersion"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "DepartmentId"},
		},
		{
			name:          "platform membership",
			model:         PlatformMembership{},
			required:      []string{"Owner", "Name", "OrganizationId", "AdminSubject", "DepartmentId", "IsMain", "IsManager", "IsDirectLeader", "LifecycleStatus", "SourceConnectionId", "OrgVersion"},
			jsonFields:    []string{"organizationId", "adminSubject", "departmentId", "isMain", "isManager", "isDirectLeader", "lifecycleStatus", "sourceConnectionId", "orgVersion"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "AdminSubject", "DepartmentId"},
		},
		{
			name:          "source connection",
			model:         SourceConnection{},
			required:      []string{"Owner", "Name", "OrganizationId", "SourceConnectionId", "SourceType", "SourceTenantId", "Status", "Freshness", "Metadata", "ConfigRef", "SecretRef", "LastSeenBatchId"},
			jsonFields:    []string{"organizationId", "sourceConnectionId", "sourceType", "sourceTenantId", "status", "freshness", "metadata", "configRef", "secretRef", "lastSeenBatchId"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "SourceConnectionId", "SourceType"},
		},
		{
			name:          "external identity",
			model:         ExternalIdentity{},
			required:      []string{"Owner", "Name", "OrganizationId", "SourceConnectionId", "ExternalSubjectType", "ExternalSubjectId", "PlatformSubjectType", "PlatformSubject", "MappingStatus", "Lineage", "LastSeenBatchId"},
			jsonFields:    []string{"organizationId", "sourceConnectionId", "externalSubjectType", "externalSubjectId", "platformSubjectType", "platformSubject", "mappingStatus", "lineage", "lastSeenBatchId"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "SourceConnectionId", "ExternalSubjectId"},
		},
		{
			name:          "lifecycle event",
			model:         LifecycleEvent{},
			required:      []string{"Owner", "Name", "OrganizationId", "SubjectType", "Subject", "LifecycleStatus", "Reason", "BatchId", "OccurredAt"},
			timeFields:    []string{"OccurredAt"},
			jsonFields:    []string{"organizationId", "subjectType", "subject", "lifecycleStatus", "reason", "batchId", "occurredAt"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "SubjectType", "Subject"},
		},
		{
			name:          "org sync batch",
			model:         OrgSyncBatch{},
			required:      []string{"Owner", "Name", "OrganizationId", "SourceConnectionId", "BatchId", "Status", "StartedAt", "FinishedAt", "OrgVersion", "Freshness", "ErrorCode", "ErrorText"},
			timeFields:    []string{"StartedAt", "FinishedAt"},
			jsonFields:    []string{"organizationId", "sourceConnectionId", "batchId", "status", "startedAt", "finishedAt", "orgVersion", "freshness", "errorCode", "errorText"},
			notNullFields: []string{"Owner", "Name", "OrganizationId", "BatchId"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			modelType := reflect.TypeOf(tt.model)
			for _, fieldName := range tt.required {
				field, ok := modelType.FieldByName(fieldName)
				if !ok {
					t.Fatalf("missing field %s", fieldName)
				}
				if field.Tag.Get("json") == "" {
					t.Fatalf("%s should declare json tag", fieldName)
				}
				if field.Tag.Get("xorm") == "" {
					t.Fatalf("%s should declare xorm tag", fieldName)
				}
			}
			for _, fieldName := range tt.timeFields {
				field, _ := modelType.FieldByName(fieldName)
				if field.Type != timeType {
					t.Fatalf("%s should use time.Time, got %s", fieldName, field.Type)
				}
				if !strings.Contains(strings.ToLower(field.Tag.Get("xorm")), "timestampz") {
					t.Fatalf("%s should declare timestampz xorm tag, got %q", fieldName, field.Tag.Get("xorm"))
				}
			}
			for _, jsonName := range tt.jsonFields {
				if !hasJSONField(modelType, jsonName) {
					t.Fatalf("%s should expose json field %q", tt.name, jsonName)
				}
			}
			for _, fieldName := range tt.notNullFields {
				field, _ := modelType.FieldByName(fieldName)
				if !strings.Contains(strings.ToLower(field.Tag.Get("xorm")), "notnull") {
					t.Fatalf("%s should be notnull, got xorm tag %q", fieldName, field.Tag.Get("xorm"))
				}
			}
		})
	}
}

func TestPlatformOrganizationStableNamesAreSourceNeutralAndBounded(t *testing.T) {
	sourceConnectionId := GetSourceConnectionId("org-a", SourceTypeWecom, "ww123456")
	sameConnectionId := GetSourceConnectionId("org-a", SourceTypeWecom, "ww123456")
	otherConnectionId := GetSourceConnectionId("org-b", SourceTypeWecom, "ww123456")

	if sourceConnectionId != sameConnectionId {
		t.Fatalf("source connection id should be stable")
	}
	if sourceConnectionId == otherConnectionId {
		t.Fatalf("source connection id must include platform organization boundary")
	}
	if !strings.HasPrefix(sourceConnectionId, "src-") || len(sourceConnectionId) > 100 {
		t.Fatalf("source connection id should be prefixed and bounded, got %q", sourceConnectionId)
	}

	externalIdentityName := GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "zhangsan")
	sameIdentityName := GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "zhangsan")
	otherIdentityName := GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "lisi")
	if externalIdentityName != sameIdentityName {
		t.Fatalf("external identity name should be stable")
	}
	if externalIdentityName == otherIdentityName {
		t.Fatalf("external identity name should change when external subject changes")
	}
	if !strings.HasPrefix(externalIdentityName, "eid-") || len(externalIdentityName) > 100 {
		t.Fatalf("external identity name should be prefixed and bounded, got %q", externalIdentityName)
	}
}

func TestPlatformOrganizationSnapshotGettersReturnEmptyForBlankOrganization(t *testing.T) {
	departments, err := GetPlatformDepartments("")
	if err != nil || len(departments) != 0 {
		t.Fatalf("GetPlatformDepartments blank = len:%d err:%v, want empty nil error", len(departments), err)
	}
	memberships, err := GetPlatformMemberships("")
	if err != nil || len(memberships) != 0 {
		t.Fatalf("GetPlatformMemberships blank = len:%d err:%v, want empty nil error", len(memberships), err)
	}
	users, err := GetPlatformUsers("")
	if err != nil || len(users) != 0 {
		t.Fatalf("GetPlatformUsers blank = len:%d err:%v, want empty nil error", len(users), err)
	}
	identities, err := GetExternalIdentities("")
	if err != nil || len(identities) != 0 {
		t.Fatalf("GetExternalIdentities blank = len:%d err:%v, want empty nil error", len(identities), err)
	}
	connections, err := GetSourceConnections("")
	if err != nil || len(connections) != 0 {
		t.Fatalf("GetSourceConnections blank = len:%d err:%v, want empty nil error", len(connections), err)
	}
	batches, err := GetOrgSyncBatches("")
	if err != nil || len(batches) != 0 {
		t.Fatalf("GetOrgSyncBatches blank = len:%d err:%v, want empty nil error", len(batches), err)
	}
}

func TestPlatformOrganizationSnapshotGettersQueryByOrganization(t *testing.T) {
	setupPlatformOrganizationSnapshotTestOrmer(t)

	sourceConnectionId := GetSourceConnectionId("org-a", SourceTypeWecom, "ww123")
	records := []any{
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("org-a", "org-a/dev"), OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&PlatformDepartment{Owner: "admin", Name: GetPlatformDepartmentName("org-b", "org-b/finance"), OrganizationId: "org-b", DepartmentId: "org-b/finance", DisplayName: "Finance", LifecycleStatus: PlatformLifecycleStatusActive, OrgVersion: "orgv-b"},
		&PlatformUser{Owner: "admin", Name: "platform-user-org-a-alice", OrganizationId: "org-a", AdminSubject: "org-a/alice", UserOwner: "org-a", UserName: "alice", DisplayName: "Alice", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-a", LastSeenBatchId: "batch-a"},
		&PlatformUser{Owner: "admin", Name: "platform-user-org-b-bob", OrganizationId: "org-b", AdminSubject: "org-b/bob", UserOwner: "org-b", UserName: "bob", DisplayName: "Bob", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-b"},
		&PlatformMembership{Owner: "admin", Name: GetPlatformMembershipName("org-a", "org-a/alice", "org-a/dev"), OrganizationId: "org-a", AdminSubject: "org-a/alice", DepartmentId: "org-a/dev", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: sourceConnectionId, OrgVersion: "orgv-a"},
		&ExternalIdentity{Owner: "admin", Name: GetExternalIdentityName(sourceConnectionId, PlatformSubjectTypeUser, "external-alice"), OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: "external-alice", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "org-a/alice", MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-a"},
		&SourceConnection{Owner: "admin", Name: sourceConnectionId, OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, SourceType: SourceTypeWecom, Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh},
		&OrgSyncBatch{Owner: "admin", Name: "batch-a", OrganizationId: "org-a", SourceConnectionId: sourceConnectionId, BatchId: "batch-a", Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-a", Freshness: PlatformFreshnessFresh, FinishedAt: time.Date(2026, 6, 10, 8, 0, 0, 0, time.UTC)},
	}
	if _, err := ormer.Engine.Insert(records...); err != nil {
		t.Fatalf("insert platform snapshot records error = %v", err)
	}

	departments, err := GetPlatformDepartments("org-a")
	if err != nil || len(departments) != 1 || departments[0].DepartmentId != "org-a/dev" {
		t.Fatalf("GetPlatformDepartments org-a = %+v err=%v, want only org-a/dev", departments, err)
	}
	memberships, err := GetPlatformMemberships("org-a")
	if err != nil || len(memberships) != 1 || memberships[0].AdminSubject != "org-a/alice" {
		t.Fatalf("GetPlatformMemberships org-a = %+v err=%v, want alice membership", memberships, err)
	}
	users, err := GetPlatformUsers("org-a")
	if err != nil || len(users) != 1 || users[0].AdminSubject != "org-a/alice" {
		t.Fatalf("GetPlatformUsers org-a = %+v err=%v, want alice user", users, err)
	}
	identities, err := GetExternalIdentities("org-a")
	if err != nil || len(identities) != 1 || identities[0].PlatformSubject != "org-a/alice" {
		t.Fatalf("GetExternalIdentities org-a = %+v err=%v, want alice external identity", identities, err)
	}
	connections, err := GetSourceConnections("org-a")
	if err != nil || len(connections) != 1 || connections[0].SourceConnectionId != sourceConnectionId {
		t.Fatalf("GetSourceConnections org-a = %+v err=%v, want source connection", connections, err)
	}
	batches, err := GetOrgSyncBatches("org-a")
	if err != nil || len(batches) != 1 || batches[0].BatchId != "batch-a" {
		t.Fatalf("GetOrgSyncBatches org-a = %+v err=%v, want batch-a", batches, err)
	}

	orgBConnections, err := GetSourceConnections("org-b")
	if err != nil || len(orgBConnections) != 0 {
		t.Fatalf("GetSourceConnections org-b = %+v err=%v, want no cross-organization source connection", orgBConnections, err)
	}
	orgBIdentities, err := GetExternalIdentities("org-b")
	if err != nil || len(orgBIdentities) != 0 {
		t.Fatalf("GetExternalIdentities org-b = %+v err=%v, want no cross-organization external identity", orgBIdentities, err)
	}
}

func TestPlatformOrganizationWeakFieldsAreNeverAutomaticJoinKeys(t *testing.T) {
	for _, field := range []string{"name", "displayName", "nickName", "phone", "email", "avatar", "mobile"} {
		if IsAllowedExternalIdentityAutoJoinField(field) {
			t.Fatalf("%s must not be allowed as automatic join key", field)
		}
	}
	for _, field := range []string{"sourceConnectionId", "externalSubjectId", "adminSubject"} {
		if !IsAllowedExternalIdentityAutoJoinField(field) {
			t.Fatalf("%s should be allowed as stable join key", field)
		}
	}
}

func TestPlatformVersionMetadataIsDeterministicAndCarriesFreshness(t *testing.T) {
	generatedAt := time.Date(2026, 6, 4, 8, 30, 0, 0, time.UTC)

	got := NewPlatformVersionMetadata("org-a", "src-1", "batch-7", generatedAt, "trace-1")
	same := NewPlatformVersionMetadata("org-a", "src-1", "batch-7", generatedAt, "trace-2")
	changed := NewPlatformVersionMetadata("org-a", "src-1", "batch-8", generatedAt, "trace-1")

	if got.OrgVersion == "" || got.ScopeVersion == "" {
		t.Fatalf("expected org and scope versions: %+v", got)
	}
	if got.OrgVersion != same.OrgVersion || got.ScopeVersion != same.ScopeVersion {
		t.Fatalf("trace id must not change deterministic org/scope versions")
	}
	if got.OrgVersion == changed.OrgVersion || got.ScopeVersion == changed.ScopeVersion {
		t.Fatalf("batch changes should change org/scope versions")
	}
	if got.Freshness != PlatformFreshnessFresh || got.GeneratedAt != generatedAt || got.TraceId != "trace-1" {
		t.Fatalf("unexpected metadata: %+v", got)
	}
}

func hasJSONField(modelType reflect.Type, jsonName string) bool {
	for i := 0; i < modelType.NumField(); i++ {
		tag := modelType.Field(i).Tag.Get("json")
		if strings.Split(tag, ",")[0] == jsonName {
			return true
		}
	}
	return false
}

func setupPlatformOrganizationSnapshotTestOrmer(t *testing.T) {
	t.Helper()

	engine, err := xorm.NewEngine("sqlite", filepath.Join(t.TempDir(), "platform-organization-snapshot.db"))
	if err != nil {
		t.Fatalf("new sqlite engine error = %v", err)
	}
	if err := engine.Sync2(new(PlatformDepartment), new(PlatformUser), new(PlatformMembership), new(ExternalIdentity), new(SourceConnection), new(OrgSyncBatch)); err != nil {
		t.Fatalf("sync platform organization snapshot tables error = %v", err)
	}

	oldOrmer := ormer
	ormer = &Ormer{Engine: engine}
	t.Cleanup(func() {
		_ = engine.Close()
		ormer = oldOrmer
	})
}
