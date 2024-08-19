import { db, eq, Set } from 'astro:db'
import type { APIRoute } from 'astro'

import { getSet } from '@scripts/db-utils';
import { makeJsonResponse, SetNotFoundResponse, SetReadErrorResponse, ZodErrorResponse } from '@scripts/api-utils';
import { SetInfoSchema } from 'src/schemas/SetInfo';

export const GET: APIRoute = async ({params}) => {
    // load set data from json and return it (only info, no cards)
    const setId = params.setid ?? "";

    try {
        const set = await getSet(setId);
        if(!set) return SetNotFoundResponse(setId);
        return makeJsonResponse(set, 200);
    }
    catch(e: any) {
        return SetReadErrorResponse(e.message, setId);
    }
}

export const PUT: APIRoute = async ({params, request}) => {
    const setId = params.setid ?? "";

    //Update Schema should not have "id" and everything should be optional.
    const setUpdateParse = SetInfoSchema.omit({id: true}).partial().safeParse(await request.json());

    if(!setUpdateParse.success) {
        return ZodErrorResponse("SetInfo", setUpdateParse.error);
    }

    const setUpdateVals = setUpdateParse.data;

    //Get set to check if it exists
    try {
        const set = await getSet(setId);
        if(!set) return SetNotFoundResponse(setId);
    }
    catch(e: any) {
        return SetReadErrorResponse(e.message, setId);
    }

    try {

        //Set exists. Update based on the provided values.
        await db.update(Set).set(setUpdateVals).where(eq(Set.id, setId));

        return makeJsonResponse({
            setId: setId,
            status: 200,
            message: "Set was successfully updated"
        }, 200);
    }
    catch(e: any) {
        return makeJsonResponse({ 
            setId: setId,
            status: 500,
            message: `Error updating set "${setId}}: ${e.message}".` 
        }, 500);
    }
}