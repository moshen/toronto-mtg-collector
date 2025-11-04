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
    async addToCart(deck) {}
}

export default new FaceToFace();
