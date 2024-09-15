import {z} from "astro/zod";

export const RarityDbSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    order: z.number().nullable()
});

export type RarityModel = z.infer<typeof RarityDbSchema>;