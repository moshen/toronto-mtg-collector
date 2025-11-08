import { setTimeout } from "node:timers/promises";
import stores from "./stores/index.mjs";

/**
 * This looks insane, but we're trying to switch tabs to activly operating tabs
 *
 * This appears to be required for some store pages to load propertly
 *
 * @param {AbortSignal} signal
 */
export async function cycleTabs(signal) {
    loop: while (true) {
        for (const store of Object.values(stores)) {
            if (signal.aborted) {
                break loop;
            }

            if (store.isWorking()) {
                await store.switchTab();
                await setTimeout(500);
            }
        }
    }
}
