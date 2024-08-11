import { db, eq, Set, Card, count } from 'astro:db'
import type { APIRoute } from 'astro'

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
            
        return new Response(
            JSON.stringify(setResult)
        )
    }
    catch(e: any) {
        return new Response(
            JSON.stringify({ error: `Failed to load set data for ${e.message}`}),
            { status: 500 }
        );
    }
}