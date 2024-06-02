import { db, sql, Card, Set } from 'astro:db';
import { type Column } from 'drizzle-orm';

export function getColumnFromString(columnStr: string): Column {
    const [tableName,columnName] = columnStr.split(".");
    const table = getTableFromName(tableName);

    if(!table) {
        throw new Error(`Invalid table ${tableName}.`);
    }

    if(!columnName || !Object.hasOwn(table, columnName)) {
        throw new Error(`Invalid DB Column "${columnStr}". Expected "table.column".`);
    }

    const column = columnName as keyof typeof table;
    return table[column] as Column;
}

export function getTableFromName(tableName: string) {
    if(tableName == "Card") return Card;
    if(tableName == "Set") return Set;
    return null;
}

export function dbarray(value: any):string[] {
    return value as string[] ?? [];
} 

export async function getDistinctArrayColValues(column: Column) {
    return db.selectDistinct({value: sql`json_each.value`}).from(sql`${column.table},json_each(${column})`); // as Promise<{value:string}[]>;
}