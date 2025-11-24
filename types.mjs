/**
 * @typedef {Object} Card
 * @property {number} num - Needed number
 * @property {string} name - Card name
 */

/**
 * @typedef {Object} CardWithPrice
 * @property {number} num - Needed number
 * @property {string} name - Card name
 * @property {number} price - Card price
 * @property {string} url - Card url to add to cart
 * @property {boolean} foil - Is card a foil
 * @property {string?} id - Store card id
 */

/**
 * @typedef {Object} CardPrice
 * @property {number} price - Card price
 * @property {string} url - Card url to add to cart
 * @property {boolean} foil - Is card a foil
 * @property {string?} id - Store card id
 */

/**
 * @typedef {Object<string, CardWithPrice>} FoundCards
 */

/**
 * @typedef {Object<string, CardWithPrice>} MissingCards
 */

/**
 * @typedef {Object} FoundAndNotCards
 * @property {Object<string, FoundCards>} storesWithCards
 * @property {[Card]} notFound
 */

/**
 * @typedef {Object} Store
 * @property {import('./pageFactory.mjs').PageFactory} _pageFactory
 * @property {string} _storeName
 * @property {(pageFactory: import('./pageFactory.mjs').PageFactory, storeName: string) => void} setPageFactory
 * @property {() => Promise<import('puppeteer-core').Page>} getPage
 * @property {(deck: Object<string, Card>) => Promise<FoundCards>} findCards
 * @property {(deck: [CardWithPrice]) => Promise<MissingCards>} addToCart
 */
