//We want to use this to replace URL parameter validation.

import {z} from "astro/zod";
import orderConfig from "src/config/order-config.json";

export const QuerySchema = z.string(); //TODO: check if a number is parsed properly as string.

//Set Types may change without dev input, therefore adding a fixed list is not recommended.
export const SetTypeSchema = z.string();

const cardOrderValues = Object.keys(orderConfig.Card);
const setOrderValues = Object.keys(orderConfig.Set);

export const SetOrderSchema = z_enumFromArray(setOrderValues);
export const CardOrderSchema = z_enumFromArray(cardOrderValues); //no catch because the value can differ.
export const SortDirectionSchema = z.enum(["asc", "desc"]); //see above

export const DisplayFormatSchema = z.enum(["image", "list"]);

export const PageNumberSchema = z.coerce.number().positive();
export const PageSizeSchema = z.coerce.number().positive();
export const TotalResultsSchema = z.coerce.number().optional();

//Workaround for zod enums
function z_enumFromArray(array: string[]){
    return z.enum([array[0], ...array.slice(1)])
}