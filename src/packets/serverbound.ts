import { z } from "zod";
import { EpanetAction } from "./common.js";

export const EpanetActionSb = z.object({
  type: z.literal("epanet_action_sb"),
  data: EpanetAction,
});
export type EpanetActionSb = z.infer<typeof EpanetActionSb>;

export const MouseMoveSb = z.object({
  type: z.literal("mouse_move_sb"),
  longitude: z.number(),
  latitude: z.number(),
});
export type MouseMoveSb = z.infer<typeof MouseMoveSb>;

export const TrackEditSb = z.object({
  type: z.literal("track_edit_sb"),
  edit_id: z.number().int().finite(),
});
export type TrackEditSb = z.infer<typeof TrackEditSb>;

export const LoginRequestSb = z.object({
  type: z.literal("login_request_sb"),
  username: z.string(),
  password: z.string(),
});
export type LoginRequestSb = z.infer<typeof LoginRequestSb>;

export const RegisterRequestSb = z.object({
  type: z.literal("register_request_sb"),
  username: z.string(),
  password: z.string(),
});
export type RegisterRequestSb = z.infer<typeof RegisterRequestSb>;

export const SetCurrentProjectSb = z.object({
  type: z.literal("set_current_project_sb"),
  project_uuid: z.string(),
});
export type SetCurrentProjectSb = z.infer<typeof SetCurrentProjectSb>;

export const ServerboundPacket = z.discriminatedUnion("type", [
  MouseMoveSb,
  TrackEditSb,
  EpanetActionSb,
  LoginRequestSb,
  SetCurrentProjectSb,
  RegisterRequestSb,
]);
export type ServerboundPacket = z.infer<typeof ServerboundPacket>;
