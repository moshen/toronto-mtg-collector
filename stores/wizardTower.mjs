import { setTimeout } from "node:timers/promises";

/**
 * @type {import('puppeteer-core').Page}
 */
let _page = null;
/**
 * @type {Object<string, import('../types.mjs').CardWithPrice>}
 */
let found = {};
/**
 * @type {Object<string, import('../types.mjs').Card>}
 */
let notFound = {};

/**
 * @type {AbortController}
 */
let signalController = null;
/**
 * @type {AbortSignal}
 */
let signal = null;

/**
 * @returns {boolean}
 */
export function hasPage() {
    return _page !== null;
}

/**
 * @param {import('puppeteer-core').Page} page
 */
export function setPage(page) {
    _page = page;
}

export async function switchTab() {
    if (_page) {
        await _page.bringToFront();
    }
}

export function isWorking() {
    if (!signal) {
        return false;
    }

    return !signal.aborted;
}

/**
 * @param {Object<string, import('../types.mjs').Card>} deck
 * @returns {import('../types.mjs').FoundCards}
 */
export async function findCards(deck) {
    signalController = new AbortController();
    signal = signalController.signal;

    /**
     * @type {Object<string, import('../types.mjs').Card>}
     */
    const searching = {};
    for (const card of Object.values(deck)) {
        if (found[card.name]) {
            continue;
        }

        if (notFound[card.name]) {
            continue;
        }

        searching[card.name] = card;
    }

    const deckArr = Object.values(searching);

    if (deckArr.length < 1) {
        signalController.abort();
        return found;
    }

    /**
     * @type {[[import('../types.mjs').Card]]}
     */
    const deckSlices = [];
    for (let i = 0; i <= deckArr.length; i += 100) {
        deckSlices.push(deckArr.slice(i, i + 100));
    }

    for (const deckSlice of deckSlices) {
        await _page.goto("https://store.wizardtower.com/pages/deck-builder");

        await _page.waitForSelector("#close-popup");
        try {
            await _page.click("#close-popup");
        } catch (_err) {
            // Don't care about this
        }

        await _page.waitForSelector("#card-list");
        const input = await _page.$("#card-list");
        const inputText = deckSlice.reduce(
            (memo, card) => `${memo}\n${card.num} ${card.name}`,
            "",
        );
        await input.type(inputText);
        await _page.click("#submit-button");

        await _page.waitForSelector("#deck-builder-results");
        await _page.waitForSelector(".deck-builder-result-group");

        const resultRegex = /^([0-9]+) result/;

        const resultGroups = await _page.$$(".deck-builder-result-group");
        for (const result of resultGroups) {
            // Get card to match
            const name = await result.$eval(
                ".deck-builder-result-group__title",
                (el) => el.textContent,
            );
            const card = searching[name];

            if (!card) {
                console.log("Unable to find", name);
                continue;
            }

            // Check number of results
            const countText = await result.$eval(
                ".deck-builder-result-group__count",
                (el) => el.textContent,
            );
            const countMatch = countText.match(resultRegex);

            if (!countMatch) {
                console.log("Failed to match", card);
                notFound[card.name] = card;
                continue;
            }

            const count = +countMatch[1];

            if (count < 1) {
                notFound[card.name] = card;
                continue;
            }

            // Get prices for result
            /**
             * @type {[import('../types.mjs').CardPrice]}
             */
            const matches = await result.$$eval(
                ".deck-builder-product",
                (els, cardName) =>
                    els.reduce((memo, el) => {
                        let name = el.querySelector(
                            ".deck-builder-product__title",
                        ).textContent;

                        let foil = false;
                        if (name.endsWith("Foil")) {
                            foil = true;
                        }

                        name = name.replace(/( \(.+| - .+Foil.+)$/, "");

                        if (name !== cardName) {
                            return memo;
                        }

                        memo.push({
                            foil,
                            price: +el.querySelector(".price-item").textContent,
                            url:
                                "https://store.wizardtower.com" +
                                el
                                    .querySelector(
                                        ".deck-builder-product__title a",
                                    )
                                    .getAttribute("href"),
                        });
                        return memo;
                    }, []),
                card.name,
            );

            if (matches.length < 1) {
                notFound[card.name] = card;
                continue;
            }

            // Sort prices for result
            matches.sort((a, b) => {
                if (a.foil && b.foil) {
                    return a.price - b.price;
                }

                if (a.foil && !b.foil) {
                    return 1;
                }

                if (!a.foil && b.foil) {
                    return -1;
                }

                return a.price - b.price;
            });
            console.log("Cheapest: ", card.name, matches[0]);

            // Select best
            found[card.name] = {
                ...card,
                ...matches[0],
            };
        }
    }

    signalController.abort();

    return found;
}

/**
 * @param {[import('../types.mjs').CardWithPrice]} deck
 */
export async function addToCart(deck) {}

/**
 * @type {import('../types.mjs').Store}
 */
export default {
    hasPage,
    setPage,
    switchTab,
    isWorking,
    findCards,
    addToCart,
};
