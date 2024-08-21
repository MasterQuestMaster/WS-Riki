import { db, eq, sql, Set, Card } from 'astro:db'
import type { APIRoute } from 'astro'

import { getDbCardFromJson } from '@scripts/import/wsdb-eng-import';
import { SetFileSchema } from 'src/schemas/SetFile';
import { generateBatchResponseMessageAndStatus, makeJsonResponse, SetNotFoundResponse, SetReadErrorResponse, ZodErrorResponse } from '@scripts/api-utils'
import { getSet } from '@scripts/db-utils';

/*
set endpoint is for importing set details.
This "cards" endpoint is for getting or importing cards for a set (from a JSON).
*/

export const GET: APIRoute = async ({params}) => {
    // load set data from json and return it (only info, no set)
    const setId = params.setid ?? "";

    try {
        const set = await getSet(setId);
        if(!set) return SetNotFoundResponse(setId);
    }
    catch(e: any) {
        return SetReadErrorResponse(e.message, setId);
    }

    try {
        //Load the cards for the set.
        const cards = await db.select().from(Card).where(eq(Card.setId, setId));
        return makeJsonResponse(cards, 200);
    }
    catch(e: any) {
        return makeJsonResponse({
            status: 500,
            message: `Error reading cards of set ${setId}: ${e.message}`
        }, 500);
    }
}

//TODO: Handle special rarities in normal set files by putting them in the same table (for easier finding) but group them together in search results (show picture of the matching one).

export const POST: APIRoute = async ({params, request}) => {
    const setId = params.setid ?? "";
    
    //Validate POST body (should be a JSON file from WS-EN-DB).
    const setFileParse = SetFileSchema.safeParse(await request.json());

    if(!setFileParse.success) {
        return ZodErrorResponse("SetFile", setFileParse.error, {setId: setId});
    }

    const setFile = setFileParse.data;

    //Create set if it doesn't exist.
    try {
        //Some sets have a Promo with "PR Card (Weiss Side)" in first slot (also Haruhi PUP), so find a non-promo.
        const setName = setFile.find(set => set.rarity != "PR")?.expansion ?? setId;
        await createSetIfNotExists(setId, setName);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            status: 500,
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
        status: overallResponseData.status,
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