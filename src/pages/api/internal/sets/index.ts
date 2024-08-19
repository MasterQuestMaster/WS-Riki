import { db, Set } from 'astro:db'
import type { APIRoute } from 'astro'
import { SetInfoSchema } from 'src/schemas/SetInfo';
import { makeJsonResponse, SetReadErrorResponse, ZodErrorResponse } from '@scripts/api-utils';

//Get all sets
export const GET: APIRoute = async () => {
    try {
        const sets = await db.select().from(Set);
        return makeJsonResponse(sets, 200)
    }
    catch(e: any) {
        return SetReadErrorResponse(e.message);
    }
}

//Insert set, or update if exists.
export const POST: APIRoute = async ({params, request}) => {

    const setInfoParse = SetInfoSchema.safeParse(await request.json());

    if(!setInfoParse.success) {
        return ZodErrorResponse("SetInfo", setInfoParse.error);
    }

    const setInfo = setInfoParse.data;

    try {
        await db.insert(Set).values([setInfo]);

        return makeJsonResponse({
            setId: setInfo.id,
            status: 201,
            message: "Set was successfully created"
        }, 201);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setInfo.id,
            status: 500,
            message: `Error creating set "${setInfo.id}: ${e.message}".` 
        }, 500);
    }
}