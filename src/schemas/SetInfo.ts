import { z } from "astro/zod";

//TODO: Use "nullish" if we need it to be able to be null 
//(import-riki uses nullish because it parses db-results)
export const SetInfoSchema = z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string().optional(),
    type: z.string().optional(),
    releaseDate: z.coerce.date().optional(), //coerce uses "new Date()" on the string.
    sha: z.string().optional()
});

export type SetInfo = z.infer<typeof SetInfoSchema>;