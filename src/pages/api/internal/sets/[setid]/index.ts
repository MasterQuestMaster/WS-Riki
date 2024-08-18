import { db, eq, Set, Card, count } from 'astro:db'
import type { APIRoute } from 'astro'
import { makeJsonResponse } from '@scripts/utils';

export const GET: APIRoute = async ({locals, params}) => {
    // load set data from json and return it (only info, no cards)
    //TODO: Currently we include card count through JOIN. It could be an option to save it as a separate column in Set table when updating.
    const setId = params.setid ?? "";

    try {
        const setResult = await db.select({
                id: Set.id,
                name: Set.name,
                type: Set.type,
                shortName: Set.shortName,
                releaseDate: Set.releaseDate,
                cardCount: count(Card.cardno)
            }).from(Set)
            .innerJoin(Card, eq(Set.id, Card.setId))
            .where(eq(Set.id, setId))
            .groupBy(Set.id)
            .get();
            
        return makeJsonResponse(setResult, 200);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            message: `Failed to load set data for ${setId}: ${e.message}`
        }, 500);
    }
}