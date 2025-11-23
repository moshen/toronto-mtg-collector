import { Page } from "puppeteer-core";

export default class Store {
    constructor() {
        /**
         * @type {import('../pageFactory.mjs').PageFactory}
         */
        this._pageFactory = null;
        /**
         * @type {string}
         */
        this._storeName = null;
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
     * @param {import('../pageFactory.mjs').PageFactory} pageFactory
     * @param {string} storeName
     */
    setPageFactory(pageFactory, storeName) {
        this._pageFactory = pageFactory;
        this._storeName = storeName;
    }

    /**
     * @returns {Promise<import('puppeteer-core').Page>}
     */
    async getPage() {
        if (!this._pageFactory) {
            throw new Error("PageFactory not set");
        }
        if (!this._storeName) {
            throw new Error("Store name not set");
        }
        return this._pageFactory.getPage(this._storeName);
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
