import type { ZodError } from "astro/zod";

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