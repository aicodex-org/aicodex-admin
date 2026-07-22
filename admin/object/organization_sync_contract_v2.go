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
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

const (
	OrganizationSyncContractV2                         = "v2"
	OrganizationSyncContractV2FreshnessTTL             = time.Hour
	OrganizationSyncContractErrorUnsupportedVersion    = "sync_contract_unsupported"
	OrganizationSyncContractErrorSourceSelection       = "source_connection_selection_required"
	OrganizationSyncContractErrorSourceUnavailable     = "source_connection_unavailable"
	OrganizationSyncContractErrorSourceUntrusted       = "source_connection_untrusted"
	OrganizationSyncContractErrorBatchUnavailable      = "source_batch_unavailable"
	OrganizationSyncContractErrorLineageInvalid        = "source_lineage_invalid"
	OrganizationSyncContractErrorInternal              = "sync_contract_internal_error"
	OrganizationSyncContractReasonIdentityMissing      = "stable_identity_absent"
	OrganizationSyncContractReasonIdentityAmbiguous    = "identity_ambiguous"
	OrganizationSyncContractReasonMainConflict         = "main_department_conflict"
	OrganizationSyncContractReasonRelationNotCurrent   = "relation_not_current"
	OrganizationSyncContractReasonDirectLeaderUnmapped = "direct_leader_identity_unresolved"
)

// OrganizationSyncContractError 向 controller 暴露稳定错误码，不拼接来源身份或 payload。
type OrganizationSyncContractError struct {
	Code string
}

func (e *OrganizationSyncContractError) Error() string {
	if e == nil || strings.TrimSpace(e.Code) == "" {
		return OrganizationSyncContractErrorSourceUnavailable
	}
	return e.Code
}

func IsOrganizationSyncContractErrorCode(err error, code string) bool {
	var contractErr *OrganizationSyncContractError
	return errors.As(err, &contractErr) && contractErr.Code == code
}

type OrganizationSyncContractV2Lineage struct {
	SourceService string `json:"sourceService"`
	SourceVersion string `json:"sourceVersion"`
	Digest        string `json:"digest"`
}

type OrganizationSyncContractV2Department struct {
	DepartmentID         string `json:"departmentId"`
	ExternalDepartmentID string `json:"externalDepartmentId,omitempty"`
	ParentDepartmentID   string `json:"parentDepartmentId,omitempty"`
	DisplayName          string `json:"displayName,omitempty"`
	LifecycleStatus      string `json:"lifecycleStatus"`
	MappingStatus        string `json:"mappingStatus"`
	SourceConnectionID   string `json:"sourceConnectionId"`
	SourceVersion        string `json:"sourceVersion"`
	BatchID              string `json:"batchId"`
}

type OrganizationSyncContractV2MemberRelation struct {
	StableSubjectID     string   `json:"stableSubjectId"`
	ExternalSubjectType string   `json:"externalSubjectType"`
	ExternalSubjectID   string   `json:"externalSubjectId"`
	DepartmentID        string   `json:"departmentId"`
	IsMain              bool     `json:"isMain"`
	LifecycleStatus     string   `json:"lifecycleStatus"`
	MappingStatus       string   `json:"mappingStatus"`
	SourceRoles         []string `json:"sourceRoles"`
	SourcePositions     []string `json:"sourcePositions"`
	SourceConnectionID  string   `json:"sourceConnectionId"`
	SourceVersion       string   `json:"sourceVersion"`
	BatchID             string   `json:"batchId"`
}

type OrganizationSyncContractV2DepartmentLeaderRelation struct {
	LeaderStableSubjectID string `json:"leaderStableSubjectId"`
	DepartmentID          string `json:"departmentId"`
	LifecycleStatus       string `json:"lifecycleStatus"`
	SourceConnectionID    string `json:"sourceConnectionId"`
	SourceVersion         string `json:"sourceVersion"`
	BatchID               string `json:"batchId"`
}

type OrganizationSyncContractV2DirectLeaderRelation struct {
	LeaderStableSubjectID      string `json:"leaderStableSubjectId"`
	SubordinateStableSubjectID string `json:"subordinateStableSubjectId"`
	LifecycleStatus            string `json:"lifecycleStatus"`
	SourceConnectionID         string `json:"sourceConnectionId"`
	SourceVersion              string `json:"sourceVersion"`
	BatchID                    string `json:"batchId"`
}

type OrganizationSyncContractV2Diagnostics struct {
	DepartmentCount       int            `json:"departmentCount"`
	MemberRelationCount   int            `json:"memberRelationCount"`
	DepartmentLeaderCount int            `json:"departmentLeaderCount"`
	DirectLeaderCount     int            `json:"directLeaderCount"`
	SkippedReasonCounts   map[string]int `json:"skippedReasonCounts,omitempty"`
}

// OrganizationSyncContractV2Organization 只发布 Gateway 建立绑定所需的组织摘要。
// 认证策略、密码、网络限制、主题和账户配置均不得进入同步契约。
type OrganizationSyncContractV2Organization struct {
	OrganizationID string `json:"organizationId"`
	DisplayName    string `json:"displayName,omitempty"`
}

// OrganizationSyncContractV2Application 是只读应用摘要，不携带 OAuth/SAML、证书、
// redirect URI、provider、HTML/CSS 或其他认证配置。
type OrganizationSyncContractV2Application struct {
	Name         string `json:"name"`
	DisplayName  string `json:"displayName,omitempty"`
	Category     string `json:"category,omitempty"`
	Type         string `json:"type,omitempty"`
	Organization string `json:"organization"`
}

// OrganizationSyncContractV2Snapshot 是 organization sync API Key 可读取的 authorization-grade producer DTO。
// DTO 不包含 API Key、SecretRef、ConfigRef、邮箱、手机号或完整 provider payload。
type OrganizationSyncContractV2Snapshot struct {
	ContractVersion           string                                               `json:"contractVersion"`
	SourceConnectionID        string                                               `json:"sourceConnectionId"`
	SourceType                string                                               `json:"sourceType"`
	SourceTenantID            string                                               `json:"sourceTenantId"`
	SourceOrgVersion          string                                               `json:"sourceOrgVersion"`
	BatchID                   string                                               `json:"batchId"`
	GeneratedAt               time.Time                                            `json:"generatedAt"`
	FreshnessExpiresAt        time.Time                                            `json:"freshnessExpiresAt"`
	Lineage                   OrganizationSyncContractV2Lineage                    `json:"lineage"`
	Organization              OrganizationSyncContractV2Organization               `json:"organization"`
	Departments               []OrganizationSyncContractV2Department               `json:"departments"`
	MemberRelations           []OrganizationSyncContractV2MemberRelation           `json:"memberRelations"`
	DepartmentLeaderRelations []OrganizationSyncContractV2DepartmentLeaderRelation `json:"departmentLeaderRelations"`
	DirectLeaderRelations     []OrganizationSyncContractV2DirectLeaderRelation     `json:"directLeaderRelations"`
	Applications              []OrganizationSyncContractV2Application              `json:"applications"`
	Diagnostics               OrganizationSyncContractV2Diagnostics                `json:"diagnostics"`
}

type OrganizationSyncContractV2BuildInput struct {
	OrganizationID              string
	RequestedSourceConnectionID string
	Now                         time.Time
	Organization                *Organization
	Applications                []*Application
	SourceConnections           []SourceConnection
	Batches                     []OrgSyncBatch
	Users                       []PlatformUser
	Departments                 []PlatformDepartment
	Memberships                 []PlatformMembership
	ExternalIdentities          []ExternalIdentity
	ApiUserMappings             []PlatformApiUserMapping
	WecomDirectLeaders          []WecomUserDirectLeader
}

func GetOrganizationSyncContractV2Snapshot(organizationID string, sourceConnectionID string, now time.Time) (*OrganizationSyncContractV2Snapshot, error) {
	organizationID = strings.TrimSpace(organizationID)
	if organizationID == "" {
		return nil, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceUnavailable}
	}
	org, err := GetMaskedOrganization(GetOrganization(util.GetId("admin", organizationID)))
	if err != nil {
		return nil, err
	}
	if org == nil {
		return nil, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceUnavailable}
	}
	applications, err := GetOrganizationApplications("admin", organizationID)
	if err != nil {
		return nil, err
	}
	connections, err := GetSourceConnections(organizationID)
	if err != nil {
		return nil, err
	}
	batches, err := GetOrgSyncBatches(organizationID)
	if err != nil {
		return nil, err
	}
	users, err := GetPlatformUsers(organizationID)
	if err != nil {
		return nil, err
	}
	departments, err := GetPlatformDepartments(organizationID)
	if err != nil {
		return nil, err
	}
	memberships, err := GetPlatformMemberships(organizationID)
	if err != nil {
		return nil, err
	}
	identities, err := GetExternalIdentities(organizationID)
	if err != nil {
		return nil, err
	}
	apiMappings, err := GetPlatformApiUserMappings(organizationID)
	if err != nil {
		return nil, err
	}
	directLeaders := []*WecomUserDirectLeader{}
	if err := ormer.Engine.Where("organization = ?", organizationID).Find(&directLeaders); err != nil {
		return nil, err
	}
	return BuildOrganizationSyncContractV2(OrganizationSyncContractV2BuildInput{
		OrganizationID: organizationID, RequestedSourceConnectionID: sourceConnectionID, Now: now,
		Organization: org, Applications: GetMaskedApplications(applications, ""),
		SourceConnections: dereferenceOrganizationSyncSourceConnections(connections),
		Batches:           dereferenceOrganizationSyncBatches(batches), Users: dereferenceOrganizationSyncPlatformUsers(users),
		Departments:        dereferenceOrganizationSyncPlatformDepartments(departments),
		Memberships:        dereferenceOrganizationSyncPlatformMemberships(memberships),
		ExternalIdentities: dereferenceOrganizationSyncExternalIdentities(identities),
		ApiUserMappings:    dereferenceOrganizationSyncApiMappings(apiMappings),
		WecomDirectLeaders: dereferenceOrganizationSyncWecomDirectLeaders(directLeaders),
	})
}

func BuildOrganizationSyncContractV2(input OrganizationSyncContractV2BuildInput) (*OrganizationSyncContractV2Snapshot, error) {
	input.OrganizationID = strings.TrimSpace(input.OrganizationID)
	if input.Now.IsZero() {
		input.Now = time.Now()
	}
	connection, err := selectOrganizationSyncContractV2Connection(input)
	if err != nil {
		return nil, err
	}
	batch, generatedAt, freshnessExpiresAt, err := selectOrganizationSyncContractV2Batch(input, connection)
	if err != nil {
		return nil, err
	}
	diagnostics := OrganizationSyncContractV2Diagnostics{SkippedReasonCounts: map[string]int{}}
	departments, departmentSet := buildOrganizationSyncContractV2Departments(input, connection, batch, &diagnostics)
	identities := buildOrganizationSyncContractV2Identities(input, connection, batch)
	rolesBySubject, positionsBySubject := buildOrganizationSyncContractV2Roles(input)
	members, leaders := buildOrganizationSyncContractV2Memberships(input, connection, batch, departmentSet, identities, rolesBySubject, positionsBySubject, &diagnostics)
	directLeaders := buildOrganizationSyncContractV2DirectLeaders(input, connection, batch, identities, &diagnostics)

	snapshot := &OrganizationSyncContractV2Snapshot{
		ContractVersion: OrganizationSyncContractV2, SourceConnectionID: connection.SourceConnectionId,
		SourceType: connection.SourceType, SourceTenantID: connection.SourceTenantId,
		SourceOrgVersion: batch.OrgVersion, BatchID: batch.BatchId,
		GeneratedAt: generatedAt, FreshnessExpiresAt: freshnessExpiresAt,
		Organization: buildOrganizationSyncContractV2Organization(input),
		Applications: buildOrganizationSyncContractV2Applications(input),
		Departments:  departments, MemberRelations: members,
		DepartmentLeaderRelations: leaders, DirectLeaderRelations: directLeaders,
		Diagnostics: diagnostics,
	}
	snapshot.Lineage = OrganizationSyncContractV2Lineage{
		SourceService: "aicodex-admin", SourceVersion: batch.OrgVersion,
		Digest: "sha256:" + organizationSyncContractV2Digest(snapshot),
	}
	return snapshot, nil
}

func selectOrganizationSyncContractV2Connection(input OrganizationSyncContractV2BuildInput) (SourceConnection, error) {
	requested := strings.TrimSpace(input.RequestedSourceConnectionID)
	candidates := []SourceConnection{}
	for _, connection := range input.SourceConnections {
		if strings.TrimSpace(connection.OrganizationId) != input.OrganizationID {
			continue
		}
		if requested != "" && strings.TrimSpace(connection.SourceConnectionId) != requested {
			continue
		}
		if !strings.EqualFold(strings.TrimSpace(connection.Status), SourceConnectionStatusActive) ||
			!strings.EqualFold(strings.TrimSpace(connection.Freshness), PlatformFreshnessFresh) {
			if requested != "" {
				return SourceConnection{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceUntrusted}
			}
			continue
		}
		if strings.TrimSpace(connection.SourceConnectionId) == "" || strings.TrimSpace(connection.SourceType) == "" || strings.TrimSpace(connection.SourceTenantId) == "" {
			return SourceConnection{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorLineageInvalid}
		}
		candidates = append(candidates, connection)
	}
	if len(candidates) == 0 {
		return SourceConnection{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceUnavailable}
	}
	if len(candidates) != 1 {
		return SourceConnection{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceSelection}
	}
	return candidates[0], nil
}

func selectOrganizationSyncContractV2Batch(input OrganizationSyncContractV2BuildInput, connection SourceConnection) (OrgSyncBatch, time.Time, time.Time, error) {
	if strings.TrimSpace(connection.LastSeenBatchId) == "" {
		return OrgSyncBatch{}, time.Time{}, time.Time{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorLineageInvalid}
	}
	var selected *OrgSyncBatch
	for i := range input.Batches {
		batch := input.Batches[i]
		if batch.OrganizationId != input.OrganizationID || batch.SourceConnectionId != connection.SourceConnectionId {
			continue
		}
		if batch.BatchId != connection.LastSeenBatchId {
			continue
		}
		if selected == nil || batch.FinishedAt.After(selected.FinishedAt) ||
			(batch.FinishedAt.Equal(selected.FinishedAt) && batch.BatchId > selected.BatchId) {
			copy := batch
			selected = &copy
		}
	}
	if selected == nil {
		return OrgSyncBatch{}, time.Time{}, time.Time{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorBatchUnavailable}
	}
	if selected.BatchId == "" || selected.OrgVersion == "" ||
		(!strings.EqualFold(selected.Status, OrgSyncBatchStatusSucceeded) && !strings.EqualFold(selected.Status, OrgSyncBatchStatusPartial)) ||
		!strings.EqualFold(selected.Freshness, PlatformFreshnessFresh) {
		return OrgSyncBatch{}, time.Time{}, time.Time{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorLineageInvalid}
	}
	generatedAt := selected.FinishedAt.UTC()
	if generatedAt.IsZero() {
		generatedAt = selected.UpdatedAt.UTC()
	}
	if generatedAt.IsZero() {
		generatedAt = input.Now.UTC()
	}
	expiresAt := generatedAt.Add(OrganizationSyncContractV2FreshnessTTL)
	if !expiresAt.After(input.Now.UTC()) {
		return OrgSyncBatch{}, time.Time{}, time.Time{}, &OrganizationSyncContractError{Code: OrganizationSyncContractErrorSourceUntrusted}
	}
	return *selected, generatedAt, expiresAt, nil
}

func buildOrganizationSyncContractV2Departments(input OrganizationSyncContractV2BuildInput, connection SourceConnection, batch OrgSyncBatch, diagnostics *OrganizationSyncContractV2Diagnostics) ([]OrganizationSyncContractV2Department, map[string]bool) {
	byID := map[string]OrganizationSyncContractV2Department{}
	departmentSet := map[string]bool{}
	for _, department := range input.Departments {
		if department.OrganizationId != input.OrganizationID || department.SourceConnectionId != connection.SourceConnectionId || department.OrgVersion != batch.OrgVersion {
			continue
		}
		departmentID := strings.TrimSpace(department.DepartmentId)
		if departmentID == "" {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonRelationNotCurrent]++
			continue
		}
		candidate := OrganizationSyncContractV2Department{
			DepartmentID: departmentID, ExternalDepartmentID: strings.TrimSpace(department.ExternalDepartmentId),
			ParentDepartmentID: strings.TrimSpace(department.ParentDepartmentId), DisplayName: strings.TrimSpace(department.DisplayName),
			LifecycleStatus: normalizeOrganizationSyncContractLifecycle(department.LifecycleStatus), MappingStatus: strings.ToLower(PlatformMappingStatusConfirmed),
			SourceConnectionID: connection.SourceConnectionId, SourceVersion: batch.OrgVersion, BatchID: batch.BatchId,
		}
		if existing, ok := byID[departmentID]; ok {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonRelationNotCurrent]++
			candidatePriority := organizationSyncContractLifecyclePriority(candidate.LifecycleStatus)
			existingPriority := organizationSyncContractLifecyclePriority(existing.LifecycleStatus)
			if candidatePriority < existingPriority || (candidatePriority == existingPriority && organizationSyncContractV2DepartmentSortKey(candidate) >= organizationSyncContractV2DepartmentSortKey(existing)) {
				continue
			}
		}
		departmentSet[departmentID] = true
		byID[departmentID] = candidate
	}
	result := make([]OrganizationSyncContractV2Department, 0, len(byID))
	for _, department := range byID {
		result = append(result, department)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].DepartmentID < result[j].DepartmentID })
	diagnostics.DepartmentCount = len(result)
	return result, departmentSet
}

type organizationSyncContractIdentity struct {
	stableSubjectID     string
	externalSubjectType string
	externalSubjectID   string
	mappingStatus       string
}

func buildOrganizationSyncContractV2Identities(input OrganizationSyncContractV2BuildInput, connection SourceConnection, batch OrgSyncBatch) map[string][]organizationSyncContractIdentity {
	result := map[string][]organizationSyncContractIdentity{}
	for _, identity := range input.ExternalIdentities {
		if identity.OrganizationId != input.OrganizationID || identity.SourceConnectionId != connection.SourceConnectionId || identity.LastSeenBatchId != batch.BatchId ||
			!IsConfirmedExternalIdentityMappingStatus(identity.MappingStatus) || identity.PlatformSubjectType != PlatformSubjectTypeUser {
			continue
		}
		stableSubjectID := strings.TrimSpace(identity.PlatformSubject)
		if stableSubjectID == "" || strings.TrimSpace(identity.ExternalSubjectId) == "" {
			continue
		}
		result[stableSubjectID] = append(result[stableSubjectID], organizationSyncContractIdentity{
			stableSubjectID: stableSubjectID, externalSubjectType: strings.TrimSpace(identity.ExternalSubjectType),
			externalSubjectID: strings.TrimSpace(identity.ExternalSubjectId), mappingStatus: strings.ToLower(identity.MappingStatus),
		})
	}
	return result
}

func buildOrganizationSyncContractV2Roles(input OrganizationSyncContractV2BuildInput) (map[string][]string, map[string][]string) {
	roles := map[string][]string{}
	positions := map[string][]string{}
	for _, mapping := range input.ApiUserMappings {
		if mapping.OrganizationId != input.OrganizationID || !IsConfirmedPlatformApiMappingStatus(mapping.MappingStatus) {
			continue
		}
		subject := strings.TrimSpace(mapping.AdminSubject)
		roles[subject] = append(roles[subject], gatewayProjectionLineageStringValues(mapping.Lineage, "roleIds")...)
		positions[subject] = append(positions[subject], gatewayProjectionLineageStringValues(mapping.Lineage, "positionIds")...)
	}
	for subject := range roles {
		roles[subject] = sortedUniqueGatewayProjectionStrings(roles[subject])
	}
	for subject := range positions {
		positions[subject] = sortedUniqueGatewayProjectionStrings(positions[subject])
	}
	return roles, positions
}

func buildOrganizationSyncContractV2Memberships(input OrganizationSyncContractV2BuildInput, connection SourceConnection, batch OrgSyncBatch, departmentSet map[string]bool, identities map[string][]organizationSyncContractIdentity, rolesBySubject map[string][]string, positionsBySubject map[string][]string, diagnostics *OrganizationSyncContractV2Diagnostics) ([]OrganizationSyncContractV2MemberRelation, []OrganizationSyncContractV2DepartmentLeaderRelation) {
	users := map[string]PlatformUser{}
	for _, user := range input.Users {
		if user.OrganizationId == input.OrganizationID && user.OrgVersion == batch.OrgVersion && user.LastSeenBatchId == batch.BatchId {
			users[strings.TrimSpace(user.AdminSubject)] = user
		}
	}
	mainCount := map[string]int{}
	for _, membership := range input.Memberships {
		subject := strings.TrimSpace(membership.AdminSubject)
		user, ok := users[subject]
		if membership.OrganizationId == input.OrganizationID && membership.SourceConnectionId == connection.SourceConnectionId && membership.OrgVersion == batch.OrgVersion && membership.IsMain && ok &&
			mergeOrganizationSyncContractLifecycle(membership.LifecycleStatus, user.LifecycleStatus, organizationSyncContractMappingLifecycle(user.MappingStatus)) == "active" {
			mainCount[subject]++
		}
	}
	memberships := append([]PlatformMembership(nil), input.Memberships...)
	sort.SliceStable(memberships, func(i, j int) bool {
		leftSubject := strings.TrimSpace(memberships[i].AdminSubject)
		rightSubject := strings.TrimSpace(memberships[j].AdminSubject)
		if leftSubject != rightSubject {
			return leftSubject < rightSubject
		}
		leftDepartment := strings.TrimSpace(memberships[i].DepartmentId)
		rightDepartment := strings.TrimSpace(memberships[j].DepartmentId)
		if leftDepartment != rightDepartment {
			return leftDepartment < rightDepartment
		}
		leftLifecycle := mergeOrganizationSyncContractLifecycle(memberships[i].LifecycleStatus, users[leftSubject].LifecycleStatus, organizationSyncContractMappingLifecycle(users[leftSubject].MappingStatus))
		rightLifecycle := mergeOrganizationSyncContractLifecycle(memberships[j].LifecycleStatus, users[rightSubject].LifecycleStatus, organizationSyncContractMappingLifecycle(users[rightSubject].MappingStatus))
		if organizationSyncContractLifecyclePriority(leftLifecycle) != organizationSyncContractLifecyclePriority(rightLifecycle) {
			return organizationSyncContractLifecyclePriority(leftLifecycle) > organizationSyncContractLifecyclePriority(rightLifecycle)
		}
		if memberships[i].IsMain != memberships[j].IsMain {
			return !memberships[i].IsMain
		}
		if memberships[i].IsManager != memberships[j].IsManager {
			return !memberships[i].IsManager
		}
		return memberships[i].Name < memberships[j].Name
	})
	result := []OrganizationSyncContractV2MemberRelation{}
	leaders := []OrganizationSyncContractV2DepartmentLeaderRelation{}
	seen := map[string]bool{}
	for _, membership := range memberships {
		subject := strings.TrimSpace(membership.AdminSubject)
		departmentID := strings.TrimSpace(membership.DepartmentId)
		if membership.OrganizationId != input.OrganizationID || membership.SourceConnectionId != connection.SourceConnectionId || membership.OrgVersion != batch.OrgVersion || subject == "" || !departmentSet[departmentID] {
			continue
		}
		identityRows := identities[subject]
		if len(identityRows) == 0 {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonIdentityMissing]++
			continue
		}
		if len(identityRows) != 1 {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonIdentityAmbiguous]++
			continue
		}
		user, ok := users[subject]
		if !ok {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonRelationNotCurrent]++
			continue
		}
		identity := identityRows[0]
		key := subject + "\x00" + departmentID
		if seen[key] {
			continue
		}
		seen[key] = true
		lifecycle := mergeOrganizationSyncContractLifecycle(membership.LifecycleStatus, user.LifecycleStatus, organizationSyncContractMappingLifecycle(user.MappingStatus))
		if lifecycle == "active" && mainCount[subject] > 1 {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonMainConflict]++
			continue
		}
		result = append(result, OrganizationSyncContractV2MemberRelation{
			StableSubjectID: subject, ExternalSubjectType: identity.externalSubjectType, ExternalSubjectID: identity.externalSubjectID,
			DepartmentID: departmentID, IsMain: membership.IsMain, LifecycleStatus: lifecycle,
			MappingStatus: identity.mappingStatus, SourceRoles: append([]string(nil), rolesBySubject[subject]...),
			SourcePositions: append([]string(nil), positionsBySubject[subject]...), SourceConnectionID: connection.SourceConnectionId,
			SourceVersion: batch.OrgVersion, BatchID: batch.BatchId,
		})
		if membership.IsManager {
			leaders = append(leaders, OrganizationSyncContractV2DepartmentLeaderRelation{
				LeaderStableSubjectID: subject, DepartmentID: departmentID, LifecycleStatus: lifecycle,
				SourceConnectionID: connection.SourceConnectionId, SourceVersion: batch.OrgVersion, BatchID: batch.BatchId,
			})
		}
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].StableSubjectID != result[j].StableSubjectID {
			return result[i].StableSubjectID < result[j].StableSubjectID
		}
		return result[i].DepartmentID < result[j].DepartmentID
	})
	sort.Slice(leaders, func(i, j int) bool {
		if leaders[i].LeaderStableSubjectID != leaders[j].LeaderStableSubjectID {
			return leaders[i].LeaderStableSubjectID < leaders[j].LeaderStableSubjectID
		}
		return leaders[i].DepartmentID < leaders[j].DepartmentID
	})
	diagnostics.MemberRelationCount = len(result)
	diagnostics.DepartmentLeaderCount = len(leaders)
	return result, leaders
}

func buildOrganizationSyncContractV2DirectLeaders(input OrganizationSyncContractV2BuildInput, connection SourceConnection, batch OrgSyncBatch, identities map[string][]organizationSyncContractIdentity, diagnostics *OrganizationSyncContractV2Diagnostics) []OrganizationSyncContractV2DirectLeaderRelation {
	if !strings.EqualFold(connection.SourceType, SourceTypeWecom) {
		return []OrganizationSyncContractV2DirectLeaderRelation{}
	}
	byExternalID := map[string]string{}
	conflicted := map[string]bool{}
	for subject, rows := range identities {
		for _, identity := range rows {
			if existing, ok := byExternalID[identity.externalSubjectID]; ok && existing != subject {
				conflicted[identity.externalSubjectID] = true
				continue
			}
			byExternalID[identity.externalSubjectID] = subject
		}
	}
	byKey := map[string]OrganizationSyncContractV2DirectLeaderRelation{}
	for _, relation := range input.WecomDirectLeaders {
		if relation.Organization != input.OrganizationID || strings.TrimSpace(relation.CorpId) != strings.TrimSpace(connection.SourceTenantId) {
			continue
		}
		lifecycle := ""
		if relation.IsEnabled && relation.LastSeenRunId == batch.BatchId {
			lifecycle = "active"
		} else if !relation.IsEnabled && relation.MissingSinceRunId == batch.BatchId {
			lifecycle = "disabled"
		} else {
			continue
		}
		subordinateID := strings.TrimSpace(relation.WecomUserId)
		leaderID := strings.TrimSpace(relation.LeaderWecomUserId)
		leader := byExternalID[leaderID]
		subordinate := byExternalID[subordinateID]
		if leader == "" || subordinate == "" || leader == subordinate || conflicted[leaderID] || conflicted[subordinateID] {
			diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonDirectLeaderUnmapped]++
			continue
		}
		key := leader + "\x00" + subordinate
		candidate := OrganizationSyncContractV2DirectLeaderRelation{
			LeaderStableSubjectID: leader, SubordinateStableSubjectID: subordinate, LifecycleStatus: lifecycle,
			SourceConnectionID: connection.SourceConnectionId, SourceVersion: batch.OrgVersion, BatchID: batch.BatchId,
		}
		if existing, ok := byKey[key]; ok && organizationSyncContractLifecyclePriority(existing.LifecycleStatus) >= organizationSyncContractLifecyclePriority(candidate.LifecycleStatus) {
			continue
		}
		byKey[key] = candidate
	}
	result := make([]OrganizationSyncContractV2DirectLeaderRelation, 0, len(byKey))
	for _, relation := range byKey {
		result = append(result, relation)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].LeaderStableSubjectID != result[j].LeaderStableSubjectID {
			return result[i].LeaderStableSubjectID < result[j].LeaderStableSubjectID
		}
		return result[i].SubordinateStableSubjectID < result[j].SubordinateStableSubjectID
	})
	diagnostics.DirectLeaderCount = len(result)
	return result
}

func organizationSyncContractV2Digest(snapshot *OrganizationSyncContractV2Snapshot) string {
	if snapshot == nil {
		return ""
	}
	copy := *snapshot
	copy.Lineage.Digest = ""
	raw, _ := json.Marshal(copy)
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func normalizeOrganizationSyncContractLifecycle(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	switch value {
	case PlatformLifecycleStatusActive:
		return "active"
	case PlatformLifecycleStatusDisabled:
		return "disabled"
	case PlatformLifecycleStatusDeleted:
		return "deleted"
	case PlatformLifecycleStatusConflicted:
		return "conflicted"
	default:
		return "unknown"
	}
}

func organizationSyncContractMappingLifecycle(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case PlatformMappingStatusConfirmed:
		return PlatformLifecycleStatusActive
	case PlatformMappingStatusDisabled:
		return PlatformLifecycleStatusDisabled
	case PlatformMappingStatusConflicted, PlatformMappingStatusDuplicate:
		return PlatformLifecycleStatusConflicted
	default:
		return PlatformLifecycleStatusUnknown
	}
}

// mergeOrganizationSyncContractLifecycle 保证只有所有输入层均为 active 时才输出 active。
// 任一层失效都会按 fail-closed 优先级保留为非 active 状态。
func mergeOrganizationSyncContractLifecycle(values ...string) string {
	result := "active"
	for _, value := range values {
		normalized := normalizeOrganizationSyncContractLifecycle(value)
		if organizationSyncContractLifecyclePriority(normalized) > organizationSyncContractLifecyclePriority(result) {
			result = normalized
		}
	}
	return result
}

func organizationSyncContractLifecyclePriority(value string) int {
	switch normalizeOrganizationSyncContractLifecycle(value) {
	case "deleted":
		return 4
	case "disabled":
		return 3
	case "conflicted":
		return 2
	case "unknown":
		return 1
	default:
		return 0
	}
}

func buildOrganizationSyncContractV2Organization(input OrganizationSyncContractV2BuildInput) OrganizationSyncContractV2Organization {
	result := OrganizationSyncContractV2Organization{OrganizationID: input.OrganizationID}
	if input.Organization != nil && strings.TrimSpace(input.Organization.Name) == input.OrganizationID {
		result.DisplayName = strings.TrimSpace(input.Organization.DisplayName)
	}
	return result
}

func buildOrganizationSyncContractV2Applications(input OrganizationSyncContractV2BuildInput) []OrganizationSyncContractV2Application {
	byName := map[string]OrganizationSyncContractV2Application{}
	for _, application := range input.Applications {
		if application == nil || strings.TrimSpace(application.Name) == "" || strings.TrimSpace(application.Organization) != input.OrganizationID {
			continue
		}
		candidate := OrganizationSyncContractV2Application{
			Name: strings.TrimSpace(application.Name), DisplayName: strings.TrimSpace(application.DisplayName),
			Category: strings.TrimSpace(application.Category), Type: strings.TrimSpace(application.Type), Organization: input.OrganizationID,
		}
		if existing, ok := byName[candidate.Name]; ok && organizationSyncContractV2ApplicationSortKey(existing) <= organizationSyncContractV2ApplicationSortKey(candidate) {
			continue
		}
		byName[candidate.Name] = candidate
	}
	result := make([]OrganizationSyncContractV2Application, 0, len(byName))
	for _, application := range byName {
		result = append(result, application)
	}
	sort.Slice(result, func(i, j int) bool {
		return organizationSyncContractV2ApplicationSortKey(result[i]) < organizationSyncContractV2ApplicationSortKey(result[j])
	})
	return result
}

func organizationSyncContractV2DepartmentSortKey(value OrganizationSyncContractV2Department) string {
	return strings.Join([]string{value.DepartmentID, value.LifecycleStatus, value.ParentDepartmentID, value.ExternalDepartmentID, value.DisplayName}, "\x00")
}

func organizationSyncContractV2ApplicationSortKey(value OrganizationSyncContractV2Application) string {
	return strings.Join([]string{value.Name, value.DisplayName, value.Category, value.Type, value.Organization}, "\x00")
}

func dereferenceOrganizationSyncSourceConnections(values []*SourceConnection) []SourceConnection {
	result := []SourceConnection{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncBatches(values []*OrgSyncBatch) []OrgSyncBatch {
	result := []OrgSyncBatch{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncPlatformUsers(values []*PlatformUser) []PlatformUser {
	result := []PlatformUser{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncPlatformDepartments(values []*PlatformDepartment) []PlatformDepartment {
	result := []PlatformDepartment{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncPlatformMemberships(values []*PlatformMembership) []PlatformMembership {
	result := []PlatformMembership{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncExternalIdentities(values []*ExternalIdentity) []ExternalIdentity {
	result := []ExternalIdentity{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncApiMappings(values []*PlatformApiUserMapping) []PlatformApiUserMapping {
	result := []PlatformApiUserMapping{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
func dereferenceOrganizationSyncWecomDirectLeaders(values []*WecomUserDirectLeader) []WecomUserDirectLeader {
	result := []WecomUserDirectLeader{}
	for _, value := range values {
		if value != nil {
			result = append(result, *value)
		}
	}
	return result
}
