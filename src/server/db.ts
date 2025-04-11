import DB from "better-sqlite3";

import type { ColumnType, Insertable, Selectable, Updateable } from "kysely";
import { Kysely, SqliteDialect } from "kysely";
import type { DbProjectRoleSchema } from "./db_project";

export interface Database {
	projects: ProjectsTable;
	users: UsersTable;
	project_user: ProjectUserTable;
	project_snapshots: ProjectSnapshotsTable;
	project_edits: ProjectEditsTable;
}

export interface ProjectsTable {
	uuid: string;
	longitude: number;
	latitude: number;
	zoom: number;
	utm_zone: string;
	created_at: ColumnType<Date, string, never>;
	modified_at: ColumnType<Date, string, string>;
	name: string;
	owner_uuid: string;
	edit_count: number;
	current_edit_id: number;
	current_snapshot_id: number;
}

export type DbProject = Selectable<ProjectsTable>;
export type NewDbProject = Insertable<ProjectsTable>;
export type UpdateDbProject = Updateable<ProjectsTable>;

export interface UsersTable {
	username: string;
	hashed_password: string;
	uuid: string;
	created_at: ColumnType<Date, string, never>;
	last_active: ColumnType<Date, string, string>;
	auth_token: string | null;
}

export type DbUser = Selectable<UsersTable>;
export type NewDbUser = Insertable<ProjectsTable>;
export type UpdateDbUser = Updateable<ProjectsTable>;

export interface ProjectUserTable {
	project_uuid: string;
	user_uuid: string;
	role: DbProjectRoleSchema;
}

export type ProjectUser = Selectable<ProjectUserTable>;
export type NewProjectUser = Insertable<ProjectUserTable>;
export type UpdateProjectUser = Updateable<ProjectUserTable>;

export interface ProjectSnapshotsTable {
	project_uuid: string;
	edit_id: number;
	snapshot_inp: string;
}

export type ProjectSnapshotsTableEntry = Selectable<ProjectSnapshotsTable>;
export type NewProjectSnapshotsTableEntry = Insertable<ProjectSnapshotsTable>;
export type UpdateProjectSnapshotsTableEntry =
	Updateable<ProjectSnapshotsTable>;

export interface ProjectEditsTable {
	project_uuid: string;
	edit_id: number;
	snapshot_id: number;
	created_at: ColumnType<Date, string, never>;
	user_uuid: string;
	edit_data: string;
	has_snapshot_file: boolean;
}

export type DbProjectEdit = Selectable<ProjectEditsTable>;
export type NewProjectEdit = Insertable<ProjectEditsTable>;
export type UpdateProjectEdit = Updateable<ProjectEditsTable>;

// Make sure all the tables are actually created as specified, with some
// additional constraints
const sqlite = new DB("collab.sqlite", {});
sqlite.pragma("journal_mode = WAL");
sqlite.exec(`CREATE TABLE IF NOT EXISTS users (
  username TEXT NOT NULL UNIQUE PRIMARY KEY,
  hashed_password TEXT NOT NULL,
  uuid TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_active TEXT NOT NULL,
  auth_token TEXT
  )`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS projects (
  uuid TEXT NOT NULL UNIQUE PRIMARY KEY,
  name TEXT NOT NULL,
  owner_uuid TEXT NOT NULL,
  created_at TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  longitude REAL NOT NULL,
  latitude REAL NOT NULL,
  zoom REAL NOT NULL,
  utm_zone TEXT NOT NULL,
  edit_count INTEGER NOT NULL,
  current_edit_id INTEGER NOT NULL,
  current_snapshot_id INTEGER NOT NULL
  )`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS project_user (
  project_uuid TEXT NOT NULL,
  user_uuid TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY(project_uuid, user_uuid)
  )`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS project_edits (
  project_uuid TEXT NOT NULL,
  edit_id INTEGER NOT NULL,
  snapshot_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  user_uuid TEXT NOT NULL,
  edit_data TEXT NOT NULL,
  has_snapshot_file BOOLEAN NOT NULL,
  PRIMARY KEY(project_uuid, edit_id)
  )`);
sqlite.exec(`CREATE TABLE IF NOT EXISTS project_snapshots (
  project_uuid TEXT NOT NULL,
  edit_id INTEGER NOT NULL,
  snapshot_inp TEXT NOT NULL
  )`);

export function getDb(): DB.Database {
	return sqlite;
}

const dialect = new SqliteDialect({
	database: sqlite,
});

export const db = new Kysely<Database>({
	dialect,
	log: (event) => {
		console.log(event);
	},
});
