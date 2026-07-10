package controllers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

const (
	insightAccessPackageSchemaVersion = "aicodex.insight.access-package.v1"
	insightAccessPackageTarget        = "insight.connection-profile.import"
	insightAdminAccessPackageSchema   = "aicodex.admin.insightAdminAccessPackage"
	insightAdminAccessPackageVersion  = "2026-07-09"
)

var adminSecureHandoffGrantServiceFactory = func() *object.AdminSecureHandoffGrantService {
	return &object.AdminSecureHandoffGrantService{}
}

type insightAdminAccessPackageCreateRequest struct {
	CopySafeMetadata     json.RawMessage `json:"copySafeMetadata"`
	TargetRegistrationId string          `json:"targetRegistrationId,omitempty"`
	TargetWorkspaceId    string          `json:"targetWorkspaceId,omitempty"`
	EnvironmentId        string          `json:"environmentId,omitempty"`
	Audience             string          `json:"audience,omitempty"`
	TTLSeconds           int             `json:"ttlSeconds,omitempty"`
}

type insightAdminAccessPackageMetadataSummary struct {
	GeneratedAt         string `json:"generatedAt,omitempty"`
	TargetConsumerAlias string `json:"targetConsumerAlias,omitempty"`
	AdminOwnerAlias     string `json:"adminOwnerAlias,omitempty"`
	InsightProfile      struct {
		TargetConsumerAlias string `json:"targetConsumerAlias,omitempty"`
		AdminOwnerAlias     string `json:"adminOwnerAlias,omitempty"`
	} `json:"insightProfile,omitempty"`
}

type insightAdminAccessPackageResponse struct {
	SchemaVersion       string                                 `json:"schemaVersion"`
	Target              string                                 `json:"target"`
	LegacySchema        string                                 `json:"legacySchema,omitempty"`
	LegacyVersion       string                                 `json:"legacyVersion,omitempty"`
	PackageType         string                                 `json:"packageType"`
	Source              string                                 `json:"source"`
	GeneratedAt         string                                 `json:"generatedAt"`
	TargetConsumerAlias string                                 `json:"targetConsumerAlias"`
	AdminOwnerAlias     string                                 `json:"adminOwnerAlias"`
	CopySafeHandoff     json.RawMessage                        `json:"copySafeHandoff"`
	CopySafeMetadata    json.RawMessage                        `json:"copySafeMetadata"`
	SecureHandoffGrant  object.AdminSecureHandoffGrantEnvelope `json:"secureHandoffGrant"`
	FallbackBindingMode string                                 `json:"fallbackBindingMode"`
	NextAction          string                                 `json:"nextAction"`
}

type adminSecureHandoffGrantFailRequest struct {
	ReasonCode string `json:"reasonCode"`
}

type adminSecureHandoffGrantRedeemResponse struct {
	GrantId             string `json:"grantId"`
	Status              string `json:"status"`
	ReasonCode          string `json:"reasonCode,omitempty"`
	ExpiresAt           string `json:"expiresAt,omitempty"`
	DeliveredAt         string `json:"deliveredAt,omitempty"`
	ConfirmedAt         string `json:"confirmedAt,omitempty"`
	TraceMarker         string `json:"traceMarker"`
	CredentialSuffix    string `json:"credentialSuffix,omitempty"`
	CredentialReference string `json:"credentialReference,omitempty"`
	CredentialMaterial  string `json:"credentialMaterial,omitempty"`
}

// CreateInsightAdminProviderAccessPackage 生成 operator 可复制的组合包：
// copy-safe metadata + secure handoff grant envelope。响应不包含凭据材料。
func (c *ApiController) CreateInsightAdminProviderAccessPackage() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	var request insightAdminAccessPackageCreateRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	accessPackage, err := buildInsightAdminAccessPackage(request, adminSecureHandoffGrantServiceFactory())
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(accessPackage)
}

// CreateInsightAdminProviderSecureHandoffGrant 只返回脱敏 grant envelope，用于 owner registry 对齐测试。
func (c *ApiController) CreateInsightAdminProviderSecureHandoffGrant() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	var request object.AdminSecureHandoffCreateGrantRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	result, err := adminSecureHandoffGrantServiceFactory().CreateGrant(request)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(result)
}

// RedeemInsightAdminProviderSecureHandoffGrant 仅供 Insight 后端按 owner registry 兑换。
// 成功时 credentialMaterial 只在本响应出现一次，状态查询和组合包不会回显。
func (c *ApiController) RedeemInsightAdminProviderSecureHandoffGrant() {
	var request object.AdminSecureHandoffRedeemGrantRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	request.GrantId = firstNonEmptyInsightString(request.GrantId, c.Ctx.Input.Param(":grantId"))
	response, err := adminSecureHandoffGrantServiceFactory().RedeemGrant(request)
	redeemResponse := buildAdminSecureHandoffGrantRedeemResponse(response)
	if err != nil {
		c.ResponseError(err.Error(), redeemResponse)
		return
	}
	c.ResponseOk(redeemResponse)
}

func (c *ApiController) ConfirmInsightAdminProviderSecureHandoffGrant() {
	var request object.AdminSecureHandoffConfirmGrantRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	request.GrantId = firstNonEmptyInsightString(request.GrantId, c.Ctx.Input.Param(":grantId"))
	response, err := adminSecureHandoffGrantServiceFactory().ConfirmGrant(request)
	if err != nil {
		c.ResponseError(err.Error(), response)
		return
	}
	c.ResponseOk(response)
}

func (c *ApiController) FailInsightAdminProviderSecureHandoffGrant() {
	var request adminSecureHandoffGrantFailRequest
	if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
		c.ResponseError(err.Error())
		return
	}
	response, err := adminSecureHandoffGrantServiceFactory().FailGrant(c.Ctx.Input.Param(":grantId"), request.ReasonCode)
	if err != nil {
		c.ResponseError(err.Error(), response)
		return
	}
	c.ResponseOk(response)
}

func (c *ApiController) RevokeInsightAdminProviderSecureHandoffGrant() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	var request adminSecureHandoffGrantFailRequest
	if len(c.Ctx.Input.RequestBody) > 0 {
		if err := json.Unmarshal(c.Ctx.Input.RequestBody, &request); err != nil {
			c.ResponseError(err.Error())
			return
		}
	}
	response, err := adminSecureHandoffGrantServiceFactory().RevokeGrant(c.Ctx.Input.Param(":grantId"), request.ReasonCode)
	if err != nil {
		c.ResponseError(err.Error(), response)
		return
	}
	c.ResponseOk(response)
}

func (c *ApiController) GetInsightAdminProviderSecureHandoffGrantStatus() {
	if !c.requireServiceCredentialGovernanceGlobalAdmin() {
		return
	}
	response, err := adminSecureHandoffGrantServiceFactory().QueryGrantStatus(c.Ctx.Input.Param(":grantId"))
	if err != nil {
		c.ResponseError(err.Error(), response)
		return
	}
	c.ResponseOk(response)
}

func buildInsightAdminAccessPackage(request insightAdminAccessPackageCreateRequest, service *object.AdminSecureHandoffGrantService) (insightAdminAccessPackageResponse, error) {
	copySafeMetadata, err := normalizeInsightAdminAccessPackageCopySafeMetadata(request.CopySafeMetadata)
	if err != nil {
		return insightAdminAccessPackageResponse{}, err
	}
	metadataSummary := insightAdminAccessPackageMetadataSummary{}
	_ = json.Unmarshal(copySafeMetadata, &metadataSummary)
	targetConsumerAlias := firstNonEmptyInsightString(metadataSummary.TargetConsumerAlias, metadataSummary.InsightProfile.TargetConsumerAlias, "insight_business_service_access")
	adminOwnerAlias := firstNonEmptyInsightString(metadataSummary.AdminOwnerAlias, metadataSummary.InsightProfile.AdminOwnerAlias, "admin_identity_application_access")
	generatedAt := firstNonEmptyInsightString(metadataSummary.GeneratedAt, time.Now().UTC().Format(time.RFC3339))
	packageHash := hashInsightAdminAccessPackageMetadata(copySafeMetadata)
	grantResult, err := service.CreateGrant(object.AdminSecureHandoffCreateGrantRequest{
		TargetRegistrationId: firstNonEmptyInsightString(request.TargetRegistrationId, "insight-profile-import-v1"),
		TargetWorkspaceId:    firstNonEmptyInsightString(request.TargetWorkspaceId, targetConsumerAlias),
		EnvironmentId:        firstNonEmptyInsightString(request.EnvironmentId, "admin-runtime"),
		ProviderType:         object.AdminSecureHandoffProviderType,
		Audience:             firstNonEmptyInsightString(request.Audience, "insight_profile_admin_handoff"),
		PackageHash:          packageHash,
		TTLSeconds:           request.TTLSeconds,
	})
	if err != nil {
		return insightAdminAccessPackageResponse{}, err
	}
	return insightAdminAccessPackageResponse{
		SchemaVersion:       insightAccessPackageSchemaVersion,
		Target:              insightAccessPackageTarget,
		LegacySchema:        insightAdminAccessPackageSchema,
		LegacyVersion:       insightAdminAccessPackageVersion,
		PackageType:         "insight_admin_access_package",
		Source:              "admin_owner_secure_handoff",
		GeneratedAt:         generatedAt,
		TargetConsumerAlias: targetConsumerAlias,
		AdminOwnerAlias:     adminOwnerAlias,
		CopySafeHandoff:     copySafeMetadata,
		CopySafeMetadata:    copySafeMetadata,
		SecureHandoffGrant:  grantResult.SecureHandoffGrant,
		FallbackBindingMode: "manual_or_secret_ref",
		NextAction:          "导入 Insight Profile 后由 Insight 后端兑换 secure handoff grant 并完成凭据绑定；兑换失败时再使用 manual/secretRef fallback。",
	}, nil
}

func normalizeInsightAdminAccessPackageCopySafeMetadata(metadata json.RawMessage) (json.RawMessage, error) {
	if len(metadata) == 0 {
		return nil, errors.New("copy-safe metadata is required")
	}
	var normalized interface{}
	if err := json.Unmarshal(metadata, &normalized); err != nil {
		return nil, err
	}
	compacted, err := json.Marshal(normalized)
	if err != nil {
		return nil, err
	}
	if object.ContainsServiceCredentialGovernanceSensitiveMaterial(string(compacted)) {
		return nil, errors.New("copy-safe metadata contains unsupported sensitive material")
	}
	return json.RawMessage(compacted), nil
}

func hashInsightAdminAccessPackageMetadata(metadata json.RawMessage) string {
	sum := sha256.Sum256(metadata)
	return "sha256:" + hex.EncodeToString(sum[:])
}

func buildAdminSecureHandoffGrantRedeemResponse(response object.AdminSecureHandoffGrantStatusResponse) adminSecureHandoffGrantRedeemResponse {
	return adminSecureHandoffGrantRedeemResponse{
		GrantId:             response.GrantId,
		Status:              response.Status,
		ReasonCode:          response.ReasonCode,
		ExpiresAt:           response.ExpiresAt,
		DeliveredAt:         response.DeliveredAt,
		ConfirmedAt:         response.ConfirmedAt,
		TraceMarker:         response.TraceMarker,
		CredentialSuffix:    response.CredentialSuffix,
		CredentialReference: response.CredentialReference,
		CredentialMaterial:  strings.TrimSpace(response.CredentialMaterial),
	}
}
