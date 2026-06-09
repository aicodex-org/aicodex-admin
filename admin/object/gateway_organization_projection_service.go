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
	"context"
	"errors"
	"time"
)

// GatewayProjectionSnapshot 是构建 gateway projection 所需的 admin 权威数据快照。
// AdminUsers 只用于读取明确 apiSubjectId 映射，不承载 Insight report scope。
type GatewayProjectionSnapshot struct {
	SourceConnections  []SourceConnection
	AdminUsers         []User
	Users              []PlatformUser
	ApiUserMappings    []PlatformApiUserMapping
	Departments        []PlatformDepartment
	Memberships        []PlatformMembership
	ExternalIdentities []ExternalIdentity
	SyncBatch          *OrgSyncBatch
}

// GatewayProjectionSnapshotStore 隔离 projection service 对 admin 存储层的读取。
type GatewayProjectionSnapshotStore interface {
	GetGatewayProjectionSnapshot(organizationID string) (*GatewayProjectionSnapshot, error)
}

// GatewayProjectionOrganizationPublisher 是 WeCom 同步触发点依赖的最小发布接口。
type GatewayProjectionOrganizationPublisher interface {
	BuildAndPublishOrganization(ctx context.Context, organizationID string, traceID string) (GatewayProjectionServiceResult, error)
}

// GatewayProjectionService 编排组织快照读取、batch 构建和 publisher push。
type GatewayProjectionService struct {
	Store     GatewayProjectionSnapshotStore
	Config    GatewayProjectionPublisherConfig
	Publisher GatewayProjectionPublisher
	Now       func() time.Time
}

// GatewayProjectionServiceResult 汇总 builder 和 publisher 两段结果，便于脚本或触发方审计。
type GatewayProjectionServiceResult struct {
	Build   GatewayProjectionBuildResult
	Publish GatewayProjectionPublishResult
}

type defaultGatewayProjectionSnapshotStore struct{}

// BuildAndPublishOrganization 从当前 admin 主模型读取组织快照，构建并推送 gateway projection batch。
// 该服务方法是后端和脚本共用入口；是否自动触发由上层配置门控决定。
func (s *GatewayProjectionService) BuildAndPublishOrganization(ctx context.Context, organizationID string, traceID string) (GatewayProjectionServiceResult, error) {
	organizationID = normalizeGatewayProjectionString(organizationID)
	if organizationID == "" {
		return GatewayProjectionServiceResult{}, errors.New("gateway projection organization is required")
	}
	config := s.publisherConfig()
	snapshot, err := s.snapshotStore().GetGatewayProjectionSnapshot(organizationID)
	if err != nil {
		return GatewayProjectionServiceResult{}, err
	}
	if snapshot == nil {
		snapshot = &GatewayProjectionSnapshot{}
	}

	build, err := BuildGatewayProjectionBatch(GatewayProjectionBuildInput{
		TraceID:            traceID,
		Caller:             config.Caller,
		OrganizationID:     organizationID,
		GeneratedAt:        s.now().UTC(),
		FreshnessTTL:       config.FreshnessTTL,
		SourceConnections:  snapshot.SourceConnections,
		AdminUsers:         snapshot.AdminUsers,
		Users:              snapshot.Users,
		ApiUserMappings:    snapshot.ApiUserMappings,
		Departments:        snapshot.Departments,
		Memberships:        snapshot.Memberships,
		ExternalIdentities: snapshot.ExternalIdentities,
		SyncBatch:          snapshot.SyncBatch,
	})
	if err != nil {
		return GatewayProjectionServiceResult{Build: build}, err
	}

	publisher := s.Publisher
	if publisher.Config.Endpoint == "" && publisher.Config.Token == "" {
		publisher.Config = config
	}
	publish, err := publisher.Publish(ctx, build.Request)
	return GatewayProjectionServiceResult{Build: build, Publish: publish}, err
}

func (s *GatewayProjectionService) snapshotStore() GatewayProjectionSnapshotStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionSnapshotStore{}
}

func (s *GatewayProjectionService) publisherConfig() GatewayProjectionPublisherConfig {
	if s != nil && (s.Config.Endpoint != "" || s.Config.Token != "" || s.Config.Caller != "" || s.Config.FreshnessTTL > 0) {
		config := s.Config
		config.Caller = firstNonEmpty(config.Caller, GatewayProjectionDefaultCaller)
		if config.FreshnessTTL <= 0 {
			config.FreshnessTTL = GatewayProjectionDefaultFreshnessTTL
		}
		return config
	}
	config := GetGatewayProjectionPublisherConfig()
	if config.FreshnessTTL <= 0 {
		config.FreshnessTTL = GatewayProjectionDefaultFreshnessTTL
	}
	return config
}

func (s *GatewayProjectionService) now() time.Time {
	if s != nil && s.Now != nil {
		return s.Now()
	}
	return time.Now()
}

func (s defaultGatewayProjectionSnapshotStore) GetGatewayProjectionSnapshot(organizationID string) (*GatewayProjectionSnapshot, error) {
	snapshot := &GatewayProjectionSnapshot{}
	organizationID = normalizeGatewayProjectionString(organizationID)
	if organizationID == "" || ormer == nil || ormer.Engine == nil {
		return snapshot, nil
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.SourceConnections); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("owner = ?", organizationID).Find(&snapshot.AdminUsers); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.Users); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.ApiUserMappings); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.Departments); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.Memberships); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Find(&snapshot.ExternalIdentities); err != nil {
		return nil, err
	}
	batches := []OrgSyncBatch{}
	if err := ormer.Engine.Where("organization_id = ?", organizationID).Desc("finished_at").Limit(1).Find(&batches); err != nil {
		return nil, err
	}
	if len(batches) > 0 {
		batch := batches[0]
		snapshot.SyncBatch = &batch
	}
	return snapshot, nil
}
