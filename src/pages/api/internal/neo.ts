import { db, sql, NeoStandard } from 'astro:db'
import type { APIRoute } from 'astro'
import { getDbNeoStandardFromJson } from '@scripts/import/neo-standard-en-import';

export const GET: APIRoute = async () => {
    //{id,title,codes[]} format.
    const neoStandards = await db.select().from(NeoStandard);
    return new Response(JSON.stringify(neoStandards));
}

export const POST: APIRoute = async ({params, request}) => {
    //Expected request body: [{title:"xxx", codes:["xxx","yyy"]},...]
    //Can be a partial json. only add/update.
    //TODO: maybe use zod to parse the input array: Type safety and could be made into a type for the import scripts.
    const neoJson = await request.json() as any[];

    let insertErrors: any[] = [];

    neoJson.forEach(async neo => {
        try {
            await db.insert(NeoStandard)
                .values(getDbNeoStandardFromJson(neo))
                .onConflictDoUpdate({
                    target: NeoStandard.id,
                    set: {
                        title: sql`excluded.title`,
                        codes: sql`excluded.codes`
                    }
                });
        }
        catch(e:any) {
            insertErrors.push(`Error inserting Neo-Standard ${neo.id}: ${e.message}`);
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