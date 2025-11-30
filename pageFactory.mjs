import { Page, Browser } from "puppeteer-core";

export class PageFactory {
    /**
     * @param {Browser} browser
     */
    constructor(browser) {
        this._browser = browser;
        /**
         * @type {Map<string, Page>}
         */
        this._pages = new Map();
    }

    /**
     * @param {string} owner
     * @returns {Promise<Page>}
     */
    async getPage(owner) {
        if (this._pages.has(owner)) {
            const page = this._pages.get(owner);
            if (!page.isClosed()) {
                return page;
            }
            this._pages.delete(owner);
        }

        const page = await this._browser.newPage();
        const session = await page.createCDPSession();
        await session.send(`Emulation.setFocusEmulationEnabled`, {
            enabled: true,
        });

        this._pages.set(owner, page);
        return page;
    }

    /**
     * @param {string} owner
     * @returns {boolean}
     */
    isClosed(owner) {
        if (this._pages.has(owner)) {
            const page = this._pages.get(owner);
            return page.isClosed();
        }

        return true;
    }
}
