import Store from "./store.mjs";

export class WizardTower extends Store {
    /**
     * @param {Object<string, import('../types.mjs').Card>} deck
     * @returns {import('../types.mjs').FoundCards}
     */
    async findCards(deck) {
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
            return this._found;
        }

        /**
         * @type {[[import('../types.mjs').Card]]}
         */
        const deckSlices = [];
        for (let i = 0; i <= deckArr.length; i += 100) {
            deckSlices.push(deckArr.slice(i, i + 100));
        }

        for (const deckSlice of deckSlices) {
            await this._page.goto(
                "https://store.wizardtower.com/pages/deck-builder",
            );

            try {
                await this._page.waitForSelector("#close-popup", {
                    timeout: 5000,
                });
                await this._page.click("#close-popup");
            } catch (_err) {
                // Don't care about this
            }

            await this._page.waitForSelector("#card-list");
            const input = await this._page.$("#card-list");
            const inputText = deckSlice.reduce(
                (memo, card) => `${memo}\n${card.num} ${card.name}`,
                "",
            );
            await input.type(inputText);
            await this._page.click("#submit-button");

            await this._page.waitForSelector("#deck-builder-results");
            await this._page.waitForSelector(".deck-builder-result-group", {
                timeout: 120000,
            });

            const resultRegex = /^([0-9]+) result/;

            const resultGroups = await this._page.$$(
                ".deck-builder-result-group",
            );
            for (const result of resultGroups) {
                // Get card to match
                const name = await result.$eval(
                    ".deck-builder-result-group__title",
                    (el) => el.textContent,
                );
                const card = searching[name.toLocaleLowerCase()];

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
                    this._notFound[card.name.toLocaleLowerCase()] = card;
                    continue;
                }

                const count = +countMatch[1];

                if (count < 1) {
                    this._notFound[card.name.toLocaleLowerCase()] = card;
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

                            // Wizard Tower mixes art cards in with search results
                            if (name.endsWith("Art Card")) {
                                return memo;
                            }

                            let foil = false;
                            if (name.endsWith("Foil")) {
                                foil = true;
                            }

                            name = name.replace(
                                /( \(.+| - .+Foil.+|\s*\/.+)$/,
                                "",
                            );

                            if (name !== cardName) {
                                return memo;
                            }

                            for (const variant of el.querySelectorAll(
                                ".deck-builder-variant",
                            )) {
                                const url = new URL(
                                    "https://store.wizardtower.com" +
                                        el
                                            .querySelector(
                                                ".deck-builder-product__title a",
                                            )
                                            .getAttribute("href"),
                                );
                                const query = new URLSearchParams({
                                    variant: variant.getAttribute(
                                        "data-variant-container",
                                    ),
                                });

                                memo.push({
                                    foil,
                                    price:
                                        +variant.querySelector(".price-item")
                                            .textContent,
                                    url:
                                        "https://store.wizardtower.com" +
                                        url.pathname +
                                        "?" +
                                        query.toString(),
                                });
                            }

                            return memo;
                        }, []),
                    card.name,
                );

                if (matches.length < 1) {
                    this._notFound[card.name.toLocaleLowerCase()] = card;
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
                this._found[card.name.toLocaleLowerCase()] = {
                    ...card,
                    ...matches[0],
                };
            }
        }

        return this._found;
    }

    /**
     * @param {[import('../types.mjs').CardWithPrice]} deck
     * @returns {Promise<import("../types.mjs").MissingCards>}
     */
    async addToCart(deck) {
        /**
         * @type {import("../types.mjs").MissingCards}
         */
        const missingCards = {};

        for (const card of deck) {
            try {
                await this._page.goto(card.url, {
                    waitUntil: "networkidle0",
                });

                const input = await this._page.$(".quantity__input");
                await input.click({ clickCount: 3 });
                await input.type(card.num.toString());

                await this._page.click("button.product-form__submit");

                await this._page.waitForSelector(".cart-notification__header", {
                    visible: true,
                });
            } catch (err) {
                // Something went wrong
                console.log(
                    "Error adding card to cart for WizardTower",
                    card,
                    err,
                );
                missingCards[card.name.toLocaleLowerCase()] = card;
            }
        }

        // TODO: Open the cart and check what was added and add to results?

        return missingCards;
    }
}

export default new WizardTower();
