import { z } from "zod";
import { AddJunctionData, AddPipeData, AddReservoirData, AddTankData, JunctionPropertiesData, LinkStatus, PipePropertiesData, ReservoirPropertiesData, TankPropertiesData } from "./common.js";

export const AddJunctionCb = z.object({
    type: z.literal('add_junction_cb'),
    data: AddJunctionData,
})
export type AddJunctionCb = z.infer<typeof AddJunctionCb>;

export const AddReservoirCb = z.object({
    type: z.literal('add_reservoir_cb'),
    data: AddReservoirData,
});
export type AddReservoirCb = z.infer<typeof AddReservoirCb>;

export const AddTankCb = z.object({
    type: z.literal('add_tank_cb'),
    data: AddTankData,
});
export type AddTankCb = z.infer<typeof AddTankCb>;

export const AddPipeCb = z.object({
    type: z.literal('add_pipe_cb'),
    data: AddPipeData,
});
export type AddPipeCb = z.infer<typeof AddPipeCb>;

export const ReservoirPropertiesCb = z.object({
    type: z.literal('reservoir_properties_cb'),
    data: ReservoirPropertiesData,
});
export type ReservoirPropertiesSb = z.infer<typeof ReservoirPropertiesCb>;

export const TankPropertiesCb = z.object({
    type: z.literal('tank_properties_cb'),
    data: TankPropertiesData,
});
export type TankPropertiesCb = z.infer<typeof TankPropertiesCb>;

export const PipePropertiesCb = z.object({
    type: z.literal('pipe_properties_cb'),
    data: PipePropertiesData,
});
export type PipePropertiesCb = z.infer<typeof PipePropertiesCb>;

export const MouseMoveCb = z.object({
    type: z.literal('mouse_move_cb'),
    longitude: z.number(),
    latitude: z.number(),
    user_id: z.string(),
    username: z.string(),
});
export type MouseMoveCb = z.infer<typeof MouseMoveCb>;

export const ProjectInfoCb = z.object({
    type: z.literal('project_info_cb'),
    inp_file: z.string(),
    user_id: z.string(),
    username: z.string(),
});
export type ProjectInfoCb = z.infer<typeof ProjectInfoCb>;

export const EmptyCb = z.object({
    type: z.literal('empty_cb'),
});
export type EmptyCb = z.infer<typeof EmptyCb>;

export const DeletePipeCb = z.object({
    type: z.literal('delete_pipe_cb'),
    id: z.string(),
});
export type DeletePipeCb = z.infer<typeof DeletePipeCb>;

export const JunctionPropertiesCb = z.object({
    type: z.literal('junction_properties_cb'),
    data: JunctionPropertiesData,
});
export type JunctionPropertiesCb = z.infer<typeof JunctionPropertiesCb>;

export const DeleteJunctionCb = z.object({
    type: z.literal('delete_junction_cb'),
    id: z.string(),
})

export const ClientboundPacket = z.discriminatedUnion('type', [
    MouseMoveCb,
    ProjectInfoCb,
    EmptyCb,
    AddJunctionCb,
    AddReservoirCb,
    AddTankCb,
    AddPipeCb,
    PipePropertiesCb,
    DeletePipeCb,
    JunctionPropertiesCb,
    DeleteJunctionCb,
]);
export type ClientboundPacket = z.infer<typeof ClientboundPacket>;