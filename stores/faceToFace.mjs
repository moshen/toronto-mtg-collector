import { setTimeout } from "node:timers/promises";
import Store from "./store.mjs";

export class FaceToFace extends Store {
    /**
     * @param {Object<string, import('../types.mjs').Card>} deck
     * @returns {import('../types.mjs').FoundCards}
     */
    async findCards(deck) {
        this._signalController = new AbortController();
        this._signal = this._signalController.signal;

        /**
         * @type {Object<string, import('../types.mjs').Card>}
         */
        const searching = {};
        for (const card of Object.values(deck)) {
            if (this._found[card.name]) {
                continue;
            }

            if (this._notFound[card.name]) {
                continue;
            }

            searching[card.name] = card;
        }

        const deckArr = Object.values(searching);

        if (deckArr.length < 1) {
            this._signalController.abort();
            return this._found;
        }

        await this._page.goto("https://facetofacegames.com/pages/deck-builder");
        await this._page.waitForSelector("#textarea_input");
        const input = await this._page.$("#textarea_input");
        const inputText = deckArr.reduce(
            (memo, card) => `${memo}\n${card.num} ${card.name}`,
            "",
        );
        await input.type(inputText);
        await this._page.click("button.db-decklist-get");

        await this._page.waitForSelector(".hits-wrap-data-info");
        await this._page.$$eval(".hits-wrap-data-info", (els) =>
            els.forEach((el, n) => {
                if (n > 0) {
                    el.click();
                }
            }),
        );
        await this._page.waitForSelector(".bb-card-wrapper");

        /**
         * @type {Object<string, [import('../types.mjs').CardWithPrice]>}
         */
        const matches = await this._page.$$eval(
            "div.hits-wrap",
            (els, deck) =>
                els.reduce((memo, el) => {
                    const name = el
                        .querySelector('span[x-text="key_name"]')
                        .textContent.toLocaleLowerCase();
                    // FIXME: Shouldn't lowercase the decklist on every iteration
                    let card = Object.keys(deck).find(
                        (k) => k.toLocaleLowerCase() === name,
                    );

                    if (!card) {
                        return memo;
                    }

                    card = deck[card];

                    for (const version of el.querySelectorAll(
                        ".bb-card-wrapper",
                    )) {
                        let price = Infinity;

                        for (const variant of version.querySelectorAll(
                            ".f2f-featured-variant",
                        )) {
                            if (
                                variant.querySelector(
                                    "button.product-form__submit span.text span",
                                ).textContent === "Out of stock"
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
                                url: version.querySelector(".bb-card-title a")
                                    .href,
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

            this._found[match] = matches[match][0];
        }

        for (const search of Object.values(searching)) {
            if (!this._found[search.name]) {
                this._notFound[search.name] = search;
            }
        }

        this._signalController.abort();

        return this._found;
    }

    /**
     * @param {[import('../types.mjs').CardWithPrice]} deck
     */
    async addToCart(deck) {
        this._signalController = new AbortController();
        this._signal = this._signalController.signal;

        for (const card of deck) {
            await this._page.goto(card.url, {
                waitUntil: "networkidle0",
            });

            let foundVariant = null;
            const variants = await this._page.$$(".f2f-featured-variant");
            for (const variant of variants) {
                if (
                    (
                        await variant.$eval(
                            ".price-item",
                            (el) => el.textContent,
                        )
                    ).trim() ===
                    card.price.toLocaleString("en-CA", {
                        style: "currency",
                        currency: "CAD",
                    })
                ) {
                    foundVariant = variant;
                }
            }

            if (foundVariant === null) {
                // Did not find our card
                // TODO: Add to collection to return?
                console.log("Did not find card at faceToFace", card);
                continue;
            }

            // TODO: Check available number

            const input = await foundVariant.$(".quantity__input");
            await input.click({ clickCount: 3 });
            await input.type(card.num.toString());

            await foundVariant.$eval("button.product-form__submit", (el) =>
                el.click(),
            );

            await this._page.waitForSelector("#CartDrawer", {
                visible: true,
            });
        }

        // TODO: Open the cart and check what was added and add to results?

        this._signalController.abort();
    }
}

export default new FaceToFace();
