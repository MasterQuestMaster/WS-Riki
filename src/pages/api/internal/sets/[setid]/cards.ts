import { db, eq, sql, Set, Card } from 'astro:db'
import type { APIRoute } from 'astro'

import { getDbCardFromJson } from '@scripts/import/wsdb-eng-import';
import { SetFileSchema } from 'src/schemas/SetFile';
import { generateBatchResponseMessageAndStatus, makeJsonResponse } from '@scripts/utils';

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
        console.log("get in set/xxx/cards");
        return makeJsonResponse({
            message: `Set ${setId} does not exist` 
        }, 404);
    }

    //Load the cards for the set.
    const cards = await db.select().from(Card).where(eq(Card.setId, setId));

    return makeJsonResponse(cards, 200);
}

//TODO: Handle special rarities in normal set files by putting them in the same table (for easier finding) but group them together in search results (show picture of the matching one).

export const POST: APIRoute = async ({params, request}) => {
    const setId = params.setid ?? "";
    
    //Validate POST body (should be a JSON file from WS-EN-DB).
    const setFileParse = SetFileSchema.safeParse(await request.json());

    if(!setFileParse.success) {
        return makeJsonResponse({
            setId: setId,
            message: setFileParse.error 
        }, 400);
    }

    const setFile = setFileParse.data;

    try {
        const setName = setFile.length == 0 ? setId : setFile[0].expansion;
        await createSetIfNotExists(setId, setName);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            message: `Error when creating set "${setId}": ${e.message}` 
        }, 500);
    }

    let countErrors = 0;

    const responses = await Promise.all(setFile.map(async (card) => {
        try {
            await db.insert(Card).values([ 
                await getDbCardFromJson(card, setId) 
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

            return {
                cardCode: card.code,
                cardName: card.name,
                status: 200,
                message: `The card "${card.name}" (${card.code}) was successfully inserted/updated.`
            }
        }
        catch(e:any) {
            countErrors++;

            return {
                cardCode: card.code,
                cardName: card.name,
                status: 500,
                message: `Error inserting/updating "${card.name}" ${card.code}: ${e.message}`
            }
        }
    }));

    //Only report 500 if all requests failed. Otherwise the users must look in the details.
    //TODO: use countErrors;
    const overallResponseData = generateBatchResponseMessageAndStatus(countErrors, setFile.length);

    return makeJsonResponse({
        setId: setId,
        message: overallResponseData.message,
        errorCount: countErrors,
        details: responses
    }, overallResponseData.status);
}

async function createSetIfNotExists(setId: string, setName: string) {
    await db.insert(Set).values({
        id: setId,
        name: setName,
    }).onConflictDoNothing();
}