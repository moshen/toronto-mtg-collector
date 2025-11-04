import Store from "./store.mjs";

export class TopDeckHero extends Store {
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

        /**
         * @type {[[import('../types.mjs').Card]]}
         */
        const deckSlices = [];
        for (let i = 0; i <= deckArr.length; i += 500) {
            deckSlices.push(deckArr.slice(i, i + 500));
        }

        for (const deckSlice of deckSlices) {
            await this._page.goto(
                "https://www.topdeckhero.com/products/multi_search",
            );

            await this._page.waitForSelector("#multisearch_query");
            const input = await this._page.$("#multisearch_query");
            const inputText = deckSlice.reduce(
                (memo, card) => `${memo}\n${card.num} ${card.name}`,
                "",
            );
            await input.type(inputText);
            await this._page.$eval("#multisearch_query", (el) => {
                // Should be submit button
                el.nextElementSibling?.click();
            });

            try {
                await this._page.waitForSelector("li.product .inner");
            } catch (err) {
                // Most likely search failed
                continue;
            }

            /**
             * @type {Object<string, [import('../types.mjs').CardWithPrice]>}
             */
            const matches = await this._page.$$eval(
                "li.product .inner",
                (els, cards) =>
                    els.reduce((memo, el) => {
                        let name = el
                            .querySelector("[itemprop='name']")
                            .getAttribute("title");

                        let foil = false;
                        if (name.includes("Foil")) {
                            foil = true;
                        }

                        name = name.replace(/ - .+$/, "");

                        if (!cards[name]) {
                            // Not a match?
                            return memo;
                        }

                        const url =
                            "https://www.topdeckhero.com" +
                            el
                                .querySelector("[itemprop='url']")
                                .getAttribute("href");

                        const card = cards[name];

                        const variants = el.querySelectorAll(".variant-row");
                        let price = Infinity;

                        for (const variant of variants) {
                            if (variant.classList.contains("no-stock")) {
                                continue;
                            }

                            const priceEl = variant.querySelector("span.price");
                            const tmpPrice = +priceEl.textContent.replaceAll(
                                /[^0-9'.]+/g,
                                "",
                            );

                            if (tmpPrice < price) {
                                price = tmpPrice;
                            }
                        }

                        // No stock
                        if (price === Infinity) {
                            return memo;
                        }

                        if (!Array.isArray(memo[name])) {
                            memo[name] = [];
                        }

                        memo[name].push({
                            ...card,
                            price,
                            url,
                            foil,
                        });

                        return memo;
                    }, {}),
                searching,
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

export default new TopDeckHero();
