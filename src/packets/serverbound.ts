import { z } from "zod";
import { EpanetAction } from "./common.js";

export const EpanetActionSb = z.object({
  type: z.literal("epanet_action_sb"),
  data: EpanetAction,
});

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

export const ServerboundPacket = z.discriminatedUnion("type", [
  MouseMoveSb,
  TrackEditSb,
  EpanetActionSb,
]);
export type ServerboundPacket = z.infer<typeof ServerboundPacket>;
