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
)

type memoryOrganizationManagementScopeStore struct {
	data map[string]*OrganizationManagementScopeData
}

func (s *memoryOrganizationManagementScopeStore) GetOrganizationManagementScopeData(organization string) (*OrganizationManagementScopeData, error) {
	if s.data == nil {
		return &OrganizationManagementScopeData{}, nil
	}
	data := s.data[organization]
	if data == nil {
		return &OrganizationManagementScopeData{}, nil
	}
	return data, nil
}

func TestOrganizationManagementScopeServiceReturnsFullScopeForAdmin(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: newScopeStoreWithData()}

	scope, err := service.GetCurrentScope(&User{Owner: "built-in", Name: "admin"}, "built-in", true)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeAdmin {
		t.Fatalf("scope type = %q, want admin", scope.ScopeType)
	}
	if got := scopeDepartmentIds(scope); !reflect.DeepEqual(got, []string{"1", "2", "3"}) {
		t.Fatalf("department ids = %#v, want [1 2 3]", got)
	}
	if got := scopeWecomUserIds(scope); !reflect.DeepEqual(got, []string{"lisi", "qianqi", "wangwu", "zhangsan", "zhaoliu"}) {
		t.Fatalf("user ids = %#v, want [lisi qianqi wangwu zhangsan zhaoliu]", got)
	}
}

func TestOrganizationManagementScopeServiceReturnsDepartmentManagerScopeForAnyLeader(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: newScopeStoreWithData()}

	scope, err := service.GetCurrentScope(&User{Owner: "built-in", Name: "local-zhao", Wecom: "zhaoliu"}, "built-in", false)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeDepartmentManager {
		t.Fatalf("scope type = %q, want department-manager", scope.ScopeType)
	}
	if got := scopeDepartmentIds(scope); !reflect.DeepEqual(got, []string{"2", "3"}) {
		t.Fatalf("department ids = %#v, want [2 3]", got)
	}
	if got := scopeWecomUserIds(scope); !reflect.DeepEqual(got, []string{"lisi", "wangwu", "zhangsan"}) {
		t.Fatalf("user ids = %#v, want [lisi wangwu zhangsan]", got)
	}
}

func TestOrganizationManagementScopeServiceReturnsRecursiveDirectLeaderScopeWithoutCycles(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: newScopeStoreWithData()}

	scope, err := service.GetCurrentScope(&User{Owner: "built-in", Name: "local-zhang", Wecom: "zhangsan"}, "built-in", false)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeDirectLeader {
		t.Fatalf("scope type = %q, want direct-leader", scope.ScopeType)
	}
	if got := scopeWecomUserIds(scope); !reflect.DeepEqual(got, []string{"lisi", "wangwu"}) {
		t.Fatalf("user ids = %#v, want [lisi wangwu]", got)
	}
}

func TestOrganizationManagementScopeServiceFallsBackToSelfScope(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: newScopeStoreWithData()}

	scope, err := service.GetCurrentScope(&User{Owner: "built-in", Name: "local-qian", Wecom: "qianqi"}, "built-in", false)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeSelf {
		t.Fatalf("scope type = %q, want self", scope.ScopeType)
	}
	if got := scopeWecomUserIds(scope); !reflect.DeepEqual(got, []string{"qianqi"}) {
		t.Fatalf("user ids = %#v, want [qianqi]", got)
	}
}

func TestOrganizationManagementScopeServiceUsesPlatformMasterDataWhenAvailable(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: &memoryOrganizationManagementScopeStore{data: map[string]*OrganizationManagementScopeData{
		"org-a": {
			PlatformDepartments: []PlatformDepartment{
				{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: PlatformLifecycleStatusActive},
				{OrganizationId: "org-a", DepartmentId: "org-a/platform", ParentDepartmentId: "org-a/dev", DisplayName: "Platform", LifecycleStatus: PlatformLifecycleStatusActive},
				{OrganizationId: "org-a", DepartmentId: "org-a/disabled", DisplayName: "Disabled", LifecycleStatus: PlatformLifecycleStatusDisabled},
			},
			PlatformUsers: []PlatformUser{
				{OrganizationId: "org-a", AdminSubject: "org-a/lead", UserOwner: "org-a", UserName: "lead", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
				{OrganizationId: "org-a", AdminSubject: "org-a/member", UserOwner: "org-a", UserName: "member", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
				{OrganizationId: "org-a", AdminSubject: "org-a/disabled", UserOwner: "org-a", UserName: "disabled", LifecycleStatus: PlatformLifecycleStatusDisabled, MappingStatus: PlatformMappingStatusConfirmed},
			},
			PlatformMemberships: []PlatformMembership{
				{OrganizationId: "org-a", AdminSubject: "org-a/lead", DepartmentId: "org-a/dev", IsManager: true, LifecycleStatus: PlatformLifecycleStatusActive},
				{OrganizationId: "org-a", AdminSubject: "org-a/member", DepartmentId: "org-a/platform", LifecycleStatus: PlatformLifecycleStatusActive},
				{OrganizationId: "org-a", AdminSubject: "org-a/disabled", DepartmentId: "org-a/disabled", LifecycleStatus: PlatformLifecycleStatusActive},
			},
		},
	}}}

	scope, err := service.GetCurrentScope(&User{Owner: "org-a", Name: "lead"}, "org-a", false)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeDepartmentManager {
		t.Fatalf("scope type = %q, want department-manager", scope.ScopeType)
	}
	if got := scopeDepartmentIds(scope); !reflect.DeepEqual(got, []string{"org-a/dev", "org-a/platform"}) {
		t.Fatalf("department ids = %#v, want platform department subtree", got)
	}
	if got := scopeUserIds(scope); !reflect.DeepEqual(got, []string{"org-a/lead", "org-a/member"}) {
		t.Fatalf("user ids = %#v, want active platform users only", got)
	}
}

func TestOrganizationManagementScopeServicePreservesDirectLeaderWhenPlatformDataAvailable(t *testing.T) {
	service := &OrganizationManagementScopeService{Store: &memoryOrganizationManagementScopeStore{data: map[string]*OrganizationManagementScopeData{
		"org-a": {
			PlatformDepartments: []PlatformDepartment{
				{OrganizationId: "org-a", DepartmentId: "org-a/dev", DisplayName: "Dev", LifecycleStatus: PlatformLifecycleStatusActive},
			},
			PlatformUsers: []PlatformUser{
				{OrganizationId: "org-a", AdminSubject: "org-a/lead", UserOwner: "org-a", UserName: "lead", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
				{OrganizationId: "org-a", AdminSubject: "org-a/member", UserOwner: "org-a", UserName: "member", LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed},
			},
			PlatformMemberships: []PlatformMembership{
				{OrganizationId: "org-a", AdminSubject: "org-a/member", DepartmentId: "org-a/dev", IsMain: true, LifecycleStatus: PlatformLifecycleStatusActive},
			},
			DirectLeaders: []WecomUserDirectLeader{
				{Organization: "org-a", WecomUserId: "legacy-member", LeaderWecomUserId: "legacy-lead", UserOwner: "org-a", UserName: "member", LeaderUserOwner: "org-a", LeaderUserName: "lead", IsEnabled: true},
			},
		},
	}}}

	scope, err := service.GetCurrentScope(&User{Owner: "org-a", Name: "lead"}, "org-a", false)
	if err != nil {
		t.Fatalf("GetCurrentScope() error = %v", err)
	}

	if scope.ScopeType != OrganizationManagementScopeTypeDirectLeader {
		t.Fatalf("scope type = %q, want direct-leader", scope.ScopeType)
	}
	if got := scopeUserIds(scope); !reflect.DeepEqual(got, []string{"org-a/member"}) {
		t.Fatalf("user ids = %#v, want direct subordinate from legacy direct-leader relation", got)
	}
	if len(scope.Users) != 1 || scope.Users[0].MainDepartmentId != "org-a/dev" {
		t.Fatalf("direct subordinate main department = %+v, want org-a/dev for organization-tree display", scope.Users)
	}
}

func TestConvertPlatformOrganizationDirectLeadersRequiresActivePlatformUsers(t *testing.T) {
	activeUsers := map[string]PlatformUser{
		"org-a/lead":   {OrganizationId: "org-a", AdminSubject: "org-a/lead", UserOwner: "org-a", UserName: "lead"},
		"org-a/member": {OrganizationId: "org-a", AdminSubject: "org-a/member", UserOwner: "org-a", UserName: "member"},
	}

	got := convertPlatformOrganizationDirectLeaders("org-a", []WecomUserDirectLeader{
		{Organization: "org-a", WecomUserId: "org-a/member", LeaderWecomUserId: "org-a/lead", IsEnabled: true},
		{Organization: "org-a", WecomUserId: "org-a/member", LeaderWecomUserId: "org-a/lead", IsEnabled: false},
		{Organization: "org-b", WecomUserId: "org-a/member", LeaderWecomUserId: "org-a/lead", IsEnabled: true},
		{Organization: "org-a", WecomUserId: "missing-member", LeaderWecomUserId: "org-a/lead", IsEnabled: true},
		{Organization: "org-a", WecomUserId: "org-a/member", LeaderWecomUserId: "missing-lead", IsEnabled: true},
	}, activeUsers)

	if len(got) != 1 {
		t.Fatalf("converted direct leaders = %+v, want only one trusted relation", got)
	}
	if got[0].WecomUserId != "org-a/member" || got[0].LeaderWecomUserId != "org-a/lead" || !got[0].IsEnabled {
		t.Fatalf("converted relation = %+v, want normalized active platform subjects", got[0])
	}
}

func newScopeStoreWithData() *memoryOrganizationManagementScopeStore {
	return &memoryOrganizationManagementScopeStore{
		data: map[string]*OrganizationManagementScopeData{
			"built-in": {
				Departments: []WecomDepartmentMapping{
					{Organization: "built-in", DepartmentId: "1", GroupOwner: "built-in", GroupName: "wecom-dept-1", DisplayName: "总公司", IsEnabled: true},
					{Organization: "built-in", DepartmentId: "2", ParentDepartmentId: "1", GroupOwner: "built-in", GroupName: "wecom-dept-2", DisplayName: "研发中心", IsEnabled: true},
					{Organization: "built-in", DepartmentId: "3", ParentDepartmentId: "2", GroupOwner: "built-in", GroupName: "wecom-dept-3", DisplayName: "平台组", IsEnabled: true},
					{Organization: "built-in", DepartmentId: "4", ParentDepartmentId: "1", GroupOwner: "built-in", GroupName: "wecom-dept-4", DisplayName: "已禁用部门", IsEnabled: false},
				},
				Users: []WecomUserMapping{
					{Organization: "built-in", WecomUserId: "zhangsan", UserOwner: "built-in", UserName: "local-zhang", ExternalId: "wecom:ww123:zhangsan", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "lisi", UserOwner: "built-in", UserName: "local-lisi", ExternalId: "wecom:ww123:lisi", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "wangwu", UserOwner: "built-in", UserName: "local-wang", ExternalId: "wecom:ww123:wangwu", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "zhaoliu", UserOwner: "built-in", UserName: "local-zhao", ExternalId: "wecom:ww123:zhaoliu", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "qianqi", UserOwner: "built-in", UserName: "local-qian", ExternalId: "wecom:ww123:qianqi", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "disabled", UserOwner: "built-in", UserName: "disabled", ExternalId: "wecom:ww123:disabled", IsEnabled: false},
				},
				UserDepartments: []WecomUserDepartment{
					{Organization: "built-in", WecomUserId: "zhangsan", DepartmentId: "2", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "lisi", DepartmentId: "2", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "wangwu", DepartmentId: "3", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "disabled", DepartmentId: "4", IsEnabled: true},
				},
				DepartmentLeaders: []WecomDepartmentLeader{
					{Organization: "built-in", DepartmentId: "2", LeaderWecomUserId: "lisi", IsEnabled: true},
					{Organization: "built-in", DepartmentId: "2", LeaderWecomUserId: "zhaoliu", IsEnabled: true},
				},
				DirectLeaders: []WecomUserDirectLeader{
					{Organization: "built-in", WecomUserId: "lisi", LeaderWecomUserId: "zhangsan", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "wangwu", LeaderWecomUserId: "lisi", IsEnabled: true},
					{Organization: "built-in", WecomUserId: "zhangsan", LeaderWecomUserId: "wangwu", IsEnabled: true},
				},
			},
		},
	}
}

func scopeDepartmentIds(scope *OrganizationManagementScope) []string {
	ids := make([]string, 0, len(scope.Departments))
	for _, department := range scope.Departments {
		ids = append(ids, department.DepartmentId)
	}
	return ids
}

func scopeWecomUserIds(scope *OrganizationManagementScope) []string {
	ids := make([]string, 0, len(scope.Users))
	for _, user := range scope.Users {
		ids = append(ids, user.WecomUserId)
	}
	return ids
}

func scopeUserIds(scope *OrganizationManagementScope) []string {
	ids := make([]string, 0, len(scope.Users))
	for _, user := range scope.Users {
		ids = append(ids, user.UserId)
	}
	return ids
}
