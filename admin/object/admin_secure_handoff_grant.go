package object

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/xorm-io/core"
)

const (
	AdminSecureHandoffGrantSchema          = "aicodex.admin.secure_handoff_grant"
	AdminSecureHandoffGrantVersion         = "2026-07-09"
	AdminSecureHandoffIssuer               = "aicodex-admin"
	AdminSecureHandoffProviderType         = "admin_owner_provider"
	AdminSecureHandoffTrustedEndpointAlias = "admin-secure-handoff"
	AdminSecureHandoffServiceIdentity      = "svc:aicodex-admin"

	AdminSecureHandoffStatusIssued    = "issued"
	AdminSecureHandoffStatusDelivered = "delivered"
	AdminSecureHandoffStatusConfirmed = "confirmed"
	AdminSecureHandoffStatusFailed    = "failed"
	AdminSecureHandoffStatusRevoked   = "revoked"
	AdminSecureHandoffStatusExpired   = "expired"

	AdminSecureHandoffReasonExpired        = "grant_expired"
	AdminSecureHandoffReasonRevoked        = "grant_revoked"
	AdminSecureHandoffReasonTargetMismatch = "target_mismatch"
	AdminSecureHandoffReasonReplayBlocked  = "replay_blocked"
	AdminSecureHandoffReasonStateClosed    = "state_closed"
	AdminSecureHandoffReasonInvalidRequest = "invalid_request"
)

const (
	defaultAdminSecureHandoffTTLSeconds = 600
	maxAdminSecureHandoffTTLSeconds     = 900
)

// AdminSecureHandoffGrantEnvelope 是 operator 可复制的脱敏 grant 摘要。
// 它不包含 credential material、完整 secretRef、redeem URL 或可还原凭据。
type AdminSecureHandoffGrantEnvelope struct {
	Schema               string `json:"schema"`
	Version              string `json:"version"`
	GrantId              string `json:"grantId"`
	Nonce                string `json:"nonce"`
	Issuer               string `json:"issuer"`
	EnvironmentId        string `json:"environmentId"`
	ProviderType         string `json:"providerType"`
	TargetRegistrationId string `json:"targetRegistrationId"`
	TargetWorkspaceId    string `json:"targetWorkspaceId"`
	// TargetOrganizationAlias 是 operator 可复制的业务组织别名，不包含凭据或私有连接信息。
	TargetOrganizationAlias string                          `json:"targetOrganizationAlias"`
	ExpiresAt               string                          `json:"expiresAt"`
	TraceMarker             string                          `json:"traceMarker"`
	CredentialSuffix        string                          `json:"credentialSuffix,omitempty"`
	OwnerRegistryReadiness  string                          `json:"ownerRegistryReadiness"`
	OwnerRegistry           AdminSecureHandoffOwnerRegistry `json:"ownerRegistry"`
	PackageHash             string                          `json:"packageHash"`
	Audience                string                          `json:"audience"`
	Status                  string                          `json:"status"`
	State                   string                          `json:"state"`
}

type AdminSecureHandoffOwnerRegistry struct {
	TrustedEndpointAlias     string `json:"trustedEndpointAlias"`
	Audience                 string `json:"audience"`
	ServiceIdentity          string `json:"serviceIdentity"`
	EndpointReadiness        string `json:"endpointReadiness"`
	TargetRegistrationStatus string `json:"targetRegistrationStatus"`
}

type AdminSecureHandoffCreateGrantResult struct {
	SecureHandoffGrant AdminSecureHandoffGrantEnvelope `json:"secureHandoffGrant"`
}

type AdminSecureHandoffCreateGrantRequest struct {
	TargetRegistrationId string `json:"targetRegistrationId"`
	TargetWorkspaceId    string `json:"targetWorkspaceId"`
	// TargetOrganization 是运行凭据唯一允许访问的非 built-in Admin 业务组织。
	TargetOrganization string `json:"targetOrganization"`
	EnvironmentId      string `json:"environmentId"`
	ProviderType       string `json:"providerType"`
	Audience           string `json:"audience"`
	PackageHash        string `json:"packageHash"`
	TTLSeconds         int    `json:"ttlSeconds,omitempty"`
	// 以下字段只由已鉴权的 Admin controller/service 注入，外部 JSON 不能声明运行身份或签发时间。
	Subject          string    `json:"-"`
	GrantId          string    `json:"-"`
	IssuedAt         time.Time `json:"-"`
	RuntimeExpiresAt time.Time `json:"-"`
}

type AdminSecureHandoffRedeemGrantRequest struct {
	GrantId              string `json:"grantId"`
	Nonce                string `json:"nonce"`
	TargetRegistrationId string `json:"targetRegistrationId"`
	TargetWorkspaceId    string `json:"targetWorkspaceId"`
	EnvironmentId        string `json:"environmentId"`
	ProviderType         string `json:"providerType"`
	Audience             string `json:"audience"`
	PackageHash          string `json:"packageHash"`
}

type AdminSecureHandoffConfirmGrantRequest struct {
	GrantId         string `json:"grantId"`
	Nonce           string `json:"nonce"`
	SecretBindingId string `json:"secretBindingId"`
	SecretRevision  string `json:"secretRevision"`
	ConfigDigest    string `json:"configDigest"`
	TraceMarker     string `json:"traceMarker"`
}

type AdminSecureHandoffGrantStatusResponse struct {
	GrantId             string `json:"grantId"`
	Status              string `json:"status"`
	ReasonCode          string `json:"reasonCode,omitempty"`
	ExpiresAt           string `json:"expiresAt,omitempty"`
	DeliveredAt         string `json:"deliveredAt,omitempty"`
	ConfirmedAt         string `json:"confirmedAt,omitempty"`
	TraceMarker         string `json:"traceMarker"`
	CredentialSuffix    string `json:"credentialSuffix,omitempty"`
	CredentialReference string `json:"credentialReference,omitempty"`
	CredentialMaterial  string `json:"-"`
}

type AdminSecureHandoffCredentialIssuer interface {
	IssueAdminSecureHandoffCredential(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffIssuedCredential, error)
}

type AdminSecureHandoffIssuedCredential struct {
	Material  string
	Reference string
	Suffix    string
}

type StaticAdminSecureHandoffCredentialIssuer struct {
	CredentialMaterial  string
	CredentialReference string
	CredentialSuffix    string
}

func (i StaticAdminSecureHandoffCredentialIssuer) IssueAdminSecureHandoffCredential(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffIssuedCredential, error) {
	material := strings.TrimSpace(i.CredentialMaterial)
	if material == "" {
		return AdminSecureHandoffIssuedCredential{}, errors.New("admin secure handoff credential material is unavailable")
	}
	suffix := strings.TrimSpace(i.CredentialSuffix)
	if suffix == "" {
		suffix = safeCredentialSuffix(material)
	}
	return AdminSecureHandoffIssuedCredential{
		Material:  material,
		Reference: sanitizeAdminSecureHandoffText(i.CredentialReference),
		Suffix:    sanitizeAdminSecureHandoffText(suffix),
	}, nil
}

type AdminSecureHandoffGrantStore interface {
	SaveAdminSecureHandoffGrant(grant *AdminSecureHandoffGrantRecord) error
	GetAdminSecureHandoffGrant(grantId string) (*AdminSecureHandoffGrantRecord, error)
	// DeliverAdminSecureHandoffGrant 以 issued 状态为 compare-and-set 条件，保证并发兑换只交付一次。
	DeliverAdminSecureHandoffGrant(grantId string, deliveredAt time.Time, credentialVerifier string) (bool, error)
}

// AdminSecureHandoffGrant 是 Admin owner secure handoff 的持久化记录。
// CredentialMaterial 在 issued 阶段保存一次性交付值，redeem 后只保存不可逆 verifier；任何 operator-facing 响应都不得回显。
type AdminSecureHandoffGrant struct {
	GrantId              string    `xorm:"varchar(100) notnull pk" json:"grantId"`
	Issuer               string    `xorm:"varchar(100)" json:"issuer"`
	EnvironmentId        string    `xorm:"varchar(100)" json:"environmentId"`
	ProviderType         string    `xorm:"varchar(100)" json:"providerType"`
	TargetRegistrationId string    `xorm:"varchar(100)" json:"targetRegistrationId"`
	TargetWorkspaceId    string    `xorm:"varchar(100)" json:"targetWorkspaceId"`
	Audience             string    `xorm:"varchar(100)" json:"audience"`
	PackageHash          string    `xorm:"varchar(100)" json:"packageHash"`
	TraceMarker          string    `xorm:"varchar(100)" json:"traceMarker"`
	Status               string    `xorm:"varchar(40)" json:"status"`
	ReasonCode           string    `xorm:"varchar(100)" json:"reasonCode,omitempty"`
	Nonce                string    `xorm:"varchar(200)" json:"-"`
	ExpiresAt            time.Time `xorm:"timestampz" json:"expiresAt"`
	DeliveredAt          time.Time `xorm:"timestampz" json:"deliveredAt,omitempty"`
	ConfirmedAt          time.Time `xorm:"timestampz" json:"confirmedAt,omitempty"`
	CredentialMaterial   string    `xorm:"text" json:"-"`
	CredentialReference  string    `xorm:"varchar(200)" json:"credentialReference,omitempty"`
	CredentialSuffix     string    `xorm:"varchar(32)" json:"credentialSuffix,omitempty"`
}

type defaultAdminSecureHandoffGrantStore struct{}

type memoryAdminSecureHandoffGrantStore struct {
	mu     sync.Mutex
	grants map[string]*AdminSecureHandoffGrantRecord
}

func NewMemoryAdminSecureHandoffGrantStore() AdminSecureHandoffGrantStore {
	return &memoryAdminSecureHandoffGrantStore{grants: map[string]*AdminSecureHandoffGrantRecord{}}
}

func (s *memoryAdminSecureHandoffGrantStore) SaveAdminSecureHandoffGrant(grant *AdminSecureHandoffGrantRecord) error {
	if grant == nil {
		return errors.New("admin secure handoff grant is required")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	copy := *grant
	s.grants[grant.GrantId] = &copy
	return nil
}

func (s *memoryAdminSecureHandoffGrantStore) GetAdminSecureHandoffGrant(grantId string) (*AdminSecureHandoffGrantRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	grant, ok := s.grants[grantId]
	if !ok {
		return nil, errors.New("admin secure handoff grant not found")
	}
	copy := *grant
	return &copy, nil
}

func (s *memoryAdminSecureHandoffGrantStore) DeliverAdminSecureHandoffGrant(grantId string, deliveredAt time.Time, credentialVerifier string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	record, ok := s.grants[grantId]
	if !ok {
		return false, errors.New("admin secure handoff grant not found")
	}
	if record.Status != AdminSecureHandoffStatusIssued {
		return false, nil
	}
	record.Status = AdminSecureHandoffStatusDelivered
	record.DeliveredAt = deliveredAt
	record.CredentialMaterial = credentialVerifier
	record.ReasonCode = ""
	return true, nil
}

type AdminSecureHandoffGrantRecord struct {
	GrantId              string
	Issuer               string
	EnvironmentId        string
	ProviderType         string
	TargetRegistrationId string
	TargetWorkspaceId    string
	Audience             string
	PackageHash          string
	TraceMarker          string
	Status               string
	ReasonCode           string
	Nonce                string
	ExpiresAt            time.Time
	DeliveredAt          time.Time
	ConfirmedAt          time.Time
	CredentialMaterial   string
	CredentialReference  string
	CredentialSuffix     string
}

func (record *AdminSecureHandoffGrantRecord) toPersistence() *AdminSecureHandoffGrant {
	if record == nil {
		return nil
	}
	return &AdminSecureHandoffGrant{
		GrantId:              record.GrantId,
		Issuer:               record.Issuer,
		EnvironmentId:        record.EnvironmentId,
		ProviderType:         record.ProviderType,
		TargetRegistrationId: record.TargetRegistrationId,
		TargetWorkspaceId:    record.TargetWorkspaceId,
		Audience:             record.Audience,
		PackageHash:          record.PackageHash,
		TraceMarker:          record.TraceMarker,
		Status:               record.Status,
		ReasonCode:           record.ReasonCode,
		Nonce:                record.Nonce,
		ExpiresAt:            record.ExpiresAt,
		DeliveredAt:          record.DeliveredAt,
		ConfirmedAt:          record.ConfirmedAt,
		CredentialMaterial:   record.CredentialMaterial,
		CredentialReference:  record.CredentialReference,
		CredentialSuffix:     record.CredentialSuffix,
	}
}

func adminSecureHandoffGrantRecordFromPersistence(record *AdminSecureHandoffGrant) *AdminSecureHandoffGrantRecord {
	if record == nil {
		return nil
	}
	return &AdminSecureHandoffGrantRecord{
		GrantId:              record.GrantId,
		Issuer:               record.Issuer,
		EnvironmentId:        record.EnvironmentId,
		ProviderType:         record.ProviderType,
		TargetRegistrationId: record.TargetRegistrationId,
		TargetWorkspaceId:    record.TargetWorkspaceId,
		Audience:             record.Audience,
		PackageHash:          record.PackageHash,
		TraceMarker:          record.TraceMarker,
		Status:               record.Status,
		ReasonCode:           record.ReasonCode,
		Nonce:                record.Nonce,
		ExpiresAt:            record.ExpiresAt,
		DeliveredAt:          record.DeliveredAt,
		ConfirmedAt:          record.ConfirmedAt,
		CredentialMaterial:   record.CredentialMaterial,
		CredentialReference:  record.CredentialReference,
		CredentialSuffix:     record.CredentialSuffix,
	}
}

type AdminSecureHandoffGrantService struct {
	Store  AdminSecureHandoffGrantStore
	Now    func() time.Time
	Issuer AdminSecureHandoffCredentialIssuer
	// UserLookup 允许测试注入；生产默认读取持久化 Admin user 并核对 credential subject。
	UserLookup func(userId string) (*User, error)
}

func (s *AdminSecureHandoffGrantService) CreateGrant(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffCreateGrantResult, error) {
	normalized, err := normalizeAdminSecureHandoffCreateGrantRequest(request)
	if err != nil {
		return AdminSecureHandoffCreateGrantResult{}, err
	}
	now := s.now()
	ttl := normalized.TTLSeconds
	if ttl <= 0 {
		ttl = defaultAdminSecureHandoffTTLSeconds
	}
	if ttl > maxAdminSecureHandoffTTLSeconds {
		ttl = maxAdminSecureHandoffTTLSeconds
	}
	grantId := "adm-grant-" + randomHex(12)
	normalized.GrantId = grantId
	normalized.IssuedAt = now
	normalized.RuntimeExpiresAt = now.Add(AdminSecureHandoffProviderRuntimeCredentialTTL)
	credential, err := s.credentialIssuer().IssueAdminSecureHandoffCredential(normalized)
	if err != nil {
		return AdminSecureHandoffCreateGrantResult{}, err
	}
	record := &AdminSecureHandoffGrantRecord{
		GrantId:              grantId,
		Issuer:               AdminSecureHandoffIssuer,
		EnvironmentId:        normalized.EnvironmentId,
		ProviderType:         normalized.ProviderType,
		TargetRegistrationId: normalized.TargetRegistrationId,
		TargetWorkspaceId:    normalized.TargetWorkspaceId,
		Audience:             normalized.Audience,
		PackageHash:          normalized.PackageHash,
		TraceMarker:          "adm-trace-" + randomHex(8),
		Status:               AdminSecureHandoffStatusIssued,
		Nonce:                "adm-nonce-" + randomHex(16),
		ExpiresAt:            now.Add(time.Duration(ttl) * time.Second),
		CredentialMaterial:   credential.Material,
		CredentialReference:  credential.Reference,
		CredentialSuffix:     credential.Suffix,
	}
	if err := s.store().SaveAdminSecureHandoffGrant(record); err != nil {
		return AdminSecureHandoffCreateGrantResult{}, err
	}
	return AdminSecureHandoffCreateGrantResult{SecureHandoffGrant: record.envelope(normalized.TargetOrganization)}, nil
}

func (s *AdminSecureHandoffGrantService) RedeemGrant(request AdminSecureHandoffRedeemGrantRequest) (AdminSecureHandoffGrantStatusResponse, error) {
	record, err := s.store().GetAdminSecureHandoffGrant(strings.TrimSpace(request.GrantId))
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{ReasonCode: AdminSecureHandoffReasonInvalidRequest}, err
	}
	if response, err := s.validateRedeemRequest(record, request); err != nil {
		_ = s.store().SaveAdminSecureHandoffGrant(record)
		return response, err
	}
	now := s.now()
	credentialMaterial := record.CredentialMaterial
	if strings.TrimSpace(credentialMaterial) == "" {
		return record.statusResponse(), errors.New("admin secure handoff credential material is unavailable")
	}
	persistedCredential := credentialMaterial
	if IsAdminSecureHandoffProviderRuntimeCredential(credentialMaterial) {
		persistedCredential = adminSecureHandoffProviderCredentialVerifier(credentialMaterial)
	}
	// 状态条件更新是一次性交付的最终边界，避免多个实例同时读到 issued 后重复返回 raw material。
	delivered, err := s.store().DeliverAdminSecureHandoffGrant(record.GrantId, now, persistedCredential)
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{}, err
	}
	if !delivered {
		latest, latestErr := s.store().GetAdminSecureHandoffGrant(record.GrantId)
		if latestErr == nil && latest != nil {
			latest.ReasonCode = AdminSecureHandoffReasonReplayBlocked
			return latest.statusResponse(), errors.New("admin secure handoff grant replay blocked")
		}
		return AdminSecureHandoffGrantStatusResponse{GrantId: record.GrantId, ReasonCode: AdminSecureHandoffReasonReplayBlocked}, errors.New("admin secure handoff grant replay blocked")
	}
	record.Status = AdminSecureHandoffStatusDelivered
	record.DeliveredAt = now
	record.CredentialMaterial = persistedCredential
	record.ReasonCode = ""
	response := record.statusResponse()
	response.CredentialMaterial = credentialMaterial
	return response, nil
}

func (s *AdminSecureHandoffGrantService) ConfirmGrant(request AdminSecureHandoffConfirmGrantRequest) (AdminSecureHandoffGrantStatusResponse, error) {
	record, err := s.store().GetAdminSecureHandoffGrant(strings.TrimSpace(request.GrantId))
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{ReasonCode: AdminSecureHandoffReasonInvalidRequest}, err
	}
	if record.Status != AdminSecureHandoffStatusDelivered || record.Nonce == "" || record.Nonce != strings.TrimSpace(request.Nonce) {
		record.ReasonCode = AdminSecureHandoffReasonStateClosed
		_ = s.store().SaveAdminSecureHandoffGrant(record)
		return record.statusResponse(), errors.New("admin secure handoff grant cannot be confirmed")
	}
	if sanitizeAdminSecureHandoffText(request.SecretBindingId) == "" || sanitizeAdminSecureHandoffText(request.SecretRevision) == "" || sanitizeAdminSecureHandoffText(request.ConfigDigest) == "" {
		record.ReasonCode = AdminSecureHandoffReasonInvalidRequest
		_ = s.store().SaveAdminSecureHandoffGrant(record)
		return record.statusResponse(), errors.New("admin secure handoff confirmation evidence is required")
	}
	record.Status = AdminSecureHandoffStatusConfirmed
	record.ConfirmedAt = s.now()
	if !isAdminSecureHandoffProviderCredentialVerifier(record.CredentialMaterial) {
		record.CredentialMaterial = ""
	}
	record.ReasonCode = ""
	if err := s.store().SaveAdminSecureHandoffGrant(record); err != nil {
		return AdminSecureHandoffGrantStatusResponse{}, err
	}
	return record.statusResponse(), nil
}

func (s *AdminSecureHandoffGrantService) FailGrant(grantId string, reasonCode string) (AdminSecureHandoffGrantStatusResponse, error) {
	record, err := s.store().GetAdminSecureHandoffGrant(strings.TrimSpace(grantId))
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{ReasonCode: AdminSecureHandoffReasonInvalidRequest}, err
	}
	record.Status = AdminSecureHandoffStatusFailed
	record.ReasonCode = sanitizeAdminSecureHandoffText(reasonCode)
	record.CredentialMaterial = ""
	if record.ReasonCode == "" {
		record.ReasonCode = "handoff_failed"
	}
	if err := s.store().SaveAdminSecureHandoffGrant(record); err != nil {
		return AdminSecureHandoffGrantStatusResponse{}, err
	}
	return record.statusResponse(), nil
}

func (s *AdminSecureHandoffGrantService) RevokeGrant(grantId string, reasonCode string) (AdminSecureHandoffGrantStatusResponse, error) {
	record, err := s.store().GetAdminSecureHandoffGrant(strings.TrimSpace(grantId))
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{ReasonCode: AdminSecureHandoffReasonInvalidRequest}, err
	}
	record.Status = AdminSecureHandoffStatusRevoked
	record.ReasonCode = sanitizeAdminSecureHandoffText(reasonCode)
	record.CredentialMaterial = ""
	if record.ReasonCode == "" {
		record.ReasonCode = AdminSecureHandoffReasonRevoked
	}
	if err := s.store().SaveAdminSecureHandoffGrant(record); err != nil {
		return AdminSecureHandoffGrantStatusResponse{}, err
	}
	return record.statusResponse(), nil
}

func (s *AdminSecureHandoffGrantService) QueryGrantStatus(grantId string) (AdminSecureHandoffGrantStatusResponse, error) {
	record, err := s.store().GetAdminSecureHandoffGrant(strings.TrimSpace(grantId))
	if err != nil {
		return AdminSecureHandoffGrantStatusResponse{ReasonCode: AdminSecureHandoffReasonInvalidRequest}, err
	}
	if record.Status == AdminSecureHandoffStatusIssued && s.now().After(record.ExpiresAt) {
		record.Status = AdminSecureHandoffStatusExpired
		record.ReasonCode = AdminSecureHandoffReasonExpired
		record.CredentialMaterial = ""
		_ = s.store().SaveAdminSecureHandoffGrant(record)
	}
	return record.statusResponse(), nil
}

func (s *AdminSecureHandoffGrantService) validateRedeemRequest(record *AdminSecureHandoffGrantRecord, request AdminSecureHandoffRedeemGrantRequest) (AdminSecureHandoffGrantStatusResponse, error) {
	now := s.now()
	if now.After(record.ExpiresAt) {
		record.Status = AdminSecureHandoffStatusExpired
		record.ReasonCode = AdminSecureHandoffReasonExpired
		record.CredentialMaterial = ""
		return record.statusResponse(), errors.New("admin secure handoff grant expired")
	}
	if record.Status == AdminSecureHandoffStatusRevoked {
		record.ReasonCode = AdminSecureHandoffReasonRevoked
		return record.statusResponse(), errors.New("admin secure handoff grant revoked")
	}
	if record.Status != AdminSecureHandoffStatusIssued {
		record.ReasonCode = AdminSecureHandoffReasonStateClosed
		return record.statusResponse(), errors.New("admin secure handoff grant is closed")
	}
	if strings.TrimSpace(request.Nonce) == "" {
		record.ReasonCode = AdminSecureHandoffReasonInvalidRequest
		return record.statusResponse(), errors.New("admin secure handoff nonce is required")
	}
	if record.Nonce == "" || record.Nonce != strings.TrimSpace(request.Nonce) {
		record.ReasonCode = AdminSecureHandoffReasonInvalidRequest
		return record.statusResponse(), errors.New("admin secure handoff nonce mismatch")
	}
	if !record.matchesRedeemRequest(request) {
		record.ReasonCode = AdminSecureHandoffReasonTargetMismatch
		return record.statusResponse(), errors.New("admin secure handoff target mismatch")
	}
	return AdminSecureHandoffGrantStatusResponse{}, nil
}

func (record *AdminSecureHandoffGrantRecord) matchesRedeemRequest(request AdminSecureHandoffRedeemGrantRequest) bool {
	return record.TargetRegistrationId == strings.TrimSpace(request.TargetRegistrationId) &&
		record.TargetWorkspaceId == strings.TrimSpace(request.TargetWorkspaceId) &&
		record.EnvironmentId == strings.TrimSpace(request.EnvironmentId) &&
		record.ProviderType == strings.TrimSpace(request.ProviderType) &&
		record.Audience == strings.TrimSpace(request.Audience) &&
		record.PackageHash == strings.TrimSpace(request.PackageHash)
}

func (record *AdminSecureHandoffGrantRecord) envelope(targetOrganization string) AdminSecureHandoffGrantEnvelope {
	return AdminSecureHandoffGrantEnvelope{
		Schema:                  AdminSecureHandoffGrantSchema,
		Version:                 AdminSecureHandoffGrantVersion,
		GrantId:                 record.GrantId,
		Nonce:                   record.Nonce,
		Issuer:                  record.Issuer,
		EnvironmentId:           record.EnvironmentId,
		ProviderType:            record.ProviderType,
		TargetRegistrationId:    record.TargetRegistrationId,
		TargetWorkspaceId:       record.TargetWorkspaceId,
		TargetOrganizationAlias: sanitizeAdminSecureHandoffText(targetOrganization),
		ExpiresAt:               record.ExpiresAt.UTC().Format(time.RFC3339),
		TraceMarker:             record.TraceMarker,
		CredentialSuffix:        record.CredentialSuffix,
		OwnerRegistryReadiness:  "ready",
		OwnerRegistry: AdminSecureHandoffOwnerRegistry{
			TrustedEndpointAlias:     AdminSecureHandoffTrustedEndpointAlias,
			Audience:                 record.Audience,
			ServiceIdentity:          AdminSecureHandoffServiceIdentity,
			EndpointReadiness:        "ready",
			TargetRegistrationStatus: "approved",
		},
		PackageHash: record.PackageHash,
		Audience:    record.Audience,
		Status:      record.Status,
		State:       record.Status,
	}
}

func (record *AdminSecureHandoffGrantRecord) statusResponse() AdminSecureHandoffGrantStatusResponse {
	response := AdminSecureHandoffGrantStatusResponse{
		GrantId:             record.GrantId,
		Status:              record.Status,
		ReasonCode:          record.ReasonCode,
		ExpiresAt:           record.ExpiresAt.UTC().Format(time.RFC3339),
		TraceMarker:         record.TraceMarker,
		CredentialSuffix:    record.CredentialSuffix,
		CredentialReference: record.CredentialReference,
	}
	if !record.DeliveredAt.IsZero() {
		response.DeliveredAt = record.DeliveredAt.UTC().Format(time.RFC3339)
	}
	if !record.ConfirmedAt.IsZero() {
		response.ConfirmedAt = record.ConfirmedAt.UTC().Format(time.RFC3339)
	}
	return response
}

func (s *AdminSecureHandoffGrantService) store() AdminSecureHandoffGrantStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultAdminSecureHandoffGrantStore{}
}

func (s *AdminSecureHandoffGrantService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s *AdminSecureHandoffGrantService) credentialIssuer() AdminSecureHandoffCredentialIssuer {
	if s != nil && s.Issuer != nil {
		return s.Issuer
	}
	return defaultAdminSecureHandoffCredentialIssuer{}
}

type defaultAdminSecureHandoffCredentialIssuer struct{}

func (s defaultAdminSecureHandoffGrantStore) SaveAdminSecureHandoffGrant(grant *AdminSecureHandoffGrantRecord) error {
	if grant == nil {
		return errors.New("admin secure handoff grant is required")
	}
	if ormer == nil || ormer.Engine == nil {
		return errors.New("admin secure handoff persistent store is unavailable")
	}
	persisted := grant.toPersistence()
	existed, err := ormer.Engine.ID(core.PK{grant.GrantId}).Exist(new(AdminSecureHandoffGrant))
	if err != nil {
		return err
	}
	if !existed {
		_, err = ormer.Engine.Insert(persisted)
		return err
	}
	_, err = ormer.Engine.ID(core.PK{grant.GrantId}).AllCols().Update(persisted)
	return err
}

func (s defaultAdminSecureHandoffGrantStore) GetAdminSecureHandoffGrant(grantId string) (*AdminSecureHandoffGrantRecord, error) {
	if ormer == nil || ormer.Engine == nil {
		return nil, errors.New("admin secure handoff persistent store is unavailable")
	}
	grantId = strings.TrimSpace(grantId)
	if grantId == "" {
		return nil, errors.New("admin secure handoff grant id is required")
	}
	record := &AdminSecureHandoffGrant{}
	existed, err := ormer.Engine.ID(core.PK{grantId}).Get(record)
	if err != nil {
		return nil, err
	}
	if !existed {
		return nil, errors.New("admin secure handoff grant not found")
	}
	return adminSecureHandoffGrantRecordFromPersistence(record), nil
}

func (s defaultAdminSecureHandoffGrantStore) DeliverAdminSecureHandoffGrant(grantId string, deliveredAt time.Time, credentialVerifier string) (bool, error) {
	if ormer == nil || ormer.Engine == nil {
		return false, errors.New("admin secure handoff persistent store is unavailable")
	}
	result, err := ormer.Engine.
		Where("grant_id = ? AND status = ?", strings.TrimSpace(grantId), AdminSecureHandoffStatusIssued).
		Cols("status", "delivered_at", "credential_material", "reason_code").
		Update(&AdminSecureHandoffGrant{
			Status:             AdminSecureHandoffStatusDelivered,
			DeliveredAt:        deliveredAt,
			CredentialMaterial: credentialVerifier,
			ReasonCode:         "",
		})
	if err != nil {
		return false, err
	}
	return result == 1, nil
}

func (i defaultAdminSecureHandoffCredentialIssuer) IssueAdminSecureHandoffCredential(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffIssuedCredential, error) {
	return issueAdminSecureHandoffProviderRuntimeCredential(request)
}

func normalizeAdminSecureHandoffCreateGrantRequest(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffCreateGrantRequest, error) {
	request.TargetRegistrationId = sanitizeAdminSecureHandoffText(request.TargetRegistrationId)
	request.TargetWorkspaceId = sanitizeAdminSecureHandoffText(request.TargetWorkspaceId)
	request.TargetOrganization = sanitizeAdminSecureHandoffText(request.TargetOrganization)
	request.EnvironmentId = sanitizeAdminSecureHandoffText(request.EnvironmentId)
	request.ProviderType = sanitizeAdminSecureHandoffText(request.ProviderType)
	request.Audience = sanitizeAdminSecureHandoffText(request.Audience)
	request.PackageHash = sanitizeAdminSecureHandoffText(request.PackageHash)
	request.Subject = sanitizeAdminSecureHandoffText(request.Subject)
	if request.ProviderType == "" {
		request.ProviderType = AdminSecureHandoffProviderType
	}
	for _, required := range []string{request.TargetRegistrationId, request.TargetWorkspaceId, request.TargetOrganization, request.EnvironmentId, request.ProviderType, request.Audience, request.PackageHash} {
		if required == "" {
			return AdminSecureHandoffCreateGrantRequest{}, errors.New("admin secure handoff grant request is incomplete")
		}
	}
	if request.ProviderType != AdminSecureHandoffProviderType {
		return AdminSecureHandoffCreateGrantRequest{}, errors.New("admin secure handoff provider type is not supported")
	}
	if !isAdminSecureHandoffBusinessTargetOrganization(request.TargetOrganization) {
		return AdminSecureHandoffCreateGrantRequest{}, errors.New("admin secure handoff target organization is not eligible")
	}
	if containsServiceCredentialGovernanceSensitiveMaterial(request.TargetRegistrationId) ||
		containsServiceCredentialGovernanceSensitiveMaterial(request.TargetWorkspaceId) ||
		containsServiceCredentialGovernanceSensitiveMaterial(request.TargetOrganization) ||
		containsServiceCredentialGovernanceSensitiveMaterial(request.EnvironmentId) ||
		containsServiceCredentialGovernanceSensitiveMaterial(request.Audience) ||
		containsServiceCredentialGovernanceSensitiveMaterial(request.PackageHash) {
		return AdminSecureHandoffCreateGrantRequest{}, errors.New("admin secure handoff grant request contains unsupported sensitive material")
	}
	return request, nil
}

// isAdminSecureHandoffBusinessTargetOrganization 阻止把内置签发域当成下游业务授权域。
func isAdminSecureHandoffBusinessTargetOrganization(organization string) bool {
	organization = strings.TrimSpace(organization)
	return organization != "" && organization != "built-in"
}

func sanitizeAdminSecureHandoffText(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || containsServiceCredentialGovernanceSensitiveMaterial(trimmed) {
		return ""
	}
	return trimmed
}

func safeCredentialSuffix(value string) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= 4 {
		return trimmed
	}
	return trimmed[len(trimmed)-4:]
}

func randomHex(bytes int) string {
	buffer := make([]byte, bytes)
	if _, err := rand.Read(buffer); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buffer)
}
