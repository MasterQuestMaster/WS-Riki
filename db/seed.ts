import { db, Card, Set } from 'astro:db';

// https://astro.build/db/seed
export default async function seed() {
	
	await db.insert(Set).values([
		{id:"SE26", name: "Sword Art Online II Vol. 2", shortName:"SAO2V2", type:"Extra Pack", releaseDate: new Date("2016-05-27")},
		{id:"S106", name: "SPY x FAMILY", type: "Booster Pack", releaseDate: new Date("2024-01-26") },
		{id:"S92", name: "Tokyo Revengers", type: "Booster Pack", releaseDate: new Date("July 29, 2022")}
	]);

	await db.insert(Card).values([
		{
			id: "SPY_S106_E001",
			cardno: "SPY/S106-E001",
			name: "Telepath Girl, Anya",
			type: "Character",
			color: "YELLOW",
			rarity: "RR",
			setId: "S106",
			side: "S", //W/S
			level: 0,
			cost: 0,
			power: 1500,
			soul: 1,
			trigger: null,
			traits: ["Berlint", "Psychic Ability"],
			abilities: [
				"【AUTO】 When your other character is placed on the stage by \"Change\", that character gets +1000 power until the end of the next turn.",
				"【ACT】 Brainstorm [(1) 【REST】 this card] Flip over 4 cards from the top of your deck, and put them into your waiting room. For each climax revealed among those cards, choose up to 1 《Berlint》 character in your waiting room, and return it to your hand."
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
			name: "《Zekken》 Yuuki",
			type: "Character",
			color: "GREEN",
			rarity: "R",
			setId: "SE26",
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
			image: "https://en.ws-tcg.com/wp/wp-content/images/cardimages/s/sao_se26/SAO_SE26_E10.png"
		},
		{
			id: "SAO_SE26_E06",
			cardno: "SAO/SE26-E06",
			name: "Demise of 《Zekken》",
			type: "Climax",
			color: "YELLOW",
			rarity: "C",
			setId: "SE26",
			side: "S",
			trigger: ["SOUL", "RETURN"],
			abilities: [
				"【CONT】 All of your characters get +1000 power and +1 soul. (: When this card triggers, you may choose one of your opponent's characters, and return it to your opponent's hand.)",
				"(【RETURN】: When this card triggers, you may choose 1 of your opponent's characters, and return it to his or her hand)"
			],
			flavor: "Yuuki: \"After all this time... I think I know why now...\"",
			image: "https://en.ws-tcg.com/wp/wp-content/images/cardimages/s/sao_se26/SAO_SE26_E06.png"
		}
	]);
}
