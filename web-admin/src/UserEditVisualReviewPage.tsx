import React from "react";
import {UserEditPage} from "./UserEditPage";

type PreviewHistory = {
  push: (path: string) => void;
};

type PreviewRouteProps = {
  history: PreviewHistory;
  location: {
    search: string;
  };
  match: {
    params: {
      organizationName: string;
      userName: string;
    };
  };
};

const accountItemNames = [
  "Organization", "Groups", "ID", "Name", "Display name", "Avatar", "User type", "Password", "Email", "Phone",
  "Country/Region", "Location", "Address", "Addresses", "Affiliation", "Title", "ID card type", "ID card",
  "ID card info", "Real name", "ID verification", "Homepage", "Bio", "Tag", "Language", "Gender", "Birthday",
  "Education", "Balance", "Balance credit", "Balance currency", "Cart", "Transactions", "Score", "Karma", "Ranking",
  "Signup application", "Register type", "Register source", "Roles", "Permissions", "3rd-party logins", "Properties",
  "Is admin", "Is forbidden", "Is deleted", "MFA items", "Consents", "Multi-factor authentication",
  "WebAuthn credentials", "Last change password time", "Managed accounts", "Face ID", "MFA accounts",
  "Need update password", "IP whitelist", "First name", "Last name",
].map(name => ({name, visible: true, modifyRule: "Admin", viewRule: "Admin"}));

const previewOrganization = {
  name: "engineering",
  accountMenu: "Horizontal",
  accountItems: accountItemNames,
  userTypes: ["normal-user", "paid-user", "contractor"],
  tags: ["alpha|核心成员", "beta|外部协作", "security|安全审核"],
  countryCodes: ["US", "CN", "SG"],
};

const previewUser = {
  owner: "engineering",
  name: "alice.chen",
  id: "usr_9f23a6b7c8d4",
  displayName: "Alice Chen",
  avatar: "",
  type: "normal-user",
  email: "alice.chen@example.test",
  countryCode: "CN",
  phone: "13800000000",
  region: "CN",
  location: "Shanghai",
  address: ["No. 88 Long Street, Pudong District", "Tower B, Floor 12"],
  addresses: [{type: "office", city: "Shanghai", country: "CN"}],
  title: "Identity Platform Engineer",
  idCardType: "passport",
  idCard: "E12345678",
  realName: "Alice Chen",
  homepage: "https://example.test/alice",
  bio: "Maintains identity governance, account lifecycle, and access review workflows for enterprise tenants.",
  tag: "alpha",
  language: "zh",
  gender: "female",
  birthday: "1995-06-18",
  education: "master",
  balance: 128.5,
  balanceCredit: 42,
  balanceCurrency: "USD",
  cart: {items: [{name: "starter-plan"}]},
  score: 87,
  karma: 1200,
  ranking: 12,
  signupApplication: "admin-console",
  registerType: "invitation",
  registerSource: "enterprise-admin",
  externalId: "ext-alice-chen",
  groups: ["engineering/platform"],
  roles: [{name: "identity-admin"}, {name: "auditor"}],
  permissions: [{name: "user:read"}, {name: "user:update"}, {name: "group:read"}],
  properties: {
    costCenter: "ID-1001",
    employeeType: "full-time",
    oauth_GitHub_avatarUrl: "",
    oauth_GitHub_displayName: "Alice Chen",
    oauth_GitHub_id: "alice-gh-1001",
    oauth_GitHub_username: "alice-chen",
    riskLevel: "medium",
  },
  isVerified: true,
  isAdmin: true,
  isForbidden: false,
  isDeleted: false,
  mfaItems: [{name: "totp-primary", type: "totp"}],
  multiFactorAuths: [
    {mfaType: "email", enabled: true, secret: "review-email", isPreferred: false},
    {mfaType: "totp", enabled: true, secret: "review-totp", isPreferred: true},
  ],
  webauthnCredentials: [{id: "credential-primary", name: "Security Key"}],
  github: "alice-chen",
  lastChangePasswordTime: "2026-06-21T08:30:00Z",
  managedAccounts: [{name: "service-account-a"}],
  faceIds: [{name: "face-primary", imageUrl: "https://example.test/face-primary.png", faceIdData: [0.12, 0.24, 0.36, 0.48, 0.6, 0.72]}],
  mfaAccounts: [{name: "mfa-account-a"}],
  mfaProps: {enabled: true},
  needUpdatePassword: false,
  ipWhitelist: "10.0.0.0/24, 192.168.1.12",
  firstName: "Alice",
  lastName: "Chen",
  applicationScopes: [{application: "admin-console", scope: "profile"}],
};

const previewApplication = {
  name: "admin-console",
  affiliationUrl: "",
  organizationObj: previewOrganization,
  providers: [
    {name: "github-oauth", canUnlink: true, provider: {name: "github", displayName: "GitHub Enterprise", category: "OAuth", type: "GitHub"}},
    {name: "corp-saml", canUnlink: true, provider: {name: "corp-saml", displayName: "Corporate SAML", category: "SAML", type: "Custom"}},
  ],
};

class PreviewUserEditPage extends UserEditPage {
  UNSAFE_componentWillMount() {
    this.setPreviewState();
  }

  componentDidUpdate() {
    // Preview data is static; suppress backend-driven refresh loops while reviewing layout.
  }

  getUser() {
    this.setPreviewState();
  }

  getUserTransactions() {
    this.setState({transactions: this.getPreviewTransactions()});
  }

  getOrganizations() {
    this.setState({organizations: this.getPreviewOrganizations()});
  }

  getApplicationsByOrganization() {
    this.setState({applications: this.getPreviewApplications(), applicationsLoaded: true});
  }

  getUserApplication() {
    this.setState({application: this.getPreviewApplication(), userOrganization: previewOrganization});
  }

  getGroups() {
    this.setState({groups: this.getPreviewGroups()});
  }

  submitUserEdit() {
    this.setState({dirty: false, submitting: false});
  }

  deleteUser() {
    this.setState({dirty: false, submitting: false});
  }

  private setPreviewState() {
    this.setState({
      user: this.getPreviewUser(),
      application: this.getPreviewApplication(),
      userOrganization: previewOrganization,
      groups: this.getPreviewGroups(),
      organizations: this.getPreviewOrganizations(),
      applications: this.getPreviewApplications(),
      applicationsLoaded: true,
      loading: false,
      transactions: this.getPreviewTransactions(),
      consents: [
        {application: "admin-console", grantedScopes: ["profile", "audit"]},
      ],
      multiFactorAuths: [...previewUser.multiFactorAuths],
      dirty: false,
      submitting: false,
    });
  }

  private getPreviewUser() {
    const search = this.props.location?.search ?? "";
    const accessMode = new URLSearchParams(search).get("access");
    const user = {...previewUser};

    if (accessMode === "empty") {
      user.roles = [];
      user.permissions = [];
    }

    return user;
  }

  private getPreviewApplication() {
    const search = this.props.location?.search ?? "";
    const providersMode = new URLSearchParams(search).get("providers");

    if (providersMode === "empty") {
      return {
        ...previewApplication,
        providers: [],
      };
    }

    return previewApplication;
  }

  private getPreviewOrganizations() {
    return [
      {name: "engineering", displayName: "Engineering"},
      {name: "sales", displayName: "Sales"},
    ];
  }

  private getPreviewApplications() {
    return [
      {name: "admin-console", displayName: "Admin Console"},
      {name: "employee-portal", displayName: "Employee Portal"},
    ];
  }

  private getPreviewGroups() {
    return [
      {owner: "engineering", name: "platform", displayName: "Platform Team", type: "Physical"},
      {owner: "engineering", name: "auditors", displayName: "Audit Reviewers", type: "Virtual"},
      {owner: "engineering", name: "directory-sync", displayName: "Directory Synced", type: "Virtual", isDirectorySynced: true},
    ];
  }

  private getPreviewTransactions() {
    return [
      {name: "tx-10001", createdTime: "2026-06-30T10:00:00Z", amount: 128.5, currency: "USD"},
      {name: "tx-10002", createdTime: "2026-07-01T09:20:00Z", amount: 42, currency: "USD"},
    ];
  }
}

export default function UserEditVisualReviewPage(props: PreviewRouteProps): JSX.Element {
  React.useEffect(() => {
    document.body.classList.add("user-edit-visual-review-active");
    return () => {
      document.body.classList.remove("user-edit-visual-review-active");
    };
  }, []);

  return (
    <PreviewUserEditPage
      account={{...previewUser, isAdmin: true, accessToken: "visual-review"}}
      match={{params: {organizationName: "engineering", userName: "alice.chen"}}}
      location={{search: props.location?.search ?? ""}}
      history={props.history}
    />
  );
}
