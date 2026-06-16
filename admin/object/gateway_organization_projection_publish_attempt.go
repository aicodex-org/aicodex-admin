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
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/beego/beego/v2/core/logs"
)

const (
	GatewayProjectionPublishAttemptSourceManual    = "manual"
	GatewayProjectionPublishAttemptSourceScheduled = "scheduled"

	defaultGatewayProjectionPublishAttemptLimit           = 20
	maxGatewayProjectionPublishAttemptLimit               = 100
	defaultGatewayProjectionPublishAttemptRetentionWindow = 30 * 24 * time.Hour
	defaultGatewayProjectionCleanupDryRunMaxAge           = 15 * time.Minute

	gatewayProjectionCleanupRetentionPolicyVersion = "gateway_projection_publish_attempt_retention.v1"
	gatewayProjectionCleanupApprovalPolicyVersion  = "gateway_projection_cleanup_approval_policy.v1"
	gatewayProjectionCleanupDecisionDraftVersion   = "gateway_projection_cleanup_approval_decision_draft.v1"

	GatewayProjectionCleanupApprovalAuditTrailStorageScope      = "admin_cleanup_approval_audit_trail.v1"
	GatewayProjectionCleanupApprovalPolicyReadinessStorageScope = "derived_policy_readiness_not_persisted"
	GatewayProjectionCleanupDecisionDraftStorageScope           = "derived_decision_draft_not_persisted"
)

// GatewayProjectionPublishAttempt 是 Admin producer 的脱敏发布尝试台账。
// 它只记录 producer 诊断字段，不保存 projection payload、token、私有 URL 或真实用户明细。
type GatewayProjectionPublishAttempt struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	AttemptId             string                                   `xorm:"varchar(100) notnull index unique" json:"attemptId"`
	OrganizationId        string                                   `xorm:"varchar(100) notnull index" json:"organizationId"`
	Source                string                                   `xorm:"varchar(50) index" json:"source"`
	Status                string                                   `xorm:"varchar(50) index" json:"status"`
	TraceId               string                                   `xorm:"varchar(255) index" json:"traceId,omitempty"`
	Caller                string                                   `xorm:"varchar(100)" json:"caller,omitempty"`
	ProjectionBatchId     string                                   `xorm:"varchar(255) index" json:"projectionBatchId,omitempty"`
	OrgVersion            int64                                    `json:"orgVersion,omitempty"`
	SourceVersion         string                                   `xorm:"varchar(255) index" json:"sourceVersion,omitempty"`
	GeneratedAt           time.Time                                `xorm:"timestampz" json:"generatedAt,omitempty"`
	FreshnessExpiresAt    time.Time                                `xorm:"timestampz" json:"freshnessExpiresAt,omitempty"`
	SubjectCount          int                                      `json:"subjectCount"`
	ActiveSubjectCount    int                                      `json:"activeSubjectCount"`
	TombstoneSubjectCount int                                      `json:"tombstoneSubjectCount"`
	SkippedSubjectCount   int                                      `json:"skippedSubjectCount"`
	SkippedByReasonJSON   string                                   `xorm:"text 'skipped_by_reason'" json:"-"`
	SkippedByReason       map[string]int                           `xorm:"-" json:"skippedByReason,omitempty"`
	ErrorCode             string                                   `xorm:"varchar(100) index" json:"errorCode,omitempty"`
	FailureCategory       string                                   `xorm:"varchar(100) index" json:"failureCategory,omitempty"`
	Attempts              int                                      `json:"attempts"`
	StatusCode            int                                      `json:"statusCode,omitempty"`
	Accepted              bool                                     `json:"accepted"`
	Idempotent            bool                                     `json:"idempotent"`
	Retryable             bool                                     `json:"retryable"`
	DurationMs            int64                                    `json:"durationMs"`
	AuditHash             string                                   `xorm:"varchar(100)" json:"auditHash,omitempty"`
	Metadata              map[string]string                        `xorm:"-" json:"metadata,omitempty"`
	MetadataJSON          string                                   `xorm:"text 'metadata'" json:"-"`
	Retention             GatewayProjectionPublishAttemptRetention `xorm:"-" json:"retention"`
	ReceiptQueryHint      GatewayProjectionReceiptQueryHint        `xorm:"-" json:"receiptQueryHint"`
}

// GatewayProjectionPublishAttemptQuery 限定 history 查询范围和筛选条件。
type GatewayProjectionPublishAttemptQuery struct {
	OrganizationId  string
	AttemptId       string
	Source          string
	Status          string
	FailureCategory string
	From            time.Time
	To              time.Time
	Limit           int
}

type GatewayProjectionPublishAttemptList struct {
	GeneratedAt string                                 `json:"generatedAt"`
	Filters     GatewayProjectionPublishAttemptFilters `json:"filters"`
	Total       int                                    `json:"total"`
	Attempts    []*GatewayProjectionPublishAttempt     `json:"attempts"`
}

type GatewayProjectionPublishAttemptFilters struct {
	OrganizationId  string `json:"organizationId,omitempty"`
	Source          string `json:"source,omitempty"`
	Status          string `json:"status,omitempty"`
	FailureCategory string `json:"failureCategory,omitempty"`
	From            string `json:"from,omitempty"`
	To              string `json:"to,omitempty"`
	OlderThan       string `json:"olderThan,omitempty"`
	Limit           int    `json:"limit"`
}

// GatewayProjectionPublishAttemptRetention 是只读保留期诊断，不代表已经执行 cleanup。
type GatewayProjectionPublishAttemptRetention struct {
	WindowSeconds   int64  `json:"windowSeconds"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
	CleanupEligible bool   `json:"cleanupEligible"`
	CleanupReason   string `json:"cleanupReason"`
}

// GatewayProjectionReceiptQueryHint 是 operator 查询 Gateway ingestion status 的脱敏条件提示。
// 它只描述可用于只读 receipt 查询的键，不代表 Gateway 已成功应用或授权成功。
type GatewayProjectionReceiptQueryHint struct {
	Available         bool   `json:"available"`
	UnavailableReason string `json:"unavailableReason,omitempty"`
	OrganizationId    string `json:"organizationId,omitempty"`
	Latest            bool   `json:"latest"`
	ProjectionBatchId string `json:"projectionBatchId,omitempty"`
	OrgVersion        int64  `json:"orgVersion,omitempty"`
	SourceVersion     string `json:"sourceVersion,omitempty"`
}

type GatewayProjectionPublishAttemptRetentionReadiness struct {
	GeneratedAt            string                                           `json:"generatedAt"`
	Filters                GatewayProjectionPublishAttemptFilters           `json:"filters"`
	RetentionWindowSeconds int64                                            `json:"retentionWindowSeconds"`
	Total                  int                                              `json:"total"`
	CleanupEligibleCount   int                                              `json:"cleanupEligibleCount"`
	BlockedCount           int                                              `json:"blockedCount"`
	ReasonCounts           map[string]int                                   `json:"reasonCounts"`
	OldestAttemptAt        string                                           `json:"oldestAttemptAt,omitempty"`
	NewestAttemptAt        string                                           `json:"newestAttemptAt,omitempty"`
	Samples                []GatewayProjectionPublishAttemptRetentionSample `json:"samples,omitempty"`
}

type GatewayProjectionPublishAttemptRetentionSample struct {
	AttemptId         string `json:"attemptId"`
	Source            string `json:"source"`
	Status            string `json:"status"`
	CreatedAt         string `json:"createdAt,omitempty"`
	CleanupEligible   bool   `json:"cleanupEligible"`
	CleanupReason     string `json:"cleanupReason"`
	ProjectionBatchId string `json:"projectionBatchId,omitempty"`
	SourceVersion     string `json:"sourceVersion,omitempty"`
}

// GatewayProjectionPublishAttemptCleanupDryRunQuery 限定 cleanup dry-run 的只读评估范围。
// P0 只允许组织内 dry-run，不允许跨组织空查询或真实清理。
type GatewayProjectionPublishAttemptCleanupDryRunQuery struct {
	OrganizationId   string
	Source           string
	Status           string
	FailureCategory  string
	OlderThan        time.Time
	Limit            int
	RequiredReason   string
	ConfirmationText string
}

type GatewayProjectionPublishAttemptCleanupDryRunPlan struct {
	GeneratedAt            string                                           `json:"generatedAt"`
	Filters                GatewayProjectionPublishAttemptFilters           `json:"filters"`
	RetentionWindowSeconds int64                                            `json:"retentionWindowSeconds"`
	Total                  int                                              `json:"total"`
	CandidateCount         int                                              `json:"candidateCount"`
	BlockedCount           int                                              `json:"blockedCount"`
	ReasonCounts           map[string]int                                   `json:"reasonCounts"`
	OldestAttemptAt        string                                           `json:"oldestAttemptAt,omitempty"`
	NewestAttemptAt        string                                           `json:"newestAttemptAt,omitempty"`
	DiagnosticCompleteness GatewayProjectionAttemptDiagnosticCompleteness   `json:"diagnosticCompleteness"`
	ReceiptHintCoverage    GatewayProjectionAttemptReceiptHintCoverage      `json:"receiptHintCoverage"`
	OperatorActionSummary  string                                           `json:"operatorActionSummary"`
	SafetyChecklist        []string                                         `json:"safetyChecklist"`
	ExecuteGuardrail       GatewayProjectionAttemptCleanupExecuteGuardrail  `json:"executeGuardrail"`
	Samples                []GatewayProjectionPublishAttemptRetentionSample `json:"samples,omitempty"`
}

type GatewayProjectionAttemptDiagnosticCompleteness struct {
	CompleteCount int `json:"completeCount"`
	MissingCount  int `json:"missingCount"`
}

type GatewayProjectionAttemptReceiptHintCoverage struct {
	AvailableCount   int `json:"availableCount"`
	UnavailableCount int `json:"unavailableCount"`
}

type GatewayProjectionAttemptCleanupExecuteGuardrail struct {
	Enabled              bool     `json:"enabled"`
	DryRunOnly           bool     `json:"dryRunOnly"`
	Irreversible         bool     `json:"irreversible"`
	DisabledReason       string   `json:"disabledReason"`
	RequiredConfirmation string   `json:"requiredConfirmation"`
	SafetyChecklist      []string `json:"safetyChecklist"`
}

// GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery 限定 cleanup 执行前只读门禁范围。
// 它只复用 dry-run 输入，不承载真实审批签名或破坏性执行意图。
type GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery struct {
	OrganizationId          string
	Source                  string
	Status                  string
	FailureCategory         string
	OlderThan               time.Time
	Limit                   int
	DryRunGeneratedAt       time.Time
	MaxDryRunAgeSeconds     int64
	ApprovalEvidenceAliases []string
}

// GatewayProjectionPublishAttemptCleanupExecuteReadiness 是 cleanup 执行前审批门禁的只读结果。
// readiness 只表示是否具备进入人工批准阶段的诊断条件；即使为 ready_for_approval，也不会执行删除或声明下游授权成功。
type GatewayProjectionPublishAttemptCleanupExecuteReadiness struct {
	GeneratedAt                   string                                          `json:"generatedAt"`
	Readiness                     string                                          `json:"readiness"`
	SafeNextAction                string                                          `json:"safeNextAction"`
	DisabledReasons               []string                                        `json:"disabledReasons,omitempty"`
	DryRunId                      string                                          `json:"dryRunId"`
	DryRunHash                    string                                          `json:"dryRunHash"`
	RetentionPolicyVersion        string                                          `json:"retentionPolicyVersion"`
	Filters                       GatewayProjectionPublishAttemptFilters          `json:"filters"`
	CandidateCount                int                                             `json:"candidateCount"`
	BlockedCount                  int                                             `json:"blockedCount"`
	MissingDiagnosticSummaryCount int                                             `json:"missingDiagnosticSummaryCount"`
	ReceiptHintAvailableCount     int                                             `json:"receiptHintAvailableCount"`
	ReceiptHintMissingCount       int                                             `json:"receiptHintMissingCount"`
	LastDryRunGeneratedAt         string                                          `json:"lastDryRunGeneratedAt"`
	LastDryRunFreshness           GatewayProjectionCleanupDryRunFreshness         `json:"lastDryRunFreshness"`
	OperatorApproval              GatewayProjectionCleanupOperatorApproval        `json:"operatorApproval"`
	ExecuteGuardrail              GatewayProjectionAttemptCleanupExecuteGuardrail `json:"executeGuardrail"`
	Export                        GatewayProjectionCleanupExecuteReadinessExport  `json:"export"`
}

// GatewayProjectionCleanupDryRunFreshness 描述本次 execute readiness 所依赖 dry-run 证据的新鲜度。
// stale/future 都必须 fail closed，引导 operator 重新生成 dry-run。
type GatewayProjectionCleanupDryRunFreshness struct {
	Status        string `json:"status"`
	GeneratedAt   string `json:"generatedAt"`
	AgeSeconds    int64  `json:"ageSeconds"`
	MaxAgeSeconds int64  `json:"maxAgeSeconds"`
	ExpiresAt     string `json:"expiresAt,omitempty"`
}

// GatewayProjectionCleanupOperatorApproval 描述 operator 已提交的审批证据别名是否满足最小人工确认清单。
// 这里不保存真实签名、账号凭据或审批正文，避免 readiness 结果承载敏感审批材料。
type GatewayProjectionCleanupOperatorApproval struct {
	Required                bool     `json:"required"`
	Status                  string   `json:"status"`
	RequiredEvidenceAliases []string `json:"requiredEvidenceAliases"`
	MissingEvidenceAliases  []string `json:"missingEvidenceAliases,omitempty"`
}

// GatewayProjectionCleanupExecuteReadinessExport 是前端复制/导出的脱敏审批包摘要。
// 它排除样本明细和 raw gateway response，只保留 dryRunHash、计数、freshness 和 guardrail 状态。
type GatewayProjectionCleanupExecuteReadinessExport struct {
	GeneratedAt            string                                           `json:"generatedAt"`
	Readiness              string                                           `json:"readiness"`
	SafeNextAction         string                                           `json:"safeNextAction"`
	DisabledReasons        []string                                         `json:"disabledReasons,omitempty"`
	DryRunId               string                                           `json:"dryRunId"`
	DryRunHash             string                                           `json:"dryRunHash"`
	RetentionPolicyVersion string                                           `json:"retentionPolicyVersion"`
	Filters                GatewayProjectionPublishAttemptFilters           `json:"filters"`
	CandidateCount         int                                              `json:"candidateCount"`
	BlockedCount           int                                              `json:"blockedCount"`
	LastDryRunFreshness    GatewayProjectionCleanupDryRunFreshness          `json:"lastDryRunFreshness"`
	OperatorApproval       GatewayProjectionCleanupOperatorApproval         `json:"operatorApproval"`
	ExecuteGuardrail       GatewayProjectionAttemptCleanupExecuteGuardrail  `json:"executeGuardrail"`
	Samples                []GatewayProjectionPublishAttemptRetentionSample `json:"samples,omitempty"`
}

// GatewayProjectionCleanupApprovalAuditRecord 是 cleanup 执行开放前的 Admin-owned 安全动作审计。
// P0 只记录 approve/reject/copy/export/refresh 等预览动作，不表示 cleanup 已获准或已执行。
type GatewayProjectionCleanupApprovalAuditRecord struct {
	Owner     string    `xorm:"varchar(100) notnull pk" json:"owner"`
	Name      string    `xorm:"varchar(100) notnull pk" json:"name"`
	CreatedAt time.Time `xorm:"timestampz created index" json:"createdAt"`
	UpdatedAt time.Time `xorm:"timestampz updated" json:"updatedAt"`

	AuditId                string   `xorm:"varchar(100) notnull index" json:"auditId"`
	OrganizationId         string   `xorm:"varchar(100) notnull index" json:"organizationId"`
	Action                 string   `xorm:"varchar(50) index" json:"action"`
	ApprovalState          string   `xorm:"varchar(80) index" json:"approvalState"`
	ReadinessHash          string   `xorm:"varchar(120) index" json:"readinessHash,omitempty"`
	DryRunId               string   `xorm:"varchar(120) index" json:"dryRunId,omitempty"`
	RetentionPolicyVersion string   `xorm:"varchar(120) index" json:"retentionPolicyVersion"`
	CandidateCount         int      `json:"candidateCount"`
	BlockedCount           int      `json:"blockedCount"`
	DisabledReasons        []string `xorm:"-" json:"disabledReasons,omitempty"`
	DisabledReasonsJSON    string   `xorm:"text 'disabled_reasons'" json:"-"`
	SafeNextAction         string   `xorm:"varchar(120)" json:"safeNextAction,omitempty"`
	StorageScope           string   `xorm:"varchar(120) index" json:"storageScope"`
	ExecuteEnabled         bool     `json:"executeEnabled"`
	DryRunOnly             bool     `json:"dryRunOnly"`
	SafetySummary          string   `xorm:"varchar(160)" json:"safetySummary"`
}

// GatewayProjectionCleanupApprovalAuditTrailQuery 限定 approval audit trail 的只读查询范围。
// 组织是必填条件，避免 operator 无意中跨组织查看审计记录。
type GatewayProjectionCleanupApprovalAuditTrailQuery struct {
	OrganizationId string
	Action         string
	ApprovalState  string
	ReadinessHash  string
	Limit          int
}

// GatewayProjectionCleanupApprovalAuditTrailRequest 是 P0 安全 action 记录请求。
// 即使包含 readiness 摘要，service 也只提取 hash、计数、reason alias 等脱敏字段。
type GatewayProjectionCleanupApprovalAuditTrailRequest struct {
	OrganizationId         string                                                  `json:"organizationId"`
	Action                 string                                                  `json:"action"`
	ApprovalState          string                                                  `json:"approvalState"`
	ReadinessHash          string                                                  `json:"readinessHash"`
	DryRunId               string                                                  `json:"dryRunId"`
	RetentionPolicyVersion string                                                  `json:"retentionPolicyVersion"`
	CandidateCount         int                                                     `json:"candidateCount"`
	BlockedCount           int                                                     `json:"blockedCount"`
	DisabledReasons        []string                                                `json:"disabledReasons"`
	SafeNextAction         string                                                  `json:"safeNextAction"`
	Readiness              *GatewayProjectionPublishAttemptCleanupExecuteReadiness `json:"readiness,omitempty"`
}

// GatewayProjectionCleanupApprovalAuditTrail 是 operator 查看 approval audit 的脱敏响应。
// ExecuteGuardrail 始终保持 disabled/dry-run-only，防止 UI 或调用方误解为真实 cleanup gate。
type GatewayProjectionCleanupApprovalAuditTrail struct {
	GeneratedAt      string                                            `json:"generatedAt"`
	StorageScope     string                                            `json:"storageScope"`
	Filters          GatewayProjectionCleanupApprovalAuditTrailFilters `json:"filters"`
	Total            int                                               `json:"total"`
	Summary          GatewayProjectionCleanupApprovalAuditTrailSummary `json:"summary"`
	Records          []*GatewayProjectionCleanupApprovalAuditRecord    `json:"records"`
	Export           GatewayProjectionCleanupApprovalAuditTrailExport  `json:"export"`
	ExecuteGuardrail GatewayProjectionAttemptCleanupExecuteGuardrail   `json:"executeGuardrail"`
}

// GatewayProjectionCleanupApprovalAuditTrailFilters 回显本次只读查询条件。
type GatewayProjectionCleanupApprovalAuditTrailFilters struct {
	OrganizationId string `json:"organizationId,omitempty"`
	Action         string `json:"action,omitempty"`
	ApprovalState  string `json:"approvalState,omitempty"`
	ReadinessHash  string `json:"readinessHash,omitempty"`
	Limit          int    `json:"limit"`
}

// GatewayProjectionCleanupApprovalAuditTrailSummary 汇总安全 action 和审批状态计数。
// 这些计数只服务 Admin producer accountability，不表示下游已授权或已执行 cleanup。
type GatewayProjectionCleanupApprovalAuditTrailSummary struct {
	ActionCounts        map[string]int `json:"actionCounts"`
	ApprovalStateCounts map[string]int `json:"approvalStateCounts"`
	CandidateCount      int            `json:"candidateCount"`
	BlockedCount        int            `json:"blockedCount"`
	LatestActionAt      string         `json:"latestActionAt,omitempty"`
	DisabledReasonCount int            `json:"disabledReasonCount"`
}

// GatewayProjectionCleanupApprovalAuditTrailExport 是复制/导出用脱敏审计包。
// 它不包含 raw Gateway response、subject 明细、凭据或可直连下游地址。
type GatewayProjectionCleanupApprovalAuditTrailExport struct {
	GeneratedAt  string                                            `json:"generatedAt"`
	StorageScope string                                            `json:"storageScope"`
	Filters      GatewayProjectionCleanupApprovalAuditTrailFilters `json:"filters"`
	Summary      GatewayProjectionCleanupApprovalAuditTrailSummary `json:"summary"`
	Records      []*GatewayProjectionCleanupApprovalAuditRecord    `json:"records"`
}

// GatewayProjectionCleanupApprovalPolicyReadinessQuery 限定 cleanup approval policy 的只读派生范围。
// 它不承载真实审批签名，只允许 Admin owner 基于 dry-run/readiness/audit trail 判断人工复核是否具备前置证据。
type GatewayProjectionCleanupApprovalPolicyReadinessQuery struct {
	OrganizationId          string
	Source                  string
	Status                  string
	FailureCategory         string
	OlderThan               time.Time
	Limit                   int
	ReadinessHash           string
	DryRunGeneratedAt       time.Time
	MaxDryRunAgeSeconds     int64
	ApprovalEvidenceAliases []string
}

// GatewayProjectionCleanupApprovalPolicyReadiness 是 cleanup 真实执行开放前的只读审批策略门禁。
// P0 只提供 manual review/cannot infer 指引，不创建真实 approval decision，也不打开 cleanup gate。
type GatewayProjectionCleanupApprovalPolicyReadiness struct {
	GeneratedAt               string                                                `json:"generatedAt"`
	PolicyVersion             string                                                `json:"policyVersion"`
	PolicyStatus              string                                                `json:"policyStatus"`
	StorageScope              string                                                `json:"storageScope"`
	RetentionPolicyVersion    string                                                `json:"retentionPolicyVersion"`
	ApprovalAuditStorageScope string                                                `json:"approvalAuditStorageScope"`
	ReadinessHash             string                                                `json:"readinessHash"`
	DryRunId                  string                                                `json:"dryRunId"`
	SafeNextAction            string                                                `json:"safeNextAction"`
	CandidateCount            int                                                   `json:"candidateCount"`
	BlockedCount              int                                                   `json:"blockedCount"`
	ManualReview              GatewayProjectionCleanupApprovalManualReview          `json:"manualReview"`
	CannotInfer               GatewayProjectionCleanupApprovalCannotInfer           `json:"cannotInfer"`
	PolicyGates               []GatewayProjectionCleanupApprovalPolicyGate          `json:"policyGates"`
	AuditSummary              GatewayProjectionCleanupApprovalAuditTrailSummary     `json:"auditSummary"`
	LastDryRunFreshness       GatewayProjectionCleanupDryRunFreshness               `json:"lastDryRunFreshness"`
	ExecuteGuardrail          GatewayProjectionAttemptCleanupExecuteGuardrail       `json:"executeGuardrail"`
	Export                    GatewayProjectionCleanupApprovalPolicyReadinessExport `json:"export"`
}

// GatewayProjectionCleanupApprovalManualReview 描述人工复核动作是否覆盖最小安全证据。
// 这些 action alias 只来自 Admin approval audit trail，不包含真实审批正文、操作者身份或敏感 payload。
type GatewayProjectionCleanupApprovalManualReview struct {
	Required              bool     `json:"required"`
	Status                string   `json:"status"`
	RequiredActionAliases []string `json:"requiredActionAliases"`
	MissingActionAliases  []string `json:"missingActionAliases,omitempty"`
}

// GatewayProjectionCleanupApprovalCannotInfer 说明当前策略不能推断通过的脱敏原因。
// reason alias 只能用于 operator guidance，不能作为 Gateway runtime authorization fact。
type GatewayProjectionCleanupApprovalCannotInfer struct {
	Value         bool     `json:"value"`
	ReasonAliases []string `json:"reasonAliases,omitempty"`
}

// GatewayProjectionCleanupApprovalPolicyGate 表示单个 approval policy gate 的脱敏判断。
// `disabled` 用于表达 P0 尚未开放真实 cleanup execute gate，不等同于当前 manual review 失败。
type GatewayProjectionCleanupApprovalPolicyGate struct {
	Name        string `json:"name"`
	Status      string `json:"status"`
	ReasonAlias string `json:"reasonAlias,omitempty"`
}

// GatewayProjectionCleanupApprovalPolicyReadinessExport 是复制/导出用脱敏策略摘要。
// 它排除 audit record 明细、raw gateway response、subject 明细和任何真实执行凭据。
type GatewayProjectionCleanupApprovalPolicyReadinessExport struct {
	GeneratedAt               string                                            `json:"generatedAt"`
	PolicyVersion             string                                            `json:"policyVersion"`
	PolicyStatus              string                                            `json:"policyStatus"`
	StorageScope              string                                            `json:"storageScope"`
	RetentionPolicyVersion    string                                            `json:"retentionPolicyVersion"`
	ApprovalAuditStorageScope string                                            `json:"approvalAuditStorageScope"`
	ReadinessHash             string                                            `json:"readinessHash"`
	DryRunId                  string                                            `json:"dryRunId"`
	SafeNextAction            string                                            `json:"safeNextAction"`
	CandidateCount            int                                               `json:"candidateCount"`
	BlockedCount              int                                               `json:"blockedCount"`
	ManualReview              GatewayProjectionCleanupApprovalManualReview      `json:"manualReview"`
	CannotInfer               GatewayProjectionCleanupApprovalCannotInfer       `json:"cannotInfer"`
	PolicyGates               []GatewayProjectionCleanupApprovalPolicyGate      `json:"policyGates"`
	AuditSummary              GatewayProjectionCleanupApprovalAuditTrailSummary `json:"auditSummary"`
	ExecuteGuardrail          GatewayProjectionAttemptCleanupExecuteGuardrail   `json:"executeGuardrail"`
}

// GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery 限定 decision draft 的只读派生范围。
// 它沿用 approval policy readiness 的安全过滤条件，不承载真实审批签名或 cleanup 执行意图。
type GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery struct {
	OrganizationId          string
	Source                  string
	Status                  string
	FailureCategory         string
	OlderThan               time.Time
	Limit                   int
	ReadinessHash           string
	DryRunGeneratedAt       time.Time
	MaxDryRunAgeSeconds     int64
	ApprovalEvidenceAliases []string
}

// GatewayProjectionCleanupApprovalDecisionDraftReadiness 是 cleanup 执行开放前的只读审批草案。
// draft_ready 只表示可进入人工审阅，不表示真实 approval decision 已创建或 cleanup gate 已打开。
type GatewayProjectionCleanupApprovalDecisionDraftReadiness struct {
	GeneratedAt               string                                                       `json:"generatedAt"`
	DecisionDraftId           string                                                       `json:"decisionDraftId"`
	DecisionDraftHash         string                                                       `json:"decisionDraftHash"`
	DecisionReadiness         string                                                       `json:"decisionReadiness"`
	DecisionState             string                                                       `json:"decisionState"`
	DecisionSummary           string                                                       `json:"decisionSummary"`
	ExecutionMode             string                                                       `json:"executionMode"`
	CleanupExecutionAllowed   bool                                                         `json:"cleanupExecutionAllowed"`
	StorageScope              string                                                       `json:"storageScope"`
	PolicyVersion             string                                                       `json:"policyVersion"`
	PolicyStatus              string                                                       `json:"policyStatus"`
	RetentionPolicyVersion    string                                                       `json:"retentionPolicyVersion"`
	ApprovalAuditStorageScope string                                                       `json:"approvalAuditStorageScope"`
	ReadinessHash             string                                                       `json:"readinessHash"`
	DryRunId                  string                                                       `json:"dryRunId"`
	CandidateCount            int                                                          `json:"candidateCount"`
	BlockedCount              int                                                          `json:"blockedCount"`
	ManualReviewChecklist     GatewayProjectionCleanupDecisionManualReviewChecklist        `json:"manualReviewChecklist"`
	CannotInfer               GatewayProjectionCleanupApprovalCannotInfer                  `json:"cannotInfer"`
	BlockingReasons           []string                                                     `json:"blockingReasons,omitempty"`
	CopySafeLabels            []string                                                     `json:"copySafeLabels"`
	RetentionSummary          GatewayProjectionCleanupDecisionRetentionSummary             `json:"retentionSummary"`
	AuditSummary              GatewayProjectionCleanupApprovalAuditTrailSummary            `json:"auditSummary"`
	RedactionSummary          GatewayProjectionCleanupDecisionRedactionSummary             `json:"redactionSummary"`
	OperatorNextAction        string                                                       `json:"operatorNextAction"`
	PolicyGates               []GatewayProjectionCleanupApprovalPolicyGate                 `json:"policyGates"`
	ExecuteGuardrail          GatewayProjectionAttemptCleanupExecuteGuardrail              `json:"executeGuardrail"`
	Export                    GatewayProjectionCleanupApprovalDecisionDraftReadinessExport `json:"export"`
}

// GatewayProjectionCleanupDecisionManualReviewChecklist 汇总人工审阅动作缺口。
// 这里只暴露 action/evidence alias，不保存操作者身份、审批正文或敏感材料。
type GatewayProjectionCleanupDecisionManualReviewChecklist struct {
	Required                bool     `json:"required"`
	Status                  string   `json:"status"`
	RequiredActionAliases   []string `json:"requiredActionAliases"`
	MissingActionAliases    []string `json:"missingActionAliases,omitempty"`
	RequiredEvidenceAliases []string `json:"requiredEvidenceAliases"`
	MissingEvidenceAliases  []string `json:"missingEvidenceAliases,omitempty"`
}

// GatewayProjectionCleanupDecisionRetentionSummary 是 decision draft 的保留期摘要。
// 它只包含策略版本、计数和 dry-run freshness，不包含 attempt 明细或 raw Gateway response。
type GatewayProjectionCleanupDecisionRetentionSummary struct {
	RetentionPolicyVersion string                                  `json:"retentionPolicyVersion"`
	CandidateCount         int                                     `json:"candidateCount"`
	BlockedCount           int                                     `json:"blockedCount"`
	LastDryRunFreshness    GatewayProjectionCleanupDryRunFreshness `json:"lastDryRunFreshness"`
}

// GatewayProjectionCleanupDecisionRedactionSummary 明确 decision draft/export 的脱敏边界。
type GatewayProjectionCleanupDecisionRedactionSummary struct {
	Status         string   `json:"status"`
	CopySafe       bool     `json:"copySafe"`
	RedactedFields []string `json:"redactedFields"`
}

// GatewayProjectionCleanupApprovalDecisionDraftReadinessExport 是复制/导出用脱敏 decision draft。
// 它排除 raw payload、下游私有 URL、完整组织树、完整 subject 明细和真实执行凭据。
type GatewayProjectionCleanupApprovalDecisionDraftReadinessExport struct {
	GeneratedAt             string                                                `json:"generatedAt"`
	DecisionDraftId         string                                                `json:"decisionDraftId"`
	DecisionDraftHash       string                                                `json:"decisionDraftHash"`
	DecisionReadiness       string                                                `json:"decisionReadiness"`
	DecisionState           string                                                `json:"decisionState"`
	ExecutionMode           string                                                `json:"executionMode"`
	CleanupExecutionAllowed bool                                                  `json:"cleanupExecutionAllowed"`
	PolicyVersion           string                                                `json:"policyVersion"`
	PolicyStatus            string                                                `json:"policyStatus"`
	ReadinessHash           string                                                `json:"readinessHash"`
	DryRunId                string                                                `json:"dryRunId"`
	ManualReviewChecklist   GatewayProjectionCleanupDecisionManualReviewChecklist `json:"manualReviewChecklist"`
	CannotInfer             GatewayProjectionCleanupApprovalCannotInfer           `json:"cannotInfer"`
	BlockingReasons         []string                                              `json:"blockingReasons,omitempty"`
	CopySafeLabels          []string                                              `json:"copySafeLabels"`
	RetentionSummary        GatewayProjectionCleanupDecisionRetentionSummary      `json:"retentionSummary"`
	AuditSummary            GatewayProjectionCleanupApprovalAuditTrailSummary     `json:"auditSummary"`
	RedactionSummary        GatewayProjectionCleanupDecisionRedactionSummary      `json:"redactionSummary"`
	OperatorNextAction      string                                                `json:"operatorNextAction"`
	ExecuteGuardrail        GatewayProjectionAttemptCleanupExecuteGuardrail       `json:"executeGuardrail"`
}

type GatewayProjectionPublishAttemptStore interface {
	RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error
	ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error)
	GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error)
	RecordGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) error
	ListGatewayProjectionCleanupApprovalAuditRecords(query GatewayProjectionCleanupApprovalAuditTrailQuery) ([]*GatewayProjectionCleanupApprovalAuditRecord, error)
}

type GatewayProjectionPublishAttemptHistoryService struct {
	Store GatewayProjectionPublishAttemptStore
	Now   func() time.Time
}

type defaultGatewayProjectionPublishAttemptStore struct{}

// Record 保存一次脱敏 publish attempt；写入失败只影响 Admin 诊断，不改变 projection 发布结果。
func (s GatewayProjectionPublishAttemptHistoryService) Record(attempt *GatewayProjectionPublishAttempt) error {
	if attempt == nil {
		return nil
	}
	normalized := normalizeGatewayProjectionPublishAttempt(attempt, s.now())
	if normalized.OrganizationId == "" {
		return nil
	}
	return s.store().RecordGatewayProjectionPublishAttempt(normalized)
}

func (s GatewayProjectionPublishAttemptHistoryService) List(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttemptList, error) {
	query = normalizeGatewayProjectionPublishAttemptQuery(query)
	attempts, err := s.store().ListGatewayProjectionPublishAttempts(query)
	if err != nil {
		return nil, err
	}
	for i := range attempts {
		attempts[i] = enrichGatewayProjectionPublishAttempt(cloneGatewayProjectionPublishAttempt(attempts[i]), query.OrganizationId, s.now())
	}
	return &GatewayProjectionPublishAttemptList{
		GeneratedAt: formatGatewayProjectionObservabilityTime(s.now()),
		Filters: GatewayProjectionPublishAttemptFilters{
			OrganizationId:  query.OrganizationId,
			Source:          query.Source,
			Status:          query.Status,
			FailureCategory: query.FailureCategory,
			From:            formatGatewayProjectionObservabilityTime(query.From),
			To:              formatGatewayProjectionObservabilityTime(query.To),
			Limit:           query.Limit,
		},
		Total:    len(attempts),
		Attempts: attempts,
	}, nil
}

func (s GatewayProjectionPublishAttemptHistoryService) Detail(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	query = normalizeGatewayProjectionPublishAttemptQuery(query)
	attempt, err := s.store().GetGatewayProjectionPublishAttempt(query)
	if err != nil || attempt == nil {
		return attempt, err
	}
	return enrichGatewayProjectionPublishAttempt(cloneGatewayProjectionPublishAttempt(attempt), query.OrganizationId, s.now()), nil
}

func (s GatewayProjectionPublishAttemptHistoryService) RetentionReadiness(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttemptRetentionReadiness, error) {
	query = normalizeGatewayProjectionPublishAttemptQuery(query)
	attempts, err := s.store().ListGatewayProjectionPublishAttempts(query)
	if err != nil {
		return nil, err
	}
	now := s.now()
	reasonCounts := map[string]int{}
	samples := []GatewayProjectionPublishAttemptRetentionSample{}
	var oldest time.Time
	var newest time.Time
	cleanupEligibleCount := 0
	for _, raw := range attempts {
		attempt := enrichGatewayProjectionPublishAttempt(cloneGatewayProjectionPublishAttempt(raw), query.OrganizationId, now)
		reasonCounts[attempt.Retention.CleanupReason]++
		if attempt.Retention.CleanupEligible {
			cleanupEligibleCount++
		}
		if !attempt.CreatedAt.IsZero() {
			if oldest.IsZero() || attempt.CreatedAt.Before(oldest) {
				oldest = attempt.CreatedAt
			}
			if newest.IsZero() || attempt.CreatedAt.After(newest) {
				newest = attempt.CreatedAt
			}
		}
		if len(samples) < 5 {
			samples = append(samples, GatewayProjectionPublishAttemptRetentionSample{
				AttemptId:         attempt.AttemptId,
				Source:            attempt.Source,
				Status:            attempt.Status,
				CreatedAt:         formatGatewayProjectionObservabilityTime(attempt.CreatedAt),
				CleanupEligible:   attempt.Retention.CleanupEligible,
				CleanupReason:     attempt.Retention.CleanupReason,
				ProjectionBatchId: attempt.ProjectionBatchId,
				SourceVersion:     attempt.SourceVersion,
			})
		}
	}
	return &GatewayProjectionPublishAttemptRetentionReadiness{
		GeneratedAt: formatGatewayProjectionObservabilityTime(now),
		Filters: GatewayProjectionPublishAttemptFilters{
			OrganizationId:  query.OrganizationId,
			Source:          query.Source,
			Status:          query.Status,
			FailureCategory: query.FailureCategory,
			From:            formatGatewayProjectionObservabilityTime(query.From),
			To:              formatGatewayProjectionObservabilityTime(query.To),
			Limit:           query.Limit,
		},
		RetentionWindowSeconds: int64(defaultGatewayProjectionPublishAttemptRetentionWindow / time.Second),
		Total:                  len(attempts),
		CleanupEligibleCount:   cleanupEligibleCount,
		BlockedCount:           len(attempts) - cleanupEligibleCount,
		ReasonCounts:           reasonCounts,
		OldestAttemptAt:        formatGatewayProjectionObservabilityTime(oldest),
		NewestAttemptAt:        formatGatewayProjectionObservabilityTime(newest),
		Samples:                samples,
	}, nil
}

func (s GatewayProjectionPublishAttemptHistoryService) CleanupDryRun(query GatewayProjectionPublishAttemptCleanupDryRunQuery) (*GatewayProjectionPublishAttemptCleanupDryRunPlan, error) {
	normalized, err := normalizeGatewayProjectionPublishAttemptCleanupDryRunQuery(query, s.now())
	if err != nil {
		return nil, err
	}
	listQuery := GatewayProjectionPublishAttemptQuery{
		OrganizationId:  normalized.OrganizationId,
		Source:          normalized.Source,
		Status:          normalized.Status,
		FailureCategory: normalized.FailureCategory,
		To:              normalized.OlderThan,
		Limit:           normalized.Limit,
	}
	attempts, err := s.store().ListGatewayProjectionPublishAttempts(listQuery)
	if err != nil {
		return nil, err
	}
	now := s.now()
	reasonCounts := map[string]int{}
	samples := []GatewayProjectionPublishAttemptRetentionSample{}
	var oldest time.Time
	var newest time.Time
	candidateCount := 0
	diagnosticCompleteCount := 0
	receiptAvailableCount := 0
	for _, raw := range attempts {
		attempt := enrichGatewayProjectionPublishAttempt(cloneGatewayProjectionPublishAttempt(raw), normalized.OrganizationId, now)
		reasonCounts[attempt.Retention.CleanupReason]++
		if attempt.Retention.CleanupEligible {
			candidateCount++
		}
		if gatewayProjectionAttemptDiagnosticComplete(attempt) {
			diagnosticCompleteCount++
		}
		if attempt.ReceiptQueryHint.Available {
			receiptAvailableCount++
		}
		if !attempt.CreatedAt.IsZero() {
			if oldest.IsZero() || attempt.CreatedAt.Before(oldest) {
				oldest = attempt.CreatedAt
			}
			if newest.IsZero() || attempt.CreatedAt.After(newest) {
				newest = attempt.CreatedAt
			}
		}
		if len(samples) < 5 {
			samples = append(samples, buildGatewayProjectionPublishAttemptRetentionSample(attempt))
		}
	}
	total := len(attempts)
	safetyChecklist := gatewayProjectionAttemptCleanupSafetyChecklist()
	return &GatewayProjectionPublishAttemptCleanupDryRunPlan{
		GeneratedAt: formatGatewayProjectionObservabilityTime(now),
		Filters: GatewayProjectionPublishAttemptFilters{
			OrganizationId:  normalized.OrganizationId,
			Source:          normalized.Source,
			Status:          normalized.Status,
			FailureCategory: normalized.FailureCategory,
			OlderThan:       formatGatewayProjectionObservabilityTime(normalized.OlderThan),
			Limit:           normalized.Limit,
		},
		RetentionWindowSeconds: int64(defaultGatewayProjectionPublishAttemptRetentionWindow / time.Second),
		Total:                  total,
		CandidateCount:         candidateCount,
		BlockedCount:           total - candidateCount,
		ReasonCounts:           reasonCounts,
		OldestAttemptAt:        formatGatewayProjectionObservabilityTime(oldest),
		NewestAttemptAt:        formatGatewayProjectionObservabilityTime(newest),
		DiagnosticCompleteness: GatewayProjectionAttemptDiagnosticCompleteness{
			CompleteCount: diagnosticCompleteCount,
			MissingCount:  total - diagnosticCompleteCount,
		},
		ReceiptHintCoverage: GatewayProjectionAttemptReceiptHintCoverage{
			AvailableCount:   receiptAvailableCount,
			UnavailableCount: total - receiptAvailableCount,
		},
		OperatorActionSummary: gatewayProjectionAttemptCleanupOperatorActionSummary(candidateCount, total-candidateCount),
		SafetyChecklist:       safetyChecklist,
		ExecuteGuardrail:      buildGatewayProjectionAttemptCleanupExecuteGuardrail(safetyChecklist),
		Samples:               samples,
	}, nil
}

// CleanupExecuteGuardrail deliberately returns the same read-only plan with execution disabled.
// P0 不执行 DB delete/update，只把确认项和禁用原因暴露给 operator。
func (s GatewayProjectionPublishAttemptHistoryService) CleanupExecuteGuardrail(query GatewayProjectionPublishAttemptCleanupDryRunQuery) (*GatewayProjectionPublishAttemptCleanupDryRunPlan, error) {
	return s.CleanupDryRun(query)
}

// CleanupExecuteReadiness 基于现有 dry-run plan 生成执行前只读门禁。
// 该方法只读取 Admin producer attempt history，不执行 DB delete/update、不触发 projection publish，也不读取 Gateway/API/Insight 内部库。
func (s GatewayProjectionPublishAttemptHistoryService) CleanupExecuteReadiness(query GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery) (*GatewayProjectionPublishAttemptCleanupExecuteReadiness, error) {
	dryRunQuery := GatewayProjectionPublishAttemptCleanupDryRunQuery{
		OrganizationId:  query.OrganizationId,
		Source:          query.Source,
		Status:          query.Status,
		FailureCategory: query.FailureCategory,
		OlderThan:       query.OlderThan,
		Limit:           query.Limit,
	}
	plan, err := s.CleanupDryRun(dryRunQuery)
	if err != nil {
		return nil, err
	}
	now := s.now()
	freshness := buildGatewayProjectionCleanupDryRunFreshness(query, now)
	approval := buildGatewayProjectionCleanupOperatorApproval(query.ApprovalEvidenceAliases)
	disabledReasons := gatewayProjectionCleanupExecuteDisabledReasons(plan, freshness, approval)
	readiness, safeNextAction := gatewayProjectionCleanupExecuteReadinessStatus(disabledReasons, approval)
	dryRunId, dryRunHash := buildGatewayProjectionCleanupDryRunIdentity(plan, freshness.GeneratedAt)
	export := GatewayProjectionCleanupExecuteReadinessExport{
		GeneratedAt:            formatGatewayProjectionObservabilityTime(now),
		Readiness:              readiness,
		SafeNextAction:         safeNextAction,
		DisabledReasons:        append([]string(nil), disabledReasons...),
		DryRunId:               dryRunId,
		DryRunHash:             dryRunHash,
		RetentionPolicyVersion: gatewayProjectionCleanupRetentionPolicyVersion,
		Filters:                plan.Filters,
		CandidateCount:         plan.CandidateCount,
		BlockedCount:           plan.BlockedCount,
		LastDryRunFreshness:    freshness,
		OperatorApproval:       approval,
		ExecuteGuardrail:       plan.ExecuteGuardrail,
	}
	return &GatewayProjectionPublishAttemptCleanupExecuteReadiness{
		GeneratedAt:                   formatGatewayProjectionObservabilityTime(now),
		Readiness:                     readiness,
		SafeNextAction:                safeNextAction,
		DisabledReasons:               disabledReasons,
		DryRunId:                      dryRunId,
		DryRunHash:                    dryRunHash,
		RetentionPolicyVersion:        gatewayProjectionCleanupRetentionPolicyVersion,
		Filters:                       plan.Filters,
		CandidateCount:                plan.CandidateCount,
		BlockedCount:                  plan.BlockedCount,
		MissingDiagnosticSummaryCount: plan.DiagnosticCompleteness.MissingCount,
		ReceiptHintAvailableCount:     plan.ReceiptHintCoverage.AvailableCount,
		ReceiptHintMissingCount:       plan.ReceiptHintCoverage.UnavailableCount,
		LastDryRunGeneratedAt:         freshness.GeneratedAt,
		LastDryRunFreshness:           freshness,
		OperatorApproval:              approval,
		ExecuteGuardrail:              plan.ExecuteGuardrail,
		Export:                        export,
	}, nil
}

// RecordCleanupApprovalAuditTrail 只记录 cleanup execute readiness 的安全操作预览。
// 该方法不执行 cleanup、不更新 publish attempt、不写 Gateway facts。
func (s GatewayProjectionPublishAttemptHistoryService) RecordCleanupApprovalAuditTrail(request GatewayProjectionCleanupApprovalAuditTrailRequest) (*GatewayProjectionCleanupApprovalAuditRecord, error) {
	record, err := normalizeGatewayProjectionCleanupApprovalAuditRecord(request, s.now())
	if err != nil {
		return nil, err
	}
	if err := s.store().RecordGatewayProjectionCleanupApprovalAuditRecord(record); err != nil {
		return nil, err
	}
	return cloneGatewayProjectionCleanupApprovalAuditRecord(record), nil
}

func (s GatewayProjectionPublishAttemptHistoryService) ListCleanupApprovalAuditTrail(query GatewayProjectionCleanupApprovalAuditTrailQuery) (*GatewayProjectionCleanupApprovalAuditTrail, error) {
	normalized, err := normalizeGatewayProjectionCleanupApprovalAuditTrailQuery(query)
	if err != nil {
		return nil, err
	}
	records, err := s.store().ListGatewayProjectionCleanupApprovalAuditRecords(normalized)
	if err != nil {
		return nil, err
	}
	cloned := make([]*GatewayProjectionCleanupApprovalAuditRecord, 0, len(records))
	for _, record := range records {
		cloned = append(cloned, cloneGatewayProjectionCleanupApprovalAuditRecord(record))
	}
	summary := buildGatewayProjectionCleanupApprovalAuditTrailSummary(cloned)
	filters := GatewayProjectionCleanupApprovalAuditTrailFilters{
		OrganizationId: normalized.OrganizationId,
		Action:         normalized.Action,
		ApprovalState:  normalized.ApprovalState,
		ReadinessHash:  normalized.ReadinessHash,
		Limit:          normalized.Limit,
	}
	generatedAt := formatGatewayProjectionObservabilityTime(s.now())
	export := GatewayProjectionCleanupApprovalAuditTrailExport{
		GeneratedAt:  generatedAt,
		StorageScope: GatewayProjectionCleanupApprovalAuditTrailStorageScope,
		Filters:      filters,
		Summary:      summary,
		Records:      cloned,
	}
	return &GatewayProjectionCleanupApprovalAuditTrail{
		GeneratedAt:      generatedAt,
		StorageScope:     GatewayProjectionCleanupApprovalAuditTrailStorageScope,
		Filters:          filters,
		Total:            len(cloned),
		Summary:          summary,
		Records:          cloned,
		Export:           export,
		ExecuteGuardrail: buildGatewayProjectionAttemptCleanupExecuteGuardrail(gatewayProjectionAttemptCleanupSafetyChecklist()),
	}, nil
}

// CleanupApprovalPolicyReadiness 基于 execute readiness 和 approval audit trail 派生审批策略状态。
// 该方法不执行 cleanup、不写 publish attempt、不读取下游 Gateway/API/Insight 数据；cannotInfer 必须 fail closed。
func (s GatewayProjectionPublishAttemptHistoryService) CleanupApprovalPolicyReadiness(query GatewayProjectionCleanupApprovalPolicyReadinessQuery) (*GatewayProjectionCleanupApprovalPolicyReadiness, error) {
	organizationID := normalizeGatewayProjectionString(query.OrganizationId)
	if organizationID == "" {
		return nil, errors.New("gateway projection organization is required")
	}
	executeReadiness, err := s.CleanupExecuteReadiness(GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery{
		OrganizationId:          organizationID,
		Source:                  query.Source,
		Status:                  query.Status,
		FailureCategory:         query.FailureCategory,
		OlderThan:               query.OlderThan,
		Limit:                   query.Limit,
		DryRunGeneratedAt:       query.DryRunGeneratedAt,
		MaxDryRunAgeSeconds:     query.MaxDryRunAgeSeconds,
		ApprovalEvidenceAliases: query.ApprovalEvidenceAliases,
	})
	if err != nil {
		return nil, err
	}

	currentHash := executeReadiness.DryRunHash
	requestedHash := sanitizeGatewayProjectionCleanupAuditIdentifier(query.ReadinessHash, "readiness-hash")
	auditHash := firstNonEmpty(requestedHash, currentHash)
	trail, err := s.ListCleanupApprovalAuditTrail(GatewayProjectionCleanupApprovalAuditTrailQuery{
		OrganizationId: organizationID,
		ReadinessHash:  auditHash,
		Limit:          query.Limit,
	})
	if err != nil {
		return nil, err
	}

	manualReview := buildGatewayProjectionCleanupApprovalManualReview(trail)
	cannotInferReasons := gatewayProjectionCleanupApprovalPolicyCannotInferReasons(executeReadiness, trail, manualReview, requestedHash, currentHash)
	policyStatus, safeNextAction := gatewayProjectionCleanupApprovalPolicyStatus(executeReadiness, manualReview, cannotInferReasons)
	cannotInfer := GatewayProjectionCleanupApprovalCannotInfer{
		Value:         len(cannotInferReasons) > 0 && policyStatus != "manual_review_ready",
		ReasonAliases: cannotInferReasons,
	}
	gates := buildGatewayProjectionCleanupApprovalPolicyGates(executeReadiness, manualReview, cannotInferReasons)
	generatedAt := formatGatewayProjectionObservabilityTime(s.now())
	export := GatewayProjectionCleanupApprovalPolicyReadinessExport{
		GeneratedAt:               generatedAt,
		PolicyVersion:             gatewayProjectionCleanupApprovalPolicyVersion,
		PolicyStatus:              policyStatus,
		StorageScope:              GatewayProjectionCleanupApprovalPolicyReadinessStorageScope,
		RetentionPolicyVersion:    gatewayProjectionCleanupRetentionPolicyVersion,
		ApprovalAuditStorageScope: GatewayProjectionCleanupApprovalAuditTrailStorageScope,
		ReadinessHash:             currentHash,
		DryRunId:                  executeReadiness.DryRunId,
		SafeNextAction:            safeNextAction,
		CandidateCount:            executeReadiness.CandidateCount,
		BlockedCount:              executeReadiness.BlockedCount,
		ManualReview:              manualReview,
		CannotInfer:               cannotInfer,
		PolicyGates:               gates,
		AuditSummary:              trail.Summary,
		ExecuteGuardrail:          executeReadiness.ExecuteGuardrail,
	}
	return &GatewayProjectionCleanupApprovalPolicyReadiness{
		GeneratedAt:               generatedAt,
		PolicyVersion:             gatewayProjectionCleanupApprovalPolicyVersion,
		PolicyStatus:              policyStatus,
		StorageScope:              GatewayProjectionCleanupApprovalPolicyReadinessStorageScope,
		RetentionPolicyVersion:    gatewayProjectionCleanupRetentionPolicyVersion,
		ApprovalAuditStorageScope: GatewayProjectionCleanupApprovalAuditTrailStorageScope,
		ReadinessHash:             currentHash,
		DryRunId:                  executeReadiness.DryRunId,
		SafeNextAction:            safeNextAction,
		CandidateCount:            executeReadiness.CandidateCount,
		BlockedCount:              executeReadiness.BlockedCount,
		ManualReview:              manualReview,
		CannotInfer:               cannotInfer,
		PolicyGates:               gates,
		AuditSummary:              trail.Summary,
		LastDryRunFreshness:       executeReadiness.LastDryRunFreshness,
		ExecuteGuardrail:          executeReadiness.ExecuteGuardrail,
		Export:                    export,
	}, nil
}

// CleanupApprovalDecisionDraftReadiness 派生真实 cleanup gate 开放前的只读审批草案。
// 它只消费 Admin-owned policy readiness/audit evidence，不创建真实 approval decision，也不修改 publish attempt。
func (s GatewayProjectionPublishAttemptHistoryService) CleanupApprovalDecisionDraftReadiness(query GatewayProjectionCleanupApprovalDecisionDraftReadinessQuery) (*GatewayProjectionCleanupApprovalDecisionDraftReadiness, error) {
	organizationID := normalizeGatewayProjectionString(query.OrganizationId)
	if organizationID == "" {
		return nil, errors.New("gateway projection organization is required")
	}
	policy, err := s.CleanupApprovalPolicyReadiness(GatewayProjectionCleanupApprovalPolicyReadinessQuery{
		OrganizationId:          organizationID,
		Source:                  query.Source,
		Status:                  query.Status,
		FailureCategory:         query.FailureCategory,
		OlderThan:               query.OlderThan,
		Limit:                   query.Limit,
		ReadinessHash:           query.ReadinessHash,
		DryRunGeneratedAt:       query.DryRunGeneratedAt,
		MaxDryRunAgeSeconds:     query.MaxDryRunAgeSeconds,
		ApprovalEvidenceAliases: query.ApprovalEvidenceAliases,
	})
	if err != nil {
		return nil, err
	}

	decisionReadiness, decisionState, operatorNextAction := gatewayProjectionCleanupApprovalDecisionDraftState(policy)
	blockingReasons := gatewayProjectionCleanupApprovalDecisionBlockingReasons(policy)
	manualChecklist := buildGatewayProjectionCleanupDecisionManualReviewChecklist(policy, query.ApprovalEvidenceAliases)
	retentionSummary := GatewayProjectionCleanupDecisionRetentionSummary{
		RetentionPolicyVersion: policy.RetentionPolicyVersion,
		CandidateCount:         policy.CandidateCount,
		BlockedCount:           policy.BlockedCount,
		LastDryRunFreshness:    policy.LastDryRunFreshness,
	}
	redactionSummary := GatewayProjectionCleanupDecisionRedactionSummary{
		Status:   "redacted",
		CopySafe: true,
		RedactedFields: []string{
			"token",
			"cookie",
			"private_url",
			"raw_gateway_response",
			"complete_organization_tree",
			"complete_subject_details",
			"gateway_authorization_facts",
		},
	}
	copySafeLabels := buildGatewayProjectionCleanupDecisionCopySafeLabels(decisionReadiness, policy)
	generatedAt := formatGatewayProjectionObservabilityTime(s.now())
	decisionDraftHash := prefixedStableHash("decision-draft-hash-", organizationID, policy.ReadinessHash, policy.DryRunId, policy.PolicyStatus, decisionReadiness, decisionState)
	decisionDraftID := prefixedStableHash("decision-draft-", organizationID, decisionDraftHash)
	decisionSummary := gatewayProjectionCleanupApprovalDecisionSummary(decisionReadiness)
	export := GatewayProjectionCleanupApprovalDecisionDraftReadinessExport{
		GeneratedAt:             generatedAt,
		DecisionDraftId:         decisionDraftID,
		DecisionDraftHash:       decisionDraftHash,
		DecisionReadiness:       decisionReadiness,
		DecisionState:           decisionState,
		ExecutionMode:           "manual_review_only",
		CleanupExecutionAllowed: false,
		PolicyVersion:           policy.PolicyVersion,
		PolicyStatus:            policy.PolicyStatus,
		ReadinessHash:           policy.ReadinessHash,
		DryRunId:                policy.DryRunId,
		ManualReviewChecklist:   manualChecklist,
		CannotInfer:             policy.CannotInfer,
		BlockingReasons:         blockingReasons,
		CopySafeLabels:          copySafeLabels,
		RetentionSummary:        retentionSummary,
		AuditSummary:            policy.AuditSummary,
		RedactionSummary:        redactionSummary,
		OperatorNextAction:      operatorNextAction,
		ExecuteGuardrail:        policy.ExecuteGuardrail,
	}
	return &GatewayProjectionCleanupApprovalDecisionDraftReadiness{
		GeneratedAt:               generatedAt,
		DecisionDraftId:           decisionDraftID,
		DecisionDraftHash:         decisionDraftHash,
		DecisionReadiness:         decisionReadiness,
		DecisionState:             decisionState,
		DecisionSummary:           decisionSummary,
		ExecutionMode:             "manual_review_only",
		CleanupExecutionAllowed:   false,
		StorageScope:              GatewayProjectionCleanupDecisionDraftStorageScope,
		PolicyVersion:             policy.PolicyVersion,
		PolicyStatus:              policy.PolicyStatus,
		RetentionPolicyVersion:    policy.RetentionPolicyVersion,
		ApprovalAuditStorageScope: policy.ApprovalAuditStorageScope,
		ReadinessHash:             policy.ReadinessHash,
		DryRunId:                  policy.DryRunId,
		CandidateCount:            policy.CandidateCount,
		BlockedCount:              policy.BlockedCount,
		ManualReviewChecklist:     manualChecklist,
		CannotInfer:               policy.CannotInfer,
		BlockingReasons:           blockingReasons,
		CopySafeLabels:            copySafeLabels,
		RetentionSummary:          retentionSummary,
		AuditSummary:              policy.AuditSummary,
		RedactionSummary:          redactionSummary,
		OperatorNextAction:        operatorNextAction,
		PolicyGates:               policy.PolicyGates,
		ExecuteGuardrail:          policy.ExecuteGuardrail,
		Export:                    export,
	}, nil
}

func (s GatewayProjectionPublishAttemptHistoryService) store() GatewayProjectionPublishAttemptStore {
	if s.Store != nil {
		return s.Store
	}
	return defaultGatewayProjectionPublishAttemptStore{}
}

func (s GatewayProjectionPublishAttemptHistoryService) now() time.Time {
	if s.Now != nil {
		return s.Now().UTC()
	}
	return time.Now().UTC()
}

func (s defaultGatewayProjectionPublishAttemptStore) RecordGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) error {
	if attempt == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	_, err := ormer.Engine.Insert(attempt)
	return err
}

func (s defaultGatewayProjectionPublishAttemptStore) ListGatewayProjectionPublishAttempts(query GatewayProjectionPublishAttemptQuery) ([]*GatewayProjectionPublishAttempt, error) {
	attempts := []*GatewayProjectionPublishAttempt{}
	if ormer == nil || ormer.Engine == nil {
		return attempts, nil
	}
	session := ormer.Engine.Desc("created_at")
	if query.OrganizationId != "" {
		session = session.Where("organization_id = ?", query.OrganizationId)
	}
	if query.Source != "" {
		session = session.And("source = ?", query.Source)
	}
	if query.Status != "" {
		session = session.And("status = ?", query.Status)
	}
	if query.FailureCategory != "" {
		session = session.And("failure_category = ?", query.FailureCategory)
	}
	if !query.From.IsZero() {
		session = session.And("created_at >= ?", query.From)
	}
	if !query.To.IsZero() {
		session = session.And("created_at <= ?", query.To)
	}
	if query.Limit > 0 {
		session = session.Limit(query.Limit)
	}
	err := session.Find(&attempts)
	return attempts, err
}

func (s defaultGatewayProjectionPublishAttemptStore) GetGatewayProjectionPublishAttempt(query GatewayProjectionPublishAttemptQuery) (*GatewayProjectionPublishAttempt, error) {
	if ormer == nil || ormer.Engine == nil || strings.TrimSpace(query.AttemptId) == "" {
		return nil, nil
	}
	attempt := &GatewayProjectionPublishAttempt{}
	session := ormer.Engine.Where("attempt_id = ?", strings.TrimSpace(query.AttemptId))
	if query.OrganizationId != "" {
		session = session.And("organization_id = ?", query.OrganizationId)
	}
	existed, err := session.Get(attempt)
	if err != nil || !existed {
		return nil, err
	}
	return attempt, nil
}

func (s defaultGatewayProjectionPublishAttemptStore) RecordGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) error {
	if record == nil || ormer == nil || ormer.Engine == nil {
		return nil
	}
	_, err := ormer.Engine.Insert(record)
	return err
}

func (s defaultGatewayProjectionPublishAttemptStore) ListGatewayProjectionCleanupApprovalAuditRecords(query GatewayProjectionCleanupApprovalAuditTrailQuery) ([]*GatewayProjectionCleanupApprovalAuditRecord, error) {
	records := []*GatewayProjectionCleanupApprovalAuditRecord{}
	if ormer == nil || ormer.Engine == nil {
		return records, nil
	}
	session := ormer.Engine.Desc("created_at").Where("organization_id = ?", query.OrganizationId)
	if query.Action != "" {
		session = session.And("action = ?", query.Action)
	}
	if query.ApprovalState != "" {
		session = session.And("approval_state = ?", query.ApprovalState)
	}
	if query.ReadinessHash != "" {
		session = session.And("readiness_hash = ?", query.ReadinessHash)
	}
	if query.Limit > 0 {
		session = session.Limit(query.Limit)
	}
	err := session.Find(&records)
	for _, record := range records {
		decodeGatewayProjectionCleanupApprovalAuditRecord(record)
	}
	return records, err
}

func normalizeGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt, now time.Time) *GatewayProjectionPublishAttempt {
	copied := *attempt
	copied.OrganizationId = normalizeGatewayProjectionString(copied.OrganizationId)
	copied.Source = normalizeGatewayProjectionAttemptSource(copied.Source)
	copied.Status = normalizeGatewayProjectionAttemptStatus(copied.Status, copied.Accepted || copied.Idempotent)
	if copied.FailureCategory == "" {
		copied.FailureCategory = GatewayProjectionFailureCategory(copied.ErrorCode)
	}
	if copied.CreatedAt.IsZero() {
		copied.CreatedAt = now
	}
	if copied.AttemptId == "" {
		copied.AttemptId = buildGatewayProjectionPublishAttemptID(copied)
	}
	copied.Owner = firstNonEmpty(copied.Owner, copied.OrganizationId)
	copied.Name = firstNonEmpty(copied.Name, copied.AttemptId)
	copied.SkippedByReason = cloneGatewayProjectionSkipSummary(copied.SkippedByReason)
	copied.SkippedByReasonJSON = gatewayProjectionAttemptMapJSON(copied.SkippedByReason)
	copied.Metadata = cloneGatewayProjectionAttemptMetadata(copied.Metadata)
	copied.MetadataJSON = gatewayProjectionAttemptMetadataJSON(copied.Metadata)
	return &copied
}

func normalizeGatewayProjectionPublishAttemptQuery(query GatewayProjectionPublishAttemptQuery) GatewayProjectionPublishAttemptQuery {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	query.AttemptId = normalizeGatewayProjectionString(query.AttemptId)
	query.Source = normalizeGatewayProjectionString(query.Source)
	query.Status = normalizeGatewayProjectionString(query.Status)
	query.FailureCategory = normalizeGatewayProjectionString(query.FailureCategory)
	if query.Limit <= 0 {
		query.Limit = defaultGatewayProjectionPublishAttemptLimit
	}
	if query.Limit > maxGatewayProjectionPublishAttemptLimit {
		query.Limit = maxGatewayProjectionPublishAttemptLimit
	}
	return query
}

func normalizeGatewayProjectionPublishAttemptCleanupDryRunQuery(query GatewayProjectionPublishAttemptCleanupDryRunQuery, now time.Time) (GatewayProjectionPublishAttemptCleanupDryRunQuery, error) {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	if query.OrganizationId == "" {
		return query, errors.New("gateway projection organization is required")
	}
	query.Source = normalizeGatewayProjectionString(query.Source)
	query.Status = normalizeGatewayProjectionString(query.Status)
	query.FailureCategory = normalizeGatewayProjectionString(query.FailureCategory)
	query.RequiredReason = normalizeGatewayProjectionString(query.RequiredReason)
	query.ConfirmationText = normalizeGatewayProjectionString(query.ConfirmationText)
	if query.OlderThan.IsZero() {
		query.OlderThan = now.UTC().Add(-defaultGatewayProjectionPublishAttemptRetentionWindow)
	} else {
		query.OlderThan = query.OlderThan.UTC()
		if query.OlderThan.After(now.UTC()) {
			return query, errors.New("gateway projection cleanup olderThan must not be in the future")
		}
	}
	if query.Limit <= 0 {
		query.Limit = defaultGatewayProjectionPublishAttemptLimit
	}
	if query.Limit > maxGatewayProjectionPublishAttemptLimit {
		query.Limit = maxGatewayProjectionPublishAttemptLimit
	}
	return query, nil
}

func normalizeGatewayProjectionCleanupApprovalAuditTrailQuery(query GatewayProjectionCleanupApprovalAuditTrailQuery) (GatewayProjectionCleanupApprovalAuditTrailQuery, error) {
	query.OrganizationId = normalizeGatewayProjectionString(query.OrganizationId)
	if query.OrganizationId == "" {
		return query, errors.New("gateway projection organization is required")
	}
	if query.Action != "" {
		action, _, err := normalizeGatewayProjectionCleanupApprovalAction(query.Action, "")
		if err != nil {
			return query, err
		}
		query.Action = action
	}
	query.ApprovalState = normalizeGatewayProjectionCleanupAuditAlias(query.ApprovalState)
	query.ReadinessHash = sanitizeGatewayProjectionCleanupAuditIdentifier(query.ReadinessHash, "readiness-hash")
	if query.Limit <= 0 {
		query.Limit = defaultGatewayProjectionPublishAttemptLimit
	}
	if query.Limit > maxGatewayProjectionPublishAttemptLimit {
		query.Limit = maxGatewayProjectionPublishAttemptLimit
	}
	return query, nil
}

func normalizeGatewayProjectionCleanupApprovalAuditRecord(request GatewayProjectionCleanupApprovalAuditTrailRequest, now time.Time) (*GatewayProjectionCleanupApprovalAuditRecord, error) {
	organizationID := normalizeGatewayProjectionString(request.OrganizationId)
	if organizationID == "" {
		return nil, errors.New("gateway projection organization is required")
	}
	if request.Readiness != nil {
		request.ReadinessHash = firstNonEmpty(request.ReadinessHash, request.Readiness.DryRunHash)
		request.DryRunId = firstNonEmpty(request.DryRunId, request.Readiness.DryRunId)
		request.RetentionPolicyVersion = firstNonEmpty(request.RetentionPolicyVersion, request.Readiness.RetentionPolicyVersion)
		request.CandidateCount = firstNonZeroInt(request.CandidateCount, request.Readiness.CandidateCount)
		request.BlockedCount = firstNonZeroInt(request.BlockedCount, request.Readiness.BlockedCount)
		request.DisabledReasons = firstNonEmptyStringSlice(request.DisabledReasons, request.Readiness.DisabledReasons)
		request.SafeNextAction = firstNonEmpty(request.SafeNextAction, request.Readiness.SafeNextAction)
	}
	action, defaultApprovalState, err := normalizeGatewayProjectionCleanupApprovalAction(request.Action, request.ApprovalState)
	if err != nil {
		return nil, err
	}
	approvalState := normalizeGatewayProjectionCleanupAuditAlias(firstNonEmpty(request.ApprovalState, defaultApprovalState))
	readinessHash := sanitizeGatewayProjectionCleanupAuditIdentifier(request.ReadinessHash, "readiness-hash")
	dryRunID := sanitizeGatewayProjectionCleanupAuditIdentifier(request.DryRunId, "dryrun")
	retentionPolicyVersion := normalizeGatewayProjectionCleanupAuditAlias(firstNonEmpty(request.RetentionPolicyVersion, gatewayProjectionCleanupRetentionPolicyVersion))
	disabledReasons := normalizeGatewayProjectionCleanupAuditAliasSlice(request.DisabledReasons)
	if request.CandidateCount < 0 {
		request.CandidateCount = 0
	}
	if request.BlockedCount < 0 {
		request.BlockedCount = 0
	}
	createdAt := now.UTC()
	auditID := prefixedStableHash("gcaa-", organizationID, action, approvalState, readinessHash, dryRunID, createdAt.Format(time.RFC3339Nano), strconv.FormatInt(time.Now().UTC().UnixNano(), 10))
	record := &GatewayProjectionCleanupApprovalAuditRecord{
		Owner:                  organizationID,
		Name:                   auditID,
		CreatedAt:              createdAt,
		AuditId:                auditID,
		OrganizationId:         organizationID,
		Action:                 action,
		ApprovalState:          approvalState,
		ReadinessHash:          readinessHash,
		DryRunId:               dryRunID,
		RetentionPolicyVersion: retentionPolicyVersion,
		CandidateCount:         request.CandidateCount,
		BlockedCount:           request.BlockedCount,
		DisabledReasons:        disabledReasons,
		DisabledReasonsJSON:    gatewayProjectionAttemptStringSliceJSON(disabledReasons),
		SafeNextAction:         normalizeGatewayProjectionCleanupAuditAlias(request.SafeNextAction),
		StorageScope:           GatewayProjectionCleanupApprovalAuditTrailStorageScope,
		ExecuteEnabled:         false,
		DryRunOnly:             true,
		SafetySummary:          "safe_action_recorded_no_cleanup_execution",
	}
	return record, nil
}

func normalizeGatewayProjectionCleanupApprovalAction(action string, approvalState string) (string, string, error) {
	action = strings.ToLower(strings.TrimSpace(action))
	switch action {
	case "approve":
		return action, "approved_preview", nil
	case "reject":
		return action, "rejected_preview", nil
	case "copy":
		return action, "copied", nil
	case "export":
		return action, "exported", nil
	case "refresh":
		return action, "refreshed", nil
	default:
		return "", "", errors.New("gateway projection cleanup approval action is invalid")
	}
}

func normalizeGatewayProjectionCleanupAuditAlias(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return ""
	}
	if gatewayProjectionCleanupAuditLooksSensitive(value) {
		return "redacted_sensitive_alias"
	}
	builder := strings.Builder{}
	for _, item := range value {
		if (item >= 'a' && item <= 'z') || (item >= '0' && item <= '9') || item == '_' || item == '-' {
			builder.WriteRune(item)
			continue
		}
		if item == ' ' || item == '.' || item == ':' || item == '/' || item == '\\' {
			builder.WriteRune('_')
		}
	}
	alias := strings.Trim(builder.String(), "_-")
	if alias == "" || gatewayProjectionCleanupAuditLooksSensitive(alias) {
		return "redacted_sensitive_alias"
	}
	if len(alias) > 120 {
		alias = alias[:120]
	}
	return alias
}

func normalizeGatewayProjectionCleanupAuditAliasSlice(values []string) []string {
	result := []string{}
	seen := map[string]bool{}
	for _, value := range values {
		alias := normalizeGatewayProjectionCleanupAuditAlias(value)
		if alias == "" || seen[alias] {
			continue
		}
		seen[alias] = true
		result = append(result, alias)
	}
	return result
}

func sanitizeGatewayProjectionCleanupAuditIdentifier(value string, fallbackPrefix string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if gatewayProjectionCleanupAuditLooksSensitive(value) {
		return prefixedStableHash(fallbackPrefix+"-", "redacted", value)
	}
	if len(value) > 120 {
		return prefixedStableHash(fallbackPrefix+"-", value)
	}
	return value
}

func gatewayProjectionCleanupAuditLooksSensitive(value string) bool {
	lower := strings.ToLower(strings.TrimSpace(value))
	if lower == "" {
		return false
	}
	for _, marker := range []string{"://", "authorization", "cookie", "token", "secret", "password", "rawgatewayresponse", "raw_gateway_response", "gateway.example", "private"} {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}

func gatewayProjectionAttemptStringSliceJSON(values []string) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

func normalizeGatewayProjectionAttemptSource(source string) string {
	source = strings.ToLower(strings.TrimSpace(source))
	if source == GatewayProjectionPublishAttemptSourceManual {
		return source
	}
	return GatewayProjectionPublishAttemptSourceScheduled
}

func normalizeGatewayProjectionAttemptStatus(status string, success bool) string {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "ok" || status == "error" {
		return status
	}
	if success {
		return "ok"
	}
	return "error"
}

func buildGatewayProjectionPublishAttemptID(attempt GatewayProjectionPublishAttempt) string {
	createdAt := attempt.CreatedAt.UTC().Format(time.RFC3339Nano)
	return prefixedStableHash("gpa-", attempt.OrganizationId, attempt.Source, attempt.TraceId, attempt.ProjectionBatchId, attempt.SourceVersion, createdAt)
}

func gatewayProjectionAttemptMapJSON(values map[string]int) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

func gatewayProjectionAttemptMetadataJSON(values map[string]string) string {
	if len(values) == 0 {
		return ""
	}
	raw, _ := json.Marshal(values)
	return string(raw)
}

func cloneGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt) *GatewayProjectionPublishAttempt {
	if attempt == nil {
		return nil
	}
	cloned := *attempt
	cloned.SkippedByReason = cloneGatewayProjectionSkipSummary(attempt.SkippedByReason)
	if len(cloned.SkippedByReason) == 0 && strings.TrimSpace(attempt.SkippedByReasonJSON) != "" {
		_ = json.Unmarshal([]byte(attempt.SkippedByReasonJSON), &cloned.SkippedByReason)
	}
	cloned.Metadata = cloneGatewayProjectionAttemptMetadata(attempt.Metadata)
	if len(cloned.Metadata) == 0 && strings.TrimSpace(attempt.MetadataJSON) != "" {
		_ = json.Unmarshal([]byte(attempt.MetadataJSON), &cloned.Metadata)
	}
	return &cloned
}

func cloneGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) *GatewayProjectionCleanupApprovalAuditRecord {
	if record == nil {
		return nil
	}
	cloned := *record
	decodeGatewayProjectionCleanupApprovalAuditRecord(&cloned)
	cloned.DisabledReasons = append([]string(nil), cloned.DisabledReasons...)
	return &cloned
}

func decodeGatewayProjectionCleanupApprovalAuditRecord(record *GatewayProjectionCleanupApprovalAuditRecord) {
	if record == nil {
		return
	}
	if len(record.DisabledReasons) == 0 && strings.TrimSpace(record.DisabledReasonsJSON) != "" {
		_ = json.Unmarshal([]byte(record.DisabledReasonsJSON), &record.DisabledReasons)
	}
	record.DisabledReasons = normalizeGatewayProjectionCleanupAuditAliasSlice(record.DisabledReasons)
	record.StorageScope = GatewayProjectionCleanupApprovalAuditTrailStorageScope
	record.ExecuteEnabled = false
	record.DryRunOnly = true
	if record.SafetySummary == "" {
		record.SafetySummary = "safe_action_recorded_no_cleanup_execution"
	}
}

func buildGatewayProjectionCleanupApprovalAuditTrailSummary(records []*GatewayProjectionCleanupApprovalAuditRecord) GatewayProjectionCleanupApprovalAuditTrailSummary {
	summary := GatewayProjectionCleanupApprovalAuditTrailSummary{
		ActionCounts:        map[string]int{},
		ApprovalStateCounts: map[string]int{},
	}
	var latest time.Time
	disabledReasons := map[string]bool{}
	for _, record := range records {
		if record == nil {
			continue
		}
		summary.ActionCounts[record.Action]++
		summary.ApprovalStateCounts[record.ApprovalState]++
		summary.CandidateCount += record.CandidateCount
		summary.BlockedCount += record.BlockedCount
		for _, reason := range record.DisabledReasons {
			disabledReasons[reason] = true
		}
		if !record.CreatedAt.IsZero() && (latest.IsZero() || record.CreatedAt.After(latest)) {
			latest = record.CreatedAt
		}
	}
	summary.LatestActionAt = formatGatewayProjectionObservabilityTime(latest)
	summary.DisabledReasonCount = len(disabledReasons)
	return summary
}

func requiredGatewayProjectionCleanupApprovalPolicyActionAliases() []string {
	return []string{"approve", "copy", "export"}
}

func buildGatewayProjectionCleanupApprovalManualReview(trail *GatewayProjectionCleanupApprovalAuditTrail) GatewayProjectionCleanupApprovalManualReview {
	required := requiredGatewayProjectionCleanupApprovalPolicyActionAliases()
	actionCounts := map[string]int{}
	if trail != nil {
		actionCounts = trail.Summary.ActionCounts
	}
	missing := []string{}
	for _, action := range required {
		if actionCounts[action] <= 0 {
			missing = append(missing, action)
		}
	}
	status := "ready"
	if len(missing) > 0 {
		status = "missing"
	}
	return GatewayProjectionCleanupApprovalManualReview{
		Required:              true,
		Status:                status,
		RequiredActionAliases: required,
		MissingActionAliases:  missing,
	}
}

func gatewayProjectionCleanupApprovalPolicyCannotInferReasons(executeReadiness *GatewayProjectionPublishAttemptCleanupExecuteReadiness, trail *GatewayProjectionCleanupApprovalAuditTrail, manualReview GatewayProjectionCleanupApprovalManualReview, requestedHash string, currentHash string) []string {
	reasons := []string{}
	seen := map[string]bool{}
	add := func(reason string) {
		if reason == "" || seen[reason] {
			return
		}
		seen[reason] = true
		reasons = append(reasons, reason)
	}
	if executeReadiness == nil {
		return []string{"cleanup_execute_readiness_unavailable"}
	}
	if currentHash == "" {
		add("readiness_hash_missing")
	}
	if requestedHash != "" && currentHash != "" && requestedHash != currentHash {
		add("approval_audit_hash_mismatch")
	}
	if trail == nil || trail.Total == 0 {
		add("approval_audit_trail_empty")
	}
	if trail != nil && trail.Summary.ActionCounts["reject"] > 0 {
		add("approval_rejected")
	}
	if executeReadiness.Readiness == "blocked" {
		add("execute_readiness_blocked")
	}
	for _, reason := range executeReadiness.DisabledReasons {
		if reason == "cleanup_execution_not_enabled" {
			continue
		}
		if reason == "approval_evidence_missing" {
			add("approval_evidence_missing")
			continue
		}
		add(reason)
	}
	if manualReview.Status != "ready" {
		add("manual_review_action_missing")
	}
	return reasons
}

func gatewayProjectionCleanupApprovalPolicyStatus(executeReadiness *GatewayProjectionPublishAttemptCleanupExecuteReadiness, manualReview GatewayProjectionCleanupApprovalManualReview, reasons []string) (string, string) {
	if executeReadiness == nil {
		return "cannot_infer", "rerun_cleanup_execute_readiness"
	}
	if containsGatewayProjectionCleanupReason(reasons, "approval_rejected") || executeReadiness.Readiness == "blocked" {
		return "blocked", "review_disabled_reasons"
	}
	if containsGatewayProjectionCleanupReason(reasons, "approval_audit_hash_mismatch") || containsGatewayProjectionCleanupReason(reasons, "approval_audit_trail_empty") {
		return "cannot_infer", "refresh_approval_audit_trail"
	}
	if manualReview.Status != "ready" || executeReadiness.Readiness == "approval_required" {
		return "manual_review_required", "collect_approval_package"
	}
	if executeReadiness.Readiness == "ready_for_approval" {
		return "manual_review_ready", "wait_for_cleanup_execute_gate"
	}
	return "cannot_infer", "rerun_cleanup_execute_readiness"
}

func buildGatewayProjectionCleanupApprovalPolicyGates(executeReadiness *GatewayProjectionPublishAttemptCleanupExecuteReadiness, manualReview GatewayProjectionCleanupApprovalManualReview, reasons []string) []GatewayProjectionCleanupApprovalPolicyGate {
	executeStatus := "pass"
	if executeReadiness == nil || executeReadiness.Readiness == "blocked" {
		executeStatus = "blocked"
	} else if executeReadiness.Readiness != "ready_for_approval" {
		executeStatus = "manual_review"
	}
	auditStatus := "pass"
	if containsGatewayProjectionCleanupReason(reasons, "approval_rejected") {
		auditStatus = "blocked"
	} else if containsGatewayProjectionCleanupReason(reasons, "approval_audit_hash_mismatch") || containsGatewayProjectionCleanupReason(reasons, "approval_audit_trail_empty") {
		auditStatus = "cannot_infer"
	}
	manualStatus := "pass"
	if manualReview.Status != "ready" {
		manualStatus = "manual_review"
	}
	return []GatewayProjectionCleanupApprovalPolicyGate{
		{Name: "cleanup_execute_readiness", Status: executeStatus, ReasonAlias: firstPolicyGateReasonAlias(reasons, "execute_readiness_blocked", "cleanup_dry_run_stale", "cleanup_dry_run_generated_at_future", "readiness_hash_missing")},
		{Name: "approval_audit_trail", Status: auditStatus, ReasonAlias: firstPolicyGateReasonAlias(reasons, "approval_rejected", "approval_audit_hash_mismatch", "approval_audit_trail_empty")},
		{Name: "manual_review_actions", Status: manualStatus, ReasonAlias: firstPolicyGateReasonAlias(reasons, "manual_review_action_missing", "approval_evidence_missing")},
		{Name: "cleanup_execution_guardrail", Status: "disabled", ReasonAlias: "cleanup_execution_not_enabled"},
	}
}

func firstPolicyGateReasonAlias(reasons []string, candidates ...string) string {
	for _, candidate := range candidates {
		if containsGatewayProjectionCleanupReason(reasons, candidate) {
			return candidate
		}
	}
	return ""
}

func gatewayProjectionCleanupApprovalDecisionDraftState(policy *GatewayProjectionCleanupApprovalPolicyReadiness) (string, string, string) {
	if policy == nil {
		return "cannot_infer", "policy_readiness_unavailable", "rerun_cleanup_approval_policy_readiness"
	}
	switch policy.PolicyStatus {
	case "manual_review_ready":
		return "draft_ready", "manual_review_ready_no_execution", "review_decision_draft_with_master_control"
	case "manual_review_required":
		return "manual_review_required", "manual_review_checklist_incomplete", "complete_manual_review_checklist"
	case "blocked":
		return "blocked", "approval_policy_blocked", "review_blocking_reasons"
	case "cannot_infer":
		return "cannot_infer", "approval_policy_cannot_infer", "refresh_cleanup_approval_policy_readiness"
	default:
		return "cannot_infer", "approval_policy_unknown", "refresh_cleanup_approval_policy_readiness"
	}
}

func gatewayProjectionCleanupApprovalDecisionSummary(decisionReadiness string) string {
	switch decisionReadiness {
	case "draft_ready":
		return "decision_draft_ready_for_manual_review_without_cleanup_execution"
	case "manual_review_required":
		return "decision_draft_waiting_for_manual_review_actions"
	case "blocked":
		return "decision_draft_blocked_by_policy_or_reject_action"
	default:
		return "decision_draft_cannot_infer_required_evidence"
	}
}

func gatewayProjectionCleanupApprovalDecisionBlockingReasons(policy *GatewayProjectionCleanupApprovalPolicyReadiness) []string {
	if policy == nil {
		return []string{"cleanup_approval_policy_unavailable"}
	}
	reasons := append([]string(nil), policy.CannotInfer.ReasonAliases...)
	if policy.PolicyStatus == "manual_review_required" && len(policy.ManualReview.MissingActionAliases) > 0 {
		reasons = append(reasons, "manual_review_action_missing")
	}
	if policy.PolicyStatus == "blocked" && len(reasons) == 0 {
		reasons = append(reasons, "approval_policy_blocked")
	}
	return normalizeGatewayProjectionCleanupAuditAliasSlice(reasons)
}

func buildGatewayProjectionCleanupDecisionManualReviewChecklist(policy *GatewayProjectionCleanupApprovalPolicyReadiness, providedEvidence []string) GatewayProjectionCleanupDecisionManualReviewChecklist {
	checklist := GatewayProjectionCleanupDecisionManualReviewChecklist{
		Required:                true,
		Status:                  "missing",
		RequiredActionAliases:   requiredGatewayProjectionCleanupApprovalPolicyActionAliases(),
		RequiredEvidenceAliases: allGatewayProjectionCleanupApprovalEvidenceAliases(),
	}
	if policy != nil {
		checklist.Status = policy.ManualReview.Status
		checklist.Required = policy.ManualReview.Required
		checklist.RequiredActionAliases = append([]string(nil), policy.ManualReview.RequiredActionAliases...)
		checklist.MissingActionAliases = append([]string(nil), policy.ManualReview.MissingActionAliases...)
	}
	approval := buildGatewayProjectionCleanupOperatorApproval(providedEvidence)
	checklist.MissingEvidenceAliases = append([]string(nil), approval.MissingEvidenceAliases...)
	return checklist
}

func buildGatewayProjectionCleanupDecisionCopySafeLabels(decisionReadiness string, policy *GatewayProjectionCleanupApprovalPolicyReadiness) []string {
	labels := []string{
		"admin_producer_diagnostics_only",
		"manual_review_only",
		"cleanup_execution_not_enabled",
		"gateway_receipt_hint_diagnostic_not_authorization_fact",
		"sanitized_export_only",
		"decision_readiness_" + normalizeGatewayProjectionCleanupAuditAlias(decisionReadiness),
	}
	if policy != nil {
		labels = append(labels,
			"policy_status_"+normalizeGatewayProjectionCleanupAuditAlias(policy.PolicyStatus),
			"policy_version_"+normalizeGatewayProjectionCleanupAuditAlias(policy.PolicyVersion),
		)
	}
	return normalizeGatewayProjectionCleanupAuditAliasSlice(labels)
}

func enrichGatewayProjectionPublishAttempt(attempt *GatewayProjectionPublishAttempt, organizationID string, now time.Time) *GatewayProjectionPublishAttempt {
	if attempt == nil {
		return nil
	}
	attempt.Retention = buildGatewayProjectionPublishAttemptRetention(*attempt, now)
	attempt.ReceiptQueryHint = buildGatewayProjectionReceiptQueryHint(*attempt, organizationID)
	return attempt
}

func buildGatewayProjectionPublishAttemptRetention(attempt GatewayProjectionPublishAttempt, now time.Time) GatewayProjectionPublishAttemptRetention {
	retention := GatewayProjectionPublishAttemptRetention{
		WindowSeconds: int64(defaultGatewayProjectionPublishAttemptRetentionWindow / time.Second),
		CleanupReason: "within_retention_window",
	}
	if attempt.CreatedAt.IsZero() {
		retention.CleanupReason = "created_at_missing"
		return retention
	}
	expiresAt := attempt.CreatedAt.UTC().Add(defaultGatewayProjectionPublishAttemptRetentionWindow)
	retention.ExpiresAt = formatGatewayProjectionObservabilityTime(expiresAt)
	if now.UTC().Before(expiresAt) {
		return retention
	}
	// 过期记录仍需要保留可排障线索；缺少 receipt 查询键和失败分类时只标记 blocked，不给 cleanup 候选。
	if attempt.ProjectionBatchId == "" && attempt.OrgVersion <= 0 && attempt.SourceVersion == "" && attempt.FailureCategory == "" && attempt.ErrorCode == "" {
		retention.CleanupReason = "retention_expired_missing_diagnostic_summary"
		return retention
	}
	retention.CleanupEligible = true
	retention.CleanupReason = "retention_expired_with_diagnostic_summary"
	return retention
}

func buildGatewayProjectionPublishAttemptRetentionSample(attempt *GatewayProjectionPublishAttempt) GatewayProjectionPublishAttemptRetentionSample {
	if attempt == nil {
		return GatewayProjectionPublishAttemptRetentionSample{}
	}
	return GatewayProjectionPublishAttemptRetentionSample{
		AttemptId:         attempt.AttemptId,
		Source:            attempt.Source,
		Status:            attempt.Status,
		CreatedAt:         formatGatewayProjectionObservabilityTime(attempt.CreatedAt),
		CleanupEligible:   attempt.Retention.CleanupEligible,
		CleanupReason:     attempt.Retention.CleanupReason,
		ProjectionBatchId: attempt.ProjectionBatchId,
		SourceVersion:     attempt.SourceVersion,
	}
}

func gatewayProjectionAttemptDiagnosticComplete(attempt *GatewayProjectionPublishAttempt) bool {
	if attempt == nil {
		return false
	}
	hasLineage := attempt.ProjectionBatchId != "" || attempt.OrgVersion > 0 || attempt.SourceVersion != ""
	hasFailureSummary := attempt.FailureCategory != "" || attempt.ErrorCode != "" || len(attempt.SkippedByReason) > 0
	return hasLineage && hasFailureSummary && attempt.Retention.CleanupReason != ""
}

func gatewayProjectionAttemptCleanupSafetyChecklist() []string {
	return []string{
		"organization_scope_required",
		"dry_run_only_no_db_delete_or_update",
		"sanitized_attempt_samples_only",
		"gateway_receipt_hint_is_diagnostic_not_authorization_fact",
	}
}

func buildGatewayProjectionAttemptCleanupExecuteGuardrail(safetyChecklist []string) GatewayProjectionAttemptCleanupExecuteGuardrail {
	return GatewayProjectionAttemptCleanupExecuteGuardrail{
		Enabled:              false,
		DryRunOnly:           true,
		Irreversible:         false,
		DisabledReason:       "cleanup_execution_not_enabled",
		RequiredConfirmation: "not_available_in_p0",
		SafetyChecklist:      append([]string(nil), safetyChecklist...),
	}
}

func gatewayProjectionAttemptCleanupOperatorActionSummary(candidateCount int, blockedCount int) string {
	if candidateCount == 0 && blockedCount == 0 {
		return "no_attempts_match_filters"
	}
	if candidateCount == 0 {
		return "cleanup_blocked_review_reasons"
	}
	if blockedCount > 0 {
		return "cleanup_candidates_require_operator_review"
	}
	return "cleanup_candidates_ready_for_future_execute_gate"
}

func buildGatewayProjectionCleanupDryRunFreshness(query GatewayProjectionPublishAttemptCleanupExecuteReadinessQuery, now time.Time) GatewayProjectionCleanupDryRunFreshness {
	maxAgeSeconds := query.MaxDryRunAgeSeconds
	if maxAgeSeconds <= 0 {
		maxAgeSeconds = int64(defaultGatewayProjectionCleanupDryRunMaxAge / time.Second)
	}
	generatedAt := query.DryRunGeneratedAt
	if generatedAt.IsZero() {
		generatedAt = now
	}
	generatedAt = generatedAt.UTC()
	ageSeconds := int64(now.UTC().Sub(generatedAt).Seconds())
	status := "fresh"
	if ageSeconds < 0 {
		status = "future"
		ageSeconds = 0
	} else if ageSeconds > maxAgeSeconds {
		status = "stale"
	}
	return GatewayProjectionCleanupDryRunFreshness{
		Status:        status,
		GeneratedAt:   formatGatewayProjectionObservabilityTime(generatedAt),
		AgeSeconds:    ageSeconds,
		MaxAgeSeconds: maxAgeSeconds,
		ExpiresAt:     formatGatewayProjectionObservabilityTime(generatedAt.Add(time.Duration(maxAgeSeconds) * time.Second)),
	}
}

func allGatewayProjectionCleanupApprovalEvidenceAliases() []string {
	return []string{
		"dry_run_export_reviewed",
		"candidate_count_reviewed",
		"receipt_hint_coverage_reviewed",
		"no_blocked_attempts_confirmed",
	}
}

func buildGatewayProjectionCleanupOperatorApproval(provided []string) GatewayProjectionCleanupOperatorApproval {
	required := allGatewayProjectionCleanupApprovalEvidenceAliases()
	seen := map[string]bool{}
	for _, item := range provided {
		item = normalizeGatewayProjectionString(item)
		if item != "" {
			seen[item] = true
		}
	}
	missing := []string{}
	for _, item := range required {
		if !seen[item] {
			missing = append(missing, item)
		}
	}
	status := "ready"
	if len(missing) > 0 {
		status = "missing"
	}
	return GatewayProjectionCleanupOperatorApproval{
		Required:                true,
		Status:                  status,
		RequiredEvidenceAliases: required,
		MissingEvidenceAliases:  missing,
	}
}

func gatewayProjectionCleanupExecuteDisabledReasons(plan *GatewayProjectionPublishAttemptCleanupDryRunPlan, freshness GatewayProjectionCleanupDryRunFreshness, approval GatewayProjectionCleanupOperatorApproval) []string {
	reasons := []string{}
	if plan == nil {
		return []string{"cleanup_dry_run_unavailable", "cleanup_execution_not_enabled"}
	}
	if plan.CandidateCount == 0 {
		reasons = append(reasons, "no_cleanup_candidates")
	}
	if plan.BlockedCount > 0 {
		reasons = append(reasons, "cleanup_blocked_attempts_present")
	}
	if plan.DiagnosticCompleteness.MissingCount > 0 {
		reasons = append(reasons, "diagnostic_summary_missing")
	}
	if plan.ReceiptHintCoverage.UnavailableCount > 0 {
		reasons = append(reasons, "receipt_hint_missing")
	}
	if freshness.Status == "stale" {
		reasons = append(reasons, "cleanup_dry_run_stale")
	}
	if freshness.Status == "future" {
		reasons = append(reasons, "cleanup_dry_run_generated_at_future")
	}
	if approval.Status != "ready" {
		reasons = append(reasons, "approval_evidence_missing")
	}
	return append(reasons, "cleanup_execution_not_enabled")
}

func gatewayProjectionCleanupExecuteReadinessStatus(disabledReasons []string, approval GatewayProjectionCleanupOperatorApproval) (string, string) {
	if containsGatewayProjectionCleanupReason(disabledReasons, "cleanup_dry_run_stale") || containsGatewayProjectionCleanupReason(disabledReasons, "cleanup_dry_run_generated_at_future") {
		return "blocked", "rerun_cleanup_dry_run"
	}
	for _, reason := range disabledReasons {
		if reason != "approval_evidence_missing" && reason != "cleanup_execution_not_enabled" {
			return "blocked", "review_disabled_reasons"
		}
	}
	if approval.Status != "ready" {
		return "approval_required", "collect_approval_package"
	}
	return "ready_for_approval", "wait_for_cleanup_execute_gate"
}

func containsGatewayProjectionCleanupReason(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func buildGatewayProjectionCleanupDryRunIdentity(plan *GatewayProjectionPublishAttemptCleanupDryRunPlan, generatedAt string) (string, string) {
	if plan == nil {
		return "", ""
	}
	reasonJSON, _ := json.Marshal(plan.ReasonCounts)
	parts := []string{
		plan.Filters.OrganizationId,
		plan.Filters.Source,
		plan.Filters.Status,
		plan.Filters.FailureCategory,
		plan.Filters.OlderThan,
		strconv.Itoa(plan.CandidateCount),
		strconv.Itoa(plan.BlockedCount),
		string(reasonJSON),
		generatedAt,
	}
	dryRunHash := prefixedStableHash("dryrun-hash-", parts...)
	dryRunId := prefixedStableHash("dryrun-", parts...)
	return dryRunId, dryRunHash
}

func buildGatewayProjectionReceiptQueryHint(attempt GatewayProjectionPublishAttempt, organizationID string) GatewayProjectionReceiptQueryHint {
	organizationID = firstNonEmpty(normalizeGatewayProjectionString(organizationID), normalizeGatewayProjectionString(attempt.OrganizationId))
	hint := GatewayProjectionReceiptQueryHint{
		OrganizationId:    organizationID,
		ProjectionBatchId: normalizeGatewayProjectionString(attempt.ProjectionBatchId),
		OrgVersion:        attempt.OrgVersion,
		SourceVersion:     normalizeGatewayProjectionString(attempt.SourceVersion),
	}
	hint.Available = hint.ProjectionBatchId != "" || hint.OrgVersion > 0 || hint.SourceVersion != ""
	if !hint.Available {
		hint.Latest = true
		hint.UnavailableReason = "projection_lineage_missing"
	}
	return hint
}

func cloneGatewayProjectionAttemptMetadata(values map[string]string) map[string]string {
	if len(values) == 0 {
		return nil
	}
	cloned := make(map[string]string, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

func firstNonZeroInt(values ...int) int {
	for _, value := range values {
		if value != 0 {
			return value
		}
	}
	return 0
}

func firstNonEmptyStringSlice(values ...[]string) []string {
	for _, value := range values {
		if len(value) > 0 {
			return append([]string(nil), value...)
		}
	}
	return nil
}

func buildGatewayProjectionPublishAttemptFromResult(source string, organizationID string, result GatewayProjectionServiceResult, sourceConnections []SourceConnection, startedAt time.Time, durationMs int64, auditHash string) *GatewayProjectionPublishAttempt {
	request := result.Build.Request
	publish := result.Publish
	active, tombstone := countGatewayProjectionSubjectLifecycle(request.Subjects)
	status := "error"
	if publish.Success {
		status = "ok"
	}
	failureCategory := GatewayProjectionFailureCategory(publish.ErrorCode)
	sourceSummary := buildGatewayProjectionSourceConnectionSummary(sourceConnections)
	if failureCategory == "" {
		failureCategory = gatewayProjectionBuildFailureCategory(result.Build)
	}
	if failureCategory == "" {
		failureCategory = gatewayProjectionSourceConnectionFailureCategory(sourceSummary)
	}
	return &GatewayProjectionPublishAttempt{
		OrganizationId:        organizationID,
		Source:                source,
		Status:                status,
		TraceId:               request.TraceID,
		Caller:                request.Caller,
		ProjectionBatchId:     request.ProjectionBatchID,
		OrgVersion:            request.OrgVersion,
		SourceVersion:         request.Lineage.SourceVersion,
		GeneratedAt:           request.GeneratedAt,
		FreshnessExpiresAt:    request.Freshness.ExpiresAt,
		SubjectCount:          len(request.Subjects),
		ActiveSubjectCount:    active,
		TombstoneSubjectCount: tombstone,
		SkippedSubjectCount:   result.Build.Summary.SkippedSubjectCount,
		SkippedByReason:       cloneGatewayProjectionSkipSummary(result.Build.Summary.SkippedByReason),
		ErrorCode:             publish.ErrorCode,
		FailureCategory:       failureCategory,
		Attempts:              publish.Attempts,
		StatusCode:            publish.StatusCode,
		Accepted:              publish.Accepted,
		Idempotent:            publish.Idempotent,
		Retryable:             publish.Retryable,
		DurationMs:            durationMs,
		AuditHash:             auditHash,
		CreatedAt:             startedAt.UTC(),
	}
}

func buildGatewayProjectionPublishAttemptFromManualResult(organizationID string, result GatewayProjectionManualPublishResult, startedAt time.Time, auditHash string) *GatewayProjectionPublishAttempt {
	return &GatewayProjectionPublishAttempt{
		OrganizationId:        organizationID,
		Source:                GatewayProjectionPublishAttemptSourceManual,
		Status:                result.Status,
		TraceId:               result.TraceID,
		ProjectionBatchId:     result.ProjectionBatchID,
		OrgVersion:            result.OrgVersion,
		SourceVersion:         result.SourceVersion,
		GeneratedAt:           parseGatewayProjectionAttemptTime(result.GeneratedAt),
		FreshnessExpiresAt:    parseGatewayProjectionAttemptTime(result.FreshnessExpiresAt),
		SubjectCount:          result.SubjectCount,
		ActiveSubjectCount:    result.ActiveSubjectCount,
		TombstoneSubjectCount: result.TombstoneSubjectCount,
		SkippedSubjectCount:   result.SkippedSubjectCount,
		SkippedByReason:       cloneGatewayProjectionSkipSummary(result.SkippedByReason),
		ErrorCode:             result.ErrorCode,
		FailureCategory:       result.FailureCategory,
		Accepted:              result.Accepted,
		Idempotent:            result.Idempotent,
		Retryable:             result.Retryable,
		DurationMs:            result.DurationMs,
		AuditHash:             auditHash,
		CreatedAt:             startedAt.UTC(),
		Metadata: map[string]string{
			"publisherConfigured":  strings.ToLower(strings.TrimSpace(boolString(result.Publisher.Configured))),
			"readinessTotal":       strings.TrimSpace(intString(result.Readiness.TotalSubjectCount)),
			"readinessPublishable": strings.TrimSpace(intString(result.Readiness.PublishableSubjectCount)),
		},
	}
}

func recordGatewayProjectionPublishAttemptSafely(service GatewayProjectionPublishAttemptHistoryService, attempt *GatewayProjectionPublishAttempt) string {
	if attempt == nil {
		return ""
	}
	if err := service.Record(attempt); err != nil {
		logs.Warning("gateway_projection_publish_attempt_record_failed source=%s status=%s failureCategory=%s error=%s",
			attempt.Source, attempt.Status, attempt.FailureCategory, err.Error())
		return ""
	}
	normalized := normalizeGatewayProjectionPublishAttempt(attempt, service.now())
	return normalized.AttemptId
}

func parseGatewayProjectionAttemptTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(value))
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func boolString(value bool) string {
	if value {
		return "true"
	}
	return "false"
}

func intString(value int) string {
	return strconv.Itoa(value)
}
