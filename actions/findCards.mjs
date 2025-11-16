import { cycleTabs } from "../util.mjs";
import stores from "../stores/index.mjs";

const lineRegex = /^([0-9]+)\s(.+)/;

/**
 * @param {string} _cardlist
 * @returns {Object<string, import('../types.mjs').FoundCards>}
 */
export default async function findCards(_cardlist) {
    /**
     * @type {Object<string, import('../types.mjs').Card>}
     */
    const cards1 = _cardlist.split(/\r?\n/).reduce((memo, line) => {
        if (line === "") {
            return memo;
        }

        const match = line.match(lineRegex);

        if (!match) {
            return memo;
        }

        // Collapse identical cards
        if (memo[match[2]]) {
            memo[match[2].toLocaleLowerCase()].num += +match[1];
        } else {
            memo[match[2].toLocaleLowerCase()] = {
                num: +match[1],
                name: match[2],
            };
        }

        return memo;
    }, {});

    // This will sort the returned list
    const cards = {};
    Object.keys(cards1)
        .sort((a, b) => a.localeCompare(b))
        .forEach((k) => {
            cards[k] = cards1[k];
        });

    /**
     * @type {Object<string, Promise<import('../types.mjs').FoundCards>>}
     */
    const cardsFromStoresPromises = {};

    for (const store of Object.keys(stores)) {
        cardsFromStoresPromises[store] = stores[store].findCards(cards);
    }

    await cycleTabs();

    /**
     * @type {Object<string, import('../types.mjs').FoundCards>}
     */
    const cardsFromStores = {};

    for (const store of Object.keys(stores)) {
        // TODO: Try catch here?
        const result = await cardsFromStoresPromises[store];
        cardsFromStores[store] = result;
    }

    console.log(JSON.stringify(cardsFromStores, undefined, 2));

    return findCheapest(cards, cardsFromStores);
}

/**
 * @param {Object<string, import('../types.mjs').Card>} cards
 * @param {Object<string, import('../types.mjs').FoundCards>} storesWithCards
 * @returns {Object<string, import('../types.mjs').FoundCards>}
 */
function findCheapest(cards, storesWithCards) {
    const notFound = [];

    for (const card of Object.values(cards)) {
        let cheapestStore = "";
        for (const store of Object.keys(stores)) {
            if (!storesWithCards[store][card.name]) {
                continue;
            }

            if (cheapestStore === "") {
                cheapestStore = store;
                continue;
            }

            if (
                storesWithCards[cheapestStore][card.name].price >
                storesWithCards[store][card.name].price
            ) {
                cheapestStore = store;
                continue;
            }
        }

        if (cheapestStore === "") {
            // Didn't find at all, should record this separately
            notFound.push(card);
            continue;
        }

        // Remove amount from other stores
        for (const store of Object.keys(stores)) {
            if (store === cheapestStore) {
                continue;
            }

            if (!storesWithCards[store][card.name]) {
                continue;
            }

            storesWithCards[store][card.name].num = 0;
            console.log(storesWithCards[store][card.name]);
        }
    }

    console.log(JSON.stringify(notFound, undefined, 2));

    return {
        cards,
        storesWithCards,
        notFound,
    };
}

// TODO: Rework this
// for (const result of results) {
// console.log("\n\nCards found:");
// let total = 0;
// for (const card of result) {
// console.log(`${card.num} ${card.name} : ${card.num * card.price}`);
// total += card.price;
// }
// console.log(`Estimated Total: ${total}`);

// console.log("\n\nIncluding Foils:");
// for (const card of result) {
// if (card.foil) {
// console.log(card.name);
// }
// }

// console.log("\n\nCards not found:");
// for (const card of result.not) {
// console.log(`${card.num} ${card.name}`);
// }
// }
