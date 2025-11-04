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

    await _page.goto("https://facetofacegames.com/pages/deck-builder");
    await _page.waitForSelector("#textarea_input");
    const input = await _page.$("#textarea_input");
    const inputText = deckArr.reduce(
        (memo, card) => `${memo}\n${card.num} ${card.name}`,
        "",
    );
    await input.type(inputText);
    await _page.click("button.db-decklist-get");

    await _page.waitForSelector(".hits-wrap-data-info");
    await _page.$$eval(".hits-wrap-data-info", (els) =>
        els.forEach((el, n) => {
            if (n > 0) {
                el.click();
            }
        }),
    );
    await _page.waitForSelector(".bb-card-wrapper");

    /**
     * @type {Object<string, [import('../types.mjs').CardWithPrice]>}
     */
    const matches = await _page.$$eval(
        "div.hits-wrap",
        (els, deck) =>
            els.reduce((memo, el) => {
                const name = el
                    .querySelector('span[x-text="key_name"]')
                    .textContent.toLocaleLowerCase();
                let card = Object.keys(deck).find(
                    (k) => k.toLocaleLowerCase() === name,
                );

                if (!card) {
                    return memo;
                }

                card = deck[card];

                for (const version of el.querySelectorAll(".bb-card-wrapper")) {
                    let price = Infinity;

                    for (const variant of version.querySelectorAll(
                        ".f2f-featured-variant",
                    )) {
                        if (
                            variant.querySelector(
                                "button.product-form__submit span.text span",
                            ).textContent.textContent === "Out of stock"
                        ) {
                            continue;
                        }

                        const foundPrice = +variant
                            .querySelector(".price-item")
                            .textContent.replaceAll(/[^0-9\.]+/g, "");
                        if (price > foundPrice) {
                            price = foundPrice;
                        }
                    }

                    if (price < Infinity) {
                        // Found
                        if (!Array.isArray(memo[card.name])) {
                            memo[card.name] = [];
                        }

                        memo[card.name].push({
                            ...card,
                            price,
                            url: version.querySelector(".bb-card-title a").href,
                            foil:
                                version.querySelector(
                                    '[data-label="Non-Foil"]',
                                ) === null,
                        });
                    }
                }

                return memo;
            }, {}),
        deck,
    );

    for (const match of Object.keys(matches)) {
        // Sort prices for result
        matches[match].sort((a, b) => {
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

        found[match] = matches[match][0];
    }

    for (const search of Object.values(searching)) {
        if (!found[search.name]) {
            notFound[search.name] = search;
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
