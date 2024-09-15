import { db, sql, NeoStandard } from 'astro:db';
import type { APIRoute } from 'astro';
import { NeoStandardDbSchema, NeoStandardInputSchema } from 'src/schemas/NeoStandard';
import { makeJsonResponse, ZodErrorResponse } from '@scripts/api-utils';

export const GET: APIRoute = async () => {
    //{id,title,codes[]} format.
    const neoStandards = await db.select().from(NeoStandard);
    return makeJsonResponse(neoStandards, 200);
}

export const POST: APIRoute = async ({params, request}) => {
    //Expected request body: [{title:"xxx", codes:["xxx","yyy"]},...]
    //Can be a partial json. only add/update.

    //Validate POST body (should be a JSON file from WS-EN-DB).
    const neoParse = NeoStandardInputSchema.array().safeParse(await request.json());

    if(!neoParse.success) {
        return ZodErrorResponse("NeoStandardInput", neoParse.error);
    }

    const neoList = neoParse.data;

    try {
        //Parse into DBSchema
        const insertRowValues = neoList.map(neo => NeoStandardDbSchema.parse({ id: neo.codes[0], ...neo }));

        const insertedRows = await db.insert(NeoStandard)
        .values(insertRowValues)
        .onConflictDoUpdate({
            target: NeoStandard.id,
            set: {
                title: sql`excluded.title`,
                codes: sql`excluded.codes`
            }
        }).returning();

        return makeJsonResponse({
            message: "All Neo Standards were successfully imported",
            status: 200,
            count: insertedRows.length,
            details: insertedRows,
        }, 200); 
    }
    catch(e: any) {
        return makeJsonResponse({
            message: `Error inserting Neo Standards ${e.message}`,
            status: 500,
        }, 500); 
    }
}