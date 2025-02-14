import { z } from "zod";
import { getDb } from "./db.js";
import { randomUUID } from "crypto";
import type { DbUserSchema } from "./auth.js";
import { FlowUnits, HeadLossType, Project, Workspace } from "epanet-js";

export const DbProjectSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner_uuid: z.string(),
    inp_file: z.string(),
    created_at: z.coerce.date(),
    modified_at: z.coerce.date(),
    longitude: z.coerce.number(),
    latitude: z.coerce.number(),
    zoom: z.coerce.number(),
});
export type DbProjectSchema = z.infer<typeof DbProjectSchema>;

export const DbProjectRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type DbProjectRoleSchema = z.infer<typeof DbProjectRoleSchema>;

export const DbProjectUserSchema = z.object({
    project_uuid: z.string(),
    user_uuid: z.string(),
    role: DbProjectRoleSchema,
})
export type DbProjectUserSchema = z.infer<typeof DbProjectUserSchema>;

// TODO: customizable flow units
export function insertProject(name: string, owner: DbUserSchema, longitude: number, latitude: number, zoom: number): DbProjectSchema | null {
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
    }
    try {
        const result = db.prepare('INSERT INTO projects (uuid, name, owner_uuid, inp_file, created_at, modified_at, longitude, latitude, zoom) VALUES (@uuid, @name, @owner_uuid, @inp_file, @created_at, @modified_at, @longitude, @latitude, @zoom)').run({
            uuid,
            name,
            owner_uuid: owner.uuid,
            inp_file,
            created_at: now_str,
            modified_at: now_str,
            longitude,
            latitude,
            zoom,
        });
        const roleResult = db.prepare('INSERT INTO project_user (project_uuid, user_uuid, role) VALUES (@project_uuid, @user_uuid, @role)').run({
            project_uuid: uuid,
            user_uuid: owner.uuid,
            role: 'owner',
        })
        if (result.changes == 1 && roleResult.changes == 1) {
            return {
                name,
                created_at: now,
                inp_file,
                modified_at: now,
                owner_uuid: owner.uuid,
                uuid,
                longitude,
                latitude,
                zoom,
            }
        } else {
            return null;
        }
    } catch (err) {
        console.log('insertProject error:', err);
        return null;
    }
}

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

export function getUserProjectRole(user: DbUserSchema, project: DbProjectSchema): DbProjectRoleSchema | null {
    const db = getDb();
    try {
        const role_result = db.prepare('SELECT * FROM project_user WHERE project_uuid = @project_uuid AND user_uuid = @user_uuid').get({
            project_uuid: project.uuid,
            user_uuid: user.uuid,
        });
        const projectUser = DbProjectUserSchema.parse(role_result);
        return projectUser.role;
    } catch (err) {
        return null;
    }
}

export function addUserToProject(user: DbUserSchema, project: DbProjectSchema, role: DbProjectRoleSchema): boolean {
    const db = getDb();
    try {
        const insert_result = db.prepare('INSERT INTO project_user (project_uuid, user_uuid, role) VALUES (@project_uuid, @user_uuid, @role)').run({
            project_uuid: project.uuid,
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

export function updateProjectInp(project: DbProjectSchema, inp_file: string): boolean {
    const db = getDb();
    try {
        const update_result = db.prepare('UPDATE projects SET inp_file = @inp_file WHERE uuid = @project_uuid').run({
            inp_file,
            project_uuid: project.uuid,
        });
        if (update_result.changes == 1) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

export function getProjectByUuid(project_uuid: string): DbProjectSchema | null {
    const db = getDb();
    try {
        const project_result = db.prepare('SELECT * FROM projects WHERE uuid = ?').get(project_uuid);
        const project = DbProjectSchema.parse(project_result);
        return project;
    } catch (err) {
        // console.log(err);
        return null;
    }
}