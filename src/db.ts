import DB from "better-sqlite3";

const db = new DB('collab.sqlite', {});
db.exec('CREATE TABLE IF NOT EXISTS users (username TEXT NOT NULL UNIQUE PRIMARY KEY, hashed_password TEXT NOT NULL, uuid TEXT NOT NULL, created_at TEXT NOT NULL, last_active TEXT NOT NULL, auth_token TEXT)');
db.exec('CREATE TABLE IF NOT EXISTS projects (uuid TEXT NOT NULL UNIQUE PRIMARY KEY, name TEXT NOT NULL, owner_uuid TEXT NOT NULL, inp_file TEXT NOT NULL, created_at TEXT NOT NULL, modified_at TEXT NOT NULL, longitude REAL NOT NULL, latitude REAL NOT NULL, zoom REAL NOT NULL, utm_zone TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS project_user (project_uuid TEXT NOT NULL, user_uuid TEXT NOT NULL, role TEXT NOT NULL, PRIMARY KEY(project_uuid, user_uuid))');

export function getDb(): DB.Database {
    return db;
}
