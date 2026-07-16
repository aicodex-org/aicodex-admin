package object

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	AdminSecureHandoffProviderRuntimeCredentialPrefix = "admrt_v2_"
	AdminSecureHandoffProviderRuntimeScope            = "profile insight.scope.read"
	AdminSecureHandoffProviderRuntimeCredentialTTL    = 30 * 24 * time.Hour

	AdminSecureHandoffProviderCredentialContextKey = "adminSecureHandoffProviderCredential"

	AdminSecureHandoffProviderCredentialUnauthenticated     = "UNAUTHENTICATED"
	AdminSecureHandoffProviderCredentialAuthorizationFailed = "AUTHORIZATION_FAILED"

	AdminSecureHandoffReasonCredentialInvalid      = "credential_invalid"
	AdminSecureHandoffReasonCredentialExpired      = "credential_expired"
	AdminSecureHandoffReasonCredentialNotConfirmed = "credential_not_confirmed"
)

const adminSecureHandoffProviderCredentialVerifierPrefix = "sha256:"

var readAdminSecureHandoffProviderRandom = rand.Read

type adminSecureHandoffProviderCredentialClaims struct {
	Version              string `json:"version"`
	GrantId              string `json:"grantId"`
	CredentialId         string `json:"credentialId"`
	Issuer               string `json:"issuer"`
	Subject              string `json:"subject"`
	Audience             string `json:"audience"`
	Scope                string `json:"scope"`
	TargetRegistrationId string `json:"targetRegistrationId"`
	TargetWorkspaceId    string `json:"targetWorkspaceId"`
	TargetOrganization   string `json:"targetOrganization"`
	PackageHash          string `json:"packageHash"`
	EnvironmentId        string `json:"environmentId"`
	ProviderType         string `json:"providerType"`
	IssuedAt             int64  `json:"issuedAt"`
	ExpiresAt            int64  `json:"expiresAt"`
}

// AdminSecureHandoffProviderCredentialAuth 是 filter 交给 Provider controller 的只读认证结果。
// controller 仍需对 issuer/audience/scope 执行 typed trust policy 授权。
type AdminSecureHandoffProviderCredentialAuth struct {
	GrantId              string
	Issuer               string
	Subject              string
	Audience             string
	Scope                string
	TargetRegistrationId string
	TargetWorkspaceId    string
	// TargetOrganization 仅来自通过 exact verifier 和 package binding 校验的 v2 claim。
	TargetOrganization string
	EnvironmentId      string
	ProviderType       string
	ExpiresAt          time.Time
	User               *User
}

// AdminSecureHandoffProviderCredentialError 只携带稳定分类，不包含 credential 或存储错误文本。
type AdminSecureHandoffProviderCredentialError struct {
	Code       string
	ReasonCode string
}

func (e *AdminSecureHandoffProviderCredentialError) Error() string {
	if e == nil {
		return "admin secure handoff provider credential rejected"
	}
	return "admin secure handoff provider credential rejected: " + e.ReasonCode
}

func issueAdminSecureHandoffProviderRuntimeCredential(request AdminSecureHandoffCreateGrantRequest) (AdminSecureHandoffIssuedCredential, error) {
	if request.GrantId == "" || request.Subject == "" || request.IssuedAt.IsZero() || request.RuntimeExpiresAt.IsZero() {
		return AdminSecureHandoffIssuedCredential{}, errors.New("admin secure handoff provider credential identity is unavailable")
	}
	if !request.RuntimeExpiresAt.After(request.IssuedAt) {
		return AdminSecureHandoffIssuedCredential{}, errors.New("admin secure handoff provider credential expiry is invalid")
	}
	claims := adminSecureHandoffProviderCredentialClaims{
		Version:              "v2",
		GrantId:              request.GrantId,
		CredentialId:         request.GrantId,
		Issuer:               AdminSecureHandoffIssuer,
		Subject:              request.Subject,
		Audience:             request.Audience,
		Scope:                AdminSecureHandoffProviderRuntimeScope,
		TargetRegistrationId: request.TargetRegistrationId,
		TargetWorkspaceId:    request.TargetWorkspaceId,
		TargetOrganization:   request.TargetOrganization,
		PackageHash:          request.PackageHash,
		EnvironmentId:        request.EnvironmentId,
		ProviderType:         request.ProviderType,
		IssuedAt:             request.IssuedAt.Unix(),
		ExpiresAt:            request.RuntimeExpiresAt.Unix(),
	}
	payload, err := json.Marshal(claims)
	if err != nil {
		return AdminSecureHandoffIssuedCredential{}, err
	}
	secret, err := randomAdminSecureHandoffProviderHex(32)
	if err != nil {
		return AdminSecureHandoffIssuedCredential{}, errors.New("admin secure handoff provider credential entropy is unavailable")
	}
	material := AdminSecureHandoffProviderRuntimeCredentialPrefix + base64.RawURLEncoding.EncodeToString(payload) + "." + secret
	return AdminSecureHandoffIssuedCredential{
		Material:  material,
		Reference: "admin-owner-provider-credential",
		Suffix:    safeCredentialSuffix(material),
	}, nil
}

// IsAdminSecureHandoffProviderRuntimeCredential 只识别版本化格式；识别成功不代表认证通过。
func IsAdminSecureHandoffProviderRuntimeCredential(material string) bool {
	return strings.HasPrefix(strings.TrimSpace(material), AdminSecureHandoffProviderRuntimeCredentialPrefix)
}

// AuthenticateProviderCredential 校验 exact material、grant 状态、目标声明和真实 Admin subject。
func (s *AdminSecureHandoffGrantService) AuthenticateProviderCredential(material string) (*AdminSecureHandoffProviderCredentialAuth, *AdminSecureHandoffProviderCredentialError) {
	claims, parseErr := parseAdminSecureHandoffProviderCredential(material)
	if parseErr != nil {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialUnauthenticated, AdminSecureHandoffReasonCredentialInvalid)
	}
	record, err := s.store().GetAdminSecureHandoffGrant(claims.GrantId)
	if err != nil || record == nil {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialUnauthenticated, AdminSecureHandoffReasonCredentialInvalid)
	}
	switch record.Status {
	case AdminSecureHandoffStatusRevoked:
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonRevoked)
	case AdminSecureHandoffStatusExpired:
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialUnauthenticated, AdminSecureHandoffReasonCredentialExpired)
	case AdminSecureHandoffStatusFailed:
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonStateClosed)
	case AdminSecureHandoffStatusConfirmed:
		// Continue with verifier and claims validation.
	default:
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonCredentialNotConfirmed)
	}
	if !constantTimeAdminSecureHandoffProviderCredentialMatch(record.CredentialMaterial, material) {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialUnauthenticated, AdminSecureHandoffReasonCredentialInvalid)
	}
	now := s.now()
	issuedAt := time.Unix(claims.IssuedAt, 0).UTC()
	expiresAt := time.Unix(claims.ExpiresAt, 0).UTC()
	if claims.IssuedAt <= 0 || claims.ExpiresAt <= claims.IssuedAt || now.Before(issuedAt) || !now.Before(expiresAt) {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialUnauthenticated, AdminSecureHandoffReasonCredentialExpired)
	}
	if !adminSecureHandoffProviderCredentialClaimsMatchRecord(claims, record) {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonTargetMismatch)
	}
	user, err := s.userLookup()(claims.Subject)
	if err != nil || user == nil || user.GetId() != claims.Subject {
		return nil, newAdminSecureHandoffProviderCredentialError(AdminSecureHandoffProviderCredentialAuthorizationFailed, AdminSecureHandoffReasonCredentialInvalid)
	}
	return &AdminSecureHandoffProviderCredentialAuth{
		GrantId:              claims.GrantId,
		Issuer:               claims.Issuer,
		Subject:              claims.Subject,
		Audience:             claims.Audience,
		Scope:                claims.Scope,
		TargetRegistrationId: claims.TargetRegistrationId,
		TargetWorkspaceId:    claims.TargetWorkspaceId,
		TargetOrganization:   claims.TargetOrganization,
		EnvironmentId:        claims.EnvironmentId,
		ProviderType:         claims.ProviderType,
		ExpiresAt:            expiresAt,
		User:                 user,
	}, nil
}

func parseAdminSecureHandoffProviderCredential(material string) (adminSecureHandoffProviderCredentialClaims, error) {
	material = strings.TrimSpace(material)
	if !IsAdminSecureHandoffProviderRuntimeCredential(material) {
		return adminSecureHandoffProviderCredentialClaims{}, errors.New("credential format is invalid")
	}
	parts := strings.Split(material, ".")
	if len(parts) != 2 || len(parts[1]) != 64 {
		return adminSecureHandoffProviderCredentialClaims{}, errors.New("credential format is invalid")
	}
	if _, err := hex.DecodeString(parts[1]); err != nil {
		return adminSecureHandoffProviderCredentialClaims{}, errors.New("credential secret is invalid")
	}
	payloadText := strings.TrimPrefix(parts[0], AdminSecureHandoffProviderRuntimeCredentialPrefix)
	payload, err := base64.RawURLEncoding.DecodeString(payloadText)
	if err != nil {
		return adminSecureHandoffProviderCredentialClaims{}, err
	}
	claims := adminSecureHandoffProviderCredentialClaims{}
	if err = json.Unmarshal(payload, &claims); err != nil {
		return adminSecureHandoffProviderCredentialClaims{}, err
	}
	if claims.Version != "v2" || claims.GrantId == "" || claims.CredentialId == "" || claims.Subject == "" || !isAdminSecureHandoffBusinessTargetOrganization(claims.TargetOrganization) || claims.PackageHash == "" {
		return adminSecureHandoffProviderCredentialClaims{}, errors.New("credential claims are incomplete")
	}
	return claims, nil
}

func adminSecureHandoffProviderCredentialClaimsMatchRecord(claims adminSecureHandoffProviderCredentialClaims, record *AdminSecureHandoffGrantRecord) bool {
	return record != nil &&
		claims.GrantId == record.GrantId &&
		claims.CredentialId == record.GrantId &&
		claims.Issuer == record.Issuer &&
		claims.Issuer == AdminSecureHandoffIssuer &&
		claims.Audience == record.Audience &&
		claims.Scope == AdminSecureHandoffProviderRuntimeScope &&
		claims.TargetRegistrationId == record.TargetRegistrationId &&
		claims.TargetWorkspaceId == record.TargetWorkspaceId &&
		isAdminSecureHandoffBusinessTargetOrganization(claims.TargetOrganization) &&
		claims.PackageHash == record.PackageHash &&
		claims.EnvironmentId == record.EnvironmentId &&
		claims.ProviderType == record.ProviderType &&
		claims.ProviderType == AdminSecureHandoffProviderType
}

func adminSecureHandoffProviderCredentialVerifier(material string) string {
	sum := sha256.Sum256([]byte(material))
	return adminSecureHandoffProviderCredentialVerifierPrefix + hex.EncodeToString(sum[:])
}

func randomAdminSecureHandoffProviderHex(size int) (string, error) {
	buffer := make([]byte, size)
	// 运行凭据不能沿用 legacy 随机 helper 的时间戳降级；系统熵源失败时必须终止签发。
	if _, err := readAdminSecureHandoffProviderRandom(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func isAdminSecureHandoffProviderCredentialVerifier(value string) bool {
	return strings.HasPrefix(value, adminSecureHandoffProviderCredentialVerifierPrefix) && len(value) == len(adminSecureHandoffProviderCredentialVerifierPrefix)+sha256.Size*2
}

func constantTimeAdminSecureHandoffProviderCredentialMatch(verifier string, material string) bool {
	want := adminSecureHandoffProviderCredentialVerifier(material)
	return subtle.ConstantTimeCompare([]byte(verifier), []byte(want)) == 1
}

func newAdminSecureHandoffProviderCredentialError(code string, reasonCode string) *AdminSecureHandoffProviderCredentialError {
	return &AdminSecureHandoffProviderCredentialError{Code: code, ReasonCode: reasonCode}
}

func (s *AdminSecureHandoffGrantService) userLookup() func(string) (*User, error) {
	if s != nil && s.UserLookup != nil {
		return s.UserLookup
	}
	return GetUser
}
