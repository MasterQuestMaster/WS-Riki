import type { ZodError } from "astro/zod";

/**
 * Generate overall status and message fora batch operation, based on success rate.
 * @param batchErrorCount Number of errors
 * @param batchTotal Total number of items
 * @returns Status code and message, according to the success rate.
 */
export function generateBatchResponseMessageAndStatus(batchErrorCount: number, batchTotal: number) {
    if(batchErrorCount == 0) 
        return {
            status: 200, /* 200: OK */
            message: `All ${batchTotal} items were successfully inserted/updated`
        };
    else if(batchErrorCount == batchTotal)
        return { 
            status: 500, /* 500: Internal Server error */
            message: `All ${batchTotal} items failed to insert/update.`
        };
    else
        return {
            status: 207, /* 207: Multi-Status */
            message: `${batchTotal - batchErrorCount} items were successfully inserted/updated, while ${batchErrorCount} of ${batchTotal} items failed.`
        };
}

/**
 * Generate a response with "application/json" type.
 * @param jsonObject Response body
 * @param statusCode HTTP status code of the response
 * @returns Response object
 */
export function makeJsonResponse(jsonObject: any, statusCode: number) {
    return new Response(
        JSON.stringify(jsonObject), {
            status: statusCode,
            headers: {
                "Content-Type": "application/json"
            }
        }
    )
}

export function SetNotFoundResponse(setId:string) {
    return makeJsonResponse({
        setId: setId,
        status: 404,
        message: `Set ${setId} does not exist` 
    }, 404)
}

export function SetReadErrorResponse(errorMessage: string, setId?: string) {
    const responseBody = setId ? 
        { status: 500, message: `Failed to load set data for ${setId}: ${errorMessage}`, setId: setId } : 
        { status: 500, message: `Failed to load set data: ${errorMessage}` };

    return makeJsonResponse(responseBody, 500);
}

export function ZodErrorResponse(schemaName: string, zodError: ZodError, additionalProperties: Record<string, any> = {}) {
    return makeJsonResponse({
        ...additionalProperties,
        status: 400,
        message: `Failed to zod-parse ${schemaName}. ${zodError.issues.length} issues occured.`,
        issues: zodError.issues
    }, 400);
}