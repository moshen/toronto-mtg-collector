import stores from "../stores/index.mjs";

/**
 * @param {Object<string, Object<string, import("../types.mjs").CardWithPrice>>} cards
 * @returns {Promise<Object<string, import("../types.mjs").MissingCards>>}
 */
export default async function addToCarts(cards) {
    /**
     * @type {Object<string, Promise<import("../types.mjs").MissingCards>>}
     */
    const storeAddtoCartPromises = {};

    for (const cardsStore of Object.keys(cards)) {
        if (!stores[cardsStore]) {
            // Got a store we weren't expecting
            continue;
        }

        storeAddtoCartPromises[cardsStore] = stores[cardsStore].addToCart(
            Object.values(cards[cardsStore]),
        );
    }

    /**
     * @type {Object<string, import("../types.mjs").MissingCards>}
     */
    const storeAddToCartResults = {};

    for (const resultStore of Object.keys(storeAddtoCartPromises)) {
        storeAddToCartResults[resultStore] =
            await storeAddtoCartPromises[resultStore];
    }

    return storeAddToCartResults;
}
