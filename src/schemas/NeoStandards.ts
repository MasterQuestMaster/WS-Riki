import {z} from "astro/zod";

export const NeoStandardsSchema = z.array(
    z.object({
        title: z.string(),
        codes: z.array(z.string()).min(1)
    })
);

export type NeoStandardEntry = z.infer<typeof NeoStandardsSchema>[number];