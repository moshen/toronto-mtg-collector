import stores from "../stores/index.mjs";

const lineRegex = /^([0-9]+)\s(.+)/;

/**
 * @param {string} _cardlist
 * @param {string[]} [storesToSearch]
 * @returns {Promise<import('../types.mjs').FoundAndNotCards>}
 */
export default async function findCards(_cardlist, storesToSearch) {
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
        if (memo[match[2].toLocaleLowerCase()]) {
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
        if (storesToSearch && !storesToSearch.includes(store)) {
            continue;
        }
        cardsFromStoresPromises[store] = stores[store].findCards(cards);
    }

    /**
     * @type {Object<string, import('../types.mjs').FoundCards>}
     */
    const cardsFromStores = {};

    for (const store of Object.keys(cardsFromStoresPromises)) {
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
 * @returns {import('../types.mjs').FoundAndNotCards}
 */
function findCheapest(cards, storesWithCards) {
    const notFound = [];

    for (const card of Object.values(cards)) {
        let cheapestStore = "";
        for (const store of Object.keys(stores)) {
            if (!storesWithCards[store]) {
                continue;
            }

            if (!storesWithCards[store][card.name.toLocaleLowerCase()]) {
                continue;
            }

            if (cheapestStore === "") {
                cheapestStore = store;
                continue;
            }

            // Prefer non-foil
            if (
                storesWithCards[cheapestStore][card.name.toLocaleLowerCase()]
                    .foil &&
                !storesWithCards[store][card.name.toLocaleLowerCase()].foil
            ) {
                cheapestStore = store;
                continue;
            }
            if (
                !storesWithCards[cheapestStore][card.name.toLocaleLowerCase()]
                    .foil &&
                storesWithCards[store][card.name.toLocaleLowerCase()].foil
            ) {
                continue;
            }

            if (
                storesWithCards[cheapestStore][card.name.toLocaleLowerCase()]
                    .price >
                storesWithCards[store][card.name.toLocaleLowerCase()].price
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
            if (!storesWithCards[store]) {
                continue;
            }

            if (store === cheapestStore) {
                continue;
            }

            if (!storesWithCards[store][card.name.toLocaleLowerCase()]) {
                continue;
            }

            storesWithCards[store][card.name.toLocaleLowerCase()].num = 0;
        }
    }

    console.log(JSON.stringify(notFound, undefined, 2));

    return {
        cards,
        storesWithCards,
        notFound,
    };
}
