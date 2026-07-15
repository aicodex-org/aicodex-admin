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
	"reflect"
	"testing"

	"github.com/xorm-io/xorm"
)

func TestAICodexOwnedSchemaRegistryCreatesAllSQLiteTables(t *testing.T) {
	models := aicodexOwnedSchemaModels()
	wantTypes := []reflect.Type{
		reflect.TypeOf(&OrganizationSyncApiKey{}),
		reflect.TypeOf(&PlatformOrganization{}),
		reflect.TypeOf(&PlatformUser{}),
		reflect.TypeOf(&PlatformDepartment{}),
		reflect.TypeOf(&PlatformMembership{}),
		reflect.TypeOf(&SourceConnection{}),
		reflect.TypeOf(&ExternalIdentity{}),
		reflect.TypeOf(&LifecycleEvent{}),
		reflect.TypeOf(&OrgSyncBatch{}),
		reflect.TypeOf(&PlatformApiOrganizationMapping{}),
		reflect.TypeOf(&PlatformApiUserMapping{}),
		reflect.TypeOf(&GatewayProjectionPublishAttempt{}),
		reflect.TypeOf(&GatewayProjectionCleanupApprovalAuditRecord{}),
		reflect.TypeOf(&ServiceCredentialGovernanceConfig{}),
		reflect.TypeOf(&AdminSecureHandoffGrant{}),
		reflect.TypeOf(&WecomOrganizationSyncConfig{}),
		reflect.TypeOf(&WecomOrganizationSyncRun{}),
		reflect.TypeOf(&WecomOrganizationSyncDryRunHistory{}),
		reflect.TypeOf(&FeishuOrganizationSyncConfig{}),
		reflect.TypeOf(&DingTalkOrganizationSyncConfig{}),
		reflect.TypeOf(&DingTalkOrganizationSyncRun{}),
		reflect.TypeOf(&FeishuOrganizationSyncRun{}),
		reflect.TypeOf(&FeishuOrganizationSyncDryRunHistory{}),
		reflect.TypeOf(&OrganizationSyncSchedule{}),
		reflect.TypeOf(&OrganizationSyncScheduleFire{}),
		reflect.TypeOf(&WecomProfileConsentIntent{}),
		reflect.TypeOf(&WecomDepartmentMapping{}),
		reflect.TypeOf(&WecomUserMapping{}),
		reflect.TypeOf(&WecomUserDepartment{}),
		reflect.TypeOf(&WecomDepartmentLeader{}),
		reflect.TypeOf(&WecomUserDirectLeader{}),
		reflect.TypeOf(&FeishuDepartmentMapping{}),
		reflect.TypeOf(&FeishuUserMapping{}),
		reflect.TypeOf(&FeishuUserDepartment{}),
		reflect.TypeOf(&DingTalkDepartmentMapping{}),
		reflect.TypeOf(&DingTalkUserMapping{}),
		reflect.TypeOf(&DingTalkUserDepartment{}),
		reflect.TypeOf(&DingTalkDepartmentLeader{}),
		reflect.TypeOf(&DingTalkUserDirectLeader{}),
	}
	if len(models) != len(wantTypes) {
		t.Fatalf("registry model count = %d, want %d", len(models), len(wantTypes))
	}
	for i, model := range models {
		if gotType := reflect.TypeOf(model); gotType != wantTypes[i] {
			t.Fatalf("registry model %d type = %v, want %v", i, gotType, wantTypes[i])
		}
	}

	engine, err := xorm.NewEngine("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("new SQLite engine: %v", err)
	}
	engine.DB().SetMaxOpenConns(1)
	t.Cleanup(func() { _ = engine.Close() })

	if err := syncAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("first registry sync: %v", err)
	}
	for _, model := range models {
		exists, err := engine.IsTableExist(model)
		if err != nil {
			t.Fatalf("check table for %T: %v", model, err)
		}
		if !exists {
			t.Fatalf("table for %T was not created", model)
		}
	}
	if err := syncAICodexOwnedSchema(engine); err != nil {
		t.Fatalf("repeated registry sync: %v", err)
	}
}

func TestAICodexOwnedSchemaRegistryReturnsFreshModels(t *testing.T) {
	first := aicodexOwnedSchemaModels()
	second := aicodexOwnedSchemaModels()
	if len(first) == 0 || len(first) != len(second) {
		t.Fatalf("registry lengths = %d/%d", len(first), len(second))
	}
	for i := range first {
		if reflect.ValueOf(first[i]).Pointer() == reflect.ValueOf(second[i]).Pointer() {
			t.Fatalf("registry model %d reused pointer %T", i, first[i])
		}
	}
}
