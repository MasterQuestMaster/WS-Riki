import { defineMiddleware } from "astro:middleware";

const INTERNAL_API_PATH = "/api/internal/"

export const onRequest = defineMiddleware((context, next) => {
    
    if(context.url.pathname.startsWith(INTERNAL_API_PATH)) {

        return next();

        const authHeader = context.request.headers.get("Authorization");
        const localApiKey = import.meta.env.RIKI_INTERNAL_API_KEY;

        if (!authHeader || authHeader != localApiKey) {

            let message = "API key invalid";
            if(!authHeader) message = "API key required";
            if(!localApiKey) message = "Local API key not set";

            return new Response(
                JSON.stringify({
                    message: message
                }),
                {
                    status: 401,
                    headers: {
                        "WWW-authenticate": 'Basic realm="Secure Area"',
                    },
                }
            );
        }
    }

    return next();

});