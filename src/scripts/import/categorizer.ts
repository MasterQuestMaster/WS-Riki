import type CardModel from "src/models/CardModel";

export function getTagsFromCardText(card: CardModel) {
    //return tags as array
    let tags = [];

    const abilities = card.abilities?.join("\n") ?? "";

    //This does not hit old stuff that does not mention climax area.
    //Like discarding the CX (Re:Zero Subaru, P5 Futaba).
    //We can't distinguish CX discard from other names cards.
    //If the categorization is done after importing the set,
    //we can extract a list of CX and look for mentions of that.
    //this should be in addition to this check to not miss out-of-set CX.
    //There are mentions of CXCOMBO that aren't CXCOMBO themselves like Renner OVL2.
    //Therefore we must also check for a preceeding CONT/AUTO/ACT.
    if(/【(CONT|AUTO|ACT)】 【CXCOMBO】/.test(abilities) 
      || abilities.includes("\" is in your climax area")
      || abilities.includes("\" is placed on your climax area")
      || abilities.includes("\" from your climax area into your waiting room")) {
        tags.push('CXCOMBO');
    }

    return null;
}