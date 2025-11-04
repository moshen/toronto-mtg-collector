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

        /**
         * @type {AbortController}
         */
        this._signalController = null;
        /**
         * @type {AbortSignal}
         */
        this._signal = null;
    }

    /**
     * @returns {boolean}
     */
    hasPage() {
        return this._page !== null;
    }

    /**
     * @param {Page} page
     */
    setPage(page) {
        this._page = page;
    }

    /**
     * @returns {Promise<void>}
     */
    async switchTab() {
        if (this._page) {
            await this._page.bringToFront();
        }
    }

    /**
     * @returns {boolean}
     */
    isWorking() {
        if (!this._signal) {
            return false;
        }

        return !this._signal.aborted;
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
     */
    async addToCart(deck) {
        throw new Error("addToCart not implemented");
    }
}
