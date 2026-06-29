// Copyright 2026 The AICodex Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");

package controllers

import (
	"errors"
	"strings"

	"git.leagsoft.com/aicodex/aicodex-admin/object"
)

type organizationDirectorySourceStatusResponse struct {
	*object.OrganizationDirectorySourceStatus
}

func newOrganizationDirectorySourceStatusResponse(status *object.OrganizationDirectorySourceStatus) *organizationDirectorySourceStatusResponse {
	if status == nil {
		status = &object.OrganizationDirectorySourceStatus{State: object.OrganizationDirectorySourceStateAvailable}
	}
	return &organizationDirectorySourceStatusResponse{OrganizationDirectorySourceStatus: status}
}

// GetOrganizationDirectorySourceStatus
// @Title GetOrganizationDirectorySourceStatus
// @Tag Organization Directory Source Status API
// @Description get unified organization directory source status
// @Param   organization     query    string  false       "The target organization"
// @Param   source           query    string  true        "Current directory source"
// @Success 200 {object} controllers.Response The Response object
// @router /organization-directory-source-status [get]
func (c *ApiController) GetOrganizationDirectorySourceStatus() {
	source := object.OrganizationDirectorySource(strings.TrimSpace(c.Ctx.Input.Query("source")))
	if source == "" {
		c.ResponseError("organization directory source is required")
		return
	}
	organization := strings.TrimSpace(c.Ctx.Input.Query("organization"))
	if organization != "" && !c.requireOrganizationDirectorySourceStatusAdmin(organization) {
		return
	}
	if organization == "" && !c.requireOrganizationDirectorySourceStatusGlobalAdmin() {
		return
	}

	service := &object.OrganizationDirectorySourceStatusService{}
	var (
		status *object.OrganizationDirectorySourceStatus
		err    error
	)
	if organization == "" {
		status, err = service.GetCandidateStatus(source)
	} else {
		status, err = service.GetStatus(organization, source)
	}
	if err != nil {
		c.ResponseError(err.Error())
		return
	}
	c.ResponseOk(newOrganizationDirectorySourceStatusResponse(status))
}

func (c *ApiController) requireOrganizationDirectorySourceStatusAdmin(organization string) bool {
	isGlobalAdmin, user := c.isGlobalAdmin()
	if isGlobalAdmin || (user != nil && user.IsAdmin && user.Owner == organization) {
		return true
	}
	c.ResponseError(c.T("auth:Unauthorized operation"))
	return false
}

func (c *ApiController) requireOrganizationDirectorySourceStatusGlobalAdmin() bool {
	isGlobalAdmin, _ := c.isGlobalAdmin()
	if isGlobalAdmin {
		return true
	}
	c.ResponseError(errors.New("organization directory source status organization is required").Error())
	return false
}
