import { db, sql, Card, Set } from 'astro:db';
import { type Column } from 'drizzle-orm';

/**
 * Converts a column name into the actual column instance.
 * Works only on tables that are coded into getTableFromName.
 * @param columnStr Column name (Format "Table.column")
 * @returns AstroDB Column instance
 */
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

/**
 * Converts a table name into the actual table (hard-coded).
 * @param tableName Name of the DB table (case-sensitive).
 * @returns AstroDB table instance. 
 */
export function getTableFromName(tableName: string) {
    if(tableName == "Card") return Card;
    if(tableName == "Set") return Set;
    return null;
}

/**
 * Converts a JSON column value into a string array.
 * @param value column value of a JSON DB column.
 * @returns the column value as a string array.
 */
export function dbarray(value: any):string[] {
    return value as string[] ?? [];
} 

/**
 * Get all distinct values from an array JSON column.
 * @param column a JSON-type DB column containing a string array.
 * @returns an array of all distinct single values of the column.
 */
export async function getDistinctArrayColValues(column: Column) {
    return db.selectDistinct({value: sql`json_each.value`}).from(sql`${column.table},json_each(${column})`); // as Promise<{value:string}[]>;
}

/**
 * Executes db.select with a list of combined card/set columns.
 * Specifying the columns means we don't have to use "Card"/"Set" col groups.
 * @returns result of db.select.
 */
export function selectCardSetCols() {
    // missing: abilites, flavor, tags, setId.
    return db.select({
        id: Card.id,
        cardno: Card.cardno,
        name: Card.name,
        type: Card.type,
        color: Card.color,
        rarity: Card.rarity,
        side: Card.side,
        level: Card.level,
        cost: Card.cost,
        power: Card.power,
        soul: Card.soul,
        trigger: Card.trigger,
        traits: Card.traits,
        image: Card.image,
        icons: Card.icons,
        setName: Set.name,
        releaseDate: Set.releaseDate
    });
}