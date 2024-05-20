import { QueryParser, type SearchToken, type IKeywordOptions as QueryKeywordOptions } from "src/scripts/parser/queryParser";
import { type LogicTree } from "src/scripts/parser/logicGroup";

import parserConfig from "src/config/parser-config.json";

const query = "color:red ability:'when this card's placed' " + 
    "-doNotSearchForThis -\"and not this\" or tg:gate and tag:runner";

const parser = new QueryParser(parserConfig.keywords as QueryKeywordOptions);

let tree: LogicTree<SearchToken>;

console.log("Hallo");

try {
    tree = parser.parse(query);
    console.log(JSON.stringify(tree));
} catch(error) {
    //TODO: Show as error message below search bar on result page.
    console.error(error);
}