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
	"fmt"
	"strings"
)

// OrganizationDirectorySource 是组织通讯录同步来源的稳定枚举，后续 Provider 也应先落到这里再参与统一判定。
type OrganizationDirectorySource string

// OrganizationDirectorySourceState 表示目标组织相对当前 Provider 的来源归属状态。
type OrganizationDirectorySourceState string

// OrganizationDirectorySourceReasonCode 是写入、手动同步和定时同步 fail-closed 时返回的安全原因码。
type OrganizationDirectorySourceReasonCode string

const (
	OrganizationDirectorySourceWeCom    OrganizationDirectorySource = "wecom"
	OrganizationDirectorySourceLark     OrganizationDirectorySource = "lark"
	OrganizationDirectorySourceDingTalk OrganizationDirectorySource = "dingtalk"

	OrganizationDirectorySourceStateAvailable OrganizationDirectorySourceState = "available"
	OrganizationDirectorySourceStateOwned     OrganizationDirectorySourceState = "owned"
	OrganizationDirectorySourceStateOccupied  OrganizationDirectorySourceState = "occupied"
	OrganizationDirectorySourceStateAmbiguous OrganizationDirectorySourceState = "ambiguous"

	OrganizationDirectorySourceReasonOccupied    OrganizationDirectorySourceReasonCode = "source_occupied"
	OrganizationDirectorySourceReasonAmbiguous   OrganizationDirectorySourceReasonCode = "source_ambiguous"
	OrganizationDirectorySourceReasonUnavailable OrganizationDirectorySourceReasonCode = "source_status_unavailable"
)

// OrganizationSyncSourceConflictError 表示目标组织已经被另一种通讯录同步来源配置占用。
type OrganizationSyncSourceConflictError struct {
	Provider     string
	Organization string
}

func (e *OrganizationSyncSourceConflictError) Error() string {
	if e == nil {
		return ""
	}
	return fmt.Sprintf("%s organization sync is already configured for organization %s; create a new organization before using another address book sync source", e.Provider, e.Organization)
}

// OrganizationDirectorySourceDecisionError 将统一执行判定失败转换为不含凭据和外部原始响应的业务错误。
type OrganizationDirectorySourceDecisionError struct {
	ReasonCode   OrganizationDirectorySourceReasonCode
	Organization string
	Source       *OrganizationDirectorySourceSummary
}

func (e *OrganizationDirectorySourceDecisionError) Error() string {
	if e == nil {
		return ""
	}
	switch e.ReasonCode {
	case OrganizationDirectorySourceReasonOccupied:
		provider := ""
		if e.Source != nil {
			provider = e.Source.DisplayName
		}
		return fmt.Sprintf("%s organization sync is already configured for organization %s; create a new organization before using another address book sync source", provider, e.Organization)
	case OrganizationDirectorySourceReasonAmbiguous:
		return fmt.Sprintf("organization %s has multiple configured address book sync sources; resolve the data abnormality or create a new organization before syncing", e.Organization)
	case OrganizationDirectorySourceReasonUnavailable:
		return fmt.Sprintf("organization directory source status is unavailable for organization %s", e.Organization)
	default:
		return fmt.Sprintf("organization directory source decision denied for organization %s", e.Organization)
	}
}

// OrganizationSyncSourceConflictStatus 汇总当前 provider 的默认同步组织和另一来源占用状态，供接口和前端过滤组织候选项。
type OrganizationSyncSourceConflictStatus struct {
	ConflictingProvider       string                             `json:"conflictingProvider,omitempty"`
	ConflictingOrganization   string                             `json:"conflictingOrganization,omitempty"`
	ConflictingConfigured     bool                               `json:"conflictingConfigured"`
	ConflictingEnabled        bool                               `json:"conflictingEnabled"`
	ConflictingOrganizations  []string                           `json:"conflictingOrganizations,omitempty"`
	DefaultOrganization       string                             `json:"defaultOrganization,omitempty"`
	DefaultOrganizationSource string                             `json:"defaultOrganizationSource,omitempty"`
	SourceStatus              *OrganizationDirectorySourceStatus `json:"sourceStatus,omitempty"`
}

// OrganizationDirectorySourceSummary 是可返回给接口和前端的脱敏来源摘要，只描述配置归属，不携带 Provider secret/token。
type OrganizationDirectorySourceSummary struct {
	Source       OrganizationDirectorySource `json:"source"`
	DisplayName  string                      `json:"displayName"`
	Organization string                      `json:"organization"`
	Configured   bool                        `json:"configured"`
	Enabled      bool                        `json:"enabled"`
}

// OrganizationDirectorySourceStatus 表示某个组织或候选组织集合的统一通讯录来源状态。
type OrganizationDirectorySourceStatus struct {
	Organization     string                                `json:"organization,omitempty"`
	CurrentSource    OrganizationDirectorySource           `json:"currentSource,omitempty"`
	State            OrganizationDirectorySourceState      `json:"state"`
	OwningSource     *OrganizationDirectorySourceSummary   `json:"owningSource,omitempty"`
	OccupyingSource  *OrganizationDirectorySourceSummary   `json:"occupyingSource,omitempty"`
	Sources          []*OrganizationDirectorySourceSummary `json:"sources,omitempty"`
	CandidateSummary []*OrganizationDirectorySourceSummary `json:"candidateSummary,omitempty"`
	Statuses         []*OrganizationDirectorySourceStatus  `json:"statuses,omitempty"`
}

// OrganizationDirectorySourceDecision 是保存配置、手动同步和 scheduler dispatch 共用的允许/拒绝结果。
type OrganizationDirectorySourceDecision struct {
	Allowed    bool                                  `json:"allowed"`
	ReasonCode OrganizationDirectorySourceReasonCode `json:"reasonCode,omitempty"`
	Status     *OrganizationDirectorySourceStatus    `json:"status,omitempty"`
}

// OrganizationDirectorySourceStatusService 聚合各 Provider 配置 store，集中计算组织通讯录来源归属。
type OrganizationDirectorySourceStatusService struct {
	WecomConfigStore  WecomOrganizationSyncConfigStore
	FeishuConfigStore FeishuOrganizationSyncConfigStore
}

type wecomOrganizationSyncConfigLister interface {
	ListWecomOrganizationSyncConfigs() ([]*WecomOrganizationSyncConfig, error)
}

type feishuOrganizationSyncConfigLister interface {
	ListFeishuOrganizationSyncConfigs() ([]*FeishuOrganizationSyncConfig, error)
}

// GetStatus 返回单个组织相对当前 Provider 的来源状态，用于页面提示和后端执行判定。
func (s *OrganizationDirectorySourceStatusService) GetStatus(organization string, currentSource OrganizationDirectorySource) (*OrganizationDirectorySourceStatus, error) {
	organization = strings.TrimSpace(organization)
	sources, err := s.configuredSourcesForOrganization(organization)
	if err != nil {
		return nil, err
	}
	return classifyOrganizationDirectorySourceStatus(organization, currentSource, sources), nil
}

// GetCandidateStatus 汇总所有已被其他来源占用或异常双配置的组织，供前端过滤组织下拉候选项。
func (s *OrganizationDirectorySourceStatusService) GetCandidateStatus(currentSource OrganizationDirectorySource) (*OrganizationDirectorySourceStatus, error) {
	currentSource = normalizeOrganizationDirectorySource(currentSource)
	organizations, err := s.configuredOrganizationSet()
	if err != nil {
		return nil, err
	}
	status := &OrganizationDirectorySourceStatus{
		CurrentSource: currentSource,
		State:         OrganizationDirectorySourceStateAvailable,
	}
	for _, organization := range organizations {
		organizationStatus, err := s.GetStatus(organization, currentSource)
		if err != nil {
			return nil, err
		}
		if organizationStatus.State == OrganizationDirectorySourceStateOccupied || organizationStatus.State == OrganizationDirectorySourceStateAmbiguous {
			status.Statuses = append(status.Statuses, organizationStatus)
			status.CandidateSummary = append(status.CandidateSummary, organizationStatus.Sources...)
		}
	}
	return status, nil
}

// GetStatusWithSourceSummary 用当前待保存配置覆盖同来源旧配置后再分类，避免把同来源更新误判为双配置。
func (s *OrganizationDirectorySourceStatusService) GetStatusWithSourceSummary(organization string, currentSource OrganizationDirectorySource, currentSummary *OrganizationDirectorySourceSummary) (*OrganizationDirectorySourceStatus, error) {
	organization = strings.TrimSpace(organization)
	excludedSource := OrganizationDirectorySource("")
	if currentSummary != nil {
		excludedSource = normalizeOrganizationDirectorySource(currentSummary.Source)
	}
	sources, err := s.configuredSourcesForOrganizationExcept(organization, excludedSource)
	if err != nil {
		return nil, err
	}
	sources = appendCurrentOrganizationDirectorySourceSummary(sources, currentSummary)
	return classifyOrganizationDirectorySourceStatus(organization, currentSource, sources), nil
}

func classifyOrganizationDirectorySourceStatus(organization string, currentSource OrganizationDirectorySource, sources []*OrganizationDirectorySourceSummary) *OrganizationDirectorySourceStatus {
	status := &OrganizationDirectorySourceStatus{
		Organization:  strings.TrimSpace(organization),
		CurrentSource: normalizeOrganizationDirectorySource(currentSource),
		State:         OrganizationDirectorySourceStateAvailable,
	}
	if status.Organization == "" {
		return status
	}
	status.Sources = compactOrganizationDirectorySourceSummaries(sources)
	switch len(status.Sources) {
	case 0:
		status.State = OrganizationDirectorySourceStateAvailable
	case 1:
		status.OwningSource = status.Sources[0]
		if status.Sources[0].Source == status.CurrentSource {
			status.State = OrganizationDirectorySourceStateOwned
		} else {
			status.State = OrganizationDirectorySourceStateOccupied
			status.OccupyingSource = status.Sources[0]
		}
	default:
		status.State = OrganizationDirectorySourceStateAmbiguous
	}
	return status
}

// DecideExecution 计算已有配置下当前 Provider 是否允许执行写入、手动同步或定时同步。
func (s *OrganizationDirectorySourceStatusService) DecideExecution(organization string, currentSource OrganizationDirectorySource) (*OrganizationDirectorySourceDecision, error) {
	status, err := s.GetStatus(organization, currentSource)
	if err != nil {
		return &OrganizationDirectorySourceDecision{
			Allowed:    false,
			ReasonCode: OrganizationDirectorySourceReasonUnavailable,
		}, err
	}
	return newOrganizationDirectorySourceDecision(status), nil
}

// DecideExecutionWithSourceSummary 在保存配置前用待保存摘要参与统一判定，确保跨来源占用 fail closed。
func (s *OrganizationDirectorySourceStatusService) DecideExecutionWithSourceSummary(organization string, currentSource OrganizationDirectorySource, currentSummary *OrganizationDirectorySourceSummary) (*OrganizationDirectorySourceDecision, error) {
	status, err := s.GetStatusWithSourceSummary(organization, currentSource, currentSummary)
	if err != nil {
		return &OrganizationDirectorySourceDecision{
			Allowed:    false,
			ReasonCode: OrganizationDirectorySourceReasonUnavailable,
		}, err
	}
	return newOrganizationDirectorySourceDecision(status), nil
}

// RequireExecutionAllowed 在执行入口直接返回统一业务错误，避免调用方重复拼装错误文案。
func (s *OrganizationDirectorySourceStatusService) RequireExecutionAllowed(organization string, currentSource OrganizationDirectorySource) error {
	decision, err := s.DecideExecution(organization, currentSource)
	return organizationDirectorySourceDecisionError(organization, decision, err)
}

// RequireExecutionAllowedWithSourceSummary 是保存配置路径使用的 fail-closed guard。
func (s *OrganizationDirectorySourceStatusService) RequireExecutionAllowedWithSourceSummary(organization string, currentSource OrganizationDirectorySource, currentSummary *OrganizationDirectorySourceSummary) error {
	decision, err := s.DecideExecutionWithSourceSummary(organization, currentSource, currentSummary)
	return organizationDirectorySourceDecisionError(organization, decision, err)
}

func newOrganizationDirectorySourceDecision(status *OrganizationDirectorySourceStatus) *OrganizationDirectorySourceDecision {
	decision := &OrganizationDirectorySourceDecision{Status: status}
	if status == nil {
		decision.ReasonCode = OrganizationDirectorySourceReasonUnavailable
		return decision
	}
	switch status.State {
	case OrganizationDirectorySourceStateAvailable, OrganizationDirectorySourceStateOwned:
		decision.Allowed = true
	case OrganizationDirectorySourceStateOccupied:
		decision.ReasonCode = OrganizationDirectorySourceReasonOccupied
	case OrganizationDirectorySourceStateAmbiguous:
		decision.ReasonCode = OrganizationDirectorySourceReasonAmbiguous
	default:
		decision.ReasonCode = OrganizationDirectorySourceReasonUnavailable
	}
	return decision
}

func organizationDirectorySourceDecisionError(organization string, decision *OrganizationDirectorySourceDecision, err error) error {
	if err != nil {
		if decision == nil {
			decision = &OrganizationDirectorySourceDecision{ReasonCode: OrganizationDirectorySourceReasonUnavailable}
		}
		if decision.ReasonCode == "" {
			decision.ReasonCode = OrganizationDirectorySourceReasonUnavailable
		}
	}
	if decision == nil || decision.Allowed {
		return nil
	}
	status := decision.Status
	var source *OrganizationDirectorySourceSummary
	if status != nil {
		source = status.OccupyingSource
		if source == nil && len(status.Sources) > 0 {
			source = status.Sources[0]
		}
	}
	return &OrganizationDirectorySourceDecisionError{
		ReasonCode:   decision.ReasonCode,
		Organization: strings.TrimSpace(organization),
		Source:       source,
	}
}

func appendCurrentOrganizationDirectorySourceSummary(sources []*OrganizationDirectorySourceSummary, currentSummary *OrganizationDirectorySourceSummary) []*OrganizationDirectorySourceSummary {
	if currentSummary == nil {
		return sources
	}
	currentSummary.Source = normalizeOrganizationDirectorySource(currentSummary.Source)
	currentSummary.Organization = strings.TrimSpace(currentSummary.Organization)
	if currentSummary.Organization == "" {
		return sources
	}
	for _, source := range sources {
		if source == nil {
			continue
		}
		if normalizeOrganizationDirectorySource(source.Source) == currentSummary.Source {
			return sources
		}
	}
	return append(sources, currentSummary)
}

func compactOrganizationDirectorySourceSummaries(sources []*OrganizationDirectorySourceSummary) []*OrganizationDirectorySourceSummary {
	compacted := []*OrganizationDirectorySourceSummary{}
	seen := map[OrganizationDirectorySource]bool{}
	for _, source := range sources {
		if source == nil {
			continue
		}
		source.Source = normalizeOrganizationDirectorySource(source.Source)
		source.Organization = strings.TrimSpace(source.Organization)
		if source.Organization == "" || seen[source.Source] {
			continue
		}
		seen[source.Source] = true
		compacted = append(compacted, source)
	}
	return compacted
}

func (s *OrganizationDirectorySourceStatusService) configuredSourcesForOrganization(organization string) ([]*OrganizationDirectorySourceSummary, error) {
	return s.configuredSourcesForOrganizationExcept(organization, "")
}

func (s *OrganizationDirectorySourceStatusService) configuredOrganizationSet() ([]string, error) {
	seen := map[string]bool{}
	organizations := []string{}
	appendOrganizations := func(values []string) {
		for _, value := range values {
			value = strings.TrimSpace(value)
			if value == "" || seen[value] {
				continue
			}
			seen[value] = true
			organizations = append(organizations, value)
		}
	}
	wecomOrganizations, err := getConfiguredWecomOrganizationSyncOrganizations(s.wecomConfigStore())
	if err != nil {
		return nil, err
	}
	appendOrganizations(wecomOrganizations)
	feishuOrganizations, err := getConfiguredFeishuOrganizationSyncOrganizations(s.feishuConfigStore())
	if err != nil {
		return nil, err
	}
	appendOrganizations(feishuOrganizations)
	return organizations, nil
}

func (s *OrganizationDirectorySourceStatusService) configuredSourcesForOrganizationExcept(organization string, excludedSource OrganizationDirectorySource) ([]*OrganizationDirectorySourceSummary, error) {
	excludedSource = normalizeOrganizationDirectorySource(excludedSource)
	sources := []*OrganizationDirectorySourceSummary{}
	if excludedSource != OrganizationDirectorySourceWeCom {
		wecomConfig, err := s.wecomConfigStore().GetWecomOrganizationSyncConfigByOrganization(organization)
		if err != nil {
			return nil, err
		}
		if wecomConfig != nil {
			sources = append(sources, newWecomOrganizationDirectorySourceSummary(wecomConfig))
		}
	}
	if excludedSource != OrganizationDirectorySourceLark {
		feishuConfig, err := s.feishuConfigStore().GetFeishuOrganizationSyncConfigByOrganization(organization)
		if err != nil {
			return nil, err
		}
		if feishuConfig != nil {
			sources = append(sources, newFeishuOrganizationDirectorySourceSummary(feishuConfig))
		}
	}
	return sources, nil
}

func (s *OrganizationDirectorySourceStatusService) wecomConfigStore() WecomOrganizationSyncConfigStore {
	if s != nil && s.WecomConfigStore != nil {
		return s.WecomConfigStore
	}
	return defaultWecomOrganizationSyncConfigStore{}
}

func (s *OrganizationDirectorySourceStatusService) feishuConfigStore() FeishuOrganizationSyncConfigStore {
	if s != nil && s.FeishuConfigStore != nil {
		return s.FeishuConfigStore
	}
	return defaultFeishuOrganizationSyncConfigStore{}
}

func newWecomOrganizationDirectorySourceSummary(config *WecomOrganizationSyncConfig) *OrganizationDirectorySourceSummary {
	if config == nil {
		return nil
	}
	return &OrganizationDirectorySourceSummary{
		Source:       OrganizationDirectorySourceWeCom,
		DisplayName:  organizationDirectorySourceDisplayName(OrganizationDirectorySourceWeCom),
		Organization: strings.TrimSpace(config.Organization),
		Configured:   true,
		Enabled:      config.IsEnabled,
	}
}

func newFeishuOrganizationDirectorySourceSummary(config *FeishuOrganizationSyncConfig) *OrganizationDirectorySourceSummary {
	if config == nil {
		return nil
	}
	return &OrganizationDirectorySourceSummary{
		Source:       OrganizationDirectorySourceLark,
		DisplayName:  organizationDirectorySourceDisplayName(OrganizationDirectorySourceLark),
		Organization: strings.TrimSpace(config.Organization),
		Configured:   true,
		Enabled:      config.IsEnabled,
	}
}

func organizationDirectorySourceDisplayName(source OrganizationDirectorySource) string {
	switch normalizeOrganizationDirectorySource(source) {
	case OrganizationDirectorySourceWeCom:
		return "WeCom"
	case OrganizationDirectorySourceLark:
		return "Feishu/Lark"
	case OrganizationDirectorySourceDingTalk:
		return "DingTalk"
	default:
		return string(source)
	}
}

func normalizeOrganizationDirectorySource(source OrganizationDirectorySource) OrganizationDirectorySource {
	switch strings.ToLower(strings.TrimSpace(string(source))) {
	case string(OrganizationDirectorySourceWeCom):
		return OrganizationDirectorySourceWeCom
	case string(OrganizationDirectorySourceLark), "feishu":
		return OrganizationDirectorySourceLark
	case string(OrganizationDirectorySourceDingTalk):
		return OrganizationDirectorySourceDingTalk
	default:
		return OrganizationDirectorySource(strings.ToLower(strings.TrimSpace(string(source))))
	}
}

func validateWecomOrganizationSyncSourceActivation(organization string, store FeishuOrganizationSyncConfigStore) error {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil
	}
	if store == nil {
		store = defaultFeishuOrganizationSyncConfigStore{}
	}
	config, err := store.GetFeishuOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return err
	}
	// 已保存的另一来源配置即表示该业务组织的通讯录主数据源已被占用，未启用草稿也不能再叠加第二套来源。
	if config != nil {
		return &OrganizationSyncSourceConflictError{Provider: "Feishu/Lark", Organization: organization}
	}
	return nil
}

func validateFeishuOrganizationSyncSourceActivation(organization string, store WecomOrganizationSyncConfigStore) error {
	organization = strings.TrimSpace(organization)
	if organization == "" {
		return nil
	}
	if store == nil {
		store = defaultWecomOrganizationSyncConfigStore{}
	}
	config, err := store.GetWecomOrganizationSyncConfigByOrganization(organization)
	if err != nil {
		return err
	}
	// 已保存的另一来源配置即表示该业务组织的通讯录主数据源已被占用，未启用草稿也不能再叠加第二套来源。
	if config != nil {
		return &OrganizationSyncSourceConflictError{Provider: "WeCom", Organization: organization}
	}
	return nil
}

func getDefaultWecomOrganizationSyncOrganization(store WecomOrganizationSyncConfigStore) (string, error) {
	organizations, err := getConfiguredWecomOrganizationSyncOrganizations(store)
	if err != nil {
		return "", err
	}
	if len(organizations) == 0 {
		return "", nil
	}
	return organizations[0], nil
}

func getDefaultFeishuOrganizationSyncOrganization(store FeishuOrganizationSyncConfigStore) (string, error) {
	organizations, err := getConfiguredFeishuOrganizationSyncOrganizations(store)
	if err != nil {
		return "", err
	}
	if len(organizations) == 0 {
		return "", nil
	}
	return organizations[0], nil
}

func getConfiguredWecomOrganizationSyncOrganizations(store WecomOrganizationSyncConfigStore) ([]string, error) {
	if store == nil {
		store = defaultWecomOrganizationSyncConfigStore{}
	}
	lister, ok := store.(wecomOrganizationSyncConfigLister)
	if !ok {
		return nil, nil
	}
	configs, err := lister.ListWecomOrganizationSyncConfigs()
	if err != nil {
		return nil, err
	}
	organizations := []string{}
	seen := map[string]bool{}
	for _, config := range configs {
		if config == nil {
			continue
		}
		organization := strings.TrimSpace(config.Organization)
		if organization == "" || organization == "built-in" || seen[organization] {
			continue
		}
		seen[organization] = true
		organizations = append(organizations, organization)
	}
	return organizations, nil
}

func getConfiguredFeishuOrganizationSyncOrganizations(store FeishuOrganizationSyncConfigStore) ([]string, error) {
	if store == nil {
		store = defaultFeishuOrganizationSyncConfigStore{}
	}
	lister, ok := store.(feishuOrganizationSyncConfigLister)
	if !ok {
		return nil, nil
	}
	configs, err := lister.ListFeishuOrganizationSyncConfigs()
	if err != nil {
		return nil, err
	}
	organizations := []string{}
	seen := map[string]bool{}
	for _, config := range configs {
		if config == nil {
			continue
		}
		organization := strings.TrimSpace(config.Organization)
		if organization == "" || organization == "built-in" || seen[organization] {
			continue
		}
		seen[organization] = true
		organizations = append(organizations, organization)
	}
	return organizations, nil
}
