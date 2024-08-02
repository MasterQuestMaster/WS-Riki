import { db, eq, Set, Card } from 'astro:db'
import type { APIRoute } from 'astro'

/* Probably use an endpoint to import each set json file with 1 request. But is it get/post? 
I'd say post since post is usually inserting. 
But we can implement get to check if it exists. 
Delete can remove the sets.

TODO: We need to protect this internal API from external access so others can't tamper with the sets.

*/

export const GET: APIRoute = async ({params}) => {
  // load set data from json and return it (only info, no set)
  const setId = params.setid ?? "";
  const setResult = await db.select().from(Set).where(eq(Set.id, setId));

  return new Response(
    JSON.stringify({
      greeting: 'Hello',
    }),
  )
}

export const POST: APIRoute = async ({params, request}) => {
  //insert more set details
  return new Response("");
}