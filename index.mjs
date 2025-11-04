import puppeteer from "puppeteer-core";
import * as server from "./server.mjs";

const chromePath =
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
    executablePath: chromePath,
    protocolTimeout: 240000,
    // We want to see what's happening
    headless: false,
    defaultViewport: null,
});

await server.setBrowser(browser);
await server.start();
