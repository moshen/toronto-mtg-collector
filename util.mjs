import { setTimeout } from "node:timers/promises";
import stores from "./stores/index.mjs";

/**
 * This looks insane, but we're trying to switch tabs to activly operating tabs
 *
 * This appears to be required for some store pages to load propertly
 */
export async function cycleTabs() {
    loop: while (true) {
        let workingCount = 0;

        for (const store of Object.values(stores)) {
            if (store.isWorking()) {
                workingCount++;
                await store.switchTab();
                await setTimeout(500);
            }
        }

        if (workingCount === 0) {
            break loop;
        }
    }
}
