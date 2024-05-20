import { db, Card, Set, eq, ne, gt, gte, lt, lte, like, and, or, 
    isNull, isNotNull, sql, notIlike, not, exists, notExists} from 'astro:db';

import { Column, type SQLWrapper } from 'drizzle-orm';

import type { LogicTree } from "./logicGroup";
import type { SearchToken, SearchGrp, SearchStr, KeywordType } from "./queryParser";

import { escapeQuotes } from '../utils';

/*
type AstroColumn = typeof Card.id
    |typeof Card.cardno
    |typeof Card.name
    |typeof Card.type
    |typeof Card.color
    |typeof Card.rarity
    |typeof Card.setId
    |typeof Card.side
    |typeof Card.level
    |typeof Card.cost
    |typeof Card.power
    |typeof Card.soul
    |typeof Card.trigger
    |typeof Card.traits
    |typeof Card.abilities
    |typeof Card.flavor
    |typeof Card.tags
    |typeof Set.name
    |typeof Set.releaseDate
    |typeof Set.shortName;
*/

/** Provide keywords and their configuration needed for the Drizzle Parser. */
export interface IKeywordOptions {
    [key: string]: {
        /** Type of keyword. string|array|number */
        type: KeywordType,
        /** DB Column reference in form "tablename.colname" */
        dbColumn: string,
        /** If enabled, only exact matches (not partial) will be found. */
        forceExactMatches?:boolean
    }
}

export class DrizzleParser {
    /** Contains a map for keywords to their options. */
    keywordOptions: IKeywordOptions;

    constructor(options: IKeywordOptions) {
        this.keywordOptions = options;
    }

    parseLogicTree(tree: LogicTree<SearchToken>, treeNegated=false): SQLWrapper|undefined {
        let expressions = [];
        for (const member of tree.members) {
            if(Array.isArray(member)) {
                //array members can only be in OR group.
                //We must parse array children as "and" (unless tree is negated, then switch).
                let childStatements = member.map( (x) => {
                    if(treeNegated) x.isNegated = !x.isNegated;
                    return this.parseMember(x, treeNegated);
                });
                //we need to use spread syntax to give the statements to and/or as array.
                //in a negated tree, after negating every expression, the logic op is also swapped.
                const func = treeNegated ? or : and;
                expressions.push(func(...childStatements));
            }
            else {
                expressions.push(this.parseMember(member, treeNegated));
            }
        }

        const func = treeNegated ? and : or;
        return func(...expressions);
    }

    private parseMember(member: SearchToken, treeNegated = false) {
        //Switch the negation status if the tree is negated.
        if(treeNegated) member.isNegated = !member.isNegated;

        if(member.type == "group") {
            //If negated, deep negate and swap and/or for the child logic tree.
            return this.parseLogicTree(member.members, member.isNegated);
        }
        else {
            const keyword = member.type == "expression" ? member.keyword : "name";
            let operator = member.type == "expression" ? member.operator : ":";
            const options = this.keywordOptions[keyword];
            const dbColumn = getColumnFromString(options.dbColumn);
            const value = getExpressionValue(member.value, options.type);

            //number always "=" instead of ":".
            if(options.type == "number" && operator == ":") {
                operator = "=";
            }
            //for regular strings, we change the operator like this.
            else if(options.type == "string" && options.forceExactMatches) {
                operator = "=";
            }
            else if(options.type == "array" && operator == ":" && options.forceExactMatches) {
                //:= operator: match the entire content of 1 array element. (TODO: decide if we make this available for user).
                //: match partial content of 1 array element.
                //= the entire array must be only this value.
                operator = ":=";
                //basically make sure we can't partial match the json column values?
                //we first need to test how to even match arrays.
            }

            return this.generateExpression(operator, dbColumn, value, member.isNegated);
        }
    }

    private generateExpression(operator: string, column:Column, value: string|number|null, isNegated=false ) {
        //"search none".
        if(value == null) {
            return isNegated ? isNotNull(column) : isNull(column);
        }
        
        //Array handling
        if(column.dataType == "json") {
            //TODO: we must also handle negated array expressions.
            if(operator == ":") {
                //array includes
                //with json_each in join, we can get the values extracted
                //so we can look for the value
                //but can we do more than 1 json_each? probably with alias.
                //we can however also look with like because it's ["",""] text.
                //so we use like ( %"${value}"% ) to find exact values.
                //and we can use a normal like for non-exact values.
                //BUT check how we can match quotes in the values.
                //And for ability, we must be able to match quotes in the text.
                //we should use json_each at least for abilities.
                //for traits, we must check if there are traits with quotes in them.
                //assume it's possible we get them in the future as well.

                //If we use json_each, how can we find a query "a:x a:y" where x and y 
                //are in different abilities?
                //Maybe we need a transposed table that makes the json_each abilities into columns?
                //Or with a subquery.
                //WHERE EXISTS(SELECT * FROM json_each(abilities) WHERE value LIKE '%a%' )
                const compareFunc = like(column, `%${escapeQuotes(<string>value)}}%`);
                return isNegated ? or(not(compareFunc), isNull(column)) : compareFunc;

                //TODO test both variants for performance and accuracy.
                
                /*
                const abilityContains = db.select().from(sql`json_each(${column.table}.${column.name})`)
                    .where(sql<boolean>`json_each.value LIKE '%${value}%'`);
                    //TODO: maybe need "as(name)".

                return isNegated ? or(isNull(Card.abilities), notExists(abilityContains)) : exists(abilityContains);
                */

            }
            else if(operator == ":=") {
                //Exact matches on 1 array element. JSON.stringify wraps in quotes and escapes them.
                const compareFunc = like(column, `%${JSON.stringify(value)}%`);
                return isNegated ? or(not(compareFunc), isNull(column)) : compareFunc;
            }
            else if(operator == "=") {
                //array must be length 1 and that element must be value.
                //we can use json_array_length(column, '$') to get the length.
                //Or we use = ["${value}"]
                //TODO: Check how sqlite handles quotes in these JSON strings. -> They escape them.
                //If they're escaped we must escape them too. -> Yes we have to escape them in query.
                //Also check what happens when we use json_each. unescape or no? -> unescape.
                const compareVal = `[${JSON.stringify(value)}]`;
                return isNegated ? or(ne(column, compareVal), isNull(column)) : eq(column, compareVal);
            }
            else {
                throw new Error("Invalid operator for arrays.");
            }
        }
        
        //TODO: We probably can't match case-insensitively like this.
        //We can use sql literal with sql`a like b`.
        //We can try to see if the sqlite pragam can be set somewhere
        //We can test if the checks are already CI (unlikely).
        //We can check for ILIKE operator.
        //Since "notILike" is apparently a thing in astro, maybe we can use not(notILike).
        //Also the bottom code is just for string/number.

        //Note: In SQLite Browser, PRAGMA Case-Sensitive Like is DISABLED!

        //we cannot use < as negated version of >= because NULL exists, so use not().
        let expression;
        if(operator == ":") expression = like(column, `%${value}%`);
        else if(operator == "=") expression = eq(column, value);
        else if(operator == "<") expression = lt(column, value);
        else if(operator == ">") expression = gt(column, value);
        else if(operator == "<=") expression = lte(column, value);
        else if(operator == ">=") expression = gte(column, value);
        else throw new Error("Invalid operator for expression");

        return isNegated ? or(not(expression), isNull(column)) : expression;
    }
}

function getColumnFromString(columnStr: string): Column {
    //sanity check, since the data comes from a config.
    if(!/\w+\.\w+/.test(columnStr)) {
        throw new Error(`Invalid DB Column "${columnStr}". Expected "table.column".`);
    }

    return eval(columnStr);
}

function getExpressionValue(value: string|null, type: KeywordType) {
    if(value == null) return null;
    if(type == "number") return parseInt(value);
    return value;
}

function lower(col:Column) {
    return sql<string>`lower(${col})`;
}