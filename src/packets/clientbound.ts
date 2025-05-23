import { z } from "zod";
import { EpanetAction } from "./common.js";
import { ServerboundPacket } from "./serverbound.js";

export const MouseMoveCb = z.object({
	type: z.literal("mouse_move_cb"),
	longitude: z.number(),
	latitude: z.number(),
	user_id: z.string(),
	username: z.string(),
});
export type MouseMoveCb = z.infer<typeof MouseMoveCb>;

export const ProjectInfoCb = z.object({
	type: z.literal("project_info_cb"),
	inp_file: z.string(),
	user_id: z.string(),
	username: z.string(),
});
export type ProjectInfoCb = z.infer<typeof ProjectInfoCb>;

export const EmptyCb = z.object({
	type: z.literal("empty_cb"),
});
export type EmptyCb = z.infer<typeof EmptyCb>;

export const EpanetEdit = z.object({
	created_at: z.coerce.date(),
	user_uuid: z.string(),
	user_username: z.string(),
	parent_id: z.number().int().finite(),
	edit_id: z.number().int().finite(),
	snapshot_id: z.number().int().finite(),
	action: EpanetAction,
});
export type EpanetEdit = z.infer<typeof EpanetEdit>;

export const EpanetEditCb = z.object({
	type: z.literal("epanet_edit_cb"),
	data: EpanetEdit,
});
export type EpanetEditCb = z.infer<typeof EpanetEditCb>;

export const TrackEditCb = z.object({
	type: z.literal("track_edit_cb"),
	edit_id: z.number().int().finite(),
	snapshot_id: z.number().int().finite(),
	snapshot_data: z
		.object({
			snapshot_inp: z.string(),
			snapshot_children: z.array(EpanetEdit),
		})
		.optional(),
});
export type TrackEditCb = z.infer<typeof TrackEditCb>;

export const LoginSuccessCb = z.object({
	type: z.literal("login_success_cb"),
	// TODO: client-facing DbProjectSchema-style type
	projects: z.array(z.string()),
});
export type LoginSuccessCb = z.infer<typeof LoginSuccessCb>;

export const LoginFailureCb = z.object({
	type: z.literal("login_failure_cb"),
});
export type LoginFailureCb = z.infer<typeof LoginFailureCb>;

export const RegisterSuccessCb = z.object({
	type: z.literal("register_success_cb"),
	// TODO: client-facing DbProjectSchema-style type
	projects: z.array(z.string()),
});
export type RegisterSuccessCb = z.infer<typeof RegisterSuccessCb>;

export const RegisterFailureCb = z.object({
	type: z.literal("login_failure_cb"),
});
export type RegisterFailureCb = z.infer<typeof RegisterFailureCb>;

export const ClientboundPacket = z.discriminatedUnion("type", [
	MouseMoveCb,
	// ProjectInfoCb,
	EmptyCb,
	EpanetEditCb,
	TrackEditCb,
	LoginSuccessCb,
	LoginFailureCb,
]);
export type ClientboundPacket = z.infer<typeof ClientboundPacket>;
