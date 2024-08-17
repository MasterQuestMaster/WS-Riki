import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";
import db from "@astrojs/db";
import cloudflare from "@astrojs/cloudflare";
import scope from "astro-scope";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://wsriki.com",
  integrations: [icon(), robotsTxt(), db(), scope()],
  adapter: cloudflare({
    imageService: "passthrough"
  }),
  vite: {
    define: {
        "process.env": process.env
    }
  }
});