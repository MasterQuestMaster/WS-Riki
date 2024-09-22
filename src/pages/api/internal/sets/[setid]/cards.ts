import { db, eq, sql, Set as SetTable, Card, Rarity } from 'astro:db'
import type { APIRoute } from 'astro'

import { getDbCardFromJson, getNeoStandardsInSetFile } from '@scripts/import/wsdb-eng-import';
import { SetFileSchema, type SetFileEntry } from 'src/schemas/SetFile';
import { makeJsonResponse, SetNotFoundResponse, SetReadErrorResponse, ZodErrorResponse } from '@scripts/api-utils'
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
        const setName = setFile.find(card => card.rarity != "PR" && card.rarity != "TD")?.expansion ?? setId;
        await createSetIfNotExists(setId, setName);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            status: 500,
            message: `Error when creating set "${setId}": ${e.message}` 
        }, 500);
    }

    try {
        await insertNewRarities(setFile);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            status: 500,
            message: `Error when creating set "${setId}": ${e.message}` 
        }, 500);
    }

    try {
        //Find all title codes and get their neo standards
        const usedNeos = await getNeoStandardsInSetFile(setFile);
        const insertRowValues = setFile.map(card => getDbCardFromJson(card, setId, usedNeos));

        const insertResponse = await db.insert(Card)
            .values(insertRowValues)
            .onConflictDoUpdate({
                target: Card.id,
                set: {
                    titleCode: sql`excluded.titleCode`,
                    name: sql`excluded.name`,
                    type: sql`excluded.type`,
                    color: sql`excluded.color`,
                    rarity: sql`excluded.rarity`,
                    neo: sql`excluded.neo`,
                    setId: sql`excluded.setId`,
                    setName: sql`excluded.setName`,
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
            }).returning();

        console.log(insertResponse);

        return makeJsonResponse({
            setId: setId,
            status: 200,
            message: "All cards were successfully inserted/updated",
            count: insertResponse.length,
            details: insertResponse.map(resp => ({id: resp.id, name: resp.name}))
        }, 200);
    }
    catch(e: any) {
        console.error(e.message);

        return makeJsonResponse({
            setId: setId,
            status: 500,
            message: `Error when inserting/updating cards for set "${setId}": ${e.message}`
        }, 500);
    }

}

async function createSetIfNotExists(setId: string, setName: string) {
    await db.insert(SetTable).values({
        id: setId,
        name: setName,
    }).onConflictDoNothing();
}

async function insertNewRarities(setFile: SetFileEntry[]) {
    const usedRarities = [...new Set(setFile.map(card => card.rarity))];
    const rarityInsertData = usedRarities.map(rar => ({id: rar, name: null, order: null}));
    await db.insert(Rarity).values(rarityInsertData).onConflictDoNothing();
}