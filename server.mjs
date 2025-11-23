import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWebsocket from "@fastify/websocket";
import path from "node:path";
import { Page } from "puppeteer-core";
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
                    case "findCards": {
                        const page = await getPage();
                        await page.bringToFront();
                        const data = await findCards(message.cardlist);
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
                        const data = await addToCarts(message.cards);
                        const page = await getPage();
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
