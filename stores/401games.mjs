import querystring from "node:querystring";
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
 * @param {string} name
 * @returns {string}
 */
function getSearchString(name) {
    return querystring.stringify({
        q: name,
        filters: "Category,Magic: The Gathering Singles,In Stock,True",
    });
}

/**
 * @param {Object<string, import('../types.mjs').Card>} deck
 * @returns {import('../types.mjs').FoundCards}
 */
export async function findCards(deck) {
    signalController = new AbortController();
    signal = signalController.signal;

    const resultsRegex = /^([0-9]+).+/;

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

    card: for (const card of Object.values(searching)) {
        console.log(`Looking for: ${card.name}`);
        await _page.goto(
            "https://store.401games.ca/pages/search-results?" +
                getSearchString(card.name),
            {
                //waitUntil: "networkidle0",
                timeout: 60000,
            },
        );
        await Promise.all([_page.bringToFront(), setTimeout(500)]);

        while (true) {
            try {
                await _page.waitForSelector(">>> .fs-total-results-text");
                const element = await _page.$(">>> .fs-total-results-text");
                const text = await _page.evaluate(
                    (el) => el.textContent,
                    element,
                );
                const match = text.match(resultsRegex);

                if (match === null || match.length < 1) {
                    continue;
                }

                console.log(text);
            } catch (err) {
                // Something went wrong, ignore the card
                notFound[card.name] = card;
                continue card;
            }

            break;
        }

        /**
         * @type {[import('../types.mjs').CardPrice]}
         */
        const matches = await _page.$$eval(
            ">>> .product-title-search-term",
            (els, cardName) =>
                els.reduce((memo, el) => {
                    const scheme =
                        el.parentElement.parentElement.parentElement.parentElement.querySelector(
                            ".scheme",
                        );

                    // Bullplop to decode html entities
                    let name =
                        scheme.querySelector('[itemprop="name"]').content;
                    name = name.substring(
                        0,
                        name.search(/( - Extended Art)? \(/),
                    );
                    const textarea = document.createElement("textarea");
                    textarea.innerHTML = name;
                    name = textarea.value;

                    // Filter out non exact matches
                    if (name !== cardName) {
                        return memo;
                    }

                    let foil = false;
                    if (
                        scheme
                            .querySelector('[itemprop="name"]')
                            .content.includes("(Foil)")
                    ) {
                        foil = true;
                    }

                    memo.push({
                        foil,
                        price:
                            +scheme.querySelector('[itemprop="price"]').content,
                        url:
                            "https://store.401games.ca" +
                            scheme.querySelector('[itemprop="url"]').content,
                    });
                    return memo;
                }, []),
            card.name,
        );

        if (matches.length < 1) {
            console.log("None found");
            notFound[card.name] = card;
            await setTimeout(200);
            continue;
        }

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
        console.log("Cheapest: ", matches[0]);

        found[card.name] = {
            ...card,
            ...matches[0],
        };
        await setTimeout(200);
    }

    signalController.abort();

    return found;
}

// TODO: fix this
/**
 * @param {[import('../types.mjs').CardPrice]} deck
 */
export async function addToCart(deck) {
    for (const card of deck) {
        await _page.goto(matches[0].url, {
            waitUntil: "networkidle0",
        });

        await _page.waitForSelector("#Quantity");
        const input = await _page.$("#Quantity");
        await input.click({ clickCount: 3 });
        await input.type(card.num.toString());

        await _page.waitForSelector("#AddToCartText-product-template");
        await _page.click("#AddToCartText-product-template");
        await _page.waitForSelector(".cart-preview-title");
        await setTimeout(2000);
    }
}

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
