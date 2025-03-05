// common.ts: data types shared between clientbound and serverbound packets

import { z } from "zod";

export const LinkStatus = z.enum(["open", "closed"]);
export type LinkStatus = z.infer<typeof LinkStatus>;

export const AddJunctionAction = z.object({
  type: z.literal("add_junction_action"),
  id: z.string(),
  x: z.number(),
  y: z.number(),
  elevation: z.number(),
});
export type AddJunctionAction = z.infer<typeof AddJunctionAction>;

export const AddReservoirAction = z.object({
  type: z.literal("add_reservoir_action"),
  id: z.string(),
  x: z.number(),
  y: z.number(),
});
export type AddReservoirAction = z.infer<typeof AddReservoirAction>;

export const AddTankAction = z.object({
  type: z.literal("add_tank_action"),
  id: z.string(),
  x: z.number(),
  y: z.number(),
  elevation: z.number(),
});
export type AddTankAction = z.infer<typeof AddTankAction>;

export const AddPipeAction = z.object({
  type: z.literal("add_pipe_action"),
  id: z.string(),
  length: z.number(),
  start_node: z.string(),
  end_node: z.string(),
  vertices: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
    }),
  ),
});
export type AddPipeAction = z.infer<typeof AddPipeAction>;

export const SetReservoirPropertiesAction = z.object({
  type: z.literal("set_reservoir_properties_action"),
  old_id: z.string(),
  new_id: z.string(),
  elevation: z.number(),
});
export type SetReservoirPropertiesAction = z.infer<
  typeof SetReservoirPropertiesAction
>;

export const SetTankPropertiesAction = z.object({
  type: z.literal("set_tank_properties_action"),
  old_id: z.string(),
  new_id: z.string(),
  elevation: z.number(),
  initial_level: z.number(),
  maximum_level: z.number(),
  minimum_level: z.number(),
  diameter: z.number(),
  minimum_volume: z.number(),
});
export type SetTankPropertiesAction = z.infer<typeof SetTankPropertiesAction>;

export const SetPipePropertiesAction = z.object({
  type: z.literal("set_pipe_properties_action"),
  old_id: z.string(),
  new_id: z.string(),
  length: z.number(),
  diameter: z.number(),
  roughness: z.number(),
  loss_coefficient: z.number(),
  initial_status: LinkStatus,
});
export type SetPipePropertiesAction = z.infer<typeof SetPipePropertiesAction>;

export const SetJunctionPropertiesAction = z.object({
  type: z.literal("set_junction_properties_action"),
  old_id: z.string(),
  new_id: z.string(),
  elevation: z.number(),
});
export type SetJunctionPropertiesAction = z.infer<
  typeof SetJunctionPropertiesAction
>;

export const DeleteJunctionAction = z.object({
  type: z.literal("delete_junction_action"),
  id: z.string(),
});
export type DeleteJunctionAction = z.infer<typeof DeleteJunctionAction>;

export const DeletePipeAction = z.object({
  type: z.literal("delete_pipe_action"),
  id: z.string(),
});
export type DeletePipeAction = z.infer<typeof DeletePipeAction>;

export const EpanetAction = z.discriminatedUnion("type", [
  AddJunctionAction,
  AddReservoirAction,
  AddTankAction,
  AddPipeAction,
  SetJunctionPropertiesAction,
  SetReservoirPropertiesAction,
  SetTankPropertiesAction,
  SetPipePropertiesAction,
  DeleteJunctionAction,
  DeletePipeAction,
]);
export type EpanetAction = z.infer<typeof EpanetAction>;
