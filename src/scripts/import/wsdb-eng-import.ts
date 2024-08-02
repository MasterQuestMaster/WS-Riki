import { getTagsFromCardText } from "./categorizer";
import { db, like, NeoStandard } from "astro:db";

export interface JsonCard {
    name: string;
    code: string;
    rarity: string;
    expansion: string;
    side: string;
    type: string;
    color: string;
    level: string;
    cost: string;
    power: string;
    soul: number;
    trigger: string[];
    attributes: string[];
    ability: string[];
    flavor_text: string;
    set: string;
    release: string;
    sid: string;
    image: string;
}

export async function getDbCardFromJson(card: JsonCard) {
    const dbCard = {
        //Replace special chars with underscores to form card id.
        id: card.code.replaceAll(/[^a-zA-Z0-9]/, "_"),
        cardno: card.code,
        titleCode: card.set,
        name: card.name,
        type: card.type,
        color: card.color,
        rarity: card.rarity,
        neo: await getNeoStandardIdFromTitle(card.set),
        //W + 103
        setId: card.side + card.sid,
        side: card.side,
        level: toNumber(nullIfEmpty(card.level)),
        cost: toNumber(nullIfEmpty(card.cost)),
        power: toNumber(nullIfEmpty(card.power)),
        //soul is the only number (0 default) so to check null, we check for card type.
        soul: card.type != "Character" ? null : card.soul,
        trigger: nullIfEmptyArray(card.trigger),
        //traits are "-" in JSON if empty.
        traits: nullIfEmptyArray(removeEmpty(card.attributes, "-")),
        abilities: nullIfEmptyArray(card.ability),
        //copy of abilities with generic trait placeholders for wildcard searching
        abilities_ph: nullIfEmptyArray(card.ability.map(abl => placeholderizeTraits(abl))),
        flavor: nullIfEmpty(card.flavor_text),
        //tags should be done afterwards
        tags: null,
        icons: nullIfEmptyArray(getIcons(card.ability)),
        image: card.image
    };

    dbCard.tags = getTagsFromCardText(dbCard);

    return dbCard;
}

//make a string null if it's empty.
function nullIfEmpty(value: string) {
    return value === "" ? null : value;
}

//make an array null if it's empty.
function nullIfEmptyArray(value: string[]) {
    return value.length === 0 ? null : value;
}

function toNumber(value: string|null) {
    return value == null ? null : parseInt(value);
}

//remove empty strings and "-" from arrays.
function removeEmpty(array: string[], additionalEmptyChar: string) {
    return array.filter(item => item !== "" && item !== additionalEmptyChar);
}

//Replace traits with generic versions to aid in generic trait search.
function placeholderizeTraits(abilityText: string) {
    //this does not work correctly with SAO cards that mention cards with《》in name in their text.
    //But the effort does not justify excluding those.
    return abilityText.replaceAll(/《 .*?》/, "《TRAIT》");
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
        return [titleCode];
    }
}