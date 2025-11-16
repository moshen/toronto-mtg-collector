import { cycleTabs } from "../util.mjs";
import stores from "../stores/index.mjs";

/**
 * @param {Object<string, Object<string, import("../types.mjs").CardWithPrice>>} cards
 * @returns {Object}
 */
export default async function addToCarts(cards) {
    const storeAddtoCartPromises = {};

    const signalController = new AbortController();
    const signal = signalController.signal;

    for (const cardsStore of Object.keys(cards)) {
        if (!stores[cardsStore]) {
            // Got a store we weren't expecting
            continue;
        }

        storeAddtoCartPromises[cardsStore] = stores[cardsStore].addToCart(
            Object.values(cards[cardsStore]),
        );
    }

    await cycleTabs();

    const storeAddToCartResults = {};

    for (const resultStore of Object.keys(storeAddtoCartPromises)) {
        storeAddToCartResults[resultStore] =
            await storeAddtoCartPromises[resultStore];
    }

    return storeAddToCartResults;
}
