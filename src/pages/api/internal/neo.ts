import { db, sql, NeoStandard, count } from 'astro:db';
import type { APIRoute } from 'astro';
import { NeoStandardsSchema } from 'src/schemas/NeoStandards';
import { generateBatchResponseMessageAndStatus, makeJsonResponse } from '@scripts/api-utils';
import { ZodErrorResponse } from '@scripts/api-utils';

export const GET: APIRoute = async () => {
    //{id,title,codes[]} format.
    const neoStandards = await db.select().from(NeoStandard);
    return makeJsonResponse(neoStandards, 200);
}

export const POST: APIRoute = async ({params, request}) => {
    //Expected request body: [{title:"xxx", codes:["xxx","yyy"]},...]
    //Can be a partial json. only add/update.

    //Validate POST body (should be a JSON file from WS-EN-DB).
    const neoParse = NeoStandardsSchema.safeParse(await request.json());

    if(!neoParse.success) {
        return ZodErrorResponse("NeoStandards", neoParse.error);
    }

    const neoList = neoParse.data;
    let countErrors = 0;
    
    const responses = await Promise.all(neoList.map(async neo => {
        try {
            await db.insert(NeoStandard)
                .values([{
                    id: neo.codes[0],
                    title: neo.title,
                    codes: neo.codes
                }])
                .onConflictDoUpdate({
                    target: NeoStandard.id,
                    set: {
                        title: sql`excluded.title`,
                        codes: sql`excluded.codes`
                    }
                });

            return {
                title: neo.title,
                codes: neo.codes,
                status: 200,
                message: `The Neo Standard ${neo.title} was successfully inserted/updated.`
            };
        }
        catch(e:any) {
            countErrors++;

            return {
                title: neo.title,
                codes: neo.codes,
                status: 500,
                message: `Error inserting/updating Neo-Standard "${neo.title}": ${e.message}`
            };
        }
    }))

    const overallResponseData = generateBatchResponseMessageAndStatus(countErrors, neoList.length);

    return makeJsonResponse({
        message: overallResponseData.message,
        status: overallResponseData.status,
        details: responses
    }, overallResponseData.status); 
}