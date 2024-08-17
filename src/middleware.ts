import { defineMiddleware } from "astro:middleware";

const INTERNAL_API_PATH = "/api/internal/"

export const onRequest = defineMiddleware((context, next) => {

    //TODO: We must also check whether we're trying to access an internal API route.

    //accessing environment variables works differently for cloudflare.
    //We're supposed to be able to access the env with context.locals.runtime but it doesn't work.
    //Maybe we must install wrangler and the other cloudflare stuff.
    //TODO: Install an Astro Cloudflare Pages test app to see what it contains that we don't have.

    context.locals.message = "Message from Middleware";
    
    if(context.url.pathname.startsWith(INTERNAL_API_PATH)) {

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