import { db, Set } from 'astro:db'
import type { APIRoute } from 'astro'
import { SetInputSchema } from 'src/schemas/Set';
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

    const setParse = SetInputSchema.safeParse(await request.json());

    if(!setParse.success) {
        return ZodErrorResponse("SetInput", setParse.error);
    }

    const setInput = setParse.data;

    try {
        await db.insert(Set).values([setInput]);

        return makeJsonResponse({
            setId: setInput.id,
            status: 201,
            message: "Set was successfully created"
        }, 201);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setInput.id,
            status: 500,
            message: `Error creating set "${setInput.id}: ${e.message}".` 
        }, 500);
    }
}