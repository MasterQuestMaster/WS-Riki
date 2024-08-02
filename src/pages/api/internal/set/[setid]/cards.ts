import { db, eq, sql, Set, Card } from 'astro:db'
import type { APIRoute } from 'astro'

import { getDbCardFromJson } from '@scripts/import/wsdb-eng-import';

/*
set endpoint is for importing set details.
This "cards" endpoint is for getting or importing cards for a set (from a JSON).

TODO: We need to protect this internal API from external access so others can't tamper with the sets.

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

//TODO: Make a WS ENG DB Model so we can import easier.

export const POST: APIRoute = async ({params, request}) => {
    const setId = params.setid ?? "";
    const setJson = await request.json() as any[];

    //Validate POST body (should be a JSON file from WS-EN-DB).
    if(!setJson || !Array.isArray(setJson)) {
        return new Response(
            JSON.stringify({ error: "Expected JSON card array in body" }),
            { status: 400 }
        );
    }

    try {
        const setName = setJson.length == 0 ? setId : setJson[0].expansion;
        await createSetIfNotExists(setId, setName);
    }
    catch(e: any) {
        return new Response(
            JSON.stringify({ error: `Error when creating set "${setId}": ${e.message}` }),
            { status: 500 }
        );
    }

    let insertErrors:any[] = [];

    //TODO: use onConflictUpdate.
    setJson.forEach(async (card) => {
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
            insertErrors.push(`Error inserting ${card.id}: ${e.message}`);
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