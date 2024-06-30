import type CardModel from "./CardModel";

export default interface ExtendedCardModel extends CardModel {
    setName: string;
    releaseDate: Date|null;
}