import { z } from "zod";
import { AddJunctionData, AddPipeData, AddReservoirData, AddTankData, LinkStatus, PipePropertiesData, TankPropertiesData } from "./common.js";

export const AddJunctionSb = z.object({
    type: z.literal('add_junction_sb'),
    data: AddJunctionData,
});
export type AddJunctionSb = z.infer<typeof AddJunctionSb>;

export const AddReservoirSb = z.object({
    type: z.literal('add_reservoir_sb'),
    data: AddReservoirData,
});
export type AddReservoirSb = z.infer<typeof AddReservoirSb>;

export const AddTankSb = z.object({
    type: z.literal('add_tank_sb'),
    data: AddTankData,
});
export type AddTankSb = z.infer<typeof AddTankSb>;

export const AddPipeSb = z.object({
    type: z.literal('add_pipe_sb'),
    data: AddPipeData,
});
export type AddPipeSb = z.infer<typeof AddPipeSb>;

export const ReservoirPropertiesSb = z.object({
    type: z.literal('reservoir_properties_sb'),
    id: z.string(),
    elevation: z.number(),
});
export type ReservoirPropertiesSb = z.infer<typeof ReservoirPropertiesSb>;

export const TankPropertiesSb = z.object({
    type: z.literal('tank_properties_sb'),
    data: TankPropertiesData,
});
export type TankPropertiesSb = z.infer<typeof TankPropertiesSb>;

export const PipePropertiesSb = z.object({
    type: z.literal('pipe_properties_sb'),
    data: PipePropertiesData,
});
export type PipePropertiesSb = z.infer<typeof PipePropertiesSb>;

export const MouseMoveSb = z.object({
    type: z.literal('mouse_move_sb'),
    longitude: z.number(),
    latitude: z.number(),
});
export type MouseMoveSb = z.infer<typeof MouseMoveSb>;

export const DeletePipeSb = z.object({
    type: z.literal('delete_pipe_sb'),
    id: z.string(),
});
export type DeletePipeSb = z.infer<typeof DeletePipeSb>;

export const ServerboundPacket = z.discriminatedUnion('type', [
    AddJunctionSb,
    AddReservoirSb,
    AddTankSb,
    AddPipeSb,
    ReservoirPropertiesSb,
    TankPropertiesSb,
    PipePropertiesSb,
    MouseMoveSb,
    DeletePipeSb,
]);
export type ServerboundPacket = z.infer<typeof ServerboundPacket>;