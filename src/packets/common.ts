// common.ts: data types shared between clientbound and serverbound packets

import { z } from "zod";

export const LinkStatus = z.enum(["open", "closed"]);
export type LinkStatus = z.infer<typeof LinkStatus>;

export const AddJunctionData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    elevation: z.number(),
});
export type AddJunctionData = z.infer<typeof AddJunctionData>;

export const AddReservoirData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
});
export type AddReservoirData = z.infer<typeof AddReservoirData>;

export const AddTankData = z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    elevation: z.number(),
});
export type AddTankData = z.infer<typeof AddTankData>;

export const AddPipeData = z.object({
    id: z.string(),
    start_node: z.string(),
    end_node: z.string(),
    vertices: z.array(z.object({
        x: z.number(),
        y: z.number(),
    })),
    // Client can use auto length, or provide their own
    length: z.number(),
});
export type AddPipeData = z.infer<typeof AddPipeData>;

export const ReservoirPropertiesData = z.object({
    old_id: z.string(),
    new_id: z.string(),
    elevation: z.number(),
});
export type ReservoirPropertiesData = z.infer<typeof ReservoirPropertiesData>;

export const TankPropertiesData = z.object({
    old_id: z.string(),
    new_id: z.string(),
    elevation: z.number(),
    initial_level: z.number(),
    maximum_level: z.number(),
    minimum_level: z.number(),
    diameter: z.number(),
    minimum_volume: z.number(),
});
export type TankPropertiesData = z.infer<typeof TankPropertiesData>;

export const PipePropertiesData = z.object({
    old_id: z.string(),
    new_id: z.string(),
    length: z.number(),
    diameter: z.number(),
    roughness: z.number(),
    loss_coefficient: z.number(),
    initial_status: LinkStatus,
});
export type PipePropertiesData = z.infer<typeof PipePropertiesData>;