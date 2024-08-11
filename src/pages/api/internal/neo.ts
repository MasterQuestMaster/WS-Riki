import { db, sql, NeoStandard } from 'astro:db';
import type { APIRoute } from 'astro';
import { NeoStandardsSchema } from 'src/schemas/NeoStandards';

export const GET: APIRoute = async () => {
    //{id,title,codes[]} format.
    const neoStandards = await db.select().from(NeoStandard);
    return new Response(JSON.stringify(neoStandards));
}

export const POST: APIRoute = async ({params, request}) => {
    //Expected request body: [{title:"xxx", codes:["xxx","yyy"]},...]
    //Can be a partial json. only add/update.

    //Validate POST body (should be a JSON file from WS-EN-DB).
    const neoParse = NeoStandardsSchema.safeParse(await request.json());

    if(!neoParse.success) {
        return new Response(
            JSON.stringify({ error: neoParse.error }),
            { status: 400 }
        );
    }

    const neoList = neoParse.data;

    let insertErrors: any[] = [];

    neoList.forEach(async neo => {
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
        }
        catch(e:any) {
            insertErrors.push(`Error inserting Neo-Standard "${neo.title}": ${e.message}`);
        }
    });

    if(insertErrors.length > 0) {
        return new Response(
            JSON.stringify({ 
                error: "Error inserting Neo Standards.",
                errorList: insertErrors 
            }),
            { status: 500 }
        );
    }
    else {
        return new Response("Neo Standards were successfully inserted", { status: 200 });
    }
}