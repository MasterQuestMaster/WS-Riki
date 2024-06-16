export default interface ListCardModel {
    id: string,
    cardno: string,
    name: string,
    type: string,
    color: string,
    rarity: string,
    level: number | null,
    cost: number | null,
    image: string,
    setName: string
}