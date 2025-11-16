import { setTimeout } from "node:timers/promises";
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
            if (this._found[card.name.toLocaleLowerCase()]) {
                continue;
            }

            if (this._notFound[card.name.toLocaleLowerCase()]) {
                continue;
            }

            searching[card.name.toLocaleLowerCase()] = card;
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

                        if (!cards[name.toLocaleLowerCase()]) {
                            // Not a match?
                            return memo;
                        }

                        const url =
                            "https://www.topdeckhero.com" +
                            el
                                .querySelector("[itemprop='url']")
                                .getAttribute("href");

                        const card = cards[name.toLocaleLowerCase()];

                        for (const variant of el.querySelectorAll(
                            ".variant-row",
                        )) {
                            if (variant.classList.contains("no-stock")) {
                                continue;
                            }

                            const priceEl = variant.querySelector("span.price");
                            const price = +priceEl.textContent.replaceAll(
                                /[^0-9'.]+/g,
                                "",
                            );

                            const id = variant
                                .querySelector("form.add-to-cart-form")
                                .getAttribute("data-vid");

                            if (!Array.isArray(memo[name])) {
                                memo[name] = [];
                            }

                            memo[name].push({
                                ...card,
                                price,
                                url,
                                foil,
                                id,
                            });
                        }

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

                this._found[match.toLocaleLowerCase()] = matches[match][0];
            }
        }

        for (const search of Object.values(searching)) {
            if (!this._found[search.name.toLocaleLowerCase()]) {
                this._notFound[search.name.toLocaleLowerCase()] = search;
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
            try {
                const res = await this._page.goto(card.url, {
                    waitUntil: "networkidle0",
                });

                const variant = await this._page.$(`[data-vid="${card.id}"]`);

                const input = await variant.$("input.qty");
                await input.click({ clickCount: 3 });
                await input.type(card.num.toString());
                await this._page.keyboard.press("Enter");

                await this._page.waitForSelector(".alert-msg", {
                    visible: true,
                    timeout: 60000,
                });

                // We will get "too many searches" warning page without this
                // Unfortunately the warning page isn't a 429 so we don't know the
                // exact timing
                await setTimeout(400);
            } catch (err) {
                // Something went wrong. TopDeckHero loves to time us out
                console.log(
                    "Error adding card to cart for TopDeckHero",
                    card,
                    err,
                );
            }
        }

        // TODO: Open the cart and check what was added and add to results?

        this._signalController.abort();
    }
}

export default new TopDeckHero();
