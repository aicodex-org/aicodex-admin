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

// aicodexOwnedSchemaModels 为 AICodex-owned bootstrap 边界返回全新的模型指针。
// versioned migration、生产 bootstrap 与测试 fixture 均只从这里取得模型集合。
func aicodexOwnedSchemaModels() []interface{} {
	return []interface{}{
		new(OrganizationSyncApiKey),
		new(PlatformOrganization),
		new(PlatformUser),
		new(PlatformDepartment),
		new(PlatformMembership),
		new(SourceConnection),
		new(ExternalIdentity),
		new(LifecycleEvent),
		new(OrgSyncBatch),
		new(PlatformApiOrganizationMapping),
		new(PlatformApiUserMapping),
		new(GatewayProjectionPublishAttempt),
		new(GatewayProjectionCleanupApprovalAuditRecord),
		new(ServiceCredentialGovernanceConfig),
		new(AdminSecureHandoffGrant),
		new(WecomOrganizationSyncConfig),
		new(WecomOrganizationSyncRun),
		new(WecomOrganizationSyncDryRunHistory),
		new(FeishuOrganizationSyncConfig),
		new(DingTalkOrganizationSyncConfig),
		new(DingTalkOrganizationSyncRun),
		new(FeishuOrganizationSyncRun),
		new(FeishuOrganizationSyncDryRunHistory),
		new(OrganizationSyncSchedule),
		new(OrganizationSyncScheduleFire),
		new(WecomProfileConsentIntent),
		new(WecomDepartmentMapping),
		new(WecomUserMapping),
		new(WecomUserDepartment),
		new(WecomDepartmentLeader),
		new(WecomUserDirectLeader),
		new(FeishuDepartmentMapping),
		new(FeishuUserMapping),
		new(FeishuUserDepartment),
		new(DingTalkDepartmentMapping),
		new(DingTalkUserMapping),
		new(DingTalkUserDepartment),
		new(DingTalkDepartmentLeader),
		new(DingTalkUserDirectLeader),
	}
}
