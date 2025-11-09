import querystring from "node:querystring";
import { setTimeout } from "node:timers/promises";
import Store from "./store.mjs";

export class FourOhOneGames extends Store {
    /**
     * @param {string} name
     * @returns {string}
     */
    getSearchString(name) {
        return querystring.stringify({
            q: name,
            filters: "Category,Magic: The Gathering Singles,In Stock,True",
        });
    }

    /**
     * @param {Object<string, import('../types.mjs').Card>} deck
     * @returns {import('../types.mjs').FoundCards}
     */
    async findCards(deck) {
        this._signalController = new AbortController();
        this._signal = this._signalController.signal;

        const resultsRegex = /^([0-9]+).+/;

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

        card: for (const card of Object.values(searching)) {
            console.log(`Looking for: ${card.name}`);
            await this._page.goto(
                "https://store.401games.ca/pages/search-results?" +
                    this.getSearchString(card.name),
                {
                    //waitUntil: "networkidle0",
                    timeout: 60000,
                },
            );

            while (true) {
                try {
                    await this._page.waitForSelector(
                        ">>> .fs-total-results-text",
                    );
                    const element = await this._page.$(
                        ">>> .fs-total-results-text",
                    );
                    const text = await this._page.evaluate(
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
                    this._notFound[card.name] = card;
                    continue card;
                }

                break;
            }

            /**
             * @type {[import('../types.mjs').CardPrice]}
             */
            const matches = await this._page.$$eval(
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
                                +scheme.querySelector('[itemprop="price"]')
                                    .content,
                            url:
                                "https://store.401games.ca" +
                                scheme.querySelector('[itemprop="url"]')
                                    .content,
                        });
                        return memo;
                    }, []),
                card.name,
            );

            if (matches.length < 1) {
                console.log("None found");
                this._notFound[card.name] = card;
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

            this._found[card.name] = {
                ...card,
                ...matches[0],
            };
            await setTimeout(200);
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

        cards: for (const card of deck) {
            try {
                await this._page.goto(card.url, {
                    waitUntil: "networkidle0",
                });

                // Find the card variant for the expected price
                for (let i = 0; i < 3; i++) {
                    await this._page.waitForSelector(
                        "#ProductPrice-product-template",
                        {
                            visible: true,
                        },
                    );

                    if (
                        await this._page.$eval(
                            "#ProductPrice-product-template",
                            (el, card) =>
                                el.textContent ===
                                card.price.toLocaleString("en-CA", {
                                    style: "currency",
                                    currency: "CAD",
                                }),
                            card,
                        )
                    ) {
                        break;
                    }

                    await this._page.waitForSelector(
                        ".store-pass-variant-buttons a",
                        {
                            visible: true,
                        },
                    );
                    if (
                        !(await this._page.$$eval(
                            ".store-pass-variant-buttons a",
                            (els, i) => {
                                if (i + 1 < els.length) {
                                    els[i + 1].click();
                                    return true;
                                } else {
                                    return false;
                                }
                            },
                            i,
                        ))
                    ) {
                        // Did not find our card
                        // TODO: Add to collection to return?
                        console.log("Did not find card at fourOhOne", card);
                        continue cards;
                    }

                    await setTimeout(100);
                }
                await setTimeout(200);

                const input = await this._page.$("#Quantity");
                await input.click({ clickCount: 3 });
                await input.type(card.num.toString());

                await this._page.click("#AddToCartText-product-template");
                await this._page.waitForSelector(".cart-preview", {
                    visible: true,
                });
                await setTimeout(200);
            } catch (err) {
                // Something went wrong. 401 games site sucks
                console.log(
                    "Error adding card to cart for FourOhOne",
                    card,
                    err,
                );
            }
        }

        // TODO: Open the cart and check what was added and add to results?

        this._signalController.abort();
    }
}

export default new FourOhOneGames();
