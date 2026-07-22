package object

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestOrganizationSyncContractV2BuildsCurrentMultiDepartmentAndLeaderRelations(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	snapshot, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	if snapshot.ContractVersion != "v2" || snapshot.SourceConnectionID != "src-wecom" || snapshot.SourceType != SourceTypeWecom || snapshot.SourceTenantID != "corp-a" || snapshot.SourceOrgVersion != "orgv-42" || snapshot.BatchID != "batch-42" {
		t.Fatalf("source contract = %+v", snapshot)
	}
	if len(snapshot.Departments) != 2 || snapshot.Departments[0].DepartmentID != "d1" || snapshot.Departments[1].DepartmentID != "d2" {
		t.Fatalf("departments = %+v", snapshot.Departments)
	}
	if len(snapshot.MemberRelations) != 4 {
		t.Fatalf("member relations = %+v", snapshot.MemberRelations)
	}
	u1Relations := []OrganizationSyncContractV2MemberRelation{}
	for _, relation := range snapshot.MemberRelations {
		if relation.StableSubjectID == "admin:u1" {
			u1Relations = append(u1Relations, relation)
		}
	}
	if len(u1Relations) != 2 || u1Relations[0].DepartmentID != "d1" || !u1Relations[0].IsMain || u1Relations[1].DepartmentID != "d2" || u1Relations[1].IsMain {
		t.Fatalf("u1 multi-department relations = %+v", u1Relations)
	}
	if !reflect.DeepEqual(u1Relations[0].SourceRoles, []string{"Manager", "Owner"}) || !reflect.DeepEqual(u1Relations[0].SourcePositions, []string{"Director"}) {
		t.Fatalf("role/position lineage = %+v", u1Relations[0])
	}
	if len(snapshot.DepartmentLeaderRelations) != 1 || snapshot.DepartmentLeaderRelations[0].LeaderStableSubjectID != "admin:u1" || snapshot.DepartmentLeaderRelations[0].DepartmentID != "d1" {
		t.Fatalf("department leaders = %+v", snapshot.DepartmentLeaderRelations)
	}
	if !reflect.DeepEqual(snapshot.DirectLeaderRelations, []OrganizationSyncContractV2DirectLeaderRelation{
		{LeaderStableSubjectID: "admin:u1", SubordinateStableSubjectID: "admin:u2", LifecycleStatus: "active", SourceConnectionID: "src-wecom", SourceVersion: "orgv-42", BatchID: "batch-42"},
		{LeaderStableSubjectID: "admin:u2", SubordinateStableSubjectID: "admin:u3", LifecycleStatus: "active", SourceConnectionID: "src-wecom", SourceVersion: "orgv-42", BatchID: "batch-42"},
	}) {
		t.Fatalf("direct leaders = %+v", snapshot.DirectLeaderRelations)
	}
	if snapshot.Diagnostics.MemberRelationCount != 4 || snapshot.Diagnostics.DepartmentLeaderCount != 1 || snapshot.Diagnostics.DirectLeaderCount != 2 || !strings.HasPrefix(snapshot.Lineage.Digest, "sha256:") {
		t.Fatalf("diagnostics/lineage = %+v %+v", snapshot.Diagnostics, snapshot.Lineage)
	}

	raw, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("marshal snapshot: %v", err)
	}
	for _, forbidden := range []string{"osak_", "secretRef", "configRef", "alice@example.com", "13000000000", "legacy manager display"} {
		if strings.Contains(string(raw), forbidden) {
			t.Fatalf("v2 payload leaks forbidden value %q: %s", forbidden, raw)
		}
	}
}

func TestOrganizationSyncContractV2IsDeterministic(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	input.Applications = []*Application{
		{Name: "z-app", DisplayName: "Z", Organization: "engineering", Type: "web", Category: "internal"},
		{Name: "a-app", DisplayName: "A", Organization: "engineering", Type: "native", Category: "internal"},
	}
	first, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("first build: %v", err)
	}
	reversePlatformDepartments(input.Departments)
	reversePlatformMemberships(input.Memberships)
	reverseExternalIdentities(input.ExternalIdentities)
	reverseWecomDirectLeaders(input.WecomDirectLeaders)
	reverseApplications(input.Applications)
	second, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("second build: %v", err)
	}
	if first.Lineage.Digest != second.Lineage.Digest || !reflect.DeepEqual(first.Departments, second.Departments) || !reflect.DeepEqual(first.MemberRelations, second.MemberRelations) || !reflect.DeepEqual(first.DirectLeaderRelations, second.DirectLeaderRelations) || !reflect.DeepEqual(first.Applications, second.Applications) {
		t.Fatalf("same snapshot must be deterministic:\nfirst=%+v\nsecond=%+v", first, second)
	}
	if len(first.Applications) != 2 || first.Applications[0].Name != "a-app" || first.Applications[1].Name != "z-app" {
		t.Fatalf("applications must be stably sorted: %+v", first.Applications)
	}
}

func TestOrganizationSyncContractV2SourceSelectionAndLineageFailClosed(t *testing.T) {
	tests := []struct {
		name string
		edit func(*OrganizationSyncContractV2BuildInput)
		code string
	}{
		{name: "missing source", edit: func(input *OrganizationSyncContractV2BuildInput) { input.SourceConnections = nil }, code: OrganizationSyncContractErrorSourceUnavailable},
		{name: "multiple source", edit: func(input *OrganizationSyncContractV2BuildInput) {
			input.SourceConnections = append(input.SourceConnections, SourceConnection{OrganizationId: "engineering", SourceConnectionId: "src-other", SourceType: SourceTypeLark, SourceTenantId: "tenant-b", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh})
		}, code: OrganizationSyncContractErrorSourceSelection},
		{name: "stale source", edit: func(input *OrganizationSyncContractV2BuildInput) {
			input.SourceConnections[0].Freshness = PlatformFreshnessStale
		}, code: OrganizationSyncContractErrorSourceUnavailable},
		{name: "missing batch", edit: func(input *OrganizationSyncContractV2BuildInput) { input.Batches = nil }, code: OrganizationSyncContractErrorBatchUnavailable},
		{name: "connection batch missing", edit: func(input *OrganizationSyncContractV2BuildInput) { input.SourceConnections[0].LastSeenBatchId = "" }, code: OrganizationSyncContractErrorLineageInvalid},
		{name: "failed batch", edit: func(input *OrganizationSyncContractV2BuildInput) { input.Batches[0].Status = OrgSyncBatchStatusFailed }, code: OrganizationSyncContractErrorLineageInvalid},
		{name: "missing source version", edit: func(input *OrganizationSyncContractV2BuildInput) { input.Batches[0].OrgVersion = "" }, code: OrganizationSyncContractErrorLineageInvalid},
		{name: "expired source", edit: func(input *OrganizationSyncContractV2BuildInput) {
			input.Batches[0].FinishedAt = input.Now.Add(-2 * time.Hour)
		}, code: OrganizationSyncContractErrorSourceUntrusted},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := organizationSyncContractV2Fixture()
			test.edit(&input)
			_, err := BuildOrganizationSyncContractV2(input)
			if !IsOrganizationSyncContractErrorCode(err, test.code) {
				t.Fatalf("err=%v want code=%s", err, test.code)
			}
		})
	}

	input := organizationSyncContractV2Fixture()
	input.SourceConnections = append(input.SourceConnections, SourceConnection{OrganizationId: "engineering", SourceConnectionId: "src-other", SourceType: SourceTypeLark, SourceTenantId: "tenant-b", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh, LastSeenBatchId: "batch-other"})
	input.Batches = append(input.Batches, OrgSyncBatch{OrganizationId: "engineering", SourceConnectionId: "src-other", BatchId: "batch-other", Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-other", Freshness: PlatformFreshnessFresh, FinishedAt: input.Now.Add(-time.Minute)})
	input.RequestedSourceConnectionID = "src-wecom"
	if _, err := BuildOrganizationSyncContractV2(input); err != nil {
		t.Fatalf("explicit source selection should succeed: %v", err)
	}
}

func TestOrganizationSyncContractV2UsesMinimalOrganizationAndApplicationDTO(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	input.Organization.PasswordType = "sensitive-password-policy"
	input.Organization.MasterPassword = "sensitive-master-password"
	input.Organization.IpWhitelist = "10.0.0.1"
	input.Applications = []*Application{{
		Owner: "admin", Name: "safe-app", DisplayName: "Safe App", Organization: "engineering", Type: "web", Category: "internal",
		ClientSecret: "sensitive-client-secret", RedirectUris: []string{"https://sensitive.example/callback"}, HeaderHtml: "sensitive-header",
	}}
	snapshot, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	if snapshot.Organization.OrganizationID != "engineering" || snapshot.Organization.DisplayName != "Engineering" {
		t.Fatalf("organization summary = %+v", snapshot.Organization)
	}
	if !reflect.DeepEqual(snapshot.Applications, []OrganizationSyncContractV2Application{{Name: "safe-app", DisplayName: "Safe App", Category: "internal", Type: "web", Organization: "engineering"}}) {
		t.Fatalf("application summaries = %+v", snapshot.Applications)
	}
	raw, err := json.Marshal(snapshot)
	if err != nil {
		t.Fatalf("marshal snapshot: %v", err)
	}
	for _, forbidden := range []string{"passwordType", "masterPassword", "ipWhitelist", "clientSecret", "redirectUris", "headerHtml", "sensitive-"} {
		if strings.Contains(string(raw), forbidden) {
			t.Fatalf("minimal DTO leaked %q: %s", forbidden, raw)
		}
	}
}

func TestOrganizationSyncContractV2RequiresCurrentIdentityAndUserBatch(t *testing.T) {
	tests := []struct {
		name string
		edit func(*OrganizationSyncContractV2BuildInput)
	}{
		{name: "stale identity", edit: func(input *OrganizationSyncContractV2BuildInput) {
			input.ExternalIdentities[0].LastSeenBatchId = "batch-41"
		}},
		{name: "stale platform user", edit: func(input *OrganizationSyncContractV2BuildInput) { input.Users[0].LastSeenBatchId = "batch-41" }},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := organizationSyncContractV2Fixture()
			test.edit(&input)
			snapshot, err := BuildOrganizationSyncContractV2(input)
			if err != nil {
				t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
			}
			for _, relation := range snapshot.MemberRelations {
				if relation.StableSubjectID == "admin:u1" {
					t.Fatalf("stale subject published as current: %+v", relation)
				}
			}
			if snapshot.Diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonIdentityMissing]+snapshot.Diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonRelationNotCurrent] == 0 {
				t.Fatalf("missing skipped diagnostic: %+v", snapshot.Diagnostics)
			}
		})
	}
}

func TestOrganizationSyncContractV2MergesLifecycleFailClosed(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	input.Users[0].LifecycleStatus = PlatformLifecycleStatusDisabled
	snapshot, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	foundMembers := 0
	for _, relation := range snapshot.MemberRelations {
		if relation.StableSubjectID == "admin:u1" {
			foundMembers++
			if relation.LifecycleStatus != "disabled" {
				t.Fatalf("disabled user must not produce active membership: %+v", relation)
			}
		}
	}
	if foundMembers != 2 || len(snapshot.DepartmentLeaderRelations) != 1 || snapshot.DepartmentLeaderRelations[0].LifecycleStatus != "disabled" {
		t.Fatalf("disabled lifecycle projection members=%d leaders=%+v", foundMembers, snapshot.DepartmentLeaderRelations)
	}
}

func TestOrganizationSyncContractV2PublishesCurrentDirectLeaderTombstoneAndFiltersOtherCorp(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	input.WecomDirectLeaders = append(input.WecomDirectLeaders,
		WecomUserDirectLeader{Organization: "engineering", CorpId: "corp-a", WecomUserId: "u3", LeaderWecomUserId: "u1", IsEnabled: false, MissingSinceRunId: "batch-42", LastSeenRunId: "batch-41"},
		WecomUserDirectLeader{Organization: "engineering", CorpId: "corp-other", WecomUserId: "u3", LeaderWecomUserId: "u1", IsEnabled: true, LastSeenRunId: "batch-42"},
	)
	snapshot, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	found := 0
	for _, relation := range snapshot.DirectLeaderRelations {
		if relation.LeaderStableSubjectID == "admin:u1" && relation.SubordinateStableSubjectID == "admin:u3" {
			found++
			if relation.LifecycleStatus != "disabled" {
				t.Fatalf("current tombstone lifecycle = %+v", relation)
			}
		}
	}
	if found != 1 {
		t.Fatalf("expected exactly one source-bound tombstone, got %d: %+v", found, snapshot.DirectLeaderRelations)
	}
}

func TestOrganizationSyncContractV2NeverConsumesLegacyManagerText(t *testing.T) {
	legacyGroup := OrganizationSyncExportGroup{Manager: "admin:u3"}
	if legacyGroup.Manager == "" {
		t.Fatal("legacy fixture must contain manager text")
	}
	snapshot, err := BuildOrganizationSyncContractV2(organizationSyncContractV2Fixture())
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	for _, relation := range snapshot.DepartmentLeaderRelations {
		if relation.LeaderStableSubjectID == legacyGroup.Manager {
			t.Fatalf("legacy manager text fabricated a v2 leader relation: %+v", relation)
		}
	}
}

func TestOrganizationSyncContractV2SkipsAmbiguousIdentityAndMainConflict(t *testing.T) {
	input := organizationSyncContractV2Fixture()
	input.ExternalIdentities = append(input.ExternalIdentities, ExternalIdentity{
		OrganizationId: "engineering", SourceConnectionId: "src-wecom", ExternalSubjectType: PlatformSubjectTypeUser,
		ExternalSubjectId: "u1-duplicate", PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: "admin:u1", MappingStatus: PlatformMappingStatusConfirmed,
		LastSeenBatchId: "batch-42",
	})
	input.Memberships = append(input.Memberships, PlatformMembership{
		OrganizationId: "engineering", AdminSubject: "admin:u2", DepartmentId: "d1", IsMain: true,
		LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-wecom", OrgVersion: "orgv-42",
	})
	snapshot, err := BuildOrganizationSyncContractV2(input)
	if err != nil {
		t.Fatalf("BuildOrganizationSyncContractV2() error = %v", err)
	}
	for _, relation := range snapshot.MemberRelations {
		if relation.StableSubjectID == "admin:u1" || relation.StableSubjectID == "admin:u2" {
			t.Fatalf("ambiguous/main-conflicted subjects must fail closed: %+v", snapshot.MemberRelations)
		}
	}
	if snapshot.Diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonIdentityAmbiguous] == 0 || snapshot.Diagnostics.SkippedReasonCounts[OrganizationSyncContractReasonMainConflict] == 0 {
		t.Fatalf("reason counts = %+v", snapshot.Diagnostics.SkippedReasonCounts)
	}
}

func organizationSyncContractV2Fixture() OrganizationSyncContractV2BuildInput {
	now := time.Date(2026, 7, 21, 12, 0, 0, 0, time.UTC)
	users := []PlatformUser{}
	memberships := []PlatformMembership{}
	identities := []ExternalIdentity{}
	for index, subject := range []string{"u1", "u2", "u3"} {
		adminSubject := "admin:" + subject
		users = append(users, PlatformUser{OrganizationId: "engineering", AdminSubject: adminSubject, LifecycleStatus: PlatformLifecycleStatusActive, MappingStatus: PlatformMappingStatusConfirmed, OrgVersion: "orgv-42", LastSeenBatchId: "batch-42"})
		identities = append(identities, ExternalIdentity{OrganizationId: "engineering", SourceConnectionId: "src-wecom", ExternalSubjectType: PlatformSubjectTypeUser, ExternalSubjectId: subject, PlatformSubjectType: PlatformSubjectTypeUser, PlatformSubject: adminSubject, MappingStatus: PlatformMappingStatusConfirmed, LastSeenBatchId: "batch-42"})
		memberships = append(memberships, PlatformMembership{OrganizationId: "engineering", AdminSubject: adminSubject, DepartmentId: "d2", IsMain: index != 0, LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-wecom", OrgVersion: "orgv-42"})
	}
	memberships = append(memberships, PlatformMembership{OrganizationId: "engineering", AdminSubject: "admin:u1", DepartmentId: "d1", IsMain: true, IsManager: true, LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-wecom", OrgVersion: "orgv-42"})
	return OrganizationSyncContractV2BuildInput{
		OrganizationID: "engineering", Now: now,
		Organization:      &Organization{Name: "engineering", DisplayName: "Engineering"},
		SourceConnections: []SourceConnection{{OrganizationId: "engineering", SourceConnectionId: "src-wecom", SourceType: SourceTypeWecom, SourceTenantId: "corp-a", Status: SourceConnectionStatusActive, Freshness: PlatformFreshnessFresh, LastSeenBatchId: "batch-42", SecretRef: "must-not-leak", ConfigRef: "must-not-leak"}},
		Batches:           []OrgSyncBatch{{OrganizationId: "engineering", SourceConnectionId: "src-wecom", BatchId: "batch-42", Status: OrgSyncBatchStatusSucceeded, OrgVersion: "orgv-42", Freshness: PlatformFreshnessFresh, FinishedAt: now.Add(-10 * time.Minute)}},
		Users:             users,
		Departments: []PlatformDepartment{
			{OrganizationId: "engineering", DepartmentId: "d2", ParentDepartmentId: "d1", DisplayName: "Team", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-wecom", ExternalDepartmentId: "2", OrgVersion: "orgv-42"},
			{OrganizationId: "engineering", DepartmentId: "d1", DisplayName: "Root", LifecycleStatus: PlatformLifecycleStatusActive, SourceConnectionId: "src-wecom", ExternalDepartmentId: "1", OrgVersion: "orgv-42"},
		},
		Memberships:        memberships,
		ExternalIdentities: identities,
		ApiUserMappings:    []PlatformApiUserMapping{{OrganizationId: "engineering", AdminSubject: "admin:u1", MappingStatus: PlatformMappingStatusConfirmed, ApiUserId: "1001", Lineage: `{"roleIds":["Owner","Manager","Manager"],"positionIds":["Director"]}`}},
		WecomDirectLeaders: []WecomUserDirectLeader{
			{Organization: "engineering", CorpId: "corp-a", WecomUserId: "u2", LeaderWecomUserId: "u1", IsEnabled: true, LastSeenRunId: "batch-42"},
			{Organization: "engineering", CorpId: "corp-a", WecomUserId: "u3", LeaderWecomUserId: "u2", IsEnabled: true, LastSeenRunId: "batch-42"},
			{Organization: "engineering", CorpId: "corp-a", WecomUserId: "u1", LeaderWecomUserId: "stale", IsEnabled: false, LastSeenRunId: "batch-41"},
		},
	}
}

func reversePlatformDepartments(values []PlatformDepartment) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}
func reversePlatformMemberships(values []PlatformMembership) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}
func reverseExternalIdentities(values []ExternalIdentity) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}
func reverseWecomDirectLeaders(values []WecomUserDirectLeader) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}
func reverseApplications(values []*Application) {
	for i, j := 0, len(values)-1; i < j; i, j = i+1, j-1 {
		values[i], values[j] = values[j], values[i]
	}
}
