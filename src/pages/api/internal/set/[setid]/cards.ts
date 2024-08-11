import { db, eq, sql, Set, Card } from 'astro:db'
import type { APIRoute } from 'astro'

import { getDbCardFromJson } from '@scripts/import/wsdb-eng-import';
import { SetFileSchema } from 'src/schemas/SetFile';

/*
set endpoint is for importing set details.
This "cards" endpoint is for getting or importing cards for a set (from a JSON).

*/

export const GET: APIRoute = async ({params}) => {
    // load set data from json and return it (only info, no set)
    const setId = params.setid ?? "";
    //Get set to check if it exists
    const set = await db.select().from(Set).where(eq(Set.id, setId)).get();

    if(!set) {
        return new Response(
            JSON.stringify({ error: `Set ${setId} does not exist` }),
            { status: 404 }
        );
    }

    //Load the cards for the set.
    const cards = await db.select().from(Card).where(eq(Card.setId, setId));

    return new Response(
        JSON.stringify(cards),
    )
}

//TODO: Handle special rarities in normal set files by inserting them in a "alternate versions" table instead.

export const POST: APIRoute = async ({params, request}) => {
    const setId = params.setid ?? "";
    
    //Validate POST body (should be a JSON file from WS-EN-DB).
    const setFileParse = SetFileSchema.safeParse(await request.json());

    if(!setFileParse.success) {
        return new Response(
            JSON.stringify({ error: setFileParse.error }),
            { status: 400 }
        );
    }

    const setFile = setFileParse.data;

    try {
        const setName = setFile.length == 0 ? setId : setFile[0].expansion;
        await createSetIfNotExists(setId, setName);
    }
    catch(e: any) {
        return new Response(
            JSON.stringify({ error: `Error when creating set "${setId}": ${e.message}` }),
            { status: 500 }
        );
    }

    let insertErrors:any[] = [];

    setFile.forEach(async (card) => {
        try {
            await db.insert(Card).values([ 
                await getDbCardFromJson(card) 
            ]).onConflictDoUpdate({
                target: Card.id,
                set: {
                    titleCode: sql`excluded.titleCode`,
                    name: sql`excluded.name`,
                    type: sql`excluded.type`,
                    color: sql`excluded.color`,
                    rarity: sql`excluded.rarity`,
                    neo: sql`excluded.neo`,
                    setId: sql`excluded.setId`,
                    side: sql`excluded.side`,
                    level: sql`excluded.level`,
                    cost: sql`excluded.cost`,
                    power: sql`excluded.power`,
                    soul: sql`excluded.soul`,
                    trigger: sql`excluded.trigger`,
                    traits: sql`excluded.traits`,
                    abilities: sql`excluded.abilities`,
                    abilities_ph: sql`excluded.abilities_ph`,
                    icons: sql`excluded.icons`,
                    image: sql`excluded.image`
                }
            });
        }
        catch(e:any) {
            insertErrors.push(`Error inserting ${card.code}: ${e.message}`);
        }

    });

    if(insertErrors.length > 0) {
        return new Response(
            JSON.stringify({ 
                error: `Error inserting cards into set "${setId}".`,
                errorList: insertErrors 
            }),
            { status: 500 }
        );
    }
    else {
        return new Response("Cards were successfully inserted", { status: 200 });
    }
}

async function createSetIfNotExists(setId: string, setName: string) {
    await db.insert(Set).values({
        id: setId,
        name: setName,
    }).onConflictDoNothing();
}