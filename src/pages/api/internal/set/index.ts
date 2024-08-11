import { db, eq, sql, Set, Card, count } from 'astro:db'
import type { APIRoute } from 'astro'
import { SetInfoSchema } from 'src/schemas/SetInfo';

//Insert, or update if exists.
export const POST: APIRoute = async ({params, request}) => {

    const setInfoParse = SetInfoSchema.safeParse(await request.json());

    if(!setInfoParse.success) {
        return new Response(
            JSON.stringify({ error: setInfoParse.error }),
            { status: 400 }
        );
    }

    const setInfo = setInfoParse.data;

    try {
        await db.insert(Set).values([setInfo]).onConflictDoUpdate({
            target: Set.id,
            set: {
                name: sql`excluded.name`,
                type: sql`excluded.type`,
                releaseDate: sql`excluded.color`
            }
        });
    }
    catch(e: any) {
        return new Response(
            JSON.stringify({ error: `Error inserting cards into set "${setInfo.id}: ${e.message}".` }),
            { status: 500 }
        );
    }

    return new Response("Set was successfully inserted", { status: 200 });
}