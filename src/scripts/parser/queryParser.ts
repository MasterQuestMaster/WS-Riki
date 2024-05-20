import { Tokenizer, type TokenType } from "./tokenizer";
import { LogicGroup, type LogicTree } from "./logicGroup";

export type SearchToken = SearchGrp|SearchExp|SearchStr;
export type KeywordType = "string"|"array"|"number";

/** Expression of form "[keyword][operator][value]". */
export interface SearchExp {
    type: "expression",
    keyword: string, 
    operator: string, 
    value: string|null,
    isNegated?: boolean 
}

/** Used for both quoted and unquoted (freetext) strings. */
export interface SearchStr {
    type: "string",
    value: string,
    isNegated?: boolean
}

/** Parentheses group containing its own complete query. */
export interface SearchGrp {
    type: "group",
    members: LogicTree<SearchToken>,
    isNegated?: boolean
}

/** Logical operator (and/or). "and" is ignored by the parser. */
interface LogicOp {
    type: "logic",
    value: "and"|"or"
}

/** Provide keywords and their configuration for the Query Parser */
export interface IKeywordOptions {
    [key: string]: {
        /** Type of keyword. string|array|number. */
        type: KeywordType,
        /** Provide additional names that will be recognized as this keyword. */
        aliases?: string[],
        /** If enabled, using "-" or "none" will search for the absence of that property. Default false. */
        allowSearchNone?:boolean,
        /** Map certain search values to other values. */
        valueMapping?: Record<string, string>
    }
}

export class QueryParser {
    /** Contains a map for main keywords to their options. */
    keywordOptions: IKeywordOptions;
    /** Contains a map of all the aliases back to their main keyword. */
    private keywordAliases: {[key: string]: string};
    /** Parses the query into tokens and returns them. */
    private tokenizer: Tokenizer;

    /**
     * Create a new Query Parser to parse search expressions.
     * @param keywords Keywords to recognize in the query. Keywords in key, their options as value.
     */
    constructor(keywords: IKeywordOptions) {
        this.keywordOptions = keywords;

        this.keywordAliases = Object.entries(this.keywordOptions).reduce((acc: any, [key, val]) => {
            //set all the aliases to point to the key, and then the keyword itself.
            val.aliases?.forEach((alias) => acc[alias] = key);
            acc[key] = key;
            return acc;
        },{});

        //We need this so TS doesn't yell "tokenizer can be null".
        this.tokenizer = new Tokenizer(null);
    }

    /**
     * Parse a search query into a tree of search tokens.
     * @param query Query to parse. No line-breaks allowed.
     * @returns AND/OR tree containing all the parsed search tokens.
     */
    parse(query: string|null): LogicTree<SearchToken> {
        //No query, no search.
        if(!query) {
            throw new Error("You didn't enter anything to search for.");
        }

        //All aliases are treated as separate recognizable keywords.
        const keywords = Object.keys(this.keywordAliases);
        this.tokenizer = new Tokenizer(query, keywords, [":","=",":=","<","<=",">",">="]);

        //Let and/or be handled automatically by this class.
        let queryStatements = new LogicGroup<SearchToken>();

        while(!this.tokenizer.eof()) {
            const searchToken = this.parseOpenState();
            this.handleParsedToken(searchToken, queryStatements);
        }

        return queryStatements.getTree();
    }

    /** Parse anything that can be in an open query state. () groups are parsed recursively. */
    private parseOpenState(): SearchToken|LogicOp|null {
        const tk = this.tokenizer.peek();

        switch(tk?.type) {
            case "neg": return this.parseNegatedExpression();
            case "key": return this.parseSearchExpression();
            case "string": return this.parseString();
            case "opengrp": return this.parseSearchGroup();
            case "logop": return this.parseLogicalOperator();
        }

        return null;
    }

    /** Handle logical operators vs search tokens in the logic group. */
    private handleParsedToken(token: SearchToken|LogicOp|null, logicGroup: LogicGroup<SearchToken>) {
        if(token?.type == "logic") {
            //and is ignored because it's the default anyway.
            if(token.value == "or") logicGroup.or();
        }
        else if(token) {
            logicGroup.addAnd(token);
        }
        else {
            this.unexpected();
        }
    }

    /** Skip the "-" and then parse the next state to negate it if able. */
    private parseNegatedExpression():SearchToken | null {
        this.skip("neg");
        const tk = this.tokenizer.peek();

        //Logop is treated as free text. Multiple "-" are treated as 1.
        let searchToken = null;
        switch(tk?.type) {
            case "key": searchToken = this.parseSearchExpression(); break;
            case "string": searchToken = this.parseString(); break;
            case "opengrp": searchToken = this.parseSearchGroup(); break; //-(...) negates the whole group.
            case "logop": searchToken = this.parseString(); break; //-and/-or should be a freetext search.
        }

        if(searchToken) searchToken.isNegated = true;
        return searchToken;
    }

    /** Parse keyword (already known), operator and value all at once. */
    private parseSearchExpression(): SearchExp|null {
        const key = this.tokenizer.next();
        if(!key?.value) return null;

        const parentKeyword = this.keywordAliases[key.value];

        return {
            type: "expression",
            keyword: parentKeyword,
            operator: this.parseOperator(parentKeyword) ?? "",
            value: this.parseSearchValue(parentKeyword) //this can be null for "search none".
        };
    }

    /** Parse quoted or unquoted strings. Empty strings are allowed. */
    private parseString(): SearchStr|null {
        const str = this.tokenizer.next();
        if(!str) return null;

        return { 
            type: "string",
            value: str.value ?? ""
        };
    }

    /** Parse a () group as if it was its own complete search query that ends with ")". Throw if no ")". */
    private parseSearchGroup(): SearchGrp|null {
        this.skip("opengrp");

        let groupStatements = new LogicGroup<SearchToken>();

        //Act like main parse function, but watch for ")".
        while(!this.tokenizer.eof() && !this.isGroupClosing()) {
            const searchToken = this.parseOpenState();
            this.handleParsedToken(searchToken, groupStatements);
        }

        //Throw if we hit EOF before a ")".
        if(!this.isGroupClosing()) {
            throw new Error("Your search contains unclosed parentheses.");
        }

        this.skip("closegrp");
        return {
            type: "group",
            members: groupStatements.getTree()
        };
    }

    /** Parse and/or */
    private parseLogicalOperator(): LogicOp|null {
        const operator = this.tokenizer.next();
        if(!operator?.value) return null; 

        return {
            type: "logic",
            value: <"and"|"or">operator.value
        };
    }

    /** Parse operator for expression. Returns a string, not a Token. */
    private parseOperator(keyword: string): string|null {
        const kwOptions = this.keywordOptions[keyword];
        const operator = this.tokenizer.peek("expression");

        if(operator?.type != "op") {
            this.tokenizer.croak(`Unexpected token in ${keyword} expression. Expected operator.`);
            return null;
        }
        else if(!isValidOperator(operator.value, kwOptions.type)) {
            this.tokenizer.croak(`Operator ${operator.value} is invalid for keyword ${keyword}.`);
            return null;
        }
        else {
            this.tokenizer.next("expression");
            return operator.value;
        }
    }

    /** Parse search value for expression. Returns a string, not a Token. */
    private parseSearchValue(keyword: string): string|null {
        const kwOptions = this.keywordOptions[keyword];
        const searchValue = this.tokenizer.peek("expression");

        if(!searchValue) {
            this.tokenizer.croak(`Unexpected token in ${keyword} expression. Expected search value.`);
            return null;
        }
        else if(!isValidSearchValueType(searchValue.value, searchValue.type, kwOptions.type, kwOptions.allowSearchNone)) {
            //TODO: This is just for testing. After testing, we want to handle these error by displaying an error message and ignoring the term.
            this.tokenizer.croak(`Type ${searchValue.type} cannot be used with ${keyword}.`);
            return null;
        }
        else if(searchValue.value.length == 0) {
            this.tokenizer.croak(`You must provide a search value for the expression.`);
            return null;
        }
        else {
            this.tokenizer.next("expression");
            return getAdjustedSearchValue(searchValue.value, kwOptions.allowSearchNone, kwOptions.valueMapping);
        }
    }

    private skip(type?: TokenType) {
        const current = this.tokenizer.peek();
        if (current?.type == type) this.tokenizer.next();
        else this.tokenizer.croak(`Expected type ${type}. Got ${current?.type}.`);
    }

    private isGroupClosing() {
        return this.tokenizer.peek()?.type == "closegrp";
    }

    private unexpected() {
        this.tokenizer.croak("Unexpected token: " + JSON.stringify(this.tokenizer.peek()));
    }

}

function isValidOperator(operator: string, keywordType: KeywordType) {
    //only numbers can use comparison operators.
    if(keywordType == "number") return [":","=","<",">","<=",">="].includes(operator);
    //Arrays can use ":=" (match single array entry exactly).
    if(keywordType == "array" ) return [":","=",":="].includes(operator);
    //Strings can use ":" or "=".
    return operator == "=" || operator == ":";
}

function isValidSearchValueType(searchValue: string, tokenType: TokenType, keywordType: KeywordType, allowSearchNone=false) {
    //"num" is allowed for all kws (treated as text for non-number types).
    //"string" is not allowed for number kws, except "none"/"-" when "search none" is set.
    const val = searchValue.toLowerCase();
    return tokenType == "num" 
        || (tokenType == "string" && keywordType != "number" )
        || (allowSearchNone && (val == "none" || val == "-"));
}

function getAdjustedSearchValue(searchValue: string, allowSearchNone=false, valueMapping?: Record<string, string>) {
    //lower case for comparisons.
    const val = searchValue.toLowerCase();

    //If a shorthand value was entered, expand to the full value.
    if(valueMapping && valueMapping[val]) {
        return valueMapping[val];
    }

    //Handle "Search None" option by using null as the search value.
    if(allowSearchNone && (val == "none" || val == "-")) {
        return null;
    }

    return searchValue;
}