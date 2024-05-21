export interface CardModel {
    id: string;
    cardno: string;
    name: string;
    type: string;
    color: string;
    rarity: string;
    setId: string;
    side: string;
    level: number|null;
    cost: number|null;
    power: number|null;
    soul: number|null;
    trigger: string[]|null;
    traits: string[]|null;
    abilities: string[]|null;
    flavor: string|null;
    tags: string[]|null;
    image: string;
}