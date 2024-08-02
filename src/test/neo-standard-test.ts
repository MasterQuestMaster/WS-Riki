import { getNeoStandardsFromWeb } from "@scripts/import/neo-standard-en-import";

const neoData = await getNeoStandardsFromWeb();
console.log(neoData);