import { z } from "zod";

export const AddJunctionSchema = z.object({
    type: z.literal('add_junction'),
    id: z.string(),
    longitude: z.number(),
    latitude: z.number(),
    elevation: z.number(),
});
export type AddJunctionSchema = z.infer<typeof AddJunctionSchema>;

export const AddReservoirSchema = z.object({
    type: z.literal('add_reservoir'),
    id: z.string(),
    longitude: z.number(),
    latitude: z.number(),
});
export type AddReservoirSchema = z.infer<typeof AddReservoirSchema>;

export const AddTankSchema = z.object({
    type: z.literal('add_tank'),
    id: z.string(),
    longitude: z.number(),
    latitude: z.number(),
    elevation: z.number(),
});
export type AddTankSchema = z.infer<typeof AddTankSchema>;

export const AddPumpSchema = z.object({
    type: z.literal('add_pump'),
    longitude: z.number(),
    latitude: z.number(),
    elevation: z.number(),
});
export type AddPumpSchema = z.infer<typeof AddPumpSchema>;

export const AddValveSchema = z.object({
    type: z.literal('add_valve'),
    longitude: z.number(),
    latitude: z.number(),
    elevation: z.number(),
});
export type AddValveSchema = z.infer<typeof AddValveSchema>;

export const AddPipeSchema = z.object({
    type: z.literal('add_pipe'),
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
export type AddPipeSchema = z.infer<typeof AddPipeSchema>;

export const ProjectInitSchema = z.object({
    type: z.literal('project_init'),
    inp_file: z.string(),
});
export type ProjectInitSchema = z.infer<typeof ProjectInitSchema>;

export const ClientActionsSchema = z.discriminatedUnion('type', [
    AddJunctionSchema,
    AddReservoirSchema,
    AddTankSchema,
    AddPumpSchema,
    AddValveSchema,
    AddPipeSchema,
    ProjectInitSchema,
]);
export type ClientActionsSchema = z.infer<typeof ClientActionsSchema>;

export const EpanetChangeSchema = z.object({
    user_id: z.string().uuid(),
    modified_at: z.coerce.date(),
    change: ClientActionsSchema,
});
export type EpanetChangeSchema = z.infer<typeof EpanetChangeSchema>;
