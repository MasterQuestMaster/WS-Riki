import InputStream from "./inputStream";
import { unquote } from "../utils";

export type TokenType = "neg"|"key"|"op"|"logop"|"string"|"num"|"opengrp"|"closegrp";
export type LexerMode = "open"|"expression"

export interface Token {
    type: TokenType,
    value: string
}

export class Tokenizer {
    private input: InputStream;
    private current: Token|null = null;

    keywords: string[];
    operators: string[];

    constructor(query: string|null, keywords?:string[], operators?:string[]) {
        this.input = new InputStream(query ?? "");
        this.keywords = keywords ?? [];
        this.operators = operators ?? [];

        //Longer operators need to go first for regex, so sort in reverse.
        this.operators.sort().reverse();
    }
    
    private read_next(mode:LexerMode): Token|null {

        //skip whitespace (except in expression mode)
        if(mode != "expression") this.read_while(is_whitespace);

        //stop at end of string.
        if (this.input.eof()) return null;

        let ch = this.input.peek();

        //Start new groups/expressions from open state.
        if(mode == "open") {
            let logop = read_and_or(this.input)?.toLowerCase();
            if (logop) return { type: "logop", value: logop }

            if (ch == "-") return { type: "neg", value: this.input.next() }
            if (ch == "(") return { type: "opengrp", value : this.input.next() };
            if (ch == ")") return { type: "closegrp", value: this.input.next() };

            if (is_key_start(ch)) return this.read_keyword();
        }
        //continue evaluating expressions
        else if(mode == "expression") {
            if (is_op_char(ch, this.operators)) return this.read_op();
            if(is_digit(ch)) {
                //this only returns a value if the value is ONLY a number.
                const number = read_number_value(this.input);
                if(number) return { type: "num", value: number };
            }
        }

        //strings are allowed in both modes.
        if (is_quot(ch)) return this.read_string();
        if (is_free_text(ch)) return this.read_free_text();

        this.input.croak("Can't handle character: " + ch);
        return null;
    }

    //Parse any operator, no matter if they're valid here.
    private read_op(): Token|null {
        let match = this.input.read_match(`(${this.operators.join("|")})`);
        return match ? { type: "op", value: match } : null;
    }

    //Lookahead for a valid "keyword:value" expression to see if it's a key.
    //If it's not a key, read as free text instead.
    private read_keyword(): Token {
        //Match keyword-operator-text without whitespace.
        let exprPattern = `\\w+(?=(${this.operators.join("|")})[^\\s()])`;
        let keyword = this.input.peek_match(exprPattern)?.toLowerCase();
        if(keyword && this.keywords.includes(keyword)) {
            this.input.next(keyword.length);
            return { type:"key", value: keyword };
        }
        else {
            return this.read_free_text();
        }
    }

    //read a string, stripping quotes and escape chars. (read until closing quotes or EOF)
    private read_string(): Token {
        return { type: "string", value: this.read_escaped() };
    }

    //read unquoted text
    private read_free_text(): Token {
        return { type: "string", value: this.read_while(is_free_text) };
    }

    //read a string until the end char, allowing escaping with \.
    //if the quotes are not closed, read until eof.
    private read_escaped() {
        //"/' is automatically detected and escaped.
        let matchedText = this.input.read_match(/(?<qt>["']).*?[^\\](\k<qt>|$)/);
        return unquote(matchedText) ?? "";
    }
    
    //read a string while it matches the specified format.
    private read_while(predicate: (ch: string) => boolean) {
        var str = "";
        while (!this.input.eof() && predicate(this.input.peek()))
            str += this.input.next();
        return str;
    }
    
    /** PUBLIC FUNCTIONS */

    public peek(mode:LexerMode="open") {
        if(!this.current) {
            this.current = this.read_next(mode);
        }

        return this.current;
    }
    
    public next(mode:LexerMode="open") {
        const tok = this.current;
        this.current = null;
        return tok || this.read_next(mode);
    }
    
    public eof() {
        return this.peek() == null;
    }

    public croak(msg:string) {
        this.input.croak(msg);
    }

}

//read a positive integer
function read_number_value(input: InputStream) {
    //For numbers, we can only return it if there is no text immediately following it ("2soul" is freetext)
    //we terminate at quotes like scryfall would and also consider potential end of string (unlike "and/or").
    return input.read_match(/\d+(?=[\s("']|$)/i);
}

function read_and_or(input: InputStream) {
    //match the and/or and move the cursor.
    //The delimiter in not included in the match, so that it doesn't get read.
    return input.read_match(/(or|and)(?=[\s("'])/i);
}

function is_whitespace(ch: string) {
    return " \t".indexOf(ch) >= 0;
}

function is_quot(ch: string) {
    return "\"'".indexOf(ch) >= 0;
}

function is_digit(ch: string) {
    return /[0-9]/i.test(ch);
}

function is_op_char(ch: string, operators:string[]) {
    return operators.join().indexOf(ch) >= 0;
}

function is_key_start(ch: string) {
    //keyword can't start with a number.
    return /[a-z_]/i.test(ch);
}

function is_free_text(ch: string) {
    //free text is terminated by space and parentheses.
    //Operators and others are ignored to allow special name matching like Re=L
    return /[^\s()]/.test(ch);
}
