// Copyright 2021 The Casdoor Authors. All Rights Reserved.
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
	"database/sql"
	"flag"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"git.leagsoft.com/aicodex/aicodex-admin/conf"
	"git.leagsoft.com/aicodex/aicodex-admin/util"
	"github.com/beego/beego/v2/server/web"
	xormadapter "github.com/casdoor/xorm-adapter/v3"
	_ "github.com/go-sql-driver/mysql"  // db = mysql
	_ "github.com/lib/pq"               // db = postgres
	_ "github.com/microsoft/go-mssqldb" // db = mssql
	"github.com/xorm-io/xorm"
	"github.com/xorm-io/xorm/core"
	"github.com/xorm-io/xorm/names"
	_ "modernc.org/sqlite" // db = sqlite
)

const (
	defaultConfigPath     = "conf/app.conf"
	defaultExportFilePath = "init_data_dump.json"
)

var (
	ormer          *Ormer = nil
	createDatabase        = true
	configPath            = defaultConfigPath
	exportData            = false
	exportFilePath        = defaultExportFilePath
)

func InitFlag() {
	createDatabasePtr := flag.Bool("createDatabase", false, "true if you need to create database")
	configPathPtr := flag.String("config", defaultConfigPath, "set it to \"/your/path/app.conf\" if your config file is not in the default search paths (for example /conf/app.conf or deploy/app.conf)")
	exportDataPtr := flag.Bool("export", false, "export database to JSON file and exit (use -exportPath to specify custom location)")
	exportFilePathPtr := flag.String("exportPath", defaultExportFilePath, "path to the exported data file (used with -export)")
	flag.Parse()

	createDatabase = *createDatabasePtr
	configPath = resolveConfigPath(*configPathPtr)
	exportData = *exportDataPtr
	exportFilePath = *exportFilePathPtr

	// Load beego config from the specified config path
	err := web.LoadAppConfig("ini", configPath)
	if err != nil {
		panic(fmt.Sprintf("failed to load config from %s: %v", configPath, err))
	}
}

func ShouldExportData() bool {
	return exportData
}

func GetExportFilePath() string {
	return exportFilePath
}

func InitConfig() {
	err := web.LoadAppConfig("ini", "../../deploy/app.conf")
	if err != nil {
		panic(err)
	}

	web.BConfig.WebConfig.Session.SessionOn = true

	InitAdapter()
	CreateTables()
}

func InitAdapter() {
	if conf.GetConfigString("driverName") == "" {
		if !util.FileExist(configPath) {
			dir, err := os.Getwd()
			if err != nil {
				panic(err)
			}
			dir = strings.ReplaceAll(dir, "\\", "/")
			panic(fmt.Sprintf("The Casdoor config file: %q was not found, current working directory: %q", configPath, dir))
		}
	}

	if createDatabase {
		err := createDatabaseForPostgres(conf.GetConfigString("driverName"), conf.GetConfigDataSourceName(), conf.GetConfigString("dbName"))
		if err != nil {
			panic(err)
		}
	}

	var err error
	ormer, err = NewAdapter(conf.GetConfigString("driverName"), conf.GetConfigDataSourceName(), conf.GetConfigString("dbName"))
	if err != nil {
		panic(err)
	}

	tableNamePrefix := conf.GetConfigString("tableNamePrefix")
	tbMapper := names.NewPrefixMapper(names.SnakeMapper{}, tableNamePrefix)
	ormer.Engine.SetTableMapper(tbMapper)
}

func resolveConfigPath(path string) string {
	if filepath.IsAbs(path) || util.FileExist(path) {
		return path
	}

	candidates := []string{
		"../deploy/app.conf",
		"deploy/app.conf",
		"../../deploy/app.conf",
	}
	for _, candidate := range candidates {
		if util.FileExist(candidate) {
			return candidate
		}
	}

	return path
}

func CreateTables() {
	if createDatabase {
		err := ormer.CreateDatabase()
		if err != nil {
			panic(err)
		}
	}

	ormer.createTable()
}

// Ormer represents the MySQL adapter for policy storage.
type Ormer struct {
	driverName     string
	dataSourceName string
	dbName         string
	Db             *sql.DB
	Engine         *xorm.Engine
}

// finalizer is the destructor for Ormer.
func finalizer(a *Ormer) {
	err := a.Engine.Close()
	if err != nil {
		panic(err)
	}

	if a.Db != nil {
		err = a.Db.Close()
		if err != nil {
			panic(err)
		}
	}
}

// NewAdapter is the constructor for Ormer.
func NewAdapter(driverName string, dataSourceName string, dbName string) (*Ormer, error) {
	a := &Ormer{}
	a.driverName = driverName
	if driverName == "postgres" {
		dataSourceName = ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName)
	}
	a.dataSourceName = dataSourceName
	a.dbName = dbName

	// Open the DB, create it if not existed.
	err := a.open()
	if err != nil {
		return nil, err
	}

	// Call the destructor when the object is released.
	runtime.SetFinalizer(a, finalizer)

	return a, nil
}

// NewAdapterFromDb is the constructor for Ormer.
func NewAdapterFromDb(driverName string, dataSourceName string, dbName string, db *sql.DB) (*Ormer, error) {
	a := &Ormer{}
	a.driverName = driverName
	if driverName == "postgres" {
		dataSourceName = ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName)
	}
	a.dataSourceName = dataSourceName
	a.dbName = dbName
	a.Db = db

	// Open the DB, create it if not existed.
	err := a.openFromDb(a.Db)
	if err != nil {
		return nil, err
	}

	// Call the destructor when the object is released.
	runtime.SetFinalizer(a, finalizer)

	return a, nil
}

func refineDataSourceNameForPostgres(dataSourceName string) string {
	reg := regexp.MustCompile(`dbname=[^ ]+`)
	return reg.ReplaceAllString(dataSourceName, "dbname=postgres")
}

func ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName string) string {
	trimmedDataSourceName := strings.TrimSpace(dataSourceName)
	if trimmedDataSourceName == "" || getPostgresDataSourceNameTimeZone(trimmedDataSourceName) != "" {
		return dataSourceName
	}

	if postgresURL, ok := parsePostgresDataSourceNameURL(trimmedDataSourceName); ok {
		query := postgresURL.Query()
		query.Set("timezone", "UTC")
		postgresURL.RawQuery = query.Encode()
		return postgresURL.String()
	}

	// lib/pq 使用 timezone 启动参数设置 PostgreSQL session 时区；默认 UTC 可避免 timestamptz 被 Xorm 按本地时区二次解释。
	return trimmedDataSourceName + " timezone=UTC"
}

func getPostgresDataSourceNameTimeZone(dataSourceName string) string {
	if postgresURL, ok := parsePostgresDataSourceNameURL(dataSourceName); ok {
		for key, values := range postgresURL.Query() {
			if strings.EqualFold(key, "timezone") && len(values) > 0 {
				return strings.Trim(values[0], `'"`)
			}
		}
	}

	for _, field := range strings.Fields(dataSourceName) {
		key, value, ok := strings.Cut(field, "=")
		if !ok || !strings.EqualFold(key, "timezone") {
			continue
		}
		return strings.Trim(value, `'"`)
	}

	return ""
}

func parsePostgresDataSourceNameURL(dataSourceName string) (*url.URL, bool) {
	postgresURL, err := url.Parse(dataSourceName)
	if err != nil {
		return nil, false
	}

	switch postgresURL.Scheme {
	case "postgres", "postgresql":
		return postgresURL, true
	default:
		return nil, false
	}
}

func configurePostgresEngineTimeZone(engine *xorm.Engine, dataSourceName string) error {
	timeZoneName := getPostgresDataSourceNameTimeZone(dataSourceName)
	if timeZoneName == "" {
		timeZoneName = "UTC"
	}

	databaseTimeZone, err := time.LoadLocation(timeZoneName)
	if err != nil {
		return fmt.Errorf("invalid postgres timezone %q: %w", timeZoneName, err)
	}

	engine.SetTZDatabase(databaseTimeZone)
	engine.SetTZLocation(time.UTC)
	return nil
}

func createDatabaseForPostgres(driverName string, dataSourceName string, dbName string) error {
	if driverName == "postgres" {
		dataSourceName = ensurePostgresDataSourceNameUsesUTCTimeZone(dataSourceName)

		db, err := sql.Open(driverName, refineDataSourceNameForPostgres(dataSourceName))
		if err != nil {
			return err
		}
		defer db.Close()

		_, err = db.Exec(fmt.Sprintf("CREATE DATABASE \"%s\";", dbName))
		if err != nil {
			if !strings.Contains(err.Error(), "already exists") {
				return err
			}
		}
		schema := util.GetValueFromDataSourceName("search_path", dataSourceName)
		if schema != "" {
			db, err = sql.Open(driverName, dataSourceName)
			if err != nil {
				return err
			}
			defer db.Close()

			_, err = db.Exec(fmt.Sprintf("CREATE SCHEMA %s;", schema))
			if err != nil {
				if !strings.Contains(err.Error(), "already exists") {
					return err
				}
			}
		}

		return nil
	} else {
		return nil
	}
}

func (a *Ormer) CreateDatabase() error {
	if a.driverName == "postgres" {
		return nil
	}

	engine, err := xorm.NewEngine(a.driverName, a.dataSourceName)
	if err != nil {
		return err
	}
	defer engine.Close()

	_, err = engine.Exec(fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s default charset utf8mb4 COLLATE utf8mb4_general_ci", a.dbName))
	return err
}

func (a *Ormer) open() error {
	dataSourceName := a.dataSourceName + a.dbName
	if a.driverName != "mysql" {
		dataSourceName = a.dataSourceName
	}

	engine, err := xorm.NewEngine(a.driverName, dataSourceName)
	if err != nil {
		return err
	}

	if a.driverName == "postgres" {
		err = configurePostgresEngineTimeZone(engine, dataSourceName)
		if err != nil {
			return err
		}
		schema := util.GetValueFromDataSourceName("search_path", dataSourceName)
		if schema != "" {
			engine.SetSchema(schema)
		}
	}

	a.Engine = engine
	return nil
}

func (a *Ormer) openFromDb(db *sql.DB) error {
	dataSourceName := a.dataSourceName + a.dbName
	if a.driverName != "mysql" {
		dataSourceName = a.dataSourceName
	}

	xormDb := core.FromDB(db)

	engine, err := xorm.NewEngineWithDB(a.driverName, dataSourceName, xormDb)
	if err != nil {
		return err
	}

	if a.driverName == "postgres" {
		err = configurePostgresEngineTimeZone(engine, dataSourceName)
		if err != nil {
			return err
		}
		schema := util.GetValueFromDataSourceName("search_path", dataSourceName)
		if schema != "" {
			engine.SetSchema(schema)
		}
	}

	a.Engine = engine
	return nil
}

func (a *Ormer) close() {
	_ = a.Engine.Close()
	a.Engine = nil
}

func (a *Ormer) createTable() {
	showSql := conf.GetConfigBool("showSql")
	a.Engine.ShowSQL(showSql)

	err := a.Engine.Sync2(new(Organization))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Group))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(User))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Invitation))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Application))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Provider))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Resource))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Cert))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Key))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Role))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Permission))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Model))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Adapter))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Enforcer))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Session))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Token))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Product))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Payment))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Order))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Plan))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Pricing))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Subscription))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Transaction))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Syncer))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformOrganization))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformUser))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformDepartment))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformMembership))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(SourceConnection))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(ExternalIdentity))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(LifecycleEvent))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(OrgSyncBatch))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformApiOrganizationMapping))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(PlatformApiUserMapping))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomOrganizationSyncConfig))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomOrganizationSyncRun))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomProfileConsentIntent))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomDepartmentMapping))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomUserMapping))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomUserDepartment))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomDepartmentLeader))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WecomUserDirectLeader))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Record))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Webhook))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(WebhookEvent))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(VerificationRecord))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Ldap))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(RadiusAccounting))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(xormadapter.CasbinRule))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Form))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Ticket))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Agent))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Server))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Entry))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Site))
	if err != nil {
		panic(err)
	}

	err = a.Engine.Sync2(new(Rule))
	if err != nil {
		panic(err)
	}
}
