import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import stores from "./stores/index.mjs";
import addToCarts from "./actions/addToCarts.mjs";
import findCards from "./actions/findCards.mjs";
import { PageFactory } from "./pageFactory.mjs";

/**
 * @type {PageFactory}
 */
let _pageFactory = null;

/**
 * @param {PageFactory} pageFactory
 */
export async function setPageFactory(pageFactory) {
    _pageFactory = pageFactory;

    for (const [name, store] of Object.entries(stores)) {
        store.setPageFactory(_pageFactory, name);
    }
}

/**
 * @returns {Promise<import('puppeteer-core').Page>}
 */
async function getPage() {
    return _pageFactory.getPage("server");
}

const fastify = Fastify({
    logger: true,
});

fastify.register(fastifyStatic, {
    root: path.join(import.meta.dirname, "public"),
    prefix: "/public/",
    constraints: { host: "127.0.0.1:30000" },
});
fastify.register(fastifyWebsocket);

fastify.register(async function (_fastify) {
    _fastify.get("/ws", { websocket: true }, function handler(socket, req) {
        // Have to wait for the client to initiate
        socket.on("message", async (data) => {
            try {
                const message = JSON.parse(data.toString("utf-8"));

                switch (message.action) {
                    case "getStores": {
                        socket.send(
                            JSON.stringify({
                                action: "getStoresResponse",
                                data: Object.keys(stores),
                            }),
                        );
                        break;
                    }
                    case "findCards": {
                        const page = await getPage();
                        const dataPromise = findCards(
                            message.cardlist,
                            message.stores,
                        );
                        // Flip back to the collector page after spinning up tabs
                        await setTimeout(500);
                        await page.bringToFront();
                        const data = await dataPromise;
                        await page.bringToFront();
                        socket.send(
                            JSON.stringify({
                                action: "findCardsResponse",
                                data,
                            }),
                        );
                        break;
                    }
                    case "addToCarts": {
                        const page = await getPage();
                        const dataPromise = addToCarts(message.cards);
                        // Flip back to the collector page after spinning up tabs
                        await setTimeout(500);
                        await page.bringToFront();
                        const data = await dataPromise;
                        await page.bringToFront();
                        socket.send(
                            JSON.stringify({
                                action: "addToCartsResponse",
                                data,
                            }),
                        );
                        break;
                    }
                }
            } catch (err) {
                console.log(err);
            }
        });
    });
});

fastify.get("/", async function handler(request, reply) {
    return reply.sendFile("index.html");
});

/**
 * @returns {Promise<void>}
 */
export async function start() {
    // Run the server!
    try {
        await fastify.listen({
            host: "127.0.0.1",
            port: 30000,
        });

        const page = await getPage();
        await page.goto("http://127.0.0.1:30000/");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
