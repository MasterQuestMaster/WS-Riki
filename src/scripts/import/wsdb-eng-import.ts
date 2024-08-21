import { getTagsFromCardText } from "./categorizer";
import { db, like, NeoStandard } from "astro:db";
import {type SetFileEntry } from "src/schemas/SetFile";

export async function getDbCardFromJson(card: SetFileEntry, setId: string) {
    //Most empty values in the JSON files are either "" or "-". We want to remove those.
    const emptyOrDash = (val: string) => (val == "" || val == "-");

    const dbCard = {
        //Replace special chars with underscores to form card id.
        id: card.code.replace(/[^a-zA-Z0-9]/g, "_"),
        cardno: card.code,
        titleCode: card.set,
        name: card.name,
        type: card.type,
        color: card.color,
        rarity: card.rarity,
        neo: await getNeoStandardIdFromTitle(card.set),
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

async function getNeoStandardIdFromTitle(titleCode: string) {
    try {
        const neoIds = await db.select({id: NeoStandard.id}).from(NeoStandard)
        .where(like(NeoStandard.codes, `%${titleCode}%`));
        return neoIds.map(neo => neo.id);
    }
    catch {
        console.error(`Import: Failed to load Neo-Standards for ${titleCode}.`);
        return [];
    }
}