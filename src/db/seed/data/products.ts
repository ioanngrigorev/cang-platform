/** Complete demo product catalogue (~175 products across 33 companies). */
import { PRODUCTS_A } from "./products-a";
import { PRODUCTS_B } from "./products-b";
import { PRODUCTS_C } from "./products-c";
import type { ProductSeed } from "./products-types";

export type { ProductSeed } from "./products-types";

export const PRODUCTS: ProductSeed[] = [...PRODUCTS_A, ...PRODUCTS_B, ...PRODUCTS_C];
