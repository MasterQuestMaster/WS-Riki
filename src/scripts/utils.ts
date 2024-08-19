import { stringifyLogicTree } from "./parser/logicGroup";
import type { SearchToken } from "./parser/queryParser";

//Slugify: To make a text be normalized and readable for URLs.
export function slugify(text:any) {
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
    
export function formatDate(date:Date) {
    return date.toLocaleDateString('en-US', {
        timeZone: "UTC",
    })
}

export function toPascal(text:string|undefined) {
    if(!text?.length) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Removes wrapped quotes ("/') and unescapes any of that type of quote in the text (\").
 * If the text is not wrapped in quotes, no unescape will be performed.
 * @param text A fully quoted text
 * @returns The text without wrapping quotes and with unescaped inside quotes.
 */
export function unquote(text:string|undefined) {
    const trimmedText = text?.trim();
    //check empty string
    if(!trimmedText?.length) {
        return text;
    }

    //check which quote character (and return if quotes don't match).
    const frontQuote = trimmedText.charAt(0);
    const backQuote = trimmedText.charAt(trimmedText.length - 1);
    if((frontQuote != "\"" && frontQuote != "'") || frontQuote != backQuote) {
        return text;
    }

    //unwrap quotes and unescapte embedded quotes.
    return trimmedText.slice(1,-1).replaceAll("\\" + frontQuote, frontQuote);
}

export function escapeQuotes(text:string|undefined) {
    if(!text?.length)
        return text;

    //turn string to JSON, escaping quotes and backslashes, then strip the start/end quotes.
    return JSON.stringify(text).slice(1,-1);
}

export function stringifySearchToken(token:SearchToken): string {
    //Recursively negate group members.
    if(token.type == "group") {
            return `${stringifyLogicTree(token.tree, (tk) => stringifySearchToken(tk))}`;
    }
    else if(token.type == "expression") {
            return `{${token.keyword}${token.operator}"${token.value}"}`;
    }
    else {
            return `{STRING:"${token.value}"}`;
    }
}

export function objectMap<TSource,TTarget>(obj:{[index:string]: TSource}, fn:(val:TSource, key:string)=>TTarget) {
    return Object.fromEntries(
        Object.entries(obj).map(
            ([key, val]) => [key, fn(val, key)]
        )
    );
}

export function objectFilter<T>(obj:{[index:string]: T}, fn:(val:T,key:string)=>boolean) {
    return Object.fromEntries(
        Object.entries(obj).filter(([key,val]) => fn(val, key))
    );
}

export function range(start: number, stop: number, step = 1):number[] {
    const arrayLength = Math.ceil((stop - start) / step) + 1;
    return Array(arrayLength)
        .fill(start)
        .map((x, y) => x + y * step)
}