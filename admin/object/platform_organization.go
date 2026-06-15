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
	"strings"
	"time"
)

const (
	SourceTypeWecom  = "wecom"
	SourceTypeLark   = "lark"
	SourceTypeCustom = "custom"

	PlatformSubjectTypeOrganization = "organization"
	PlatformSubjectTypeUser         = "user"
	PlatformSubjectTypeDepartment   = "department"
	PlatformSubjectTypeService      = "service-account"

	PlatformMappingStatusConfirmed     = "CONFIRMED"
	PlatformMappingStatusPendingReview = "PENDING_REVIEW"
	PlatformMappingStatusDuplicate     = "DUPLICATE"
	PlatformMappingStatusConflicted    = "CONFLICTED"
	PlatformMappingStatusDisabled      = "DISABLED"

	PlatformLifecycleStatusActive     = "ACTIVE"
	PlatformLifecycleStatusDisabled   = "DISABLED"
	PlatformLifecycleStatusDeleted    = "DELETED"
	PlatformLifecycleStatusStale      = "STALE"
	PlatformLifecycleStatusUnknown    = "UNKNOWN"
	PlatformLifecycleStatusConflicted = "CONFLICTED"

	PlatformFreshnessFresh       = "FRESH"
	PlatformFreshnessStale       = "STALE"
	PlatformFreshnessUnknown     = "UNKNOWN"
	PlatformFreshnessUnavailable = "UNAVAILABLE"

	SourceConnectionStatusActive   = "ACTIVE"
	SourceConnectionStatusDisabled = "DISABLED"
	SourceConnectionStatusError    = "ERROR"

	OrgSyncBatchStatusRunning   = "RUNNING"
	OrgSyncBatchStatusSucceeded = "SUCCEEDED"
	OrgSyncBatchStatusPartial   = "PARTIAL"
	OrgSyncBatchStatusFailed    = "FAILED"
)

// PlatformOrganization 是 admin 内部平台组织边界，外部来源租户 ID 只能挂在 SourceConnection 上。
type PlatformOrganization struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId     string `xorm:"varchar(100) notnull unique index" json:"organizationId"`
	DisplayName        string `xorm:"varchar(255)" json:"displayName"`
	LifecycleStatus    string `xorm:"varchar(50) index" json:"lifecycleStatus"`
	OrgVersion         string `xorm:"varchar(100) index" json:"orgVersion"`
	Freshness          string `xorm:"varchar(50) index" json:"freshness"`
	SourceConnectionId string `xorm:"varchar(100) index" json:"sourceConnectionId"`
}

// PlatformUser 表达 admin 稳定用户主体及其组织生命周期状态。
type PlatformUser struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId  string `xorm:"varchar(100) notnull index unique(platform_user_subject)" json:"organizationId"`
	AdminSubject    string `xorm:"varchar(255) notnull index unique(platform_user_subject)" json:"adminSubject"`
	UserOwner       string `xorm:"varchar(100) index" json:"userOwner"`
	UserName        string `xorm:"varchar(255) index" json:"userName"`
	DisplayName     string `xorm:"varchar(255)" json:"displayName"`
	LifecycleStatus string `xorm:"varchar(50) index" json:"lifecycleStatus"`
	MappingStatus   string `xorm:"varchar(50) index" json:"mappingStatus"`
	OrgVersion      string `xorm:"varchar(100) index" json:"orgVersion"`
	LastSeenBatchId string `xorm:"varchar(100) index" json:"lastSeenBatchId"`
}

// PlatformDepartment 是 source-neutral 部门节点，来源部门 ID 只作为 lineage。
type PlatformDepartment struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId       string `xorm:"varchar(100) notnull index unique(platform_department_id)" json:"organizationId"`
	DepartmentId         string `xorm:"varchar(100) notnull index unique(platform_department_id)" json:"departmentId"`
	ParentDepartmentId   string `xorm:"varchar(100) index" json:"parentDepartmentId"`
	DisplayName          string `xorm:"varchar(255)" json:"displayName"`
	LifecycleStatus      string `xorm:"varchar(50) index" json:"lifecycleStatus"`
	SourceConnectionId   string `xorm:"varchar(100) index" json:"sourceConnectionId"`
	ExternalDepartmentId string `xorm:"varchar(255) index" json:"externalDepartmentId"`
	OrgVersion           string `xorm:"varchar(100) index" json:"orgVersion"`
}

// PlatformMembership 记录平台用户与平台部门的关系和负责人语义。
type PlatformMembership struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId     string `xorm:"varchar(100) notnull index unique(platform_membership_subject)" json:"organizationId"`
	AdminSubject       string `xorm:"varchar(255) notnull index unique(platform_membership_subject)" json:"adminSubject"`
	DepartmentId       string `xorm:"varchar(100) notnull index unique(platform_membership_subject)" json:"departmentId"`
	IsMain             bool   `xorm:"bool index" json:"isMain"`
	IsManager          bool   `xorm:"bool index" json:"isManager"`
	IsDirectLeader     bool   `xorm:"bool index" json:"isDirectLeader"`
	LifecycleStatus    string `xorm:"varchar(50) index" json:"lifecycleStatus"`
	SourceConnectionId string `xorm:"varchar(100) index" json:"sourceConnectionId"`
	OrgVersion         string `xorm:"varchar(100) index" json:"orgVersion"`
}

// SourceConnection 表达某个平台组织绑定的一个外部来源连接。
type SourceConnection struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId     string `xorm:"varchar(100) notnull index unique(source_connection_source)" json:"organizationId"`
	SourceConnectionId string `xorm:"varchar(100) notnull index unique" json:"sourceConnectionId"`
	SourceType         string `xorm:"varchar(100) notnull index unique(source_connection_source)" json:"sourceType"`
	SourceTenantId     string `xorm:"varchar(255) index unique(source_connection_source)" json:"sourceTenantId"`
	Status             string `xorm:"varchar(50) index" json:"status"`
	Freshness          string `xorm:"varchar(50) index" json:"freshness"`
	Metadata           string `xorm:"text" json:"metadata"`
	ConfigRef          string `xorm:"varchar(255) index" json:"configRef"`
	SecretRef          string `xorm:"varchar(255)" json:"secretRef"`
	LastSeenBatchId    string `xorm:"varchar(100) index" json:"lastSeenBatchId"`
}

// ExternalIdentity 使用 sourceConnectionId + externalSubjectId 作为稳定外部身份根键。
type ExternalIdentity struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId      string `xorm:"varchar(100) notnull index" json:"organizationId"`
	SourceConnectionId  string `xorm:"varchar(100) notnull index unique(external_identity_subject)" json:"sourceConnectionId"`
	ExternalSubjectType string `xorm:"varchar(50) index" json:"externalSubjectType"`
	ExternalSubjectId   string `xorm:"varchar(255) notnull index unique(external_identity_subject)" json:"externalSubjectId"`
	PlatformSubjectType string `xorm:"varchar(50) index" json:"platformSubjectType"`
	PlatformSubject     string `xorm:"varchar(255) index" json:"platformSubject"`
	MappingStatus       string `xorm:"varchar(50) index" json:"mappingStatus"`
	Lineage             string `xorm:"text" json:"lineage"`
	LastSeenBatchId     string `xorm:"varchar(100) index" json:"lastSeenBatchId"`
}

// LifecycleEvent 记录会影响 scope/org version 的生命周期变化。
type LifecycleEvent struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId  string    `xorm:"varchar(100) notnull index" json:"organizationId"`
	SubjectType     string    `xorm:"varchar(50) notnull index" json:"subjectType"`
	Subject         string    `xorm:"varchar(255) notnull index" json:"subject"`
	LifecycleStatus string    `xorm:"varchar(50) index" json:"lifecycleStatus"`
	Reason          string    `xorm:"varchar(255)" json:"reason"`
	BatchId         string    `xorm:"varchar(100) index" json:"batchId"`
	OccurredAt      time.Time `xorm:"timestampz index" json:"occurredAt"`
}

// OrgSyncBatch 记录一次来源同步批次、版本、新鲜度和安全错误摘要。
type OrgSyncBatch struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId     string    `xorm:"varchar(100) notnull index" json:"organizationId"`
	SourceConnectionId string    `xorm:"varchar(100) index" json:"sourceConnectionId"`
	BatchId            string    `xorm:"varchar(100) notnull index unique" json:"batchId"`
	Status             string    `xorm:"varchar(50) index" json:"status"`
	StartedAt          time.Time `xorm:"timestampz index" json:"startedAt"`
	FinishedAt         time.Time `xorm:"timestampz" json:"finishedAt"`
	OrgVersion         string    `xorm:"varchar(100) index" json:"orgVersion"`
	Freshness          string    `xorm:"varchar(50) index" json:"freshness"`
	ErrorCode          string    `xorm:"varchar(100)" json:"errorCode"`
	ErrorText          string    `xorm:"text" json:"errorText"`
}

// PlatformVersionMetadata 是 admin provider 对外暴露的组织快照元数据。
// 这里的 orgVersion/scopeVersion 描述 admin 范围快照，不等同于 gateway projection 的数值版本。
type PlatformVersionMetadata struct {
	OrgVersion   string    `json:"orgVersion"`
	ScopeVersion string    `json:"scopeVersion"`
	Freshness    string    `json:"freshness"`
	GeneratedAt  time.Time `json:"generatedAt"`
	TraceId      string    `json:"traceId"`
}

// GetSourceConnectionId 以平台组织、来源类型和来源租户生成稳定来源连接 ID。
func GetSourceConnectionId(organizationId string, sourceType string, sourceTenantId string) string {
	return prefixedStableHash("src-", organizationId, sourceType, sourceTenantId)
}

// GetExternalIdentityName 以来源连接和来源主体生成稳定外部身份根键。
func GetExternalIdentityName(sourceConnectionId string, externalSubjectType string, externalSubjectId string) string {
	return prefixedStableHash("eid-", sourceConnectionId, externalSubjectType, externalSubjectId)
}

// GetPlatformDepartmentName 以平台组织和 source-neutral 部门 ID 生成稳定部门记录名。
func GetPlatformDepartmentName(organizationId string, departmentId string) string {
	return prefixedStableHash("dept-", organizationId, departmentId)
}

// GetPlatformDepartments 返回指定平台组织下的部门投影，供 provider 补充来源连接和生命周期元数据。
func GetPlatformDepartments(organizationId string) ([]*PlatformDepartment, error) {
	departments := []*PlatformDepartment{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return departments, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&departments)
	return departments, err
}

// GetPlatformUsers 返回指定平台组织下的稳定用户主体，用于 admin-only 诊断展示。
func GetPlatformUsers(organizationId string) ([]*PlatformUser, error) {
	users := []*PlatformUser{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return users, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&users)
	return users, err
}

// GetPlatformMemberships 返回指定平台组织下的成员关系，供 scope 和组织树 read model 复用同一主模型口径。
func GetPlatformMemberships(organizationId string) ([]*PlatformMembership, error) {
	memberships := []*PlatformMembership{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return memberships, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&memberships)
	return memberships, err
}

// GetExternalIdentities 返回指定平台组织下的外部身份映射，用于诊断来源身份和 mapping 状态。
func GetExternalIdentities(organizationId string) ([]*ExternalIdentity, error) {
	identities := []*ExternalIdentity{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return identities, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&identities)
	return identities, err
}

func GetPlatformMembershipName(organizationId string, adminSubject string, departmentId string) string {
	return prefixedStableHash("mem-", organizationId, adminSubject, departmentId)
}

// GetSourceConnections 返回平台组织下的来源连接脱敏元数据。
func GetSourceConnections(organizationId string) ([]*SourceConnection, error) {
	connections := []*SourceConnection{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return connections, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&connections)
	return connections, err
}

// GetOrgSyncBatches 返回平台组织下的来源同步批次，调用方负责选择最新可用版本。
func GetOrgSyncBatches(organizationId string) ([]*OrgSyncBatch, error) {
	batches := []*OrgSyncBatch{}
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" {
		return batches, nil
	}
	err := ormer.Engine.Where("organization_id = ?", organizationId).Find(&batches)
	return batches, err
}

// GetLifecycleEventName 将生命周期事件的主体、批次和发生时间纳入幂等键，避免不同批次状态变更互相覆盖。
func GetLifecycleEventName(organizationId string, subjectType string, subject string, batchId string, occurredAt time.Time) string {
	return prefixedStableHash("life-", organizationId, subjectType, subject, batchId, occurredAt.UTC().Format(time.RFC3339Nano))
}

// NewPlatformVersionMetadata 用组织、来源连接、同步批次和生成时间派生确定性版本。
// provider 消费方用它判断同一 admin scope 快照的新鲜度和追踪信息，而不是作为 gateway 授权投影版本。
func NewPlatformVersionMetadata(organizationId string, sourceConnectionId string, batchId string, generatedAt time.Time, traceId string) PlatformVersionMetadata {
	orgVersion := prefixedStableHash("orgv-", organizationId, sourceConnectionId, batchId, generatedAt.UTC().Format("2006-01-02T15:04:05Z"))
	scopeVersion := prefixedStableHash("scopev-", organizationId, orgVersion)
	return PlatformVersionMetadata{
		OrgVersion:   orgVersion,
		ScopeVersion: scopeVersion,
		Freshness:    PlatformFreshnessFresh,
		GeneratedAt:  generatedAt,
		TraceId:      traceId,
	}
}

// IsAllowedExternalIdentityAutoJoinField 限制自动合并只能使用稳定身份字段。
// 姓名、手机号、邮箱等弱标识只允许用于诊断候选，不能驱动外部身份自动绑定。
func IsAllowedExternalIdentityAutoJoinField(field string) bool {
	switch normalizePlatformFieldName(field) {
	case "sourceconnectionid", "externalsubjectid", "adminsubject":
		return true
	default:
		return false
	}
}

// IsConfirmedExternalIdentityMappingStatus 是 provider 读取外部身份前的 fail-closed 判断。
func IsConfirmedExternalIdentityMappingStatus(mappingStatus string) bool {
	return strings.EqualFold(strings.TrimSpace(mappingStatus), PlatformMappingStatusConfirmed)
}

// IsPlatformLifecycleStatusUsableForScope 只允许 active 主体进入管理范围和报表 scope。
func IsPlatformLifecycleStatusUsableForScope(lifecycleStatus string) bool {
	return strings.EqualFold(strings.TrimSpace(lifecycleStatus), PlatformLifecycleStatusActive)
}

func prefixedStableHash(prefix string, parts ...string) string {
	normalized := make([]string, len(parts))
	for i, part := range parts {
		normalized[i] = strings.TrimSpace(part)
	}
	sum := sha256.Sum256([]byte(strings.Join(normalized, "\x1f")))
	return prefix + hex.EncodeToString(sum[:])
}

func normalizePlatformFieldName(field string) string {
	normalized := strings.ToLower(strings.TrimSpace(field))
	normalized = strings.ReplaceAll(normalized, "_", "")
	normalized = strings.ReplaceAll(normalized, "-", "")
	return normalized
}
