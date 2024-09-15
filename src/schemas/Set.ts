import { z } from "astro/zod";

//Nullable and Optional are different. Db needs "nullable".
//TODO: These schemas are very similar. Do we need both?
//This is for loading from DB. The other is for importing to DB.
export const SetDbSchema = z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string().nullable(),
    type: z.string().nullable(),
    releaseDate: z.coerce.date().nullable(), //coerce uses "new Date()" on the string.
    sha: z.string().nullable()
});

export const SetInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string().optional(),
    type: z.string().optional(),
    releaseDate: z.coerce.date().optional(),
    sha: z.string().optional()
});

export type SetModel = z.infer<typeof SetDbSchema>;
export type SetInput = z.infer<typeof SetInputSchema>;