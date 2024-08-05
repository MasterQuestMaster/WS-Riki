import { eq, ne, gt, gte, lt, lte, like, and, or, isNull, isNotNull, sql, not} from 'astro:db';

import { type Column, type SQL } from 'drizzle-orm';

import type { SearchToken, KeywordType } from "./queryParser";
import { type LogicTree, negateLogicTree } from "./logicGroup";
import { getColumnFromString } from '../db-utils';
import { escapeQuotes } from '../utils';

/** Provide keywords and their configuration needed for the Drizzle Parser. */
export interface IKeywordOptions {
    [key: string]: {
        /** Type of keyword. string|array|number */
        type: KeywordType,
        /** DB Column reference in form "tablename.colname". Can be array of columns. */
        dbColumn: string | string[],
        /** If enabled, only exact matches (not partial) will be found. */
        forceExactMatches?:boolean,
        /** Configure placeholder search with an additional column */
        placeholderSearch?:{
            /** Map DB columns to their partner column which has the pattern replaced with the placeholder */
            columnMap: Record<string,string>,
            /** Placeholder used in DB column (also used for search) */
            placeholder: string,
            /** The pattern that the placeholder replaces. */
            pattern: string
        }
    }
}

type ParserStatistics = {
    keywordUsage: Record<string, number>;
}

export class DrizzleParser {
    /** Contains a map for keywords to their options. */
    keywordOptions: IKeywordOptions;
    /** Stores statistics about the parsed contents (keyword usage). */
    statistics: ParserStatistics;

    constructor(options: IKeywordOptions) {
        this.keywordOptions = options;
        this.statistics = { keywordUsage: {} };
    }

    parseLogicTree(tree: LogicTree<SearchToken>): SQL|undefined {
        let expressions = [];
        for (const member of tree.members) {
            if(Array.isArray(member)) {
                //Type for array children is opposite type of the main and (and/or vs or/and).
                const childAndOr = tree.type == "and" ? or : and;
                const childStatements = member.map(this.parseMember, this);

                if(childStatements.length > 0) {
                    expressions.push(childAndOr(...childStatements));
                }
            }
            else {
                expressions.push(this.parseMember(member));
            }
        }

        if(expressions.length > 0) {
            const mainAndOr = tree.type == "and" ? and : or;
            return mainAndOr(...expressions);
        }

        return undefined;
    }

    private parseMember(member: SearchToken) {

        if(member.type == "group") {
            if(member.isNegated) {
                //deeply negate the entire tree beforehand to make query construction easier.
                negateLogicTree(member.tree, tokenNegator);
            }

            return this.parseLogicTree(member.tree);
        } 
        else {
            //Strings default to name search with ":".
            const keyword = member.type == "expression" ? member.keyword : "name";
            const operator =  member.type == "expression" ? member.operator : ":";

            //Count how many times each keyword was used since the creation of the parser.
            this.increaseUsageStatistic(keyword); 

            const options = this.keywordOptions[keyword];
            const adjustedOp = getAdjustedOperator(operator, options.type, options.forceExactMatches);

            //Multiple columns should be searched as "OR".
            if(Array.isArray(options.dbColumn)) {
                const expressionList = options.dbColumn.map((column) => {
                    const dbCol = getColumnFromString(column);
                    return this.generateExpression(dbCol,adjustedOp, member.value, options.type, member.isNegated);
                }, this);

                return or(...expressionList);
            }

            const dbCol = getColumnFromString(options.dbColumn);
            const phColName = options.placeholderSearch?.columnMap?.[options.dbColumn];

            if(phColName && options.type != "number" && member.value !== null) {7
                //in generate expression we remove all % so this can't be done here. Maybe pass placeholder to generate expression.
                //it's only relevant if it's a string with a value.
                //generate expression is only called on 2 instances in this func, so we could just replace % here instead.
                //then we don't need the placeholder thingy in generateExpression.
                const genericValueForMainCol = member.value.replaceAll(options.placeholderSearch!.placeholder, "%");
                const genericValueForMappedCol = member.value.replace(new RegExp(options.placeholderSearch!.pattern, "gi"), options.placeholderSearch!.placeholder);

                const phCol = getColumnFromString(phColName);
                const mainExpression = this.generateExpression(dbCol, adjustedOp, genericValueForMainCol, options.type, member.isNegated, options.placeholderSearch!.placeholder);
                const phExpression = this.generateExpression(phCol, adjustedOp, genericValueForMappedCol, options.type, member.isNegated);
                //both must be fulfilled to find correct matches.
                //in the generateExpression function, we must replace the placeholder value with % after removing existing %.
                return and(mainExpression, phExpression);
            }

            return this.generateExpression(dbCol, adjustedOp, member.value, options.type, member.isNegated);
        }
    }

    private generateExpression(
        column:Column, 
        operator: string, 
        value: string|null, 
        type:"string"|"number"|"array",
        isNegated=false,
        likePlaceholder?:string, //instances of this in value will be used as % in like. 
    ) {
        //"search none".
        if(value == null) {
            return isNegated ? isNotNull(column) : isNull(column);
        }
        
        //Array handling
        if(type == "array") {
            if(operator == "=") {
                //array must be length 1 and that element must be the value.
                //SQLite escpaes quotes in JSON strings, but when json_each is used, the quotes are unescaped.
                const sqlVal = `["${JSON.stringify(value)}]`; //stringify wraps in quotes.
                return maybeNegate(eq(column, sqlVal), column, isNegated);
            }
            else {
                //if we search directly in the json column, we must escape "". Also remove % for LIKE.
                let sqlVal = escapeQuotes(value.replaceAll("%","")); 
                if(operator == ":=") sqlVal = `"${sqlVal}"`; //for exact match, we include the quotes.
                return maybeNegate(like(column, `%${sqlVal}%`), column, isNegated);
            }
        }
        else if(type == "string") {
            //like is case-insensitive by default.
            if(operator == "=") return maybeNegate(eq(lower(column), lower(value)), column, isNegated);
            if(operator == ":") return maybeNegate(like(column, `%${value.replaceAll("%","")}%`), column, isNegated);
            throw new Error(`Invalid operator (${operator}) for text expression`);
        }
        else {
            const numValue = parseInt(value);
            let expression: SQL|null = 
                (operator == "=") ? eq(column, numValue) :
                (operator == "!=") ? ne(column, numValue) :
                (operator == "<") ? lt(column, numValue) :
                (operator == ">") ? gt(column, numValue) :
                (operator == "<=") ? lte(column, numValue) :
                (operator == ">=") ? gte(column, numValue) : null;

            if(!expression) {
                throw new Error(`Invalid operator (${operator}) for numeric expression`);
            } 

            return maybeNegate(expression, column, isNegated);
        }
    }

    private increaseUsageStatistic(keyword:string) {
        const usage = this.statistics.keywordUsage;
        usage[keyword] = (usage[keyword] ?? 0) + 1;
    }
}

function getAdjustedOperator(operator: string, type: KeywordType, forceExactMatches=false) {
    if(type == "number" && operator == ":") return "="; //number always "=" instead of ":".
    if(type == "string" && forceExactMatches) return "="; //regular string (exact matches): always "=".
    if(type == "array" && operator == ":" && forceExactMatches) return ":="; //":=" instead of ":" (match 1 entry exactly)
    return operator;
}

//Negator function for "negateLogicTree".
function tokenNegator(token:SearchToken) {
    //Recursively negate group members.
    if(token.type == "group") {
        negateLogicTree(token.tree, tokenNegator);
    }

    //this also applies for groups, because after the inner negate, the flag can be removed.
    token.isNegated = !token.isNegated;
}

//If negate is specified, apply not, but also include null rows.
function maybeNegate(expression: SQL, nullColumn: Column, isNegated:boolean) {
    //For non-nullable column, we use a regular not().
    if(isNegated && nullColumn.notNull) return not(expression);
    if(isNegated) return or(not(expression), isNull(nullColumn));
    return expression;
}

function lower(value: Column|string) {
    return sql`lower(${value})`;
}