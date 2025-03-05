import { z } from "zod";
import { getDb } from "./db.js";
import { randomUUID } from "crypto";
import type { DbUserSchema } from "./auth.js";
import { FlowUnits, HeadLossType, Project, Workspace } from "epanet-js";
import { getUtmZone } from "../coords.js";
import type { EpanetEdit } from "../packets/clientbound.js";

export const DbProjectSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner_uuid: z.string(),
    created_at: z.coerce.date(),
    modified_at: z.coerce.date(),
    longitude: z.coerce.number(),
    latitude: z.coerce.number(),
    zoom: z.coerce.number(),
    edit_count: z.coerce.number().int().finite(),
    current_edit_id: z.coerce.number().int().finite(),
    current_snapshot_id: z.coerce.number().int().finite(),
    // Formatted like `utm${ZONE_NUMBER}${ZONE_HEMI}`, resulting in 'utm15n'.
    // Case sensitive as used in coords.ts
    utm_zone: z.string(),
});
export type DbProjectSchema = z.infer<typeof DbProjectSchema>;

export class DbProject {
    createdAt: Date
    modifiedAt: Date

    currentEditId: number
    currentSnapshotId: number
    editCount: number

    longitude: number
    latitude: number
    zoom: number

    name: string
    ownerUuid: string
    utmZone: string
    uuid: string

    constructor(uuid: string) {
        const db = getDb();
        const project_result = db.prepare('SELECT * FROM projects WHERE uuid = ?').get(uuid);
        const project = DbProjectSchema.parse(project_result);
        // basically everything except uuid
        const {
            created_at,
            current_edit_id,
            current_snapshot_id,
            edit_count,
            latitude,
            longitude,
            modified_at,
            name,
            owner_uuid,
            utm_zone,
            zoom
        } = project;
        this.createdAt = created_at;
        this.modifiedAt = modified_at;

        this.currentEditId = current_edit_id;
        this.currentSnapshotId = current_snapshot_id;
        this.editCount = edit_count;

        this.longitude = longitude;
        this.latitude = latitude;
        this.zoom = zoom;

        this.name = name;
        this.ownerUuid = owner_uuid;
        this.utmZone = utm_zone;
        this.uuid = uuid;
    }

    addEdit(edit: EpanetEdit): boolean {
        const db = getDb();
        try {
            const editResult = db.prepare(`INSERT INTO project_edits (
        project_uuid,
        edit_id,
        snapshot_id,
        created_at,
        user_uuid,
        edit_data,
        has_snapshot_file
        ) VALUES (
        @project_uuid,
        @edit_id,
        @snapshot_id,
        @created_at,
        @user_uuid,
        @edit_data,
        @has_snapshot_file
        )`).run({
                project_uuid: this.uuid,
                edit_id: edit.edit_id,
                snapshot_id: edit.snapshot_id,
                created_at: edit.created_at.toISOString(),
                user_uuid: edit.user_uuid,
                edit_data: JSON.stringify(edit),
                has_snapshot_file: 0,
            });
            if (editResult.changes == 1) {
                const projectUpdateResult = db.prepare('UPDATE projects SET current_edit_id = @current_edit_id WHERE uuid = @uuid').run({
                    current_edit_id: edit.edit_id,
                    uuid: this.uuid,
                });
                if (projectUpdateResult.changes == 1) {
                    this.currentEditId = edit.edit_id;
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (e) {
            console.log('insertEdit error:', e);
            return false;
        }
    }

    incrementEditCount() {
        const db = getDb();
        try {
            const result = db.prepare(`UPDATE projects SET edit_count = @edit_count WHERE uuid = @uuid`).run({
                edit_count: this.editCount + 1,
                uuid: this.uuid,
            });
            if (result.changes == 1) {
                this.editCount += 1;
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log('incrementEditCount error:', e);
            return false;
        }
    }

    getSnapshotEditArrays(snapshot_id: number): { snapshot: DbProjectSnapshotSchema, edits: DbProjectEditSchema[] } | null {
        const db = getDb();
        // First, get the INP file
        try {
            const snapshotResult = db.prepare(`SELECT * FROM project_snapshots WHERE project_uuid = @project_uuid AND edit_id = @snapshot_id`).get({
                project_uuid: this.uuid,
                snapshot_id,
            });
            const snapshotSchema = DbProjectSnapshotSchema.parse(snapshotResult);
            // Next, get the subtree of all edits whose snapshot is the current one
            const editResult = db.prepare(`SELECT * FROM project_edits WHERE project_uuid = @project_uuid AND snapshot_id = @snapshot_id AND edit_id <> snapshot_id`).all({
                project_uuid: this.uuid,
                snapshot_id,
            });
            const editArray = z.array(DbProjectEditSchema).parse(editResult);
            return {
                snapshot: snapshotSchema,
                edits: editArray,
            }
        } catch (e) {
            console.log('getLatestEditTree error:', e);
            return null;
        }
    }

    getEditSnapshotId(edit_id: number): number | null {
        const db = getDb();
        try {
            const snapshotResult = db.prepare(`SELECT snapshot_id FROM project_edits WHERE project_uuid = @project_uuid AND edit_id = @edit_id `).get({
                project_uuid: this.uuid,
                edit_id,
            });
            const { snapshot_id } = z.object({ snapshot_id: z.coerce.number().int().finite() }).parse(snapshotResult);
            return snapshot_id;
        } catch (e) {
            return null;
        }
    }

    getUserRole(user: DbUserSchema): DbProjectRoleSchema | null {
        const db = getDb();
        try {
            const role_result = db.prepare('SELECT * FROM project_user WHERE project_uuid = @project_uuid AND user_uuid = @user_uuid').get({
                project_uuid: this.uuid,
                user_uuid: user.uuid,
            });
            const projectUser = DbProjectUserSchema.parse(role_result);
            return projectUser.role;
        } catch (err) {
            return null;
        }
    }

    addUser(user: DbUserSchema, role: DbProjectRoleSchema): boolean {
        const db = getDb();
        try {
            const insert_result = db.prepare('INSERT INTO project_user (project_uuid, user_uuid, role) VALUES (@project_uuid, @user_uuid, @role)').run({
                project_uuid: this.uuid,
                user_uuid: user.uuid,
                role,
            });
            if (insert_result.changes == 1) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            return false;
        }
    }

    setEditAndSnapshot(args: { edit_id: number, snapshot_id: number }): boolean {
        try {
            const db = getDb();
            const result = db.prepare('UPDATE projects SET current_edit_id = @edit_id, current_snapshot_id = @snapshot_id WHERE uuid = @uuid').run({
                edit_id: args.edit_id,
                snapshot_id: args.snapshot_id,
                uuid: this.uuid,
            });
            if (result.changes == 1) {
                this.currentEditId = args.edit_id;
                this.currentSnapshotId = args.snapshot_id;
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.log('setEditAndSnapshot error:', e);
            return false;
        }
    }

    static new(name: string, owner: DbUserSchema, longitude: number, latitude: number, zoom: number): DbProject | null {
        const db = getDb();
        const now = new Date();
        const now_str = now.toISOString();
        const uuid = randomUUID();
        let inp_file = '';
        {
            // Blank EPANET project
            const ws = new Workspace();
            const project = new Project(ws);
            project.init('report.txt', 'out.txt', FlowUnits.GPM, HeadLossType.HW);
            project.saveInpFile('empty.inp');
            inp_file = ws.readFile('empty.inp', 'utf8');
            project.close();
            try {
                const snapshotResult = db.prepare(`INSERT INTO project_snapshots (
            project_uuid,
            edit_id,
            snapshot_inp
            ) VALUES (
            @project_uuid,
            @edit_id,
            @snapshot_inp
            )`).run({
                    project_uuid: uuid,
                    edit_id: 0,
                    snapshot_inp: inp_file,
                });
                if (snapshotResult.changes != 1) {
                    return null;
                }
                const editResult = db.prepare(`INSERT INTO project_edits (
                project_uuid,
                edit_id,
                snapshot_id,
                created_at,
                user_uuid,
                edit_data,
                has_snapshot_file
                ) VALUES (
                @project_uuid,
                @edit_id,
                @snapshot_id,
                @created_at,
                @user_uuid,
                @edit_data,
                @has_snapshot_file
                 )`).run({
                    project_uuid: uuid,
                    edit_id: 0,
                    snapshot_id: 0,
                    created_at: new Date().toISOString(),
                    user_uuid: owner.uuid,
                    edit_data: '',
                    has_snapshot_file: 0,
                });
                if (editResult.changes != 1) {
                    return null;
                }
            } catch (e) {
                console.log('insertProject error:', e);
                return null;
            }
        }
        const utm_zone = getUtmZone(longitude, latitude);
        try {
            const result = db.prepare(`INSERT INTO projects (
        uuid,
        name,
        owner_uuid,
        created_at,
        modified_at,
        longitude,
        latitude,
        zoom,
        utm_zone,
        edit_count,
        current_edit_id,
        current_snapshot_id
        ) VALUES (
        @uuid,
        @name,
        @owner_uuid,
        @created_at,
        @modified_at,
        @longitude,
        @latitude,
        @zoom,
        @utm_zone,
        @edit_count,
        @current_edit_id,
        @current_snapshot_id
        )`).run({
                uuid,
                name,
                owner_uuid: owner.uuid,
                created_at: now_str,
                modified_at: now_str,
                longitude,
                latitude,
                zoom,
                utm_zone,
                edit_count: 1,
                current_edit_id: 0,
                current_snapshot_id: 0,
            });
            const roleResult = db.prepare('INSERT INTO project_user (project_uuid, user_uuid, role) VALUES (@project_uuid, @user_uuid, @role)').run({
                project_uuid: uuid,
                user_uuid: owner.uuid,
                role: 'owner',
            })
            if (result.changes == 1 && roleResult.changes == 1) {
                return new DbProject(uuid);
            } else {
                return null;
            }
        } catch (err) {
            console.log('insertProject error:', err);
            return null;
        }
    }
}

export const DbProjectEditSchema = z.object({
    project_uuid: z.string(),
    edit_id: z.coerce.number().int().finite(),
    snapshot_id: z.coerce.number().int().finite(),
    edit_data: z.string(),
    has_snapshot_file: z.coerce.boolean(),
});
export type DbProjectEditSchema = z.infer<typeof DbProjectEditSchema>;

export const DbProjectSnapshotSchema = z.object({
    project_uuid: z.string(),
    edit_id: z.coerce.number().int().finite(),
    snapshot_inp: z.string(),
});
export type DbProjectSnapshotSchema = z.infer<typeof DbProjectSnapshotSchema>;

export const DbProjectRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type DbProjectRoleSchema = z.infer<typeof DbProjectRoleSchema>;

export const DbProjectUserSchema = z.object({
    project_uuid: z.string(),
    user_uuid: z.string(),
    role: DbProjectRoleSchema,
})
export type DbProjectUserSchema = z.infer<typeof DbProjectUserSchema>;

export function getUserProjects(user: DbUserSchema): DbProjectSchema[] {
    // TODO: single SELECT using JOIN. For now, do what I know works
    const db = getDb();
    const projects = [];
    try {
        const all_roles_result = db.prepare('SELECT * FROM project_user WHERE user_uuid = ?').all(user.uuid);
        const all_roles = z.array(DbProjectUserSchema).parse(all_roles_result);
        for (const role of all_roles) {
            const project_result = db.prepare('SELECT * FROM projects WHERE uuid = ?').get(role.project_uuid);
            const project = DbProjectSchema.parse(project_result);
            projects.push(project);
        }
        return projects;
    } catch (err) {
        return projects;
    }
}
