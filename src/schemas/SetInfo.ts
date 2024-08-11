import { z } from "astro/zod";

export const SetInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    releaseDate: z.date()
})