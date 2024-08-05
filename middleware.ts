import { defineMiddleware } from "astro/middleware";

/*
export const onRequest = defineMiddleware((context, next) => {
  // If a basic auth header is present, it wil take the string form: "Basic authValue"
  const authHeader = context.request.headers.get("Authorization");

  //TODO: We must also check whether we're trying to access an internal API route.

  //accessing environment variables works differently for cloudflare.
  //We're supposed to be able to access the env with context.locals.runtime but it doesn't work.
  //Maybe we must install wrangler and the other cloudflare stuff.
  //TODO: Install an Astro Cloudflare Pages test app to see what it contains that we don't have.
  
  if (authHeader && authHeader == context.locals.runtime.env.RIKI_INTERNAL_API_KEY) {
      return next();
  }

  return new Response("API key required", {
    status: 401,
    headers: {
      "WWW-authenticate": 'Basic realm="Secure Area"',
    },
  });

});
*/