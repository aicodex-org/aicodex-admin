# feishu-homepage-signin Specification

## Purpose
TBD - created by archiving change add-feishu-homepage-login-and-admin-config. Update Purpose after archive.
## Requirements
### Requirement: Feishu entry appears in the provider icon area
The system SHALL expose domestic Feishu sign-in through the existing OAuth Provider icon area by using a visible `Lark` Provider configured on the current application.

#### Scenario: Visible Lark provider renders Feishu sign-in entry
- **WHEN** an application has a visible OAuth Provider with `type = Lark` and the login form includes the `Providers` signin item
- **THEN** the login page renders a third-party sign-in entry for that Provider in the form's Provider icon area

#### Scenario: Hidden Lark provider does not render entry
- **WHEN** an application has an OAuth Provider with `type = Lark` but the Provider is not visible for sign-in
- **THEN** the login page does not render the Feishu/Lark sign-in entry

#### Scenario: Domestic Feishu provider uses Feishu branding by default
- **WHEN** a visible `Lark` OAuth Provider has global endpoint disabled
- **THEN** the login page renders the entry with Feishu-facing brand text, image alt text, and icon mapping by default

#### Scenario: Overseas Lark provider uses Lark branding by default
- **WHEN** a visible `Lark` OAuth Provider has global endpoint enabled
- **THEN** the login page renders the entry with Lark-facing brand text, image alt text, and icon mapping by default

#### Scenario: Provider display name remains a tenant override
- **WHEN** a `Lark` Provider has a non-empty `displayName`
- **THEN** the login entry may use that display name as a tenant-specific label without changing the domestic Feishu or overseas Lark endpoint mode

#### Scenario: Provider icon entry uses centralized Feishu branding
- **WHEN** a domestic Feishu `Lark` Provider is rendered in the small Provider icon area
- **THEN** the icon URL, image alt text, accessible label, and fallback display text come from the centralized Feishu/Lark brand mapping rather than `LarkLoginButton.js` alone

### Requirement: Feishu entry starts the correct authorization flow
The system SHALL start the Feishu/Lark OAuth authorization flow from the Provider entry using the current application, Provider, callback URL, and state.

#### Scenario: Domestic Feishu authorization URL
- **WHEN** a user clicks a visible `Lark` Provider entry with global endpoint disabled
- **THEN** the generated authorization URL targets `https://accounts.feishu.cn/open-apis/authen/v1/authorize` and includes `client_id=<Provider App ID>`, `response_type=code`, URL-encoded `redirect_uri`, and URL-encoded `state`

#### Scenario: Overseas Lark authorization URL remains available
- **WHEN** a user clicks a visible `Lark` Provider entry with global endpoint enabled
- **THEN** the generated authorization URL targets `https://accounts.larksuite.com/open-apis/authen/v1/authorize` and includes `client_id=<Provider App ID>`, `response_type=code`, URL-encoded `redirect_uri`, and URL-encoded `state`

#### Scenario: Agreement gate still applies
- **WHEN** the application requires agreement acceptance and the user clicks the Feishu/Lark Provider entry without accepting it
- **THEN** the system blocks the navigation and shows the existing agreement-required error

### Requirement: Feishu callback completes admin authentication
The system SHALL accept Feishu/Lark authorization callbacks and convert a successful Provider login into the same admin authentication result as other OAuth Providers.

#### Scenario: Successful Feishu callback signs in user
- **WHEN** Feishu redirects the browser to `/callback` with a valid authorization `code` and matching `state`
- **THEN** the backend exchanges the code, loads the Feishu user profile, matches or creates the local user according to the application OAuth rules, and completes the requested login response

#### Scenario: Existing synchronized Feishu user is matched
- **WHEN** the Feishu callback profile contains `user_id` and a local user already has that value in the `Lark` binding field
- **THEN** the system signs in that existing user instead of creating a duplicate user

#### Scenario: Historical open_id binding is upgraded
- **WHEN** the Feishu callback profile contains `user_id` and `open_id`, and an existing local user is bound by `open_id`
- **THEN** the system signs in that existing user and backfills the `Lark` binding field to `user_id`

#### Scenario: Conflicting identifiers are rejected
- **WHEN** the Feishu callback profile identifiers match multiple different local users
- **THEN** the system rejects automatic login with a visible error instead of merging or choosing a user implicitly

#### Scenario: Invalid callback state is rejected
- **WHEN** Feishu redirects the browser to `/callback` with a state that does not match the expected application state
- **THEN** the system rejects the login and returns a visible authentication error

#### Scenario: Provider API failure is visible
- **WHEN** the code exchange or user information request fails
- **THEN** the callback page shows a user-readable login failure instead of remaining indefinitely in a loading state

### Requirement: Feishu sign-in preserves AICodex client context
The system SHALL preserve the original AICodex client login context while using Feishu/Lark as an upstream identity provider.

#### Scenario: Browser-based client login returns to original redirect URI
- **WHEN** an AICodex browser-based client starts OAuth/OIDC login through the authentication center and the user signs in with Feishu
- **THEN** the authentication center returns the authorization result to the original registered client redirect URI instead of landing on the admin home page

#### Scenario: Desktop client login returns through registered deep link
- **WHEN** an AICodex desktop client starts OAuth/OIDC login through the authentication center with a registered custom scheme redirect URI
- **THEN** the authentication center returns the authorization result to that registered desktop redirect URI after Feishu sign-in succeeds

#### Scenario: Feishu open platform callback remains authentication center callback
- **WHEN** an AICodex client uses Feishu sign-in through the authentication center
- **THEN** the Feishu open platform callback URL remains the authentication center HTTPS `/callback` URL and is not replaced by the downstream client redirect URI

#### Scenario: Client redirect URI cannot be overridden by upstream callback
- **WHEN** a callback or deep link includes an untrusted `redirect_uri` parameter that differs from the stored client login request
- **THEN** the system ignores the untrusted value and uses the stored registered client redirect context

#### Scenario: Restored client request is revalidated before final redirect
- **WHEN** Feishu redirects back and the authentication center restores the original AICodex client login request from Provider state or server-side login context
- **THEN** the backend revalidates the restored `client_id`, `response_type`, `redirect_uri`, `scope`, `state`, PKCE data, and application Provider visibility before issuing the final OAuth/OIDC result

#### Scenario: Tampered client context is rejected
- **WHEN** the restored Provider state contains a changed downstream `redirect_uri`, `client_id`, `response_type`, `scope`, or PKCE value that does not match a valid registered client request
- **THEN** the authentication center rejects the login with a visible authentication error instead of redirecting to the tampered target

### Requirement: Existing OAuth Provider entries do not regress
The system SHALL preserve the existing behavior of other OAuth Provider icon entries while adding Feishu/Lark sign-in.

#### Scenario: Other OAuth provider still renders
- **WHEN** an application has existing visible OAuth Providers other than `Lark`
- **THEN** those Provider entries continue to render and navigate as before

#### Scenario: WeCom login entry remains independent
- **WHEN** an application has both WeCom and Feishu/Lark Providers enabled
- **THEN** the WeCom entry keeps its existing behavior and the Feishu/Lark entry uses the OAuth Provider icon behavior
