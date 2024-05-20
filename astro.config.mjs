import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import robotsTxt from "astro-robots-txt";

import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://wsriki.com",
  integrations: [icon(), robotsTxt(), db()]
});