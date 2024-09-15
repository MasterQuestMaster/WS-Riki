import {z} from "astro/zod";

export const NeoStandardDbSchema = z.object({
    id: z.string(),
    title: z.string(),
    codes: z.array(z.string()).min(1)
});

export const NeoStandardInputSchema = z.object({
    title: z.string(),
    codes: z.array(z.string()).min(1)
});

export type NeoStandardModel = z.infer<typeof NeoStandardDbSchema>;
export type NeoStandardInput = z.infer<typeof NeoStandardInputSchema>;