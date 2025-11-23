import puppeteer from "puppeteer-core";
import * as server from "./server.mjs";
import { PageFactory } from "./pageFactory.mjs";

const chromePath =
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
    executablePath: chromePath,
    protocolTimeout: 240000,
    // We want to see what's happening
    headless: false,
    defaultViewport: null,
    args: [
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
    ],
});

const pageFactory = new PageFactory(browser);
await server.setPageFactory(pageFactory);
await server.start();
