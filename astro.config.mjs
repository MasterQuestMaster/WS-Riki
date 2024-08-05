import { defineConfig } from 'astro/config';

import db from "@astrojs/db";
import cloudflare from "@astrojs/cloudflare";
import icon from "astro-icon";
import scope from "astro-scope";
import robotsTxt from "astro-robots-txt";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://wsriki.com",
  integrations: [icon(), robotsTxt(), db(), scope()],
  adapter: cloudflare({
    imageService: "passthrough",
    platformProxy: {
      enabled: true
    }
  })
});