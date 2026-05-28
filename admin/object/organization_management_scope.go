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
	"errors"
	"sort"
	"strings"
)

type OrganizationManagementScopeType string

const (
	OrganizationManagementScopeTypeAdmin             OrganizationManagementScopeType = "admin"
	OrganizationManagementScopeTypeDepartmentManager OrganizationManagementScopeType = "department-manager"
	OrganizationManagementScopeTypeDirectLeader      OrganizationManagementScopeType = "direct-leader"
	OrganizationManagementScopeTypeSelf              OrganizationManagementScopeType = "self"
)

// OrganizationManagementScopeData 是计算当前用户范围所需的最小同步数据快照。
// 服务层只读取企业微信显式关系，避免从部门展示层级推断上下级。
type OrganizationManagementScopeData struct {
	Departments       []WecomDepartmentMapping
	Users             []WecomUserMapping
	UserDepartments   []WecomUserDepartment
	DepartmentLeaders []WecomDepartmentLeader
	DirectLeaders     []WecomUserDirectLeader
}

type OrganizationManagementScopeDepartment struct {
	GroupId            string `json:"groupId"`
	GroupOwner         string `json:"groupOwner"`
	GroupName          string `json:"groupName"`
	DepartmentId       string `json:"departmentId"`
	ParentDepartmentId string `json:"parentDepartmentId"`
	ParentGroupOwner   string `json:"parentGroupOwner"`
	ParentGroupName    string `json:"parentGroupName"`
	DisplayName        string `json:"displayName"`
}

type OrganizationManagementScopeUser struct {
	UserId           string `json:"userId"`
	UserOwner        string `json:"userOwner"`
	UserName         string `json:"userName"`
	WecomUserId      string `json:"wecomUserId"`
	ExternalId       string `json:"externalId"`
	MainDepartmentId string `json:"mainDepartmentId"`
	Status           int    `json:"status"`
}

type OrganizationManagementScope struct {
	Organization  string                                  `json:"organization"`
	ScopeType     OrganizationManagementScopeType         `json:"scopeType"`
	Departments   []OrganizationManagementScopeDepartment `json:"departments"`
	Users         []OrganizationManagementScopeUser       `json:"users"`
	FilterUserIds []string                                `json:"filterUserIds"`
}

type OrganizationManagementScopeStore interface {
	GetOrganizationManagementScopeData(organization string) (*OrganizationManagementScopeData, error)
}

type OrganizationManagementScopeService struct {
	Store OrganizationManagementScopeStore
}

type defaultOrganizationManagementScopeStore struct{}

func (s *OrganizationManagementScopeService) GetCurrentScope(user *User, organization string, isAdmin bool) (*OrganizationManagementScope, error) {
	organization = strings.TrimSpace(organization)
	if organization == "" && user != nil {
		organization = user.Owner
	}
	if organization == "" {
		return nil, errors.New("organization management scope organization is required")
	}

	data, err := s.scopeStore().GetOrganizationManagementScopeData(organization)
	if err != nil {
		return nil, err
	}
	if data == nil {
		data = &OrganizationManagementScopeData{}
	}

	calculator := newOrganizationManagementScopeCalculator(organization, data)
	if isAdmin {
		return calculator.adminScope(), nil
	}
	return calculator.currentUserScope(user), nil
}

func (s *OrganizationManagementScopeService) scopeStore() OrganizationManagementScopeStore {
	if s != nil && s.Store != nil {
		return s.Store
	}
	return defaultOrganizationManagementScopeStore{}
}

func (s defaultOrganizationManagementScopeStore) GetOrganizationManagementScopeData(organization string) (*OrganizationManagementScopeData, error) {
	data := &OrganizationManagementScopeData{}

	if err := ormer.Engine.Where("organization = ?", organization).And("is_enabled = ?", true).Find(&data.Departments); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("is_enabled = ?", true).Find(&data.Users); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("is_enabled = ?", true).Find(&data.UserDepartments); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("is_enabled = ?", true).Find(&data.DepartmentLeaders); err != nil {
		return nil, err
	}
	if err := ormer.Engine.Where("organization = ?", organization).And("is_enabled = ?", true).Find(&data.DirectLeaders); err != nil {
		return nil, err
	}
	return data, nil
}

type organizationManagementScopeCalculator struct {
	organization string

	departmentsById map[string]WecomDepartmentMapping
	departmentIds   []string
	childDeptIds    map[string][]string

	usersByWecomId map[string]WecomUserMapping
	wecomUserIds   []string

	userDepartments   []WecomUserDepartment
	departmentLeaders []WecomDepartmentLeader
	directLeaders     []WecomUserDirectLeader
}

func newOrganizationManagementScopeCalculator(organization string, data *OrganizationManagementScopeData) *organizationManagementScopeCalculator {
	calculator := &organizationManagementScopeCalculator{
		organization:      organization,
		departmentsById:   map[string]WecomDepartmentMapping{},
		childDeptIds:      map[string][]string{},
		usersByWecomId:    map[string]WecomUserMapping{},
		userDepartments:   data.UserDepartments,
		departmentLeaders: data.DepartmentLeaders,
		directLeaders:     data.DirectLeaders,
	}

	for _, department := range data.Departments {
		if !department.IsEnabled || department.DepartmentId == "" {
			continue
		}
		calculator.departmentsById[department.DepartmentId] = department
		calculator.departmentIds = append(calculator.departmentIds, department.DepartmentId)
		if department.ParentDepartmentId != "" {
			calculator.childDeptIds[department.ParentDepartmentId] = append(calculator.childDeptIds[department.ParentDepartmentId], department.DepartmentId)
		}
	}
	sort.Strings(calculator.departmentIds)
	for parentId := range calculator.childDeptIds {
		sort.Strings(calculator.childDeptIds[parentId])
	}

	for _, user := range data.Users {
		if !user.IsEnabled || user.WecomUserId == "" {
			continue
		}
		calculator.usersByWecomId[user.WecomUserId] = user
		calculator.wecomUserIds = append(calculator.wecomUserIds, user.WecomUserId)
	}
	sort.Strings(calculator.wecomUserIds)

	return calculator
}

func (c *organizationManagementScopeCalculator) adminScope() *OrganizationManagementScope {
	departmentSet := map[string]bool{}
	userSet := map[string]bool{}
	for _, departmentId := range c.departmentIds {
		departmentSet[departmentId] = true
	}
	for _, wecomUserId := range c.wecomUserIds {
		userSet[wecomUserId] = true
	}
	return c.buildScope(OrganizationManagementScopeTypeAdmin, departmentSet, userSet)
}

func (c *organizationManagementScopeCalculator) currentUserScope(user *User) *OrganizationManagementScope {
	currentWecomIds := c.resolveCurrentWecomUserIds(user)
	departmentSet := map[string]bool{}
	userSet := map[string]bool{}

	if len(currentWecomIds) == 0 {
		return c.buildScope(OrganizationManagementScopeTypeSelf, departmentSet, userSet)
	}

	// 部门管理范围只来自企业微信明确的部门负责人关系，不从通讯录展示层级或同级位置推断。
	hasDepartmentManagerScope := false
	for _, leader := range c.departmentLeaders {
		if !leader.IsEnabled || !currentWecomIds[leader.LeaderWecomUserId] {
			continue
		}
		if _, ok := c.departmentsById[leader.DepartmentId]; !ok {
			continue
		}
		hasDepartmentManagerScope = true
		c.addDepartmentSubtree(departmentSet, leader.DepartmentId)
	}
	c.addUsersInDepartments(userSet, departmentSet)

	// 直属上级范围只来自 direct_leader 关系，并向下递归展开，覆盖多级下属。
	hasDirectLeaderScope := c.addRecursiveSubordinates(userSet, currentWecomIds)
	if !hasDepartmentManagerScope && !hasDirectLeaderScope {
		c.addSelfUser(userSet, currentWecomIds)
		return c.buildScope(OrganizationManagementScopeTypeSelf, departmentSet, userSet)
	}

	scopeTypes := make([]OrganizationManagementScopeType, 0, 2)
	if hasDepartmentManagerScope {
		scopeTypes = append(scopeTypes, OrganizationManagementScopeTypeDepartmentManager)
	}
	if hasDirectLeaderScope {
		scopeTypes = append(scopeTypes, OrganizationManagementScopeTypeDirectLeader)
	}
	return c.buildScope(joinOrganizationManagementScopeTypes(scopeTypes), departmentSet, userSet)
}

func (c *organizationManagementScopeCalculator) resolveCurrentWecomUserIds(user *User) map[string]bool {
	ids := map[string]bool{}
	if user == nil {
		return ids
	}
	addScopeId(ids, user.Wecom)
	if user.Properties != nil {
		addScopeId(ids, user.Properties[WecomUserPropertyUserId])
	}

	// 当前用户可能是同步创建、手工绑定或历史导入账号，这里按多种稳定标识合并匹配。
	for _, mapping := range c.usersByWecomId {
		if mapping.UserOwner == user.Owner && mapping.UserName == user.Name {
			addScopeId(ids, mapping.WecomUserId)
			continue
		}
		if user.ExternalId != "" && mapping.ExternalId == user.ExternalId {
			addScopeId(ids, mapping.WecomUserId)
		}
	}
	return ids
}

func (c *organizationManagementScopeCalculator) addDepartmentSubtree(departmentSet map[string]bool, rootDepartmentId string) {
	queue := []string{rootDepartmentId}
	for len(queue) > 0 {
		departmentId := queue[0]
		queue = queue[1:]
		if departmentSet[departmentId] {
			continue
		}
		if _, ok := c.departmentsById[departmentId]; !ok {
			continue
		}
		departmentSet[departmentId] = true
		queue = append(queue, c.childDeptIds[departmentId]...)
	}
}

func (c *organizationManagementScopeCalculator) addUsersInDepartments(userSet map[string]bool, departmentSet map[string]bool) {
	if len(departmentSet) == 0 {
		return
	}
	for _, membership := range c.userDepartments {
		if !membership.IsEnabled || !departmentSet[membership.DepartmentId] {
			continue
		}
		if _, ok := c.usersByWecomId[membership.WecomUserId]; !ok {
			continue
		}
		userSet[membership.WecomUserId] = true
	}
}

func (c *organizationManagementScopeCalculator) addRecursiveSubordinates(userSet map[string]bool, currentWecomIds map[string]bool) bool {
	subordinateIdsByLeader := map[string][]string{}
	for _, relation := range c.directLeaders {
		if !relation.IsEnabled || relation.WecomUserId == "" || relation.LeaderWecomUserId == "" {
			continue
		}
		if _, ok := c.usersByWecomId[relation.WecomUserId]; !ok {
			continue
		}
		subordinateIdsByLeader[relation.LeaderWecomUserId] = append(subordinateIdsByLeader[relation.LeaderWecomUserId], relation.WecomUserId)
	}
	for leaderId := range subordinateIdsByLeader {
		sort.Strings(subordinateIdsByLeader[leaderId])
	}

	// 将当前用户预先标记为已访问，避免企业微信异常环路把本人重新纳入下属范围。
	visited := map[string]bool{}
	queue := make([]string, 0, len(currentWecomIds))
	for currentWecomId := range currentWecomIds {
		visited[currentWecomId] = true
		queue = append(queue, currentWecomId)
	}
	sort.Strings(queue)

	hasScope := false
	for len(queue) > 0 {
		leaderId := queue[0]
		queue = queue[1:]
		for _, subordinateId := range subordinateIdsByLeader[leaderId] {
			if visited[subordinateId] {
				continue
			}
			visited[subordinateId] = true
			userSet[subordinateId] = true
			hasScope = true
			queue = append(queue, subordinateId)
		}
	}
	return hasScope
}

func (c *organizationManagementScopeCalculator) addSelfUser(userSet map[string]bool, currentWecomIds map[string]bool) {
	for currentWecomId := range currentWecomIds {
		if _, ok := c.usersByWecomId[currentWecomId]; ok {
			userSet[currentWecomId] = true
		}
	}
}

func (c *organizationManagementScopeCalculator) buildScope(scopeType OrganizationManagementScopeType, departmentSet map[string]bool, userSet map[string]bool) *OrganizationManagementScope {
	scope := &OrganizationManagementScope{
		Organization: c.organization,
		ScopeType:    scopeType,
		Departments:  c.renderDepartments(departmentSet),
		Users:        c.renderUsers(userSet),
	}
	scope.FilterUserIds = buildOrganizationManagementScopeFilterUserIds(scope.Users)
	return scope
}

func (c *organizationManagementScopeCalculator) renderDepartments(departmentSet map[string]bool) []OrganizationManagementScopeDepartment {
	departmentIds := sortedScopeIds(departmentSet)
	departments := make([]OrganizationManagementScopeDepartment, 0, len(departmentIds))
	for _, departmentId := range departmentIds {
		department, ok := c.departmentsById[departmentId]
		if !ok {
			continue
		}
		departments = append(departments, OrganizationManagementScopeDepartment{
			GroupId:            getWecomLocalId(department.GroupOwner, department.GroupName),
			GroupOwner:         department.GroupOwner,
			GroupName:          department.GroupName,
			DepartmentId:       department.DepartmentId,
			ParentDepartmentId: department.ParentDepartmentId,
			ParentGroupOwner:   department.ParentGroupOwner,
			ParentGroupName:    department.ParentGroupName,
			DisplayName:        department.DisplayName,
		})
	}
	return departments
}

func (c *organizationManagementScopeCalculator) renderUsers(userSet map[string]bool) []OrganizationManagementScopeUser {
	wecomUserIds := sortedScopeIds(userSet)
	users := make([]OrganizationManagementScopeUser, 0, len(wecomUserIds))
	for _, wecomUserId := range wecomUserIds {
		user, ok := c.usersByWecomId[wecomUserId]
		if !ok {
			continue
		}
		users = append(users, OrganizationManagementScopeUser{
			UserId:           getWecomLocalId(user.UserOwner, user.UserName),
			UserOwner:        user.UserOwner,
			UserName:         user.UserName,
			WecomUserId:      user.WecomUserId,
			ExternalId:       user.ExternalId,
			MainDepartmentId: user.MainDepartmentId,
			Status:           user.Status,
		})
	}
	return users
}

func buildOrganizationManagementScopeFilterUserIds(users []OrganizationManagementScopeUser) []string {
	filterIdSet := map[string]bool{}
	for _, user := range users {
		addScopeId(filterIdSet, user.UserId)
		addScopeId(filterIdSet, user.WecomUserId)
		addScopeId(filterIdSet, user.ExternalId)
	}
	return sortedScopeIds(filterIdSet)
}

func joinOrganizationManagementScopeTypes(scopeTypes []OrganizationManagementScopeType) OrganizationManagementScopeType {
	if len(scopeTypes) == 0 {
		return OrganizationManagementScopeTypeSelf
	}
	if len(scopeTypes) == 1 {
		return scopeTypes[0]
	}
	values := make([]string, 0, len(scopeTypes))
	for _, scopeType := range scopeTypes {
		values = append(values, string(scopeType))
	}
	sort.Strings(values)
	return OrganizationManagementScopeType(strings.Join(values, ","))
}

func sortedScopeIds(idSet map[string]bool) []string {
	ids := make([]string, 0, len(idSet))
	for id := range idSet {
		if id != "" {
			ids = append(ids, id)
		}
	}
	sort.Strings(ids)
	return ids
}

func addScopeId(idSet map[string]bool, id string) {
	id = strings.TrimSpace(id)
	if id != "" {
		idSet[id] = true
	}
}
