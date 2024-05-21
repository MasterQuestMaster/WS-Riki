import { db, Card, Set, eq, ne, gt, gte, lt, lte, like, and, or, 
    isNull, isNotNull, sql, notIlike, not, exists, notExists} from 'astro:db';

import { Table, Column, type SQL } from 'drizzle-orm';

import type { SearchToken, SearchGrp, SearchStr, KeywordType } from "./queryParser";
import { type LogicTree, negateLogicTree } from "./logicGroup";
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
                const childStatements = member.map(this.parseMember);
                expressions.push(childAndOr(...childStatements));
            }
            else {
                expressions.push(this.parseMember(member));
            }
        }

        const mainAndOr = tree.type == "and" ? and : or;
        return mainAndOr(...expressions); //use spread syntax for args.
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

            const options = this.keywordOptions[keyword];
            const dbColumn = getColumnFromString(options.dbColumn);
            const adjustedOp = getAdjustedOperator(operator, options.type, options.forceExactMatches);
            const value = getExpressionValue(member.value, options.type);

            //Count how many times each keyword was used since the creation of the parser.
            this.increaseUsageStatistic(keyword); 

            return this.generateExpression(dbColumn, adjustedOp, value, member.type, member.isNegated);
        }
    }

    private generateExpression(column:Column, operator: string, value: string|number|null, type:string, isNegated=false ) {
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
                let sqlVal = escapeQuotes(<string>value); //if we search directly in the json column, we must escape "".
                if(operator == ":=") sqlVal = `"${sqlVal}"`; //for exact match, we include the quotes.
                return maybeNegate(like(column, `%${sqlVal}%`), column, isNegated);

                //TODO test this variant with the other for performance and accuracy.
                /*
                const abilityContains = db.select().from(sql`json_each(${column.table}.${column.name})`)
                    .where(sql<boolean>`json_each.value LIKE '%${value}%'`);
                    //TODO: maybe need "as(name)".

                return isNegated ? or(isNull(Card.abilities), notExists(abilityContains)) : exists(abilityContains);
                */
            }
        }
        
        //TODO: Check case insensitive matching.
        //String or Number
        let expression: SQL;
        if(operator == ":") expression = like(column, `%${value}%`);
        else if(operator == "=") expression = eq(column, value);
        else if(operator == "<") expression = lt(column, value);
        else if(operator == ">") expression = gt(column, value);
        else if(operator == "<=") expression = lte(column, value);
        else if(operator == ">=") expression = gte(column, value);
        else throw new Error(`Invalid operator for ${type} expression`);

        return maybeNegate(expression, column, isNegated);
    }

    private increaseUsageStatistic(keyword:string) {
        const usage = this.statistics.keywordUsage;
        usage[keyword] = (usage[keyword] ?? 0) + 1;
    }

    private resetStatistics() {
        this.statistics = { keywordUsage: {} };
    }
}

function getColumnFromString(columnStr: string): Column {
    const [tableName,columnName] = columnStr.split(".");
    const table = getTableFromName(tableName);

    if(!table)
        throw new Error(`Invalid table ${tableName}.`);

    if(!columnName || !Object.hasOwn(table, columnName))
        throw new Error(`Invalid DB Column "${columnStr}". Expected "table.column".`);

    const column = columnName as keyof typeof table;
    return table[column] as Column;
}

function getTableFromName(tableName: string) {
    if(tableName == "Card") return Card;
    if(tableName == "Set") return Set;
    return null;
}

function getExpressionValue(value: string|null, type: KeywordType) {
    if(value == null) return null;
    if(type == "number") return parseInt(value);
    return value;
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
    //(NOT (col > 5) OR col IS NULL)
    return isNegated ? or(not(expression), isNull(nullColumn)) : expression;
}