import { z } from "zod";
import { type DbProject, type DbUser, db } from "./db.js";

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
});
export type DbProjectUserSchema = z.infer<typeof DbProjectUserSchema>;

export async function getUserProjects(user: DbUser): Promise<DbProject[]> {
	// TODO: single SELECT using JOIN. For now, do what I know works
	// const db = getDb();
	const projects = [];
	const allRoles = await db
		.selectFrom("project_user")
		.selectAll()
		.where("user_uuid", "=", user.uuid)
		.execute();
	for (const role of allRoles) {
		const project = await db
			.selectFrom("projects")
			.where("uuid", "=", role.project_uuid)
			.selectAll()
			.executeTakeFirstOrThrow();
		projects.push(project);
	}
	return projects;
}
