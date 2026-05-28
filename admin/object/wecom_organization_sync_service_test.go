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
	"context"
	"errors"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"
)

type memoryWecomOrganizationSyncRunStore struct {
	runningRun *WecomOrganizationSyncRun
	createdRun *WecomOrganizationSyncRun
	updatedRun *WecomOrganizationSyncRun
	runs       []*WecomOrganizationSyncRun
}

type memoryWecomOrganizationSyncConfigLastSyncStore struct {
	configName string
	runId      string
	syncedAt   time.Time
	err        error
}

type fakeWecomOrganizationSnapshotClient struct {
	token               *WecomAccessToken
	departments         []WecomDepartmentSnapshot
	users               []WecomUserSnapshot
	departmentTokenSeen string
	userTokenSeen       string
}

type memoryWecomOrganizationObjectStore struct {
	groups              map[string]*Group
	departmentMappings  map[string]*WecomDepartmentMapping
	users               map[string]*User
	userMappings        map[string]*WecomUserMapping
	userDepartments     map[string]*WecomUserDepartment
	departmentLeaders   map[string]*WecomDepartmentLeader
	directLeaders       map[string]*WecomUserDirectLeader
	savedGroupNames     []string
	savedUserNames      []string
	savedUserMappingIds []string
	saveGroupErrors     map[string]error
}

func newMemoryWecomOrganizationObjectStore() *memoryWecomOrganizationObjectStore {
	return &memoryWecomOrganizationObjectStore{
		groups:             map[string]*Group{},
		departmentMappings: map[string]*WecomDepartmentMapping{},
		users:              map[string]*User{},
		userMappings:       map[string]*WecomUserMapping{},
		userDepartments:    map[string]*WecomUserDepartment{},
		departmentLeaders:  map[string]*WecomDepartmentLeader{},
		directLeaders:      map[string]*WecomUserDirectLeader{},
		saveGroupErrors:    map[string]error{},
	}
}

func (s *memoryWecomOrganizationObjectStore) GetGroup(owner string, name string) (*Group, error) {
	group := s.groups[owner+"/"+name]
	if group == nil {
		return nil, nil
	}
	copied := *group
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveGroup(group *Group) error {
	if err := s.saveGroupErrors[group.Name]; err != nil {
		return err
	}
	copied := *group
	s.groups[group.Owner+"/"+group.Name] = &copied
	s.savedGroupNames = append(s.savedGroupNames, group.Name)
	return nil
}

func (s *memoryWecomOrganizationObjectStore) GetWecomDepartmentMapping(organization string, corpId string, departmentId string) (*WecomDepartmentMapping, error) {
	mapping := s.departmentMappings[organization+"|"+corpId+"|"+departmentId]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveWecomDepartmentMapping(mapping *WecomDepartmentMapping) error {
	copied := *mapping
	s.departmentMappings[mapping.Organization+"|"+mapping.CorpId+"|"+mapping.DepartmentId] = &copied
	return nil
}

func (s *memoryWecomOrganizationObjectStore) FindUserByWecomIdentity(organization string, corpId string, wecomUserId string, fullExternalId string) (*User, error) {
	lengthSafeExternalId := GetLengthSafeWecomUserExternalId(corpId, wecomUserId)
	for _, user := range s.users {
		if user.Owner != organization {
			continue
		}
		if user.Wecom == wecomUserId || user.ExternalId == fullExternalId || user.ExternalId == lengthSafeExternalId || user.Properties["wecomUserId"] == wecomUserId {
			copied := *user
			copied.Properties = copyStringMap(user.Properties)
			return &copied, nil
		}
	}
	return nil, nil
}

func (s *memoryWecomOrganizationObjectStore) FindPossibleDuplicateUsers(organization string, corpId string, wecomUserId string, fullExternalId string, displayName string, phone string, email string) ([]string, error) {
	lengthSafeExternalId := GetLengthSafeWecomUserExternalId(corpId, wecomUserId)
	ids := []string{}
	for _, user := range s.users {
		if user.Owner != organization || isPossibleDuplicateSelf(user, wecomUserId, fullExternalId, lengthSafeExternalId) {
			continue
		}
		if displayName != "" && user.DisplayName == displayName || phone != "" && user.Phone == phone || email != "" && user.Email == email {
			ids = append(ids, user.GetId())
		}
	}
	sort.Strings(ids)
	return ids, nil
}

func (s *memoryWecomOrganizationObjectStore) GetUser(owner string, name string) (*User, error) {
	user := s.users[owner+"/"+name]
	if user == nil {
		return nil, nil
	}
	copied := *user
	copied.Properties = copyStringMap(user.Properties)
	copied.Groups = copyStringSlice(user.Groups)
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveUser(user *User) error {
	copied := *user
	copied.Properties = copyStringMap(user.Properties)
	copied.Groups = copyStringSlice(user.Groups)
	s.users[user.Owner+"/"+user.Name] = &copied
	s.savedUserNames = append(s.savedUserNames, user.Name)
	return nil
}

func (s *memoryWecomOrganizationObjectStore) SaveUserGroups(user *User) error {
	return s.SaveUser(user)
}

func (s *memoryWecomOrganizationObjectStore) GetWecomUserMapping(organization string, corpId string, wecomUserId string) (*WecomUserMapping, error) {
	mapping := s.userMappings[organization+"|"+corpId+"|"+wecomUserId]
	if mapping == nil {
		return nil, nil
	}
	copied := *mapping
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveWecomUserMapping(mapping *WecomUserMapping) error {
	copied := *mapping
	s.userMappings[mapping.Organization+"|"+mapping.CorpId+"|"+mapping.WecomUserId] = &copied
	s.savedUserMappingIds = append(s.savedUserMappingIds, mapping.UserOwner+"/"+mapping.UserName)
	return nil
}

func (s *memoryWecomOrganizationObjectStore) GetWecomUserDepartment(organization string, corpId string, wecomUserId string, departmentId string) (*WecomUserDepartment, error) {
	membership := s.userDepartments[organization+"|"+corpId+"|"+wecomUserId+"|"+departmentId]
	if membership == nil {
		return nil, nil
	}
	copied := *membership
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveWecomUserDepartment(membership *WecomUserDepartment) error {
	copied := *membership
	s.userDepartments[membership.Organization+"|"+membership.CorpId+"|"+membership.WecomUserId+"|"+membership.DepartmentId] = &copied
	return nil
}

func (s *memoryWecomOrganizationObjectStore) GetWecomDepartmentLeader(organization string, corpId string, departmentId string, leaderWecomUserId string) (*WecomDepartmentLeader, error) {
	leader := s.departmentLeaders[organization+"|"+corpId+"|"+departmentId+"|"+leaderWecomUserId]
	if leader == nil {
		return nil, nil
	}
	copied := *leader
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveWecomDepartmentLeader(leader *WecomDepartmentLeader) error {
	copied := *leader
	s.departmentLeaders[leader.Organization+"|"+leader.CorpId+"|"+leader.DepartmentId+"|"+leader.LeaderWecomUserId] = &copied
	return nil
}

func (s *memoryWecomOrganizationObjectStore) GetWecomUserDirectLeader(organization string, corpId string, wecomUserId string, leaderWecomUserId string) (*WecomUserDirectLeader, error) {
	leader := s.directLeaders[organization+"|"+corpId+"|"+wecomUserId+"|"+leaderWecomUserId]
	if leader == nil {
		return nil, nil
	}
	copied := *leader
	return &copied, nil
}

func (s *memoryWecomOrganizationObjectStore) SaveWecomUserDirectLeader(leader *WecomUserDirectLeader) error {
	copied := *leader
	s.directLeaders[leader.Organization+"|"+leader.CorpId+"|"+leader.WecomUserId+"|"+leader.LeaderWecomUserId] = &copied
	return nil
}

func (s *memoryWecomOrganizationObjectStore) GetWecomOrganizationSyncExistingState(organization string, corpId string) (*WecomOrganizationSyncExistingState, error) {
	state := &WecomOrganizationSyncExistingState{}
	for _, department := range s.departmentMappings {
		if department.Organization == organization && department.CorpId == corpId {
			state.Departments = append(state.Departments, *department)
		}
	}
	for _, user := range s.userMappings {
		if user.Organization == organization && user.CorpId == corpId {
			state.Users = append(state.Users, *user)
		}
	}
	for _, membership := range s.userDepartments {
		if membership.Organization == organization && membership.CorpId == corpId {
			state.UserDepartments = append(state.UserDepartments, *membership)
		}
	}
	for _, leader := range s.departmentLeaders {
		if leader.Organization == organization && leader.CorpId == corpId {
			state.DepartmentLeaders = append(state.DepartmentLeaders, *leader)
		}
	}
	for _, leader := range s.directLeaders {
		if leader.Organization == organization && leader.CorpId == corpId {
			state.DirectLeaders = append(state.DirectLeaders, *leader)
		}
	}
	return state, nil
}

func (c *fakeWecomOrganizationSnapshotClient) GetAccessToken(ctx context.Context) (*WecomAccessToken, error) {
	return c.token, nil
}

func (c *fakeWecomOrganizationSnapshotClient) FetchDepartmentSnapshots(ctx context.Context, accessToken string, departmentId string) ([]WecomDepartmentSnapshot, error) {
	c.departmentTokenSeen = accessToken
	return c.departments, nil
}

func (c *fakeWecomOrganizationSnapshotClient) FetchUserSnapshots(ctx context.Context, accessToken string) ([]WecomUserSnapshot, error) {
	c.userTokenSeen = accessToken
	return c.users, nil
}

func (s *memoryWecomOrganizationSyncRunStore) GetRunningWecomOrganizationSyncRun(organization string) (*WecomOrganizationSyncRun, error) {
	if s.runningRun == nil || s.runningRun.Organization != organization || s.runningRun.Status != WecomOrganizationSyncRunStatusRunning {
		return nil, nil
	}
	return s.runningRun, nil
}

func (s *memoryWecomOrganizationSyncRunStore) CreateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error {
	copied := *run
	s.createdRun = &copied
	return nil
}

func (s *memoryWecomOrganizationSyncRunStore) UpdateWecomOrganizationSyncRun(run *WecomOrganizationSyncRun) error {
	copied := *run
	s.updatedRun = &copied
	return nil
}

func (s *memoryWecomOrganizationSyncConfigLastSyncStore) UpdateWecomOrganizationSyncConfigLastSync(config *WecomOrganizationSyncConfig, run *WecomOrganizationSyncRun, syncedAt time.Time) error {
	s.configName = config.Name
	s.runId = run.Name
	s.syncedAt = syncedAt
	return s.err
}

func copyStringMap(values map[string]string) map[string]string {
	if values == nil {
		return nil
	}
	copied := map[string]string{}
	for key, value := range values {
		copied[key] = value
	}
	return copied
}

func copyStringSlice(values []string) []string {
	if values == nil {
		return nil
	}
	copied := make([]string, len(values))
	copy(copied, values)
	return copied
}

func TestWecomOrganizationSyncServiceStartRunRejectsActiveRunningRun(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{
		runningRun: &WecomOrganizationSyncRun{
			Owner:          "engineering",
			Name:           "run-active",
			Organization:   "engineering",
			Status:         WecomOrganizationSyncRunStatusRunning,
			LeaseExpiresAt: now.Add(5 * time.Minute),
		},
	}
	service := &WecomOrganizationSyncService{
		Store: store,
		Now:   func() time.Time { return now },
	}

	_, err := service.StartManualRun(&WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              "config",
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
	}, "admin")

	if !errors.Is(err, ErrWecomOrganizationSyncRunAlreadyRunning) {
		t.Fatalf("error = %v, want ErrWecomOrganizationSyncRunAlreadyRunning", err)
	}
	if store.createdRun != nil {
		t.Fatalf("active running run should prevent creating a new run: %#v", store.createdRun)
	}
}

func TestWecomOrganizationSyncServiceStartRunRecoversStaleRunningRun(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{
		runningRun: &WecomOrganizationSyncRun{
			Owner:          "engineering",
			Name:           "run-stale",
			Organization:   "engineering",
			Status:         WecomOrganizationSyncRunStatusRunning,
			LeaseExpiresAt: now.Add(-time.Minute),
		},
	}
	service := &WecomOrganizationSyncService{
		Store:         store,
		Now:           func() time.Time { return now },
		LeaseDuration: 10 * time.Minute,
	}

	run, err := service.StartManualRun(&WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              "config",
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
	}, "admin")
	if err != nil {
		t.Fatalf("StartManualRun() error = %v", err)
	}

	if store.updatedRun == nil {
		t.Fatalf("stale running run should be marked failed")
	}
	if store.updatedRun.Status != WecomOrganizationSyncRunStatusFailed || store.updatedRun.ErrorCode != WecomOrganizationSyncErrorCodeStaleRunning {
		t.Fatalf("unexpected stale run update: %#v", store.updatedRun)
	}
	if store.updatedRun.FinishedAt != now {
		t.Fatalf("stale run finished_at = %s, want %s", store.updatedRun.FinishedAt, now)
	}
	if store.createdRun == nil {
		t.Fatalf("new run should be created after stale recovery")
	}
	if run.Status != WecomOrganizationSyncRunStatusRunning || run.Stage != WecomOrganizationSyncRunStageFetching {
		t.Fatalf("new run should start in running/fetching state: %#v", run)
	}
	if run.LeaseExpiresAt != now.Add(10*time.Minute) {
		t.Fatalf("lease expires at = %s, want %s", run.LeaseExpiresAt, now.Add(10*time.Minute))
	}
}

func TestWecomOrganizationSyncServiceUpdateRunStageRefreshesHeartbeatAndLease(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{}
	service := &WecomOrganizationSyncService{
		Store:         store,
		Now:           func() time.Time { return now },
		LeaseDuration: 10 * time.Minute,
	}
	run := &WecomOrganizationSyncRun{
		Owner:        "built-in",
		Name:         "run-stage",
		Organization: "built-in",
		Status:       WecomOrganizationSyncRunStatusRunning,
		Stage:        WecomOrganizationSyncRunStageFetching,
	}

	if err := service.UpdateRunStage(run, WecomOrganizationSyncRunStageApplying); err != nil {
		t.Fatalf("UpdateRunStage() error = %v", err)
	}

	if store.updatedRun == nil {
		t.Fatalf("expected run update")
	}
	if store.updatedRun.Status != WecomOrganizationSyncRunStatusRunning || store.updatedRun.Stage != WecomOrganizationSyncRunStageApplying {
		t.Fatalf("unexpected run status/stage: %#v", store.updatedRun)
	}
	if store.updatedRun.HeartbeatAt != now || store.updatedRun.LeaseExpiresAt != now.Add(10*time.Minute) {
		t.Fatalf("unexpected heartbeat/lease: %#v", store.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceFinishRunSucceeded(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{}
	service := &WecomOrganizationSyncService{
		Store: store,
		Now:   func() time.Time { return now },
	}
	run := &WecomOrganizationSyncRun{
		Owner:     "built-in",
		Name:      "run-success",
		Status:    WecomOrganizationSyncRunStatusRunning,
		Stage:     WecomOrganizationSyncRunStageApplying,
		ErrorCode: "old",
		ErrorText: "old error",
	}

	if err := service.FinishRunSucceeded(run); err != nil {
		t.Fatalf("FinishRunSucceeded() error = %v", err)
	}

	if store.updatedRun == nil {
		t.Fatalf("expected run update")
	}
	if store.updatedRun.Status != WecomOrganizationSyncRunStatusSucceeded || store.updatedRun.Stage != WecomOrganizationSyncRunStageFinalizing {
		t.Fatalf("unexpected success status/stage: %#v", store.updatedRun)
	}
	if store.updatedRun.FinishedAt != now || store.updatedRun.ErrorCode != "" || store.updatedRun.ErrorText != "" {
		t.Fatalf("unexpected success finish metadata: %#v", store.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceFinishRunFailedAndPartial(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{}
	service := &WecomOrganizationSyncService{
		Store: store,
		Now:   func() time.Time { return now },
	}
	failedRun := &WecomOrganizationSyncRun{
		Owner:  "built-in",
		Name:   "run-failed",
		Status: WecomOrganizationSyncRunStatusRunning,
		Stage:  WecomOrganizationSyncRunStageFetching,
	}

	if err := service.FinishRunFailed(failedRun, WecomOrganizationSyncRunStageFetching, "wecom_api_error", "token request failed"); err != nil {
		t.Fatalf("FinishRunFailed() error = %v", err)
	}

	if store.updatedRun.Status != WecomOrganizationSyncRunStatusFailed || store.updatedRun.Stage != WecomOrganizationSyncRunStageFetching {
		t.Fatalf("unexpected failed status/stage: %#v", store.updatedRun)
	}
	if store.updatedRun.FinishedAt != now || store.updatedRun.ErrorCode != "wecom_api_error" || store.updatedRun.ErrorText != "token request failed" {
		t.Fatalf("unexpected failed finish metadata: %#v", store.updatedRun)
	}

	partialRun := &WecomOrganizationSyncRun{
		Owner:  "built-in",
		Name:   "run-partial",
		Status: WecomOrganizationSyncRunStatusRunning,
		Stage:  WecomOrganizationSyncRunStageApplying,
	}
	if err := service.FinishRunPartial(partialRun, "object_errors", "2 users failed"); err != nil {
		t.Fatalf("FinishRunPartial() error = %v", err)
	}

	if store.updatedRun.Status != WecomOrganizationSyncRunStatusPartial || store.updatedRun.Stage != WecomOrganizationSyncRunStageFinalizing {
		t.Fatalf("unexpected partial status/stage: %#v", store.updatedRun)
	}
	if store.updatedRun.FinishedAt != now || store.updatedRun.ErrorCode != "object_errors" || store.updatedRun.ErrorText != "2 users failed" {
		t.Fatalf("unexpected partial finish metadata: %#v", store.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceFinalizeRunOnlySoftDisablesOnSuccess(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	runStore := &memoryWecomOrganizationSyncRunStore{}
	store.groups["built-in/wecom-dept-2"] = &Group{Owner: "built-in", Name: "wecom-dept-2", IsEnabled: true}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-16",
		DepartmentDisables: []WecomDepartmentMapping{
			{Organization: "built-in", CorpId: "ww123", DepartmentId: "2", GroupOwner: "built-in", GroupName: "wecom-dept-2"},
		},
	}

	failedRun := &WecomOrganizationSyncRun{Owner: "built-in", Name: "run-failed", Status: WecomOrganizationSyncRunStatusRunning, Stage: WecomOrganizationSyncRunStageApplying}
	if err := service.FinalizeRun(failedRun, plan, WecomOrganizationSyncRunStatusFailed, "fetch_failed", "fetch failed"); err != nil {
		t.Fatalf("FinalizeRun(failed) error = %v", err)
	}
	if !store.groups["built-in/wecom-dept-2"].IsEnabled || !store.departmentMappings["built-in|ww123|2"].IsEnabled {
		t.Fatalf("failed run must not soft-disable missing data")
	}
	if runStore.updatedRun.Status != WecomOrganizationSyncRunStatusFailed {
		t.Fatalf("failed run status not recorded: %#v", runStore.updatedRun)
	}

	partialRun := &WecomOrganizationSyncRun{Owner: "built-in", Name: "run-partial", Status: WecomOrganizationSyncRunStatusRunning, Stage: WecomOrganizationSyncRunStageApplying}
	if err := service.FinalizeRun(partialRun, plan, WecomOrganizationSyncRunStatusPartial, "object_errors", "object failed"); err != nil {
		t.Fatalf("FinalizeRun(partial) error = %v", err)
	}
	if !store.groups["built-in/wecom-dept-2"].IsEnabled || !store.departmentMappings["built-in|ww123|2"].IsEnabled {
		t.Fatalf("partial run must not soft-disable missing data")
	}
	if runStore.updatedRun.Status != WecomOrganizationSyncRunStatusPartial {
		t.Fatalf("partial run status not recorded: %#v", runStore.updatedRun)
	}

	successRun := &WecomOrganizationSyncRun{Owner: "built-in", Name: "run-success", Status: WecomOrganizationSyncRunStatusRunning, Stage: WecomOrganizationSyncRunStageFinalizing}
	if err := service.FinalizeRun(successRun, plan, WecomOrganizationSyncRunStatusSucceeded, "", ""); err != nil {
		t.Fatalf("FinalizeRun(succeeded) error = %v", err)
	}
	if store.groups["built-in/wecom-dept-2"].IsEnabled || store.departmentMappings["built-in|ww123|2"].IsEnabled {
		t.Fatalf("successful run should soft-disable missing data")
	}
	if runStore.updatedRun.Status != WecomOrganizationSyncRunStatusSucceeded {
		t.Fatalf("success run status not recorded: %#v", runStore.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceFinalizeRunRespectsSoftDisableFlag(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	runStore := &memoryWecomOrganizationSyncRunStore{}
	store.groups["built-in/wecom-dept-2"] = &Group{Owner: "built-in", Name: "wecom-dept-2", IsEnabled: true}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-soft-disabled",
		DepartmentDisables: []WecomDepartmentMapping{
			{Organization: "built-in", CorpId: "ww123", DepartmentId: "2", GroupOwner: "built-in", GroupName: "wecom-dept-2"},
		},
	}

	run := &WecomOrganizationSyncRun{Owner: "built-in", Name: "run-soft-disabled", Status: WecomOrganizationSyncRunStatusRunning, Stage: WecomOrganizationSyncRunStageFinalizing}
	if err := service.FinalizeRunWithOptions(run, plan, WecomOrganizationSyncRunStatusSucceeded, "", "", false); err != nil {
		t.Fatalf("FinalizeRunWithOptions() error = %v", err)
	}

	if !store.groups["built-in/wecom-dept-2"].IsEnabled || !store.departmentMappings["built-in|ww123|2"].IsEnabled {
		t.Fatalf("soft disable flag disabled should preserve missing data")
	}
	if runStore.updatedRun.Status != WecomOrganizationSyncRunStatusSucceeded {
		t.Fatalf("success run status not recorded: %#v", runStore.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceUpdateRunStatsPersistsCountsAndSafeErrorSummary(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := &memoryWecomOrganizationSyncRunStore{}
	service := &WecomOrganizationSyncService{
		Store: store,
		Now:   func() time.Time { return now },
	}
	run := &WecomOrganizationSyncRun{
		Owner:  "built-in",
		Name:   "run-stats",
		Status: WecomOrganizationSyncRunStatusPartial,
	}
	stats := WecomOrganizationSyncRunStats{
		DepartmentFetchedCount:   10,
		DepartmentCreatedCount:   2,
		DepartmentUpdatedCount:   3,
		DepartmentDisabledCount:  1,
		UserFetchedCount:         20,
		UserCreatedCount:         4,
		UserUpdatedCount:         5,
		UserDisabledCount:        2,
		MembershipUpdatedCount:   7,
		ManagerUpdatedCount:      8,
		DirectLeaderUpdatedCount: 9,
		ErrorCode:                "object_errors",
		ErrorText:                "2 users failed",
	}

	if err := service.UpdateRunStats(run, stats); err != nil {
		t.Fatalf("UpdateRunStats() error = %v", err)
	}

	if store.updatedRun == nil {
		t.Fatalf("expected run update")
	}
	if store.updatedRun.DepartmentFetchedCount != 10 ||
		store.updatedRun.DepartmentCreatedCount != 2 ||
		store.updatedRun.DepartmentUpdatedCount != 3 ||
		store.updatedRun.DepartmentDisabledCount != 1 ||
		store.updatedRun.UserFetchedCount != 20 ||
		store.updatedRun.UserCreatedCount != 4 ||
		store.updatedRun.UserUpdatedCount != 5 ||
		store.updatedRun.UserDisabledCount != 2 ||
		store.updatedRun.MembershipUpdatedCount != 7 ||
		store.updatedRun.ManagerUpdatedCount != 8 ||
		store.updatedRun.DirectLeaderUpdatedCount != 9 {
		t.Fatalf("unexpected run stats: %#v", store.updatedRun)
	}
	if store.updatedRun.ErrorCode != "object_errors" || store.updatedRun.ErrorText != "2 users failed" {
		t.Fatalf("unexpected safe error summary: %#v", store.updatedRun)
	}
	if store.updatedRun.UpdatedAt != now {
		t.Fatalf("updated_at = %s, want %s", store.updatedRun.UpdatedAt, now)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunAppliesSnapshotAndFinishesSucceeded(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	objectStore := newMemoryWecomOrganizationObjectStore()
	client := &fakeWecomOrganizationSnapshotClient{
		token: &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{
			{Id: "1", ParentId: "0", Name: "总公司", DepartmentLeader: []string{"zhangsan"}, HasDepartmentLeaderField: true},
			{Id: "2", ParentId: "1", Name: "研发中心", HasDepartmentLeaderField: true},
		},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Name:                         "张三",
				Departments:                  []string{"1", "2"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{true, false},
				HasIsLeaderInDepartmentField: true,
				HasDirectLeaderField:         true,
				Status:                       1,
			},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ConfigStore: &memoryWecomOrganizationSyncConfigLastSyncStore{},
		ObjectStore: objectStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			if corpId != "ww123" || addressBookSecret != "secret" {
				t.Fatalf("snapshot client args = %q/%q, want ww123/secret", corpId, addressBookSecret)
			}
			return client
		},
	}
	run := &WecomOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-execute",
		Organization: "engineering",
		CorpId:       "ww123",
		Status:       WecomOrganizationSyncRunStatusRunning,
		Stage:        WecomOrganizationSyncRunStageFetching,
	}
	config := &WecomOrganizationSyncConfig{
		Owner:                  "engineering",
		Name:                   "config",
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "secret",
		SoftDisableMissingData: true,
	}

	if err := service.ExecuteManualRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteManualRun() error = %v", err)
	}

	if runStore.updatedRun == nil || runStore.updatedRun.Status != WecomOrganizationSyncRunStatusSucceeded {
		t.Fatalf("run should finish succeeded: %#v", runStore.updatedRun)
	}
	if _, ok := objectStore.departmentMappings["engineering|ww123|1"]; !ok {
		t.Fatalf("root department mapping should be created")
	}
	if _, ok := objectStore.userMappings["engineering|ww123|zhangsan"]; !ok {
		t.Fatalf("user mapping should be created")
	}
	if _, ok := objectStore.userDepartments["engineering|ww123|zhangsan|1"]; !ok {
		t.Fatalf("user department relationship should be created")
	}
	if len(objectStore.departmentLeaders) != 1 {
		t.Fatalf("department leader relationship should be created: %#v", objectStore.departmentLeaders)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunSeparatesCreatedAndUpdatedStats(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	objectStore := newMemoryWecomOrganizationObjectStore()
	objectStore.groups["engineering/wecom-dept-1"] = &Group{Owner: "engineering", Name: "wecom-dept-1", IsEnabled: true}
	objectStore.departmentMappings["engineering|ww123|1"] = &WecomDepartmentMapping{
		Owner:        "engineering",
		Name:         "mapping-1",
		Organization: "engineering",
		CorpId:       "ww123",
		DepartmentId: "1",
		GroupOwner:   "engineering",
		GroupName:    "wecom-dept-1",
		IsEnabled:    true,
	}
	objectStore.users["engineering/wecom-user-zhangsan"] = &User{
		Owner:      "engineering",
		Name:       "wecom-user-zhangsan",
		Id:         "local-zhangsan",
		Properties: map[string]string{},
	}
	objectStore.userMappings["engineering|ww123|zhangsan"] = &WecomUserMapping{
		Owner:        "engineering",
		Name:         "mapping-user-zhangsan",
		Organization: "engineering",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "engineering",
		UserName:     "wecom-user-zhangsan",
		IsEnabled:    true,
	}
	client := &fakeWecomOrganizationSnapshotClient{
		token: &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{
			{Id: "1", ParentId: "0", Name: "总公司", HasDepartmentLeaderField: true},
			{Id: "2", ParentId: "1", Name: "研发中心", HasDepartmentLeaderField: true},
		},
		users: []WecomUserSnapshot{
			{UserId: "zhangsan", Name: "张三", Departments: []string{"1"}, MainDepartmentId: "1", IsLeaderInDepartment: []bool{false}, HasIsLeaderInDepartmentField: true, HasDirectLeaderField: true, Status: 1},
			{UserId: "lisi", Name: "李四", Departments: []string{"2"}, MainDepartmentId: "2", IsLeaderInDepartment: []bool{false}, HasIsLeaderInDepartmentField: true, HasDirectLeaderField: true, Status: 1},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ConfigStore: &memoryWecomOrganizationSyncConfigLastSyncStore{},
		ObjectStore: objectStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{Owner: "engineering", Name: "run-stats", Organization: "engineering", CorpId: "ww123", Status: WecomOrganizationSyncRunStatusRunning}
	config := &WecomOrganizationSyncConfig{Owner: "engineering", Name: "config", Organization: "engineering", CorpId: "ww123", AddressBookSecret: "secret"}

	if err := service.ExecuteManualRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteManualRun() error = %v", err)
	}

	if runStore.updatedRun.DepartmentCreatedCount != 1 || runStore.updatedRun.DepartmentUpdatedCount != 1 {
		t.Fatalf("department stats = created:%d updated:%d, want 1/1", runStore.updatedRun.DepartmentCreatedCount, runStore.updatedRun.DepartmentUpdatedCount)
	}
	if runStore.updatedRun.UserCreatedCount != 1 || runStore.updatedRun.UserUpdatedCount != 1 {
		t.Fatalf("user stats = created:%d updated:%d, want 1/1", runStore.updatedRun.UserCreatedCount, runStore.updatedRun.UserUpdatedCount)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunUpdatesConfigLastSyncOnSuccess(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	configStore := &memoryWecomOrganizationSyncConfigLastSyncStore{}
	client := &fakeWecomOrganizationSnapshotClient{
		token: &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{
			{Id: "1", ParentId: "0", Name: "总公司", HasDepartmentLeaderField: true},
		},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Name:                         "张三",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{false},
				HasIsLeaderInDepartmentField: true,
				HasDirectLeaderField:         true,
				Status:                       1,
			},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ConfigStore: configStore,
		ObjectStore: newMemoryWecomOrganizationObjectStore(),
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-update-config",
		Organization: "engineering",
		CorpId:       "ww123",
		Status:       WecomOrganizationSyncRunStatusRunning,
		Stage:        WecomOrganizationSyncRunStageFetching,
	}
	config := &WecomOrganizationSyncConfig{
		Owner:             "engineering",
		Name:              "config",
		Organization:      "engineering",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
	}

	if err := service.ExecuteManualRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteManualRun() error = %v", err)
	}

	if configStore.configName != "config" || configStore.runId != "run-update-config" || !configStore.syncedAt.Equal(now) {
		t.Fatalf("config last sync update = %q/%q/%s, want config/run-update-config/%s", configStore.configName, configStore.runId, configStore.syncedAt, now)
	}
}

func TestWecomOrganizationSyncServiceStartManualRunRejectsBuiltInTarget(t *testing.T) {
	service := &WecomOrganizationSyncService{Store: &memoryWecomOrganizationSyncRunStore{}}

	_, err := service.StartManualRunWithResult(&WecomOrganizationSyncConfig{
		Owner:             "built-in",
		Name:              "config",
		Organization:      "built-in",
		CorpId:            "ww123",
		AddressBookSecret: "secret",
	}, "built-in/admin")
	if err == nil || !strings.Contains(err.Error(), "built-in") {
		t.Fatalf("StartManualRunWithResult() error = %v, want built-in rejection", err)
	}
}

func TestWecomOrganizationSyncServiceStartManualRunEnsuresBusinessApplication(t *testing.T) {
	corpId := "wwe7e01c69367e67bf"
	organizationName := GetWecomBusinessOrganizationName(corpId)
	organizationStore := newMemoryWecomBusinessOrganizationStore()
	service := &WecomOrganizationSyncService{
		Store:             &memoryWecomOrganizationSyncRunStore{},
		OrganizationStore: organizationStore,
	}

	_, err := service.StartManualRunWithResult(&WecomOrganizationSyncConfig{
		Owner:             organizationName,
		Name:              "config",
		Organization:      organizationName,
		CorpId:            corpId,
		AddressBookSecret: "secret",
	}, "built-in/admin")
	if err != nil {
		t.Fatalf("StartManualRunWithResult() error = %v", err)
	}

	applicationName := GetWecomBusinessApplicationName(corpId)
	if organizationStore.applications["admin/"+applicationName] == nil {
		t.Fatalf("business application %q should be created before run starts", applicationName)
	}
	organization := organizationStore.organizations["admin/"+organizationName]
	if organization == nil || organization.DefaultApplication != applicationName {
		t.Fatalf("organization default application = %#v, want %q", organization, applicationName)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunUpdatesAutoOrganizationDisplayName(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	corpId := "ww123"
	organizationName := GetWecomBusinessOrganizationName(corpId)
	organizationStore := newMemoryWecomBusinessOrganizationStore()
	organizationStore.organizations["admin/"+organizationName] = &Organization{
		Owner:       "admin",
		Name:        organizationName,
		DisplayName: GetWecomBusinessOrganizationAutoDisplayName(corpId),
	}
	client := &fakeWecomOrganizationSnapshotClient{
		token:       &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "联软科技集团", HasDepartmentLeaderField: true}},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Name:                         "张三",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{false},
				HasIsLeaderInDepartmentField: true,
				HasDirectLeaderField:         true,
				Status:                       1,
			},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:             &memoryWecomOrganizationSyncRunStore{},
		ConfigStore:       &memoryWecomOrganizationSyncConfigLastSyncStore{},
		ObjectStore:       newMemoryWecomOrganizationObjectStore(),
		OrganizationStore: organizationStore,
		Now:               func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{Owner: organizationName, Name: "run-update-org", Organization: organizationName, CorpId: corpId, Status: WecomOrganizationSyncRunStatusRunning}
	config := &WecomOrganizationSyncConfig{Owner: organizationName, Name: "config", Organization: organizationName, CorpId: corpId, AddressBookSecret: "secret"}

	if err := service.ExecuteManualRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteManualRun() error = %v", err)
	}

	organization := organizationStore.organizations["admin/"+organizationName]
	if organization.DisplayName != "联软科技集团" {
		t.Fatalf("organization display name = %q, want root department name", organization.DisplayName)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunKeepsSucceededWhenConfigLastSyncUpdateFails(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	configStore := &memoryWecomOrganizationSyncConfigLastSyncStore{err: errors.New("metadata update failed")}
	client := &fakeWecomOrganizationSnapshotClient{
		token:       &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "总公司", HasDepartmentLeaderField: true}},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Name:                         "张三",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{false},
				HasIsLeaderInDepartmentField: true,
				HasDirectLeaderField:         true,
				Status:                       1,
			},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ConfigStore: configStore,
		ObjectStore: newMemoryWecomOrganizationObjectStore(),
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{Owner: "engineering", Name: "run-metadata-fail", Organization: "engineering", CorpId: "ww123", Status: WecomOrganizationSyncRunStatusRunning}
	config := &WecomOrganizationSyncConfig{Owner: "engineering", Name: "config", Organization: "engineering", CorpId: "ww123", AddressBookSecret: "secret"}

	if err := service.ExecuteManualRun(context.Background(), config, run); err != nil {
		t.Fatalf("ExecuteManualRun() error = %v, want nil because data sync already succeeded", err)
	}
	if runStore.updatedRun == nil || runStore.updatedRun.Status != WecomOrganizationSyncRunStatusSucceeded {
		t.Fatalf("run should stay succeeded when config metadata update fails: %#v", runStore.updatedRun)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunMarksFailedWhenFinalizingSoftDisableFails(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	objectStore := newMemoryWecomOrganizationObjectStore()
	objectStore.groups["engineering/wecom-dept-2"] = &Group{Owner: "engineering", Name: "wecom-dept-2", IsEnabled: true}
	objectStore.departmentMappings["engineering|ww123|2"] = &WecomDepartmentMapping{
		Owner:        "engineering",
		Name:         "mapping-2",
		Organization: "engineering",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "engineering",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	objectStore.saveGroupErrors["wecom-dept-2"] = errors.New("disable group failed")
	client := &fakeWecomOrganizationSnapshotClient{
		token:       &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "总公司", HasDepartmentLeaderField: true}},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Name:                         "张三",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{false},
				HasIsLeaderInDepartmentField: true,
				HasDirectLeaderField:         true,
				Status:                       1,
			},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ObjectStore: objectStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{Owner: "engineering", Name: "run-finalize-fail", Organization: "engineering", CorpId: "ww123", Status: WecomOrganizationSyncRunStatusRunning}
	config := &WecomOrganizationSyncConfig{
		Owner:                  "engineering",
		Name:                   "config",
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "secret",
		SoftDisableMissingData: true,
	}

	err := service.ExecuteManualRun(context.Background(), config, run)
	if err == nil || !strings.Contains(err.Error(), "disable group failed") {
		t.Fatalf("ExecuteManualRun() error = %v, want soft disable failure", err)
	}
	if runStore.updatedRun == nil || runStore.updatedRun.Status != WecomOrganizationSyncRunStatusFailed || runStore.updatedRun.Stage != WecomOrganizationSyncRunStageFinalizing {
		t.Fatalf("finalizing failure should mark run failed/finalizing: %#v", runStore.updatedRun)
	}
	if runStore.updatedRun.ErrorCode != "finalize_failed" {
		t.Fatalf("finalizing failure error code = %q, want finalize_failed", runStore.updatedRun.ErrorCode)
	}
}

func TestWecomOrganizationSyncServiceExecuteManualRunFailsWhenRequiredFieldsMissing(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	runStore := &memoryWecomOrganizationSyncRunStore{}
	objectStore := newMemoryWecomOrganizationObjectStore()
	client := &fakeWecomOrganizationSnapshotClient{
		token:       &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{{Id: "1", ParentId: "0", Name: "总公司"}},
		users: []WecomUserSnapshot{
			{UserId: "zhangsan", Departments: []string{"1"}, MainDepartmentId: "1", Status: 1},
		},
	}
	service := &WecomOrganizationSyncService{
		Store:       runStore,
		ObjectStore: objectStore,
		Now:         func() time.Time { return now },
		NewSnapshotClient: func(corpId string, addressBookSecret string) WecomOrganizationSnapshotClient {
			return client
		},
	}
	run := &WecomOrganizationSyncRun{
		Owner:        "engineering",
		Name:         "run-missing-fields",
		Organization: "engineering",
		CorpId:       "ww123",
		Status:       WecomOrganizationSyncRunStatusRunning,
		Stage:        WecomOrganizationSyncRunStageFetching,
	}
	config := &WecomOrganizationSyncConfig{
		Owner:                  "engineering",
		Name:                   "config",
		Organization:           "engineering",
		CorpId:                 "ww123",
		AddressBookSecret:      "secret",
		SoftDisableMissingData: true,
	}

	err := service.ExecuteManualRun(context.Background(), config, run)
	if err == nil || !strings.Contains(err.Error(), "missing required wecom organization snapshot fields") {
		t.Fatalf("ExecuteManualRun() error = %v, want missing fields error", err)
	}

	if runStore.updatedRun == nil || runStore.updatedRun.Status != WecomOrganizationSyncRunStatusFailed {
		t.Fatalf("run should finish failed: %#v", runStore.updatedRun)
	}
	if len(objectStore.departmentMappings) != 0 || len(objectStore.userMappings) != 0 {
		t.Fatalf("missing fields failure must not apply local data")
	}
}

func TestNormalizeWecomOrganizationSnapshotSeparatesRelationships(t *testing.T) {
	snapshot := NormalizeWecomOrganizationSnapshot(
		[]WecomDepartmentSnapshot{
			{Id: "1", ParentId: "0", Name: "总公司", DepartmentLeader: []string{"zhangsan", "lisi"}, HasDepartmentLeaderField: true},
			{Id: "2", ParentId: "1", Name: "研发中心", DepartmentLeader: []string{}, HasDepartmentLeaderField: true},
		},
		[]WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Departments:                  []string{"1", "2"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{true, false},
				DirectLeaders:                []string{"ceo"},
				HasDirectLeaderField:         true,
				HasIsLeaderInDepartmentField: true,
			},
			{
				UserId:                       "lisi",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{false},
				DirectLeaders:                []string{"zhangsan"},
				HasDirectLeaderField:         true,
				HasIsLeaderInDepartmentField: true,
			},
			{
				UserId:        "ceo",
				Departments:   []string{"1"},
				DirectLeaders: []string{},
			},
		},
	)

	if len(snapshot.UserDepartments) != 4 {
		t.Fatalf("len(user departments) = %d, want 4", len(snapshot.UserDepartments))
	}
	firstMembership := snapshot.UserDepartments[0]
	if firstMembership.WecomUserId != "zhangsan" || firstMembership.DepartmentId != "1" || !firstMembership.IsMain || !firstMembership.IsLeader {
		t.Fatalf("unexpected first membership: %#v", firstMembership)
	}

	wantLeaders := []WecomSnapshotDepartmentLeader{
		{DepartmentId: "1", LeaderWecomUserId: "zhangsan", IsPrimary: true},
		{DepartmentId: "1", LeaderWecomUserId: "lisi", IsPrimary: false},
	}
	if !reflect.DeepEqual(snapshot.DepartmentLeaders, wantLeaders) {
		t.Fatalf("department leaders = %#v, want %#v", snapshot.DepartmentLeaders, wantLeaders)
	}

	wantDirectLeaders := []WecomSnapshotDirectLeader{
		{WecomUserId: "zhangsan", LeaderWecomUserId: "ceo"},
		{WecomUserId: "lisi", LeaderWecomUserId: "zhangsan"},
	}
	if !reflect.DeepEqual(snapshot.DirectLeaders, wantDirectLeaders) {
		t.Fatalf("direct leaders = %#v, want %#v", snapshot.DirectLeaders, wantDirectLeaders)
	}
}

func TestWecomOrganizationSyncServiceFetchFullSnapshotUsesClientAndNormalizes(t *testing.T) {
	client := &fakeWecomOrganizationSnapshotClient{
		token: &WecomAccessToken{AccessToken: "token-value"},
		departments: []WecomDepartmentSnapshot{
			{Id: "1", ParentId: "0", Name: "总公司", DepartmentLeader: []string{"zhangsan"}, HasDepartmentLeaderField: true},
		},
		users: []WecomUserSnapshot{
			{
				UserId:                       "zhangsan",
				Departments:                  []string{"1"},
				MainDepartmentId:             "1",
				IsLeaderInDepartment:         []bool{true},
				DirectLeaders:                []string{"ceo"},
				HasDirectLeaderField:         true,
				HasIsLeaderInDepartmentField: true,
			},
		},
	}
	service := &WecomOrganizationSyncService{}

	snapshot, err := service.FetchFullSnapshot(context.Background(), client)
	if err != nil {
		t.Fatalf("FetchFullSnapshot() error = %v", err)
	}
	if client.departmentTokenSeen != "token-value" || client.userTokenSeen != "token-value" {
		t.Fatalf("snapshot client should receive token, got department=%q user=%q", client.departmentTokenSeen, client.userTokenSeen)
	}
	if len(snapshot.Departments) != 1 || len(snapshot.Users) != 1 {
		t.Fatalf("snapshot should include departments and users: %#v", snapshot)
	}
	if len(snapshot.DepartmentLeaders) != 1 || snapshot.DepartmentLeaders[0].LeaderWecomUserId != "zhangsan" {
		t.Fatalf("snapshot should normalize department leaders: %#v", snapshot.DepartmentLeaders)
	}
	if len(snapshot.DirectLeaders) != 1 || snapshot.DirectLeaders[0].LeaderWecomUserId != "ceo" {
		t.Fatalf("snapshot should normalize direct leaders: %#v", snapshot.DirectLeaders)
	}
}

func TestBuildWecomOrganizationSyncPlanDiffsByStableWecomIds(t *testing.T) {
	snapshot := &WecomOrganizationFullSnapshot{
		Departments: []WecomDepartmentSnapshot{
			{Id: "1", Name: "总公司"},
			{Id: "2", Name: "研发中心"},
		},
		Users: []WecomUserSnapshot{
			{UserId: "zhangsan", Name: "张三", Status: 1},
			{UserId: "lisi", Name: "李四", Status: 1},
		},
		UserDepartments: []WecomSnapshotUserDepartment{
			{WecomUserId: "zhangsan", DepartmentId: "1", IsMain: true},
		},
		DepartmentLeaders: []WecomSnapshotDepartmentLeader{
			{DepartmentId: "1", LeaderWecomUserId: "zhangsan", IsPrimary: true},
		},
		DirectLeaders: []WecomSnapshotDirectLeader{
			{WecomUserId: "lisi", LeaderWecomUserId: "zhangsan"},
		},
	}
	existing := WecomOrganizationSyncExistingState{
		Departments: []WecomDepartmentMapping{
			{DepartmentId: "1", DisplayName: "旧总公司"},
			{DepartmentId: "stale-dept", DisplayName: "旧部门"},
		},
		Users: []WecomUserMapping{
			{WecomUserId: "zhangsan", Status: 1},
			{WecomUserId: "stale-user", Status: 1},
		},
		UserDepartments: []WecomUserDepartment{
			{WecomUserId: "zhangsan", DepartmentId: "old-dept"},
		},
		DepartmentLeaders: []WecomDepartmentLeader{
			{DepartmentId: "old-dept", LeaderWecomUserId: "zhangsan"},
		},
		DirectLeaders: []WecomUserDirectLeader{
			{WecomUserId: "zhangsan", LeaderWecomUserId: "old-leader"},
		},
	}

	plan := BuildWecomOrganizationSyncPlan("built-in", "ww123", "run-1", snapshot, existing)

	if len(plan.DepartmentUpserts) != 2 {
		t.Fatalf("department upserts = %#v, want 2", plan.DepartmentUpserts)
	}
	if len(plan.DepartmentDisables) != 1 || plan.DepartmentDisables[0].DepartmentId != "stale-dept" {
		t.Fatalf("department disables = %#v, want stale-dept", plan.DepartmentDisables)
	}
	if len(plan.UserUpserts) != 2 {
		t.Fatalf("user upserts = %#v, want 2", plan.UserUpserts)
	}
	if len(plan.UserDisables) != 1 || plan.UserDisables[0].WecomUserId != "stale-user" {
		t.Fatalf("user disables = %#v, want stale-user", plan.UserDisables)
	}
	if len(plan.UserDepartmentUpserts) != 1 || plan.UserDepartmentUpserts[0].DepartmentId != "1" {
		t.Fatalf("user department upserts = %#v, want department 1", plan.UserDepartmentUpserts)
	}
	if len(plan.UserDepartmentDisables) != 1 || plan.UserDepartmentDisables[0].DepartmentId != "old-dept" {
		t.Fatalf("user department disables = %#v, want old-dept", plan.UserDepartmentDisables)
	}
	if len(plan.DepartmentLeaderUpserts) != 1 || plan.DepartmentLeaderUpserts[0].LeaderWecomUserId != "zhangsan" {
		t.Fatalf("department leader upserts = %#v, want zhangsan", plan.DepartmentLeaderUpserts)
	}
	if len(plan.DepartmentLeaderDisables) != 1 || plan.DepartmentLeaderDisables[0].DepartmentId != "old-dept" {
		t.Fatalf("department leader disables = %#v, want old-dept", plan.DepartmentLeaderDisables)
	}
	if len(plan.DirectLeaderUpserts) != 1 || plan.DirectLeaderUpserts[0].LeaderWecomUserId != "zhangsan" {
		t.Fatalf("direct leader upserts = %#v, want zhangsan", plan.DirectLeaderUpserts)
	}
	if len(plan.DirectLeaderDisables) != 1 || plan.DirectLeaderDisables[0].LeaderWecomUserId != "old-leader" {
		t.Fatalf("direct leader disables = %#v, want old-leader", plan.DirectLeaderDisables)
	}
}

func TestWecomOrganizationSyncServiceApplyDepartmentUpsertsPreservesStableGroupName(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.groups["built-in/wecom-dept-2"] = &Group{
		Owner:       "built-in",
		Name:        "wecom-dept-2",
		DisplayName: "研发中心",
		ParentId:    "wecom-dept-1",
		Type:        "wecom-department",
		IsEnabled:   true,
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Owner:        "built-in",
		Name:         "wecom-dept-map-2",
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	store.departmentMappings["built-in|ww123|3"] = &WecomDepartmentMapping{
		Owner:        "built-in",
		Name:         "wecom-dept-map-3",
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "3",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-3",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-2",
		DepartmentUpserts: []WecomDepartmentSnapshot{
			{Id: "2", ParentId: "3", Name: "研发平台", Order: 30},
		},
	}

	if err := service.ApplyDepartmentUpserts(plan); err != nil {
		t.Fatalf("ApplyDepartmentUpserts() error = %v", err)
	}

	group := store.groups["built-in/wecom-dept-2"]
	if group == nil {
		t.Fatalf("expected existing stable group to be updated")
	}
	if group.Name != "wecom-dept-2" || group.DisplayName != "研发平台" || group.ParentId != "wecom-dept-3" {
		t.Fatalf("unexpected group after rename/move: %#v", group)
	}
	if group.Type != "wecom-department" || group.IsTopGroup || !group.IsEnabled {
		t.Fatalf("unexpected group flags: %#v", group)
	}
	if len(store.departmentMappings) != 2 {
		t.Fatalf("department mapping count = %d, want 2", len(store.departmentMappings))
	}
	mapping := store.departmentMappings["built-in|ww123|2"]
	if mapping.GroupName != "wecom-dept-2" || mapping.ParentGroupName != "wecom-dept-3" || mapping.LastSeenRunId != "run-2" {
		t.Fatalf("unexpected department mapping: %#v", mapping)
	}
	if mapping.LastSyncedAt != now || !mapping.IsEnabled || mapping.MissingSinceRunId != "" {
		t.Fatalf("unexpected department sync metadata: %#v", mapping)
	}
}

func TestWecomOrganizationSyncServiceApplyDepartmentUpsertsGeneratesGloballyUniqueGroupName(t *testing.T) {
	store := newMemoryWecomOrganizationObjectStore()
	service := &WecomOrganizationSyncService{ObjectStore: store}
	department := WecomDepartmentSnapshot{Id: "2", ParentId: "1", Name: "研发平台"}

	// Group.Name 在当前 Casdoor 表结构里是全局唯一索引，不能只用 department_id 生成。
	for _, plan := range []*WecomOrganizationSyncPlan{
		{
			Organization:      "wecom-ww123",
			CorpId:            "ww123",
			RunId:             "run-ww123",
			DepartmentUpserts: []WecomDepartmentSnapshot{department},
		},
		{
			Organization:      "wecom-ww456",
			CorpId:            "ww456",
			RunId:             "run-ww456",
			DepartmentUpserts: []WecomDepartmentSnapshot{department},
		},
	} {
		if err := service.ApplyDepartmentUpserts(plan); err != nil {
			t.Fatalf("ApplyDepartmentUpserts(%s) error = %v", plan.CorpId, err)
		}
	}

	firstName := store.departmentMappings["wecom-ww123|ww123|2"].GroupName
	secondName := store.departmentMappings["wecom-ww456|ww456|2"].GroupName
	if firstName == "" || secondName == "" {
		t.Fatalf("expected department group names to be saved, got %q and %q", firstName, secondName)
	}
	if firstName == secondName {
		t.Fatalf("department group names should be globally unique, both got %q", firstName)
	}
	if firstName == "wecom-dept-2" || secondName == "wecom-dept-2" {
		t.Fatalf("department group names should include corp_id to avoid legacy collision, got %q and %q", firstName, secondName)
	}
	if !strings.Contains(firstName, "ww123") || !strings.Contains(secondName, "ww456") {
		t.Fatalf("department group names should keep readable corp_id hints, got %q and %q", firstName, secondName)
	}
	if len(firstName) > 100 || len(secondName) > 100 {
		t.Fatalf("department group names exceed Group.Name length limit: %q(%d), %q(%d)", firstName, len(firstName), secondName, len(secondName))
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsPreservesBoundUsername(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-zhang"] = &User{
		Owner:       "built-in",
		Name:        "local-zhang",
		DisplayName: "旧姓名",
		Wecom:       "zhangsan",
		ExternalId:  "old-external",
		Properties:  map[string]string{"wecomUserId": "zhangsan"},
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-3",
		UserUpserts: []WecomUserSnapshot{
			{
				UserId:           "zhangsan",
				Name:             "张三",
				Mobile:           "13800000000",
				Email:            "zhangsan@example.com",
				Position:         "研发经理",
				Avatar:           "https://example.com/avatar.png",
				Alias:            "zs",
				OpenUserId:       "open-zhangsan",
				MainDepartmentId: "2",
				Status:           1,
			},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	user := store.users["built-in/local-zhang"]
	if user == nil {
		t.Fatalf("expected existing bound user to be updated")
	}
	if user.Name != "local-zhang" {
		t.Fatalf("bound user name changed to %q", user.Name)
	}
	if user.DisplayName != "张三" || user.Phone != "13800000000" || user.Email != "zhangsan@example.com" || user.Title != "研发经理" {
		t.Fatalf("unexpected synced user profile: %#v", user)
	}
	if user.Wecom != "zhangsan" || user.ExternalId != "wecom:ww123:zhangsan" {
		t.Fatalf("unexpected user identity fields: %#v", user)
	}
	if user.Properties["wecomCorpId"] != "ww123" || user.Properties["wecomOpenUserId"] != "open-zhangsan" || user.Properties["wecomMainDepartmentId"] != "2" {
		t.Fatalf("unexpected user properties: %#v", user.Properties)
	}
	mapping := store.userMappings["built-in|ww123|zhangsan"]
	if mapping == nil || mapping.UserName != "local-zhang" || mapping.ExternalId != "wecom:ww123:zhangsan" {
		t.Fatalf("unexpected user mapping: %#v", mapping)
	}
	if mapping.LastSyncedAt != now || !mapping.IsEnabled || mapping.MissingSinceRunId != "" {
		t.Fatalf("unexpected user mapping sync metadata: %#v", mapping)
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsKeepsSensitiveProfileWhenWecomOmitsFields(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["engineering/local-zhang"] = &User{
		Owner:       "engineering",
		Name:        "local-zhang",
		DisplayName: "旧姓名",
		Wecom:       "zhangsan",
		ExternalId:  "wecom:ww123:zhangsan",
		Phone:       "13800000000",
		Email:       "zhangsan@example.com",
		Avatar:      "https://example.com/avatar.png",
		Properties:  map[string]string{"wecomUserId": "zhangsan"},
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "engineering",
		CorpId:       "ww123",
		RunId:        "run-sensitive-profile",
		UserUpserts: []WecomUserSnapshot{
			{
				UserId:           "zhangsan",
				Name:             "张三",
				Position:         "研发经理",
				MainDepartmentId: "2",
				Status:           1,
			},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	user := store.users["engineering/local-zhang"]
	if user == nil {
		t.Fatalf("expected existing bound user to be updated")
	}
	if user.Phone != "13800000000" || user.Email != "zhangsan@example.com" || user.Avatar != "https://example.com/avatar.png" {
		t.Fatalf("sensitive profile fields should be preserved when WeCom omits them: %#v", user)
	}
	if user.DisplayName != "张三" || user.Title != "研发经理" {
		t.Fatalf("non-sensitive profile fields should still be updated: %#v", user)
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsRecordsPossibleDuplicateUsers(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["engineering/local-zhang"] = &User{
		Owner:       "engineering",
		Name:        "local-zhang",
		DisplayName: "张三",
		Phone:       "13800000000",
		Email:       "zhangsan@example.com",
		Properties:  map[string]string{},
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "engineering",
		CorpId:       "ww123",
		RunId:        "run-possible-duplicate",
		UserUpserts: []WecomUserSnapshot{
			{
				UserId:           "zhangsan",
				Name:             "张三",
				Mobile:           "13800000000",
				Email:            "zhangsan@example.com",
				MainDepartmentId: "2",
				Status:           1,
			},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	if store.users["engineering/wecom-user-zhangsan"] == nil {
		t.Fatalf("expected a new WeCom-bound user instead of merging into same-profile local user")
	}
	if store.users["engineering/local-zhang"].Wecom != "" {
		t.Fatalf("same-profile local user should not be automatically bound: %#v", store.users["engineering/local-zhang"])
	}
	mapping := store.userMappings["engineering|ww123|zhangsan"]
	if mapping == nil {
		t.Fatalf("expected user mapping to be saved")
	}
	if mapping.PossibleDuplicateUsers != "[\"engineering/local-zhang\"]" {
		t.Fatalf("possible duplicate users = %q", mapping.PossibleDuplicateUsers)
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsHandlesExternalIdLimit(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	longCorpId := "ww" + strings.Repeat("x", 110)
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       longCorpId,
		RunId:        "run-4",
		UserUpserts: []WecomUserSnapshot{
			{UserId: "alice", Name: "Alice", MainDepartmentId: "1", Status: 1},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	user := store.users["built-in/wecom-user-alice"]
	if user == nil {
		t.Fatalf("expected new WeCom user to be created, users = %#v", store.users)
	}
	fullExternalId := "wecom:" + longCorpId + ":alice"
	if user.ExternalId == fullExternalId {
		t.Fatalf("User.ExternalId should use a length-safe value for overlength identity")
	}
	if len(user.ExternalId) > 100 || !strings.HasPrefix(user.ExternalId, "wecom:sha256:") {
		t.Fatalf("unexpected length-safe external id %q", user.ExternalId)
	}
	mapping := store.userMappings["built-in|"+longCorpId+"|alice"]
	if mapping == nil || mapping.ExternalId != fullExternalId {
		t.Fatalf("mapping should preserve full external id, got %#v", mapping)
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsMatchesLengthSafeExternalId(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	longCorpId := "ww" + strings.Repeat("x", 110)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-alice"] = &User{
		Owner:      "built-in",
		Name:       "local-alice",
		ExternalId: GetLengthSafeWecomUserExternalId(longCorpId, "alice"),
		Properties: map[string]string{},
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       longCorpId,
		RunId:        "run-5",
		UserUpserts: []WecomUserSnapshot{
			{UserId: "alice", Name: "Alice", MainDepartmentId: "1", Status: 1},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	if store.users["built-in/wecom-user-alice"] != nil {
		t.Fatalf("length-safe ExternalId should bind existing user instead of creating generated user")
	}
	user := store.users["built-in/local-alice"]
	if user == nil || user.Name != "local-alice" || user.Wecom != "alice" {
		t.Fatalf("unexpected existing user after upsert: %#v", user)
	}
	mapping := store.userMappings["built-in|"+longCorpId+"|alice"]
	if mapping == nil || mapping.UserName != "local-alice" {
		t.Fatalf("unexpected user mapping: %#v", mapping)
	}
}

func TestWecomOrganizationSyncServiceApplyUserUpsertsAssignsWecomSignupApplication(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	corpId := "wwe7e01c69367e67bf"
	organization := GetWecomBusinessOrganizationName(corpId)
	store := newMemoryWecomOrganizationObjectStore()
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: organization,
		CorpId:       corpId,
		RunId:        "run-assign-app",
		UserUpserts: []WecomUserSnapshot{
			{UserId: "alice", Name: "Alice", MainDepartmentId: "1", Status: 1},
		},
	}

	if err := service.ApplyUserUpserts(plan); err != nil {
		t.Fatalf("ApplyUserUpserts() error = %v", err)
	}

	user := store.users[organization+"/wecom-user-alice"]
	if user == nil {
		t.Fatalf("expected new WeCom user to be created, users = %#v", store.users)
	}
	if user.SignupApplication != GetWecomBusinessApplicationName(corpId) {
		t.Fatalf("signup application = %q, want %q", user.SignupApplication, GetWecomBusinessApplicationName(corpId))
	}
}

func TestWecomOrganizationSyncServiceApplyUserDepartmentRelationshipsAddsDepartmentGroups(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-zhang"] = &User{
		Owner:  "built-in",
		Name:   "local-zhang",
		Groups: []string{"built-in/manual-reviewers"},
	}
	store.userMappings["built-in|ww123|zhangsan"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		IsEnabled:    true,
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-6",
		UserDepartmentUpserts: []WecomSnapshotUserDepartment{
			{WecomUserId: "zhangsan", DepartmentId: "2", IsMain: true, IsLeader: true},
		},
	}

	if err := service.ApplyUserDepartmentRelationships(plan); err != nil {
		t.Fatalf("ApplyUserDepartmentRelationships() error = %v", err)
	}

	membership := store.userDepartments["built-in|ww123|zhangsan|2"]
	if membership == nil {
		t.Fatalf("expected user department relationship to be saved")
	}
	if membership.UserName != "local-zhang" || membership.GroupName != "wecom-dept-2" || !membership.IsEnabled || !membership.IsMain || !membership.IsLeader {
		t.Fatalf("unexpected membership: %#v", membership)
	}
	if membership.Name != GetWecomRelationshipName("built-in", "ww123", WecomRelationshipTypeUserDepartment, "zhangsan", "2") {
		t.Fatalf("unexpected relationship name: %q", membership.Name)
	}
	if membership.LastSeenRunId != "run-6" || membership.LastSyncedAt != now {
		t.Fatalf("unexpected sync metadata: %#v", membership)
	}

	user := store.users["built-in/local-zhang"]
	wantGroups := []string{"built-in/manual-reviewers", "built-in/wecom-dept-2"}
	if !reflect.DeepEqual(user.Groups, wantGroups) {
		t.Fatalf("user groups = %#v, want %#v", user.Groups, wantGroups)
	}
}

func TestWecomOrganizationSyncServiceApplyUserDepartmentRelationshipsDisablesStaleMembershipOnly(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-zhang"] = &User{
		Owner:  "built-in",
		Name:   "local-zhang",
		Groups: []string{"built-in/manual-reviewers", "built-in/wecom-dept-2", "built-in/wecom-dept-3"},
	}
	store.userDepartments["built-in|ww123|zhangsan|2"] = &WecomUserDepartment{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		DepartmentId: "2",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsMain:       true,
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-7",
		UserDepartmentDisables: []WecomUserDepartment{
			{
				Organization: "built-in",
				CorpId:       "ww123",
				WecomUserId:  "zhangsan",
				DepartmentId: "2",
				UserOwner:    "built-in",
				UserName:     "local-zhang",
				GroupOwner:   "built-in",
				GroupName:    "wecom-dept-2",
			},
		},
	}

	if err := service.ApplyUserDepartmentRelationships(plan); err != nil {
		t.Fatalf("ApplyUserDepartmentRelationships() error = %v", err)
	}

	membership := store.userDepartments["built-in|ww123|zhangsan|2"]
	if membership == nil || membership.IsEnabled || membership.IsMain || membership.MissingSinceRunId != "run-7" {
		t.Fatalf("stale membership should be disabled: %#v", membership)
	}
	user := store.users["built-in/local-zhang"]
	wantGroups := []string{"built-in/manual-reviewers", "built-in/wecom-dept-3"}
	if !reflect.DeepEqual(user.Groups, wantGroups) {
		t.Fatalf("user groups = %#v, want %#v", user.Groups, wantGroups)
	}
}

func TestWecomOrganizationSyncServiceApplyUserDepartmentRelationshipsKeepsSingleMainDepartment(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-zhang"] = &User{Owner: "built-in", Name: "local-zhang"}
	store.userMappings["built-in|ww123|zhangsan"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		IsEnabled:    true,
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	store.departmentMappings["built-in|ww123|3"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "3",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-3",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-8",
		UserDepartmentUpserts: []WecomSnapshotUserDepartment{
			{WecomUserId: "zhangsan", DepartmentId: "2", IsMain: true},
			{WecomUserId: "zhangsan", DepartmentId: "3", IsMain: true},
		},
	}

	if err := service.ApplyUserDepartmentRelationships(plan); err != nil {
		t.Fatalf("ApplyUserDepartmentRelationships() error = %v", err)
	}

	first := store.userDepartments["built-in|ww123|zhangsan|2"]
	second := store.userDepartments["built-in|ww123|zhangsan|3"]
	if first == nil || second == nil {
		t.Fatalf("expected both memberships to be saved: %#v", store.userDepartments)
	}
	if !first.IsMain || second.IsMain {
		t.Fatalf("only the first enabled main department should remain main: first=%#v second=%#v", first, second)
	}
	user := store.users["built-in/local-zhang"]
	wantGroups := []string{"built-in/wecom-dept-2", "built-in/wecom-dept-3"}
	if !reflect.DeepEqual(user.Groups, wantGroups) {
		t.Fatalf("user groups = %#v, want %#v", user.Groups, wantGroups)
	}
}

func TestWecomOrganizationSyncServiceApplyDepartmentLeaderRelationshipsStoresAllLeadersAndPrimaryManager(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.groups["built-in/wecom-dept-2"] = &Group{
		Owner: "built-in",
		Name:  "wecom-dept-2",
		Type:  "wecom-department",
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	store.userMappings["built-in|ww123|zhangsan"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		IsEnabled:    true,
	}
	store.userMappings["built-in|ww123|lisi"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "lisi",
		UserOwner:    "built-in",
		UserName:     "local-lisi",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-9",
		DepartmentLeaderUpserts: []WecomSnapshotDepartmentLeader{
			{DepartmentId: "2", LeaderWecomUserId: "zhangsan", IsPrimary: true},
			{DepartmentId: "2", LeaderWecomUserId: "lisi", IsPrimary: false},
		},
	}

	if err := service.ApplyDepartmentLeaderRelationships(plan); err != nil {
		t.Fatalf("ApplyDepartmentLeaderRelationships() error = %v", err)
	}

	primary := store.departmentLeaders["built-in|ww123|2|zhangsan"]
	secondary := store.departmentLeaders["built-in|ww123|2|lisi"]
	if primary == nil || secondary == nil {
		t.Fatalf("expected all leaders to be saved: %#v", store.departmentLeaders)
	}
	if !primary.IsPrimary || !primary.IsEnabled || primary.LeaderUserName != "local-zhang" {
		t.Fatalf("unexpected primary leader: %#v", primary)
	}
	if secondary.IsPrimary || !secondary.IsEnabled || secondary.LeaderUserName != "local-lisi" {
		t.Fatalf("unexpected secondary leader: %#v", secondary)
	}
	if primary.Name != GetWecomRelationshipName("built-in", "ww123", WecomRelationshipTypeDepartmentLead, "2", "zhangsan") {
		t.Fatalf("unexpected relationship name: %q", primary.Name)
	}
	if primary.LastSeenRunId != "run-9" || primary.LastSyncedAt != now {
		t.Fatalf("unexpected sync metadata: %#v", primary)
	}

	group := store.groups["built-in/wecom-dept-2"]
	if group.Manager != "built-in/local-zhang" {
		t.Fatalf("group manager = %q, want built-in/local-zhang", group.Manager)
	}
	mapping := store.departmentMappings["built-in|ww123|2"]
	if mapping.PrimaryLeaderWecomUserId != "zhangsan" {
		t.Fatalf("primary leader cache = %q, want zhangsan", mapping.PrimaryLeaderWecomUserId)
	}
}

func TestWecomOrganizationSyncServiceApplyDepartmentLeaderRelationshipsDisablesStalePrimaryAndPromotesNewPrimary(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.groups["built-in/wecom-dept-2"] = &Group{
		Owner:   "built-in",
		Name:    "wecom-dept-2",
		Type:    "wecom-department",
		Manager: "built-in/local-zhang",
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization:             "built-in",
		CorpId:                   "ww123",
		DepartmentId:             "2",
		GroupOwner:               "built-in",
		GroupName:                "wecom-dept-2",
		PrimaryLeaderWecomUserId: "zhangsan",
		IsEnabled:                true,
	}
	store.userMappings["built-in|ww123|lisi"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "lisi",
		UserOwner:    "built-in",
		UserName:     "local-lisi",
		IsEnabled:    true,
	}
	store.departmentLeaders["built-in|ww123|2|zhangsan"] = &WecomDepartmentLeader{
		Organization:      "built-in",
		CorpId:            "ww123",
		DepartmentId:      "2",
		GroupOwner:        "built-in",
		GroupName:         "wecom-dept-2",
		LeaderWecomUserId: "zhangsan",
		LeaderUserOwner:   "built-in",
		LeaderUserName:    "local-zhang",
		IsPrimary:         true,
		IsEnabled:         true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-10",
		DepartmentLeaderDisables: []WecomDepartmentLeader{
			{
				Organization:      "built-in",
				CorpId:            "ww123",
				DepartmentId:      "2",
				GroupOwner:        "built-in",
				GroupName:         "wecom-dept-2",
				LeaderWecomUserId: "zhangsan",
				LeaderUserOwner:   "built-in",
				LeaderUserName:    "local-zhang",
				IsPrimary:         true,
			},
		},
		DepartmentLeaderUpserts: []WecomSnapshotDepartmentLeader{
			{DepartmentId: "2", LeaderWecomUserId: "lisi", IsPrimary: true},
		},
	}

	if err := service.ApplyDepartmentLeaderRelationships(plan); err != nil {
		t.Fatalf("ApplyDepartmentLeaderRelationships() error = %v", err)
	}

	stale := store.departmentLeaders["built-in|ww123|2|zhangsan"]
	if stale == nil || stale.IsEnabled || stale.IsPrimary || stale.MissingSinceRunId != "run-10" {
		t.Fatalf("stale primary leader should be disabled: %#v", stale)
	}
	current := store.departmentLeaders["built-in|ww123|2|lisi"]
	if current == nil || !current.IsEnabled || !current.IsPrimary {
		t.Fatalf("new primary leader should be enabled: %#v", current)
	}
	group := store.groups["built-in/wecom-dept-2"]
	if group.Manager != "built-in/local-lisi" {
		t.Fatalf("group manager = %q, want built-in/local-lisi", group.Manager)
	}
	mapping := store.departmentMappings["built-in|ww123|2"]
	if mapping.PrimaryLeaderWecomUserId != "lisi" {
		t.Fatalf("primary leader cache = %q, want lisi", mapping.PrimaryLeaderWecomUserId)
	}
}

func TestWecomOrganizationSyncServiceApplyDepartmentLeaderRelationshipsKeepsSinglePrimaryLeader(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.groups["built-in/wecom-dept-2"] = &Group{Owner: "built-in", Name: "wecom-dept-2", Type: "wecom-department"}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		DepartmentId: "2",
		GroupOwner:   "built-in",
		GroupName:    "wecom-dept-2",
		IsEnabled:    true,
	}
	store.userMappings["built-in|ww123|zhangsan"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		IsEnabled:    true,
	}
	store.userMappings["built-in|ww123|lisi"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "lisi",
		UserOwner:    "built-in",
		UserName:     "local-lisi",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-11",
		DepartmentLeaderUpserts: []WecomSnapshotDepartmentLeader{
			{DepartmentId: "2", LeaderWecomUserId: "zhangsan", IsPrimary: true},
			{DepartmentId: "2", LeaderWecomUserId: "lisi", IsPrimary: true},
		},
	}

	if err := service.ApplyDepartmentLeaderRelationships(plan); err != nil {
		t.Fatalf("ApplyDepartmentLeaderRelationships() error = %v", err)
	}

	first := store.departmentLeaders["built-in|ww123|2|zhangsan"]
	second := store.departmentLeaders["built-in|ww123|2|lisi"]
	if first == nil || second == nil {
		t.Fatalf("expected both department leaders to be saved: %#v", store.departmentLeaders)
	}
	if !first.IsPrimary || second.IsPrimary {
		t.Fatalf("only the first enabled primary leader should remain primary: first=%#v second=%#v", first, second)
	}
	group := store.groups["built-in/wecom-dept-2"]
	if group.Manager != "built-in/local-zhang" {
		t.Fatalf("group manager = %q, want built-in/local-zhang", group.Manager)
	}
}

func TestWecomOrganizationSyncServiceApplyDirectLeaderRelationshipsStoresExplicitDirectLeader(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.userMappings["built-in|ww123|lisi"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "lisi",
		UserOwner:    "built-in",
		UserName:     "local-lisi",
		IsEnabled:    true,
	}
	store.userMappings["built-in|ww123|zhangsan"] = &WecomUserMapping{
		Organization: "built-in",
		CorpId:       "ww123",
		WecomUserId:  "zhangsan",
		UserOwner:    "built-in",
		UserName:     "local-zhang",
		IsEnabled:    true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-12",
		DirectLeaderUpserts: []WecomSnapshotDirectLeader{
			{WecomUserId: "lisi", LeaderWecomUserId: "zhangsan"},
		},
	}

	if err := service.ApplyDirectLeaderRelationships(plan); err != nil {
		t.Fatalf("ApplyDirectLeaderRelationships() error = %v", err)
	}

	leader := store.directLeaders["built-in|ww123|lisi|zhangsan"]
	if leader == nil {
		t.Fatalf("expected direct leader relationship to be saved")
	}
	if leader.UserName != "local-lisi" || leader.LeaderUserName != "local-zhang" || !leader.IsEnabled {
		t.Fatalf("unexpected direct leader relationship: %#v", leader)
	}
	if leader.Name != GetWecomRelationshipName("built-in", "ww123", WecomRelationshipTypeDirectLeader, "lisi", "zhangsan") {
		t.Fatalf("unexpected relationship name: %q", leader.Name)
	}
	if leader.LastSeenRunId != "run-12" || leader.LastSyncedAt != now {
		t.Fatalf("unexpected sync metadata: %#v", leader)
	}
}

func TestWecomOrganizationSyncServiceApplyDirectLeaderRelationshipsDisablesStaleRelationship(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.directLeaders["built-in|ww123|lisi|zhangsan"] = &WecomUserDirectLeader{
		Organization:      "built-in",
		CorpId:            "ww123",
		WecomUserId:       "lisi",
		LeaderWecomUserId: "zhangsan",
		UserOwner:         "built-in",
		UserName:          "local-lisi",
		LeaderUserOwner:   "built-in",
		LeaderUserName:    "local-zhang",
		IsEnabled:         true,
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-13",
		DirectLeaderDisables: []WecomUserDirectLeader{
			{
				Organization:      "built-in",
				CorpId:            "ww123",
				WecomUserId:       "lisi",
				LeaderWecomUserId: "zhangsan",
				UserOwner:         "built-in",
				UserName:          "local-lisi",
				LeaderUserOwner:   "built-in",
				LeaderUserName:    "local-zhang",
			},
		},
	}

	if err := service.ApplyDirectLeaderRelationships(plan); err != nil {
		t.Fatalf("ApplyDirectLeaderRelationships() error = %v", err)
	}

	leader := store.directLeaders["built-in|ww123|lisi|zhangsan"]
	if leader == nil || leader.IsEnabled || leader.MissingSinceRunId != "run-13" {
		t.Fatalf("stale direct leader relationship should be disabled: %#v", leader)
	}
}

func TestWecomOrganizationSyncServiceApplyMissingDataDisablesDepartmentGroupAndMapping(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.groups["built-in/wecom-dept-2"] = &Group{
		Owner:     "built-in",
		Name:      "wecom-dept-2",
		IsEnabled: true,
	}
	store.departmentMappings["built-in|ww123|2"] = &WecomDepartmentMapping{
		Organization:      "built-in",
		CorpId:            "ww123",
		DepartmentId:      "2",
		GroupOwner:        "built-in",
		GroupName:         "wecom-dept-2",
		IsEnabled:         true,
		MissingSinceRunId: "",
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-14",
		DepartmentDisables: []WecomDepartmentMapping{
			{
				Organization: "built-in",
				CorpId:       "ww123",
				DepartmentId: "2",
				GroupOwner:   "built-in",
				GroupName:    "wecom-dept-2",
				IsEnabled:    true,
			},
		},
	}

	if err := service.ApplyMissingDataDisables(plan); err != nil {
		t.Fatalf("ApplyMissingDataDisables() error = %v", err)
	}

	group := store.groups["built-in/wecom-dept-2"]
	if group == nil || group.IsEnabled {
		t.Fatalf("missing department group should be disabled: %#v", group)
	}
	mapping := store.departmentMappings["built-in|ww123|2"]
	if mapping == nil || mapping.IsEnabled || mapping.MissingSinceRunId != "run-14" || mapping.LastSyncedAt != now {
		t.Fatalf("missing department mapping should be marked disabled: %#v", mapping)
	}
}

func TestWecomOrganizationSyncServiceApplyMissingDataDisablesUserMappingAndForbidsUser(t *testing.T) {
	now := time.Date(2026, 5, 19, 12, 0, 0, 0, time.UTC)
	store := newMemoryWecomOrganizationObjectStore()
	store.users["built-in/local-lisi"] = &User{
		Owner:       "built-in",
		Name:        "local-lisi",
		IsForbidden: false,
		IsDeleted:   false,
		Groups:      []string{"built-in/manual-reviewers", "built-in/wecom-dept-2"},
	}
	store.userMappings["built-in|ww123|lisi"] = &WecomUserMapping{
		Organization:      "built-in",
		CorpId:            "ww123",
		WecomUserId:       "lisi",
		UserOwner:         "built-in",
		UserName:          "local-lisi",
		IsEnabled:         true,
		MissingSinceRunId: "",
	}
	service := &WecomOrganizationSyncService{
		ObjectStore: store,
		Now:         func() time.Time { return now },
	}
	plan := &WecomOrganizationSyncPlan{
		Organization: "built-in",
		CorpId:       "ww123",
		RunId:        "run-15",
		UserDisables: []WecomUserMapping{
			{
				Organization: "built-in",
				CorpId:       "ww123",
				WecomUserId:  "lisi",
				UserOwner:    "built-in",
				UserName:     "local-lisi",
				IsEnabled:    true,
			},
		},
	}

	if err := service.ApplyMissingDataDisables(plan); err != nil {
		t.Fatalf("ApplyMissingDataDisables() error = %v", err)
	}

	user := store.users["built-in/local-lisi"]
	if user == nil || !user.IsForbidden || user.IsDeleted {
		t.Fatalf("missing WeCom user should be forbidden but not deleted: %#v", user)
	}
	wantGroups := []string{"built-in/manual-reviewers", "built-in/wecom-dept-2"}
	if !reflect.DeepEqual(user.Groups, wantGroups) {
		t.Fatalf("soft-disable should preserve user groups = %#v, want %#v", user.Groups, wantGroups)
	}
	mapping := store.userMappings["built-in|ww123|lisi"]
	if mapping == nil || mapping.IsEnabled || mapping.MissingSinceRunId != "run-15" || mapping.LastSyncedAt != now {
		t.Fatalf("missing user mapping should be marked disabled: %#v", mapping)
	}
}
