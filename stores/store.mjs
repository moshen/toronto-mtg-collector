import { Page } from "puppeteer-core";

export default class Store {
    constructor() {
        /**
         * @type {import('puppeteer-core').Page}
         */
        this._page = null;
        /**
         * @type {Object<string, import('../types.mjs').CardWithPrice>}
         */
        this._found = {};
        /**
         * @type {Object<string, import('../types.mjs').Card>}
         */
        this._notFound = {};
    }

    /**
     * @returns {boolean}
     */
    hasPage() {
        return this._page !== null;
    }

    /**
     * @param {Page} page
     * @returns {Promise<void>}
     */
    async setPage(page) {
        this._page = page;
        const session = await page.createCDPSession();
        await session.send(`Emulation.setFocusEmulationEnabled`, {
            enabled: true,
        });
    }

    /**
     * @param {Object<string, import('../types.mjs').Card>} deck
     * @returns {import('../types.mjs').FoundCards}
     */
    async findCards(deck) {
        throw new Error("findCards not implemented");
    }

    /**
     * @param {[import('../types.mjs').CardWithPrice]} deck
     * @returns {Promise<import("../types.mjs").MissingCards>}
     */
    async addToCart(deck) {
        throw new Error("addToCart not implemented");
    }
}
