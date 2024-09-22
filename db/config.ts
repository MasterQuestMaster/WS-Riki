//When DB schema changes, the content.db in .astro must be deleted, or old tables will remain.
import { defineDb, defineTable, column } from 'astro:db';

const Set = defineTable({
  columns: {
    id: column.text({primaryKey: true}), //W45, SX01 -> get from end of JSON file name.
    name: column.text(), //Batman Ninja
    shortName: column.text({optional: true}),
    type: column.text({optional: true}), //Booster Pack, Extra Booster, Trial Deck, Promo
    releaseNumber: column.number({optional: true}),
    releaseDate: column.date({optional: true}),
    sha: column.text({optional: true}) //JSON set file compare value
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
    color: column.text({references: () => Color.columns.id}), //Y/R/G/B
    rarity: column.text({references: () => Rarity.columns.id}), //C/U/R/RR...
    setId: column.text({references: () => Set.columns.id}),
    setName: column.text(), //Can be different than Set.name for TD cards.
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

const NeoStandard = defineTable({
  columns: {
    id: column.text({primaryKey: true}),
    title: column.text(),
    codes: column.json()
  }
});

//Card rarity
const Rarity = defineTable({
  columns: {
    id: column.text({primaryKey: true}),
    name: column.text({optional: true}),
    order: column.number({optional: true})
  }
});

//Card color
const Color = defineTable({
  columns: {
    id: column.text({primaryKey: true}),
    name: column.text(),
    order: column.number()
  }
});

/*
Other idea for order:
1 big table for all order things.
Order: 
type: rarity
value: RR
order: 1

on join we join the order table if necessary (check if the column starts with Order)

*/


//TODO: Keep SHA of set file somewhere, to check if file changed.
//We can keep it in set table, but we might split a set file in TD/BP pack?
//Actually, if we don't split, we get "Trial Deck" section in Set Overview (might be possible with a join query).
//We can also still find TD cards with rarity filter. How to handle TD SP? We should be able to find them as TD cards.
//SSP version as subversion of the base card? So we have an extra table for special versions?
//If we find a special version in the regular files, we specially handle it. (todo in cards.ts)

// https://astro.build/db/config
export default defineDb({
  tables: { Set, Card, NeoStandard, Rarity, Color }
});
