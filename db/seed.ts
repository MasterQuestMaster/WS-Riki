import { db, Card, Set, Rarity, Color } from 'astro:db';

// https://astro.build/db/seed
export default async function seed() {
	
	await db.insert(Set).values([
		{id: "SE26", name: "Sword Art Online II Vol. 2", shortName:"SAO2V2", type:"Extra Booster", releaseNumber: 26, releaseDate: new Date("2016-05-27")},
		{id: "S106", name: "SPY x FAMILY", type: "Booster Pack", releaseNumber: 106, releaseDate: new Date("2024-01-26") },
		{id: "S92", name: "Tokyo Revengers", type: "Booster Pack", releaseNumber: 92, releaseDate: new Date("July 29, 2022")}
	]);

	let i=1;

	await db.insert(Rarity).values([
		//base rarities
		{id: "CC", name: "Climax Common", order: 10*i++},
		{id: "CR", name: "Climax Rare", order: 10*i++},
		{id: "TD", name: "Trial Deck", order: 10*i++},
		{id: "N", name: "Normal", order: 10*i++},
		{id: "C", name: "Common", order: 10*i++},
		{id: "U", name: "Uncommon", order: 10*i++},
		{id: "R", name: "Rare", order: 10*i++},
		{id: "RR", name: "Double Rare", order: 10*i++},
		{id: "RR+", name: "Double Rare+", order: 10*i++},
		{id: "PR", name: "Promo Rare", order: 10*i++},
		{id: "SR", name: "Super Rare", order: 10*i++},

		//set-specific rarities with 1 guaranteed per pack (they have the same sort priority).
		{id: "FP", name: "School idol festival Parallel", order: 10*i},
		{id: "JJR", name: "JoJo Rare", order: 10*i},
		{id: "HLP", name: "hololive Parallel", order: 10*i},
		{id: "IGP", name: "Itsutsugo Parallel", order: 10*i},
		{id: "DCR", name: "Deculture Rare", order: 10*i},
		{id: "SHP", name: "Shana Parallel", order: 10*i},
		{id: "BDR", name: "BanG Dream Rare", order: 10*i++},

		//Special Rarities higher than set-specific rarities
		{id: "RRR", name: "Triple Rare", order: 10*i++},
		{id: "OFR", name: "Over Frame Rare", order: 10*i++},

		//Set-specific SP rarities
		{id: "MR", name: "Marvel Rare", order: 10*i},
		{id: "PXR", name: "Pixar Rare", order: 10*i},
		{id: "LRR", name: "LycoReco Rare", order: 10*i},
		{id: "SPYR", name: "Spy Rare", order: 10*i},
		{id: "ATR", name: "Avatar Rare", order: 10*i},
		{id: "HYR", name: "Hanayome Rare", order: 10*i},
		{id: "DSR", name: "Deadly Sin Rare", order: 10*i},
		{id: "MDR", name: "Maid Dragon Rare", order: 10*i},
		{id: "TRV", name: "Tokyo Revengers", order: 10*i},
		{id: "RTR", name: "Round Table Rare", order: 10*i},
		{id: "RBR", name: "RWBY Rare", order: 10*i++},

		{id: "SP", name: "Special", order: 10*i++},
		{id: "SSP", name: "Super Special", order: 10*i++},

		//Set-specific SEC rarities
		{id: "AVGR", name: "Avengers Rare", order: 10*i},
		{id: "LUXO", name: "Luxo Rare", order: 10*i},
		{id: "CSMR", name: "Chainsaw Man Rare", order: 10*i++},

		{id: "SEC", name: "Secret", order: 10*i++}
	]);

	await db.insert(Color).values([
		{id: "Y", name: "Yellow", order: 1},
		{id: "G", name: "Green", order: 2},
		{id: "R", name: "Red", order: 3},
		{id: "B", name: "Blue", order: 4}
	]);

	await db.insert(Card).values([
		{
			id: "SPY_S106_E001",
			cardno: "SPY/S106-E001",
			titleCode: "SPY",
			name: "Telepath Girl, Anya",
			type: "Character",
			color: "Y",
			rarity: "RR",
			neo: ["SPY"],
			setId: "S106",
			setName: "SxF Trial Deck",
			side: "S", //W/S
			level: 0,
			cost: 0,
			power: 1500,
			soul: 1,
			trigger: null,
			traits: ["Berlint", "Psychic Ability"],
			abilities: [
				"【AUTO】<div></div> When your other character is placed on the stage by \"Change\", that character gets +1000 power until the end of the next turn. 《Psychic Ability》",
				"【ACT】 Brainstorm [(1) 【REST】 this card] Flip over 4 cards from the top of your deck, and put them into your waiting room. For each climax revealed among those cards, choose up to 1 《Berlint》 character in your waiting room, and return it to your hand."
			],
			abilities_ph: [
				"【AUTO】<div></div> When your other character is placed on the stage by \"Change\", that character gets +1000 power until the end of the next turn. 《TRAIT》",
				"【ACT】 Brainstorm [(1) 【REST】 this card] Flip over 4 cards from the top of your deck, and put them into your waiting room. For each climax revealed among those cards, choose up to 1 《TRAIT》 character in your waiting room, and return it to your hand."
			],
			icons: [
				"BACKUP",
				"CLOCK"
			],
			image: "https://en.ws-tcg.com/wp/wp-content/images/cardimages/SPYFAM/S106_E001.png"
		},
		{
			id: "SAO_SE26_E10",
			cardno: "SAO/SE26-E10",
			titleCode: "SAO",
			name: "《Zekken》 Yuuki",
			type: "Character",
			color: "G",
			rarity: "R",
			neo: ["SAO"],
			setId: "SE26",
			setName: "Sword Art Online II Vol. 2",
			side: "S", //W/S
			level: 1,
			cost: 0,
			power: 4000,
			soul: 1,
			trigger: null,
			traits: ["Avatar", "Weapon"],
			abilities: [
				"【AUTO】 When this card is placed on the stage from your hand, this card gets +X power until end of turn. X is equal to 500 multiplied by the number of 《Avatar》 or 《Net》 characters you have.",
				"【AUTO】 [(1) Put a card from your hand into your waiting room] When this card attacks, if a card named \"《Mother's Rosario》\" is in your climax area, you may pay the cost. If you do, search your deck for up to two 《Avatar》 or 《Net》 characters, reveal them to your opponent, and put them into your hand. Then, shuffle your deck, and this card gets +1 level until the end of your opponent's next turn."
			],
			abilities_ph: [
				"【AUTO】 When this card is placed on the stage from your hand, this card gets +X power until end of turn. X is equal to 500 multiplied by the number of 《TRAIT》 or 《TRAIT》 characters you have.",
				"【AUTO】 [(1) Put a card from your hand into your waiting room] When this card attacks, if a card named \"《Mother's Rosario》\" is in your climax area, you may pay the cost. If you do, search your deck for up to two 《TRAIT》 or 《TRAIT》 characters, reveal them to your opponent, and put them into your hand. Then, shuffle your deck, and this card gets +1 level until the end of your opponent's next turn."
			],
			flavor: "You can use magic, or items, whatever you want. I'm only gonna use my sword, though.",
			image: "https://en.ws-tcg.com/wp/wp-content/images/cardimages/s/sao_se26/SAO_SE26_E10.png"
		},
		{
			id: "SAO_SE26_E06",
			cardno: "SAO/SE26-E06",
			titleCode: "SAO",
			name: "Demise of 《Zekken》",
			type: "Climax",
			color: "Y",
			rarity: "C",
			neo: ["SAO"],
			setId: "SE26",
			setName: "Sword Art Online II Vol. 2",
			side: "S",
			trigger: ["SOUL", "RETURN"],
			abilities: [
				"【CONT】 All of your characters get +1000 power and +1 soul. (: When this card triggers, you may choose one of your opponent's characters, and return it to your opponent's hand.)",
				"(【RETURN】: When this card triggers, you may choose 1 of your opponent's characters, and return it to his or her hand)"
			],
			abilities_ph: [
				"【CONT】 All of your characters get +1000 power and +1 soul. (: When this card triggers, you may choose one of your opponent's characters, and return it to your opponent's hand.)",
				"(【RETURN】: When this card triggers, you may choose 1 of your opponent's characters, and return it to his or her hand)"
			],
			flavor: "Yuuki: \"After all this time... I think I know why now...\"",
			image: "https://en.ws-tcg.com/wp/wp-content/images/cardimages/s/sao_se26/SAO_SE26_E06.png"
		}
	]);
}
