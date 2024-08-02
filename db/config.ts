//When DB schema changes, the content.db in .astro must be deleted, or old tables will remain.
import { defineDb, defineTable, column } from 'astro:db';

const Set = defineTable({
  columns: {
    id: column.text({primaryKey: true}), //W45, SX01 -> get from end of JSON file name.
    name: column.text(), //Batman Ninja
    shortName: column.text({optional: true}),
    type: column.text({optional: true}), //Booster Pack, Extra Booster, Trial Deck, Promo
    releaseDate: column.date({optional: true})
  }
});
//TODO: Maybe we need a column for the title codes.

//Card Data. Abilities are in separate tables. Separate abilities so we can search for specific abilities.
const Card = defineTable({
  columns: {
    id: column.text({primaryKey: true}), //SPY_S106_E001, sanitized
    cardno: column.text(), //SPY/S106-E001
    name: column.text(), 
    titleCode: column.text(), //SPY
    type: column.text(), //Character/Event/Climax
    color: column.text(), //YELLOW/RED/GREEN/BLUE
    rarity: column.text(), //C/U/R/RR...
    setId: column.text({references: () => Set.columns.id}),
    neo: column.json(), //["DAL","Fdl"]
    side: column.text(), //W/S
    level: column.number({optional: true}),
    cost: column.number({optional: true}),
    power: column.number({optional: true}),
    soul: column.number({optional: true}),
    trigger: column.json({optional: true}), //Soul/Gate...
    traits: column.json({optional: true}), //Magic/Weapon/Avatar...
    abilities: column.json({optional: true}), //【AUTO】 [(1) Put the top card of your deck into your clock] When this card is placed...
    abilities_ph: column.json({optional: true}), // Search a <<TRAIT>> character...
    flavor: column.text({optional: true}),
    tags: column.json({optional: true}), //CXCombo/Riki
    icons: column.json({optional:true}),
    image: column.text() //name of the image file.
  }
});

//Group sets into NeoStandards (https://en.ws-tcg.com/rules/deck/)
//Each set can be part of multiple groups. The groups are decided by DB-JSON first part (sanitized)

/*
Neo-Std: Have the ID in the Card table as "neo" (JSON array).
Codes in this table are JSON array.
Search by LIKE.
*/

const NeoStandard = defineTable({
  columns: {
    id: column.text({primaryKey: true}),
    title: column.text(),
    codes: column.json()
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Set, Card, NeoStandard }
});
