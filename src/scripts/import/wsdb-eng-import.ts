import { getTagsFromCardText } from "./categorizer";
import { db, NeoStandard, Rarity, eq, like, or } from "astro:db";
import type { SetFileEntry } from "src/schemas/SetFile";
import { NeoStandardDbSchema, type NeoStandardModel } from "src/schemas/NeoStandard";
import { RarityDbSchema, type RarityModel } from "src/schemas/Rarity";

/**
 * Transforms a card entry from the JSON file to a DB-ready row.
 * @param card Card object from JSON file
 * @param setId Set ID (e.g.: W32)
 * @param neoList List of Neo Standards used for this set
 * @returns Transformed Card object that can be inserted into the Card table.
 */
export function getDbCardFromJson(card: SetFileEntry, setId: string, neoList: NeoStandardModel[]) {
    //Most empty values in the JSON files are either "" or "-". We want to remove those.
    const emptyOrDash = (val: string) => (val == "" || val == "-");

    //card.set: title code
    //card.release: set number (after W/S)
    //card.sid: card number (E001)
    //card.expansion: set name

    const dbCard = {
        //Replace special chars with underscores to form card id.
        id: card.code.replace(/[^a-zA-Z0-9]/g, "_"),
        cardno: card.code,
        titleCode: card.set,
        name: card.name,
        type: card.type,
        color: card.color.substring(0,1).toUpperCase(), //First letter
        rarity: card.rarity,
        //Filter NeoStandard List and get the IDs based on the set.
        neo: getNeoStandards(card.set, neoList),
        //We can't use side+release since some card are outliers (Haruhi Swing)
        setId: setId,
        side: card.side,
        level: toNumber(nullIf(card.level, emptyOrDash)),
        cost: toNumber(nullIf(card.cost, emptyOrDash)),
        power: toNumber(nullIf(card.power, emptyOrDash)),
        //soul is the only number (0 default) so to check null, we check for card type.
        soul: card.type != "Character" ? null : card.soul,
        trigger: nullIfEmptyArray(card.trigger),
        //traits are "-" in JSON if empty.
        traits: nullIfEmptyArray(removeIf(card.attributes, emptyOrDash)),
        abilities: nullIfEmptyArray(card.ability),
        //copy of abilities with generic trait placeholders for wildcard searching
        abilities_ph: nullIfEmptyArray(card.ability.map(abl => placeholderizeTraits(abl))),
        flavor: nullIf(card.flavor_text, emptyOrDash),
        //tags should be done afterwards
        tags: null,
        icons: nullIfEmptyArray(getIcons(card.ability)),
        image: card.image
    };

    dbCard.tags = getTagsFromCardText(dbCard);

    //console.log("DB Card", dbCard);
    return dbCard;
}

export async function getNeoStandardsInSetFile(setFile: SetFileEntry[]): Promise<NeoStandardModel[]> {
    //find all title codes used in the set (card.set is the title code)
    const uniqueTitleCodes = [...new Set(setFile.map(card => card.set))];
    const likes = uniqueTitleCodes.map(code => like(NeoStandard.codes, `%"${code}"%`));
    const neoList = await db.select().from(NeoStandard).where(or(...likes));
    return NeoStandardDbSchema.array().parse(neoList);
}

//Currently not used but could be useful later.
export async function getRaritiesInSetFile(setFile: SetFileEntry[]): Promise<RarityModel[]> {
    const uniqueRarities = [...new Set(setFile.map(card => card.rarity))];
    const filter = uniqueRarities.map(rar => eq(Rarity.id, rar));
    const rarityList = await db.select().from(Rarity).where(or(...filter));
    return RarityDbSchema.array().parse(rarityList);
}

//make a string null if it's a specified value.
function nullIf(value: string, shouldNull: (val: string) => boolean) {
    return shouldNull(value) ? null : value;
}

//make an array null if it's empty.
function nullIfEmptyArray(value: string[]) {
    return value.length === 0 ? null : value;
}

function toNumber(value: string|null) {
    return value == null ? null : parseInt(value);
}

//remove specified values from array.
function removeIf(array: string[], shouldRemove: (val: string) => boolean) {
    return array.filter(item => !shouldRemove(item));
}

//Replace traits with generic versions to aid in generic trait search.
function placeholderizeTraits(abilityText: string) {
    //this does not work correctly with SAO cards that mention cards with《》in name in their text.
    //But the effort does not justify excluding those.
    return abilityText.replace(/《.*?》/g, "《TRAIT》");
}

//extract which icons are used from the ability text
function getIcons(abilities: string[]) {
    let icons = [];
    const entireText = abilities.join("\n");

    if(entireText.includes("【CLOCK】")) {
        icons.push("CLOCK");
    }

    if(entireText.includes("【COUNTER】")) {
        icons.push("BACKUP");
    }

    return icons;
}

function getNeoStandards(setId: string, neoList: NeoStandardModel[]) {
    //Consider "F**" (Bunko) by replacing * with regex lowercase.
    //Only if the ** is the only entry.
    return neoList.filter(neo => 
        (neo.codes.length == 1 && neo.codes[0].includes("*")) ? 
            setId.match(neo.codes[0].replaceAll("*", "[a-z]")) : 
            neo.codes.includes(setId) 
    ).map(neo => neo.id);
}