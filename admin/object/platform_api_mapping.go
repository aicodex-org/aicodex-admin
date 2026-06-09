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
	"fmt"
	"strings"
	"time"

	"github.com/beego/beego/v2/core/logs"
	"github.com/xorm-io/core"
	"github.com/xorm-io/xorm"
)

const (
	PlatformApiMappingSourceManual    = "MANUAL"
	PlatformApiMappingSourceMigration = "MIGRATION"
	PlatformApiMappingSourceResolver  = "RESOLVER"

	PlatformApiMappingDefaultLineageSource  = "admin-console"
	PlatformApiMappingDefaultLineageAction  = "manual-update"
	PlatformApiMappingDefaultLineageReason  = "operator-maintained"
	PlatformApiMappingDefaultLineageVersion = 1
)

var (
	ErrPlatformApiOrganizationMappingMissing   = errors.New("confirmed api organization mapping is missing")
	ErrPlatformApiOrganizationMappingUntrusted = errors.New("api organization mapping is not confirmed")
	ErrPlatformApiUserMappingMissing           = errors.New("confirmed api user mapping is missing")
	ErrPlatformApiUserMappingUntrusted         = errors.New("api user mapping is not confirmed")
)

// PlatformApiOrganizationMapping 是 platform organization 到 aicodex-api organization UUID 的权威映射。
type PlatformApiOrganizationMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId    string `xorm:"varchar(100) notnull index unique" json:"organizationId"`
	ApiOrganizationId string `xorm:"varchar(100) index" json:"apiOrganizationId"`
	MappingStatus     string `xorm:"varchar(50) index" json:"mappingStatus"`
	MappingSource     string `xorm:"varchar(100) index" json:"mappingSource"`
	Lineage           string `xorm:"text" json:"lineage"`
}

// PlatformApiUserMapping 是 platform admin subject 到 aicodex-api user ID 的权威映射。
type PlatformApiUserMapping struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	OrganizationId string `xorm:"varchar(100) notnull index" json:"organizationId"`
	AdminSubject   string `xorm:"varchar(255) notnull index" json:"adminSubject"`
	ApiUserId      string `xorm:"varchar(100) index" json:"apiUserId"`
	MappingStatus  string `xorm:"varchar(50) index" json:"mappingStatus"`
	MappingSource  string `xorm:"varchar(100) index" json:"mappingSource"`
	Lineage        string `xorm:"text" json:"lineage"`
}

// PlatformApiMappingMigrationPlan 描述从旧属性/lineage 提取出的待确认 api 映射候选集合。
type PlatformApiMappingMigrationPlan struct {
	OrganizationMappings []*PlatformApiOrganizationMapping `json:"organizationMappings"`
	UserMappings         []*PlatformApiUserMapping         `json:"userMappings"`
}

// GetPlatformApiOrganizationMappingName 为组织映射生成稳定主键，避免名称依赖可变展示字段。
func GetPlatformApiOrganizationMappingName(organizationId string) string {
	return prefixedStableHash("api-org-map-", organizationId)
}

// GetPlatformApiUserMappingName 为用户映射生成稳定主键，键空间限定在 organizationId + adminSubject。
func GetPlatformApiUserMappingName(organizationId string, adminSubject string) string {
	return prefixedStableHash("api-user-map-", organizationId, adminSubject)
}

// BuildPlatformApiMappingMigrationPlan 只把旧自由属性和 ExternalIdentity lineage 转成候选映射。
// 候选数据必须人工确认；冲突值进入 CONFLICTED，避免迁移过程自动恢复运行时弱映射。
func BuildPlatformApiMappingMigrationPlan(organizationId string, users []*User, identities []ExternalIdentity) PlatformApiMappingMigrationPlan {
	organizationId = strings.TrimSpace(organizationId)
	plan := PlatformApiMappingMigrationPlan{}
	if organizationId == "" {
		return plan
	}

	orgValues := []string{}
	for _, user := range users {
		if user == nil || user.Owner != organizationId {
			continue
		}
		orgValues = append(orgValues, legacyStringPropertyValues(user.Properties, "aicodexApiOrganizationId", "aicodex_api_organization_id", "apiOrganizationId", "api_organization_id")...)
	}
	orgValues = sortedUniqueGatewayProjectionStrings(orgValues)
	if len(orgValues) > 0 {
		status := PlatformMappingStatusPendingReview
		apiOrganizationId := orgValues[0]
		if len(orgValues) > 1 {
			status = PlatformMappingStatusConflicted
			apiOrganizationId = ""
		}
		plan.OrganizationMappings = append(plan.OrganizationMappings, &PlatformApiOrganizationMapping{
			Owner:             organizationId,
			Name:              GetPlatformApiOrganizationMappingName(organizationId),
			OrganizationId:    organizationId,
			ApiOrganizationId: apiOrganizationId,
			MappingStatus:     status,
			MappingSource:     PlatformApiMappingSourceMigration,
			Lineage:           migrationLineageJSON("legacyUserProperties", orgValues),
		})
	}

	bySubject := map[string][]string{}
	for _, user := range users {
		if user == nil || user.Owner != organizationId {
			continue
		}
		adminSubject := getStableAdminSubject(user)
		if adminSubject == "" {
			continue
		}
		bySubject[adminSubject] = append(bySubject[adminSubject], legacyStringPropertyValues(user.Properties, "aicodexApiUserId", "aicodex_api_user_id", "apiUserId", "api_user_id")...)
	}
	for _, identity := range identities {
		if identity.OrganizationId != organizationId || identity.PlatformSubjectType != PlatformSubjectTypeUser {
			continue
		}
		adminSubject := strings.TrimSpace(identity.PlatformSubject)
		if adminSubject == "" {
			continue
		}
		bySubject[adminSubject] = append(bySubject[adminSubject], legacyLineageStringValues(identity.Lineage, "apiSubjectId", "api_subject_id", "aicodexApiUserId", "aicodex_api_user_id", "apiUserId", "api_user_id")...)
	}
	for adminSubject, values := range bySubject {
		values = sortedUniqueGatewayProjectionStrings(values)
		if len(values) == 0 {
			continue
		}
		status := PlatformMappingStatusPendingReview
		apiUserId := values[0]
		if len(values) > 1 {
			status = PlatformMappingStatusConflicted
			apiUserId = ""
		}
		plan.UserMappings = append(plan.UserMappings, &PlatformApiUserMapping{
			Owner:          organizationId,
			Name:           GetPlatformApiUserMappingName(organizationId, adminSubject),
			OrganizationId: organizationId,
			AdminSubject:   adminSubject,
			ApiUserId:      apiUserId,
			MappingStatus:  status,
			MappingSource:  PlatformApiMappingSourceMigration,
			Lineage:        migrationLineageJSON("legacyUserPropertiesOrExternalIdentityLineage", values),
		})
	}
	return plan
}

func legacyStringPropertyValues(properties map[string]string, keys ...string) []string {
	values := []string{}
	if properties == nil {
		return values
	}
	for _, key := range keys {
		values = append(values, splitGatewayProjectionList(properties[key])...)
	}
	return values
}

func legacyLineageStringValues(lineage string, keys ...string) []string {
	values := map[string]any{}
	if err := json.Unmarshal([]byte(lineage), &values); err != nil {
		return nil
	}
	result := []string{}
	for _, key := range keys {
		result = append(result, gatewayProjectionStringValues(values[key])...)
	}
	return result
}

func migrationLineageJSON(source string, values []string) string {
	payload := map[string]any{
		"source": source,
		"values": sortedUniqueGatewayProjectionStrings(values),
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func normalizePlatformApiMappingLineage(lineage string) string {
	lineage = strings.TrimSpace(lineage)
	if !shouldPopulateDefaultPlatformApiMappingLineage(lineage) {
		return lineage
	}
	return defaultPlatformApiMappingLineageJSON()
}

func shouldPopulateDefaultPlatformApiMappingLineage(lineage string) bool {
	if lineage == "" {
		return true
	}
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(lineage), &payload); err != nil {
		return false
	}
	return len(payload) == 0
}

func defaultPlatformApiMappingLineageJSON() string {
	payload := map[string]any{
		"source":  PlatformApiMappingDefaultLineageSource,
		"action":  PlatformApiMappingDefaultLineageAction,
		"reason":  PlatformApiMappingDefaultLineageReason,
		"version": PlatformApiMappingDefaultLineageVersion,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return `{"action":"manual-update","reason":"operator-maintained","source":"admin-console","version":1}`
	}
	return string(raw)
}

// IsConfirmedPlatformApiMappingStatus 判断映射状态是否可作为运行时权威映射消费。
func IsConfirmedPlatformApiMappingStatus(mappingStatus string) bool {
	return strings.EqualFold(strings.TrimSpace(mappingStatus), PlatformMappingStatusConfirmed)
}

// GetPlatformApiOrganizationMappingByOrganization 按 platform organizationId 查找一等 api organization 映射。
func GetPlatformApiOrganizationMappingByOrganization(organizationId string) (*PlatformApiOrganizationMapping, error) {
	organizationId = strings.TrimSpace(organizationId)
	if organizationId == "" || ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	mapping := &PlatformApiOrganizationMapping{}
	existed, err := ormer.Engine.Where("organization_id = ?", organizationId).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

// GetPlatformApiOrganizationMappings 返回后台管理页使用的 api organization 映射列表。
func GetPlatformApiOrganizationMappings(organizationId string) ([]*PlatformApiOrganizationMapping, error) {
	mappings := []*PlatformApiOrganizationMapping{}
	if ormer == nil || ormer.Engine == nil {
		return mappings, nil
	}
	session := ormer.Engine.Asc("organization_id")
	if strings.TrimSpace(organizationId) != "" {
		session = session.Where("organization_id = ?", strings.TrimSpace(organizationId))
	}
	err := session.Find(&mappings)
	return mappings, err
}

// GetConfirmedPlatformApiOrganizationMapping 只返回可作为运行时权威来源的 confirmed 映射。
func GetConfirmedPlatformApiOrganizationMapping(organizationId string) (*PlatformApiOrganizationMapping, error) {
	mapping, err := GetPlatformApiOrganizationMappingByOrganization(organizationId)
	if err != nil {
		return nil, err
	}
	if mapping == nil {
		return nil, ErrPlatformApiOrganizationMappingMissing
	}
	if !IsConfirmedPlatformApiMappingStatus(mapping.MappingStatus) || strings.TrimSpace(mapping.ApiOrganizationId) == "" {
		return nil, ErrPlatformApiOrganizationMappingUntrusted
	}
	return mapping, nil
}

// GetPlatformApiUserMappingByAdminSubject 按稳定 admin subject 查找一等 api user 映射。
func GetPlatformApiUserMappingByAdminSubject(organizationId string, adminSubject string) (*PlatformApiUserMapping, error) {
	organizationId = strings.TrimSpace(organizationId)
	adminSubject = strings.TrimSpace(adminSubject)
	if organizationId == "" || adminSubject == "" || ormer == nil || ormer.Engine == nil {
		return nil, nil
	}
	mapping := &PlatformApiUserMapping{}
	existed, err := ormer.Engine.Where("organization_id = ?", organizationId).And("admin_subject = ?", adminSubject).Get(mapping)
	if err != nil || !existed {
		return nil, err
	}
	return mapping, nil
}

// GetPlatformApiUserMappings 返回后台管理页使用的 api user 映射列表。
func GetPlatformApiUserMappings(organizationId string) ([]*PlatformApiUserMapping, error) {
	mappings := []*PlatformApiUserMapping{}
	if ormer == nil || ormer.Engine == nil {
		return mappings, nil
	}
	session := getPlatformApiUserMappingListSession(organizationId, "")
	err := session.Find(&mappings)
	return mappings, err
}

// GetPlatformApiUserMappingCount 返回后台用户映射列表分页总数。
func GetPlatformApiUserMappingCount(organizationId string, keyword string) (int64, error) {
	if ormer == nil || ormer.Engine == nil {
		return 0, nil
	}
	session := getPlatformApiUserMappingListSession(organizationId, keyword)
	return session.Count(&PlatformApiUserMapping{})
}

// GetPaginationPlatformApiUserMappings 返回后台用户映射列表的单页数据。
func GetPaginationPlatformApiUserMappings(organizationId string, offset int, limit int, keyword string) ([]*PlatformApiUserMapping, error) {
	mappings := []*PlatformApiUserMapping{}
	if ormer == nil || ormer.Engine == nil {
		return mappings, nil
	}
	session := getPlatformApiUserMappingListSession(organizationId, keyword)
	if limit > 0 {
		session = session.Limit(limit, offset)
	}
	err := session.Find(&mappings)
	return mappings, err
}

func getPlatformApiUserMappingListSession(organizationId string, keyword string) *xorm.Session {
	session := ormer.Engine.Asc("organization_id").Asc("admin_subject")
	if strings.TrimSpace(organizationId) != "" {
		session = session.Where("organization_id = ?", strings.TrimSpace(organizationId))
	}
	keyword = strings.TrimSpace(keyword)
	if keyword != "" {
		keywordLike := "%" + strings.ToLower(keyword) + "%"
		session = session.And("(LOWER(admin_subject) LIKE ? OR LOWER(api_user_id) LIKE ? OR LOWER(mapping_status) LIKE ? OR LOWER(mapping_source) LIKE ?)", keywordLike, keywordLike, keywordLike, keywordLike)
	}
	return session
}

// GetConfirmedPlatformApiUserMapping 只返回可作为运行时权威来源的 confirmed 用户映射。
func GetConfirmedPlatformApiUserMapping(organizationId string, adminSubject string) (*PlatformApiUserMapping, error) {
	mapping, err := GetPlatformApiUserMappingByAdminSubject(organizationId, adminSubject)
	if err != nil {
		return nil, err
	}
	if mapping == nil {
		return nil, ErrPlatformApiUserMappingMissing
	}
	if !IsConfirmedPlatformApiMappingStatus(mapping.MappingStatus) || strings.TrimSpace(mapping.ApiUserId) == "" {
		return nil, ErrPlatformApiUserMappingUntrusted
	}
	return mapping, nil
}

// SavePlatformApiOrganizationMapping 创建或更新组织映射，并在写入前阻止 apiOrganizationId 静默多对一。
func SavePlatformApiOrganizationMapping(mapping *PlatformApiOrganizationMapping) error {
	if mapping == nil {
		return fmt.Errorf("api organization mapping is required")
	}
	mapping.OrganizationId = strings.TrimSpace(mapping.OrganizationId)
	mapping.ApiOrganizationId = strings.TrimSpace(mapping.ApiOrganizationId)
	if mapping.OrganizationId == "" {
		return fmt.Errorf("organizationId is required")
	}
	mapping.Owner = firstNonEmpty(mapping.Owner, mapping.OrganizationId)
	mapping.Name = firstNonEmpty(mapping.Name, GetPlatformApiOrganizationMappingName(mapping.OrganizationId))
	mapping.MappingStatus = firstNonEmpty(mapping.MappingStatus, PlatformMappingStatusPendingReview)
	mapping.MappingSource = firstNonEmpty(mapping.MappingSource, PlatformApiMappingSourceManual)
	mapping.Lineage = normalizePlatformApiMappingLineage(mapping.Lineage)
	if err := validatePlatformApiOrganizationMappingUniqueness(mapping); err != nil {
		return err
	}
	existed, err := ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).Get(&PlatformApiOrganizationMapping{})
	if err != nil {
		return err
	}
	if !existed {
		_, err = ormer.Engine.Insert(mapping)
		return err
	}
	_, err = ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).AllCols().Update(mapping)
	return err
}

// SavePlatformApiUserMapping 创建或更新用户映射，并在写入前阻止同组织内 apiUserId 静默多对一。
func SavePlatformApiUserMapping(mapping *PlatformApiUserMapping) error {
	if mapping == nil {
		return fmt.Errorf("api user mapping is required")
	}
	mapping.OrganizationId = strings.TrimSpace(mapping.OrganizationId)
	mapping.AdminSubject = strings.TrimSpace(mapping.AdminSubject)
	mapping.ApiUserId = strings.TrimSpace(mapping.ApiUserId)
	if mapping.OrganizationId == "" || mapping.AdminSubject == "" {
		return fmt.Errorf("organizationId and adminSubject are required")
	}
	mapping.Owner = firstNonEmpty(mapping.Owner, mapping.OrganizationId)
	mapping.Name = firstNonEmpty(mapping.Name, GetPlatformApiUserMappingName(mapping.OrganizationId, mapping.AdminSubject))
	mapping.MappingStatus = firstNonEmpty(mapping.MappingStatus, PlatformMappingStatusPendingReview)
	mapping.MappingSource = firstNonEmpty(mapping.MappingSource, PlatformApiMappingSourceManual)
	mapping.Lineage = normalizePlatformApiMappingLineage(mapping.Lineage)
	if err := validatePlatformApiUserMappingUniqueness(mapping); err != nil {
		return err
	}
	existed, err := ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).Get(&PlatformApiUserMapping{})
	if err != nil {
		return err
	}
	if !existed {
		_, err = ormer.Engine.Insert(mapping)
		return err
	}
	_, err = ormer.Engine.ID(core.PK{mapping.Owner, mapping.Name}).AllCols().Update(mapping)
	return err
}

func validatePlatformApiOrganizationMappingUniqueness(mapping *PlatformApiOrganizationMapping) error {
	if mapping == nil || strings.TrimSpace(mapping.ApiOrganizationId) == "" || ormer == nil || ormer.Engine == nil {
		return nil
	}
	existing := &PlatformApiOrganizationMapping{}
	existed, err := ormer.Engine.Where("api_organization_id = ?", mapping.ApiOrganizationId).Get(existing)
	if err != nil || !existed {
		return err
	}
	if existing.Owner == mapping.Owner && existing.Name == mapping.Name {
		return nil
	}
	return fmt.Errorf("apiOrganizationId is already mapped to organizationId %s", existing.OrganizationId)
}

func validatePlatformApiUserMappingUniqueness(mapping *PlatformApiUserMapping) error {
	if mapping == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	existingBySubject := &PlatformApiUserMapping{}
	existed, err := ormer.Engine.Where("organization_id = ?", mapping.OrganizationId).And("admin_subject = ?", mapping.AdminSubject).Get(existingBySubject)
	if err != nil || !existed {
		if err != nil {
			return err
		}
	} else if existingBySubject.Owner != mapping.Owner || existingBySubject.Name != mapping.Name {
		return fmt.Errorf("adminSubject is already mapped in organizationId %s", mapping.OrganizationId)
	}

	if strings.TrimSpace(mapping.ApiUserId) == "" {
		return nil
	}
	existingByApiUser := &PlatformApiUserMapping{}
	existed, err = ormer.Engine.Where("organization_id = ?", mapping.OrganizationId).And("api_user_id = ?", mapping.ApiUserId).Get(existingByApiUser)
	if err != nil || !existed {
		return err
	}
	if existingByApiUser.Owner == mapping.Owner && existingByApiUser.Name == mapping.Name {
		return nil
	}
	return fmt.Errorf("apiUserId is already mapped to adminSubject %s in organizationId %s", existingByApiUser.AdminSubject, existingByApiUser.OrganizationId)
}

// ValidateApplicationApiMappingGate 在面向 aicodex-api 的 application 上执行 confirmed mapping gate。
// 任何组织或用户映射缺失/不可信都必须 fail closed，不能回退到旧属性或弱标识。
func ValidateApplicationApiMappingGate(application *Application, user *User) error {
	if application == nil || user == nil || !application.RequiresApiMappingGate() {
		return nil
	}
	organizationId := getTokenOrganization(application, user)
	if organizationId == "" {
		writePlatformApiMappingGateAudit(application, user, organizationId, "error", "ORGANIZATION_MISSING")
		return ErrPlatformApiOrganizationMappingMissing
	}
	if _, err := GetConfirmedPlatformApiOrganizationMapping(organizationId); err != nil {
		writePlatformApiMappingGateAudit(application, user, organizationId, "error", platformApiMappingGateErrorCode(err, "ORGANIZATION_UNTRUSTED"))
		return err
	}
	adminSubject := getStableAdminSubject(user)
	if adminSubject == "" {
		writePlatformApiMappingGateAudit(application, user, organizationId, "error", "ADMIN_SUBJECT_MISSING")
		return ErrPlatformApiUserMappingMissing
	}
	if _, err := GetConfirmedPlatformApiUserMapping(organizationId, adminSubject); err != nil {
		writePlatformApiMappingGateAudit(application, user, organizationId, "error", platformApiMappingGateErrorCode(err, "USER_UNTRUSTED"))
		return err
	}
	return nil
}

// ValidateApplicationUserTokenContext 先按用户所属组织绑定 application，再执行 API 映射 gate。
// token/refresh/token-exchange 等非页面入口也必须走同一组织解析规则，避免 shared application 使用持久化默认组织绕过多租户边界。
func ValidateApplicationUserTokenContext(application *Application, user *User) error {
	if application == nil || user == nil {
		return nil
	}
	if user.Owner != "" {
		if err := ResolveApplicationLoginOrganization(application, user.Owner); err != nil {
			return err
		}
	}
	return ValidateApplicationApiMappingGate(application, user)
}

func platformApiMappingGateErrorCode(err error, fallback string) string {
	switch {
	case errors.Is(err, ErrPlatformApiOrganizationMappingMissing):
		return "ORGANIZATION_MAPPING_MISSING"
	case errors.Is(err, ErrPlatformApiOrganizationMappingUntrusted):
		return "ORGANIZATION_MAPPING_UNTRUSTED"
	case errors.Is(err, ErrPlatformApiUserMappingMissing):
		return "USER_MAPPING_MISSING"
	case errors.Is(err, ErrPlatformApiUserMappingUntrusted):
		return "USER_MAPPING_UNTRUSTED"
	default:
		return fallback
	}
}

func writePlatformApiMappingGateAudit(application *Application, user *User, organizationId string, status string, errorCode string) {
	applicationId := ""
	clientId := ""
	if application != nil {
		applicationId = application.GetId()
		clientId = strings.TrimSpace(application.ClientId)
	}
	adminSubject := ""
	if user != nil {
		adminSubject = getStableAdminSubject(user)
	}
	logs.Info("platform_api_mapping_gate_audit applicationId=%s clientId=%s organizationId=%s adminSubjectHash=%s status=%s errorCode=%s",
		applicationId,
		clientId,
		strings.TrimSpace(organizationId),
		hashPlatformApiMappingAuditValue(adminSubject),
		status,
		errorCode)
}

// hashPlatformApiMappingAuditValue 用于审计日志脱敏；日志只保留可关联的哈希，不输出 admin subject 明文。
func hashPlatformApiMappingAuditValue(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(value))
	return "sha256:" + hex.EncodeToString(sum[:])
}
