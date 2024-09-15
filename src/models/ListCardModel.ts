export default interface ListCardModel {
    id: string,
    cardno: string,
    name: string,
    type: string,
    color: string,
    colorName: string,
    rarity: string,
    rarityName: string | null,
    level: number | null,
    cost: number | null,
    image: string,
    setName: string
}