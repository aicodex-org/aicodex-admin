package object

import (
	"fmt"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
)

const (
	AICodexIOSApplicationOwner        = "admin"
	AICodexIOSApplicationName         = "app-aicodex-ios"
	AICodexIOSApplicationClientID     = "aicodex-ios"
	AICodexIOSDefaultRedirectURI      = "mt.aicodex.ios:/oauth2redirect"
	AICodexGatewayResourceIndicator   = "urn:aicodex:resource:gateway"
	AICodexMobileControlRuntimeScope  = "aicodex.mobile_control"
	AICodexIOSClientEnabledConfigName = "AICODEX_IOS_OIDC_CLIENT_ENABLED"
	AICodexIOSRedirectsConfigName     = "AICODEX_IOS_OIDC_REDIRECT_URIS"
)

var aicodexIOSGrantTypes = []string{
	"authorization_code",
	"refresh_token",
}

func newAICodexIOSApplication() *Application {
	return &Application{
		Owner:          AICodexIOSApplicationOwner,
		Name:           AICodexIOSApplicationName,
		CreatedTime:    util.GetCurrentTime(),
		DisplayName:    "AICodex iOS",
		Category:       "Default",
		Type:           "All",
		Logo:           "/branding/icon-only.svg",
		Description:    "Fixed public OIDC client for AICodex iOS login",
		Organization:   "built-in",
		Cert:           "cert-built-in",
		EnablePassword: true,
		EnableSignUp:   true,
		Providers: []*ProviderItem{
			{Name: "provider_captcha_default", CanSignUp: false, CanSignIn: false, CanUnlink: false, Prompted: false, Rule: "None"},
		},
		SigninMethods: []*SigninMethod{
			{Name: "Password", DisplayName: "Password", Rule: "All"},
			{Name: "Verification code", DisplayName: "Verification code", Rule: "All"},
			{Name: "WebAuthn", DisplayName: "WebAuthn", Rule: "None"},
		},
		SignupItems: []*SignupItem{
			{Name: "ID", Visible: false, Required: true, Rule: "Random"},
			{Name: "Username", Visible: true, Required: true, Rule: "None"},
			{Name: "Display name", Visible: true, Required: true, Rule: "None"},
			{Name: "Password", Visible: true, Required: true, Rule: "None"},
			{Name: "Confirm password", Visible: true, Required: true, Rule: "None"},
			{Name: "Email", Visible: true, Required: true, Rule: "Normal"},
			{Name: "Agreement", Visible: true, Required: true, Rule: "None"},
		},
		Scopes:                     scopeItemsForAICodexIOS(),
		GrantTypes:                 append([]string{}, aicodexIOSGrantTypes...),
		Tags:                       []string{"aicodex", "ios", "native", "oidc"},
		ClientId:                   AICodexIOSApplicationClientID,
		ClientSecret:               "",
		PublicClient:               true,
		PkceRequired:               true,
		RedirectUris:               aicodexIOSRedirectURIs(),
		TokenFormat:                "JWT-Standard",
		TokenSigningMethod:         "RS256",
		ExpireInHours:              0.25,
		RefreshExpireInHours:       720,
		FormOffset:                 2,
		CookieExpireInHours:        720,
		IsShared:                   true,
		OrganizationResolutionMode: ApplicationOrganizationResolutionModeSharedApplication,
		AllowedOrganizations:       []string{"built-in"},
		AllowedOrganizationStatus:  ApplicationAllowedOrganizationStatusConfirmed,
	}
}

func initAICodexIOSApplication() {
	if !conf.GetConfigBool(AICodexIOSClientEnabledConfigName) {
		return
	}
	application, err := getApplication(AICodexIOSApplicationOwner, AICodexIOSApplicationName)
	if err != nil {
		panic(err)
	}
	applicationID := ""
	if application == nil {
		application, err = GetApplicationByClientId(AICodexIOSApplicationClientID)
		if err != nil {
			panic(err)
		}
		if application != nil {
			applicationID = application.GetId()
		}
	}
	if application == nil {
		application = newAICodexIOSApplication()
		affected, addErr := AddApplication(application)
		if addErr != nil {
			panic(addErr)
		}
		if !affected {
			panic("failed to add AICodex iOS application: clientId already exists")
		}
		return
	}

	if ensureAICodexIOSApplicationContract(application) {
		if applicationID != "" && applicationID != application.GetId() {
			if err := replaceFixedOIDCApplication(applicationID, application); err != nil {
				panic(err)
			}
			return
		}
		if applicationID == "" {
			applicationID = application.GetId()
		}
		affected, updateErr := UpdateApplication(applicationID, application, true, "en")
		if updateErr != nil {
			panic(updateErr)
		}
		if !affected {
			panic("failed to update AICodex iOS application")
		}
	}
}

func ensureAICodexIOSApplicationContract(application *Application) bool {
	if application == nil {
		return false
	}
	target := newAICodexIOSApplication()
	changed := false
	setString := func(current *string, value string) {
		if *current != value {
			*current = value
			changed = true
		}
	}
	setString(&application.Owner, target.Owner)
	setString(&application.Name, target.Name)
	setString(&application.DisplayName, target.DisplayName)
	setString(&application.Organization, target.Organization)
	// The initial certificate is provisioned deterministically, but an existing
	// non-empty reference is rotation state rather than client-contract drift.
	// Pinning it back to cert-built-in would make planned JWKS rotation
	// impossible and could reactivate an old signing key after restart.
	if strings.TrimSpace(application.Cert) == "" {
		application.Cert = target.Cert
		changed = true
	}
	setString(&application.ClientId, target.ClientId)
	setString(&application.ClientSecret, "")
	setString(&application.TokenFormat, target.TokenFormat)
	setString(&application.TokenSigningMethod, target.TokenSigningMethod)
	setString(&application.OrganizationResolutionMode, target.OrganizationResolutionMode)
	setString(&application.AllowedOrganizationStatus, target.AllowedOrganizationStatus)
	if !application.PublicClient {
		application.PublicClient = true
		changed = true
	}
	if !application.PkceRequired {
		application.PkceRequired = true
		changed = true
	}
	if !application.IsShared {
		application.IsShared = true
		changed = true
	}
	if !application.EnablePassword {
		application.EnablePassword = true
		changed = true
	}
	if !application.EnableSignUp {
		application.EnableSignUp = true
		changed = true
	}
	if !sameStringSet(application.RedirectUris, target.RedirectUris) {
		application.RedirectUris = append([]string{}, target.RedirectUris...)
		changed = true
	}
	if !sameStringSet(application.GrantTypes, target.GrantTypes) {
		application.GrantTypes = append([]string{}, target.GrantTypes...)
		changed = true
	}
	if !sameStringSet(application.AllowedOrganizations, target.AllowedOrganizations) {
		application.AllowedOrganizations = append([]string{}, target.AllowedOrganizations...)
		changed = true
	}
	for _, scope := range target.Scopes {
		if !scopeItemsContain(application.Scopes, scope.Name) {
			application.Scopes = append(application.Scopes, scope)
			changed = true
		}
	}
	if application.ExpireInHours != target.ExpireInHours {
		application.ExpireInHours = target.ExpireInHours
		changed = true
	}
	if application.RefreshExpireInHours != target.RefreshExpireInHours {
		application.RefreshExpireInHours = target.RefreshExpireInHours
		changed = true
	}
	if application.CookieExpireInHours != target.CookieExpireInHours {
		application.CookieExpireInHours = target.CookieExpireInHours
		changed = true
	}
	return changed
}

func aicodexIOSRedirectURIs() []string {
	items := []string{AICodexIOSDefaultRedirectURI}
	for _, item := range strings.Split(conf.GetConfigString(AICodexIOSRedirectsConfigName), ",") {
		item = strings.TrimSpace(item)
		if item != "" && !aicodexDesktopStringSliceContains(items, item) {
			items = append(items, item)
		}
	}
	return items
}

func scopeItemsForAICodexIOS() []*ScopeItem {
	return []*ScopeItem{
		{Name: "openid", DisplayName: "OpenID", Description: "OpenID Connect identity scope"},
		{Name: "profile", DisplayName: "Profile", Description: "Basic user profile"},
		{Name: "email", DisplayName: "Email", Description: "User email"},
		{Name: "offline_access", DisplayName: "Offline access", Description: "Rotating refresh-token access for native sessions"},
		{Name: AICodexMobileControlRuntimeScope, DisplayName: "AICodex Mobile Control", Description: "Access to AICodex Gateway Mobile Control"},
	}
}

func isAICodexIOSApplication(application *Application) bool {
	return application != nil && application.ClientId == AICodexIOSApplicationClientID
}

func validateAICodexIOSResource(application *Application, resource string) string {
	if !isAICodexIOSApplication(application) {
		return ""
	}
	if strings.TrimSpace(resource) != AICodexGatewayResourceIndicator {
		return fmt.Sprintf("resource must be %s for AICodex iOS", AICodexGatewayResourceIndicator)
	}
	return ""
}

func validateAICodexIOSAuthorizationRequest(application *Application, responseType string, nonce string) string {
	if !isAICodexIOSApplication(application) {
		return ""
	}
	if strings.TrimSpace(responseType) != "code" {
		return "response_type must be code for AICodex iOS"
	}
	if strings.TrimSpace(nonce) == "" {
		return "nonce is required for AICodex iOS"
	}
	return ""
}

func sameStringSet(left []string, right []string) bool {
	if len(left) != len(right) {
		return false
	}
	seen := make(map[string]int, len(left))
	for _, item := range left {
		seen[item]++
	}
	for _, item := range right {
		seen[item]--
		if seen[item] < 0 {
			return false
		}
	}
	return true
}
