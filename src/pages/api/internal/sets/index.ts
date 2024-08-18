import { db, sql, Set } from 'astro:db'
import type { APIRoute } from 'astro'
import { SetInfoSchema } from 'src/schemas/SetInfo';
import { makeJsonResponse } from '@scripts/utils';

//Insert set, or update if exists.
export const POST: APIRoute = async ({params, request}) => {

    const setInfoParse = SetInfoSchema.safeParse(await request.json());

    if(!setInfoParse.success) {
        return makeJsonResponse({ message: setInfoParse.error }, 400);
    }

    const setInfo = setInfoParse.data;

    try {
        await db.insert(Set).values([setInfo]).onConflictDoUpdate({
            target: Set.id,
            set: {
                name: sql`excluded.name`,
                type: sql`excluded.type`,
                releaseDate: sql`excluded.color`,
                sha: sql`excluded.sha`
            }
        });
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setInfo.id,
            message: `Error inserting cards into set "${setInfo.id}: ${e.message}".` 
        }, 500);
    }

    return makeJsonResponse({
        setId: setInfo.id,
        message: "Set was successfully inserted"
    }, 200);
}