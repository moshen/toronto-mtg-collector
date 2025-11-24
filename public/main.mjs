const socket = new WebSocket("/ws");
const form = document.getElementById("card-form");
const textarea = document.getElementById("card-list");
const storeCheckboxes = document.getElementById("store-checkboxes");
const loadingSpinner = document.getElementById("loading-spinner");
const cardTable = document.getElementById("card-table");
const cardControls = document.getElementById("card-controls");

let notificationsEnabled = false;

const numberChangeListener = (ev) => {
    if (
        ev.target.getAttribute("type") === "number" &&
        ev.target.parentElement.tagName === "TD"
    ) {
        if (+ev.target.value < 0) {
            ev.target.value = 0;
        }

        if (+ev.target.value === 0) {
            ev.target.classList.add("num-zero");
        } else {
            ev.target.classList.remove("num-zero");
        }

        recalculateTotals(
            ev.target.parentElement.parentElement.parentElement.parentElement,
        );
    }
};
document.body.addEventListener("change", numberChangeListener);

const addToCartsListener = (ev) => {
    ev.target.disabled = true;
    form.querySelector("fieldset").disabled = true;
    loadingSpinner.classList.remove("invisible");

    /**
     * @type {Object<string, Object<string, import("../types.mjs").CardWithPrice>>}
     */
    const cards = {};
    for (const storeEl of cardTable.querySelectorAll(".store-list")) {
        const store = storeEl.getAttribute("data-store");
        const rows = storeEl.querySelectorAll("tr.available");

        for (const row of rows) {
            /**
             * @type {import("../types.mjs").CardWithPrice}
             */
            const card = JSON.parse(row.getAttribute("data-card"));
            card.num = +row.querySelector('input[type="number"]').value;

            if (card.num < 1) {
                continue;
            }

            if (cards[store]?.constructor !== Object) {
                cards[store] = {};
            }

            cards[store][card.name.toLocaleLowerCase()] = card;
        }
    }

    socket.send(
        JSON.stringify({
            action: "addToCarts",
            cards,
        }),
    );
};

const rowHoverListener = (ev) => {
    const num = ev.target.getAttribute("data-row-num");
    const rows = document.querySelectorAll(
        `tr[data-row-num="${num}"].available`,
    );
    for (const row of rows) {
        row.classList.add("row-highlight");
    }
};
const rowHoverOffListener = (ev) => {
    const num = ev.target.getAttribute("data-row-num");
    const rows = document.querySelectorAll(
        `tr[data-row-num="${num}"].available`,
    );
    for (const row of rows) {
        row.classList.remove("row-highlight");
    }
};

function recalculateTotals(store) {
    const rows = store.querySelectorAll("tr.available");

    let storeTotal = 0;
    for (const row of rows) {
        const card = JSON.parse(row.getAttribute("data-card"));
        card.num = +row.querySelector('input[type="number"]').value;
        storeTotal += card.num * card.price;
    }

    const storeTotalEl = store.querySelector(".total");
    storeTotalEl.textContent = `Store Total: ${storeTotal.toLocaleString(
        "en-CA",
        {
            style: "currency",
            currency: "CAD",
        },
    )}`;
    storeTotalEl.setAttribute("data-total", storeTotal);

    const allStoreTotalEls = document.querySelectorAll("div.store-list .total");
    let total = 0;
    for (const storeTotalEl of allStoreTotalEls) {
        total += +storeTotalEl.getAttribute("data-total");
    }

    const totalEl = cardControls.querySelector(":scope > .total");
    totalEl.textContent = `Total: ${total.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
    })}`;
    totalEl.setAttribute("data-total", total);
}

socket.addEventListener("open", (ev) => {
    socket.send(
        JSON.stringify({
            action: "getStores",
        }),
    );
});

function createStoreCheckboxes(stores) {
    storeCheckboxes.innerHTML = "";
    for (const store of stores) {
        const div = document.createElement("div");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `store-${store}`;
        checkbox.value = store;
        checkbox.checked = true;
        div.appendChild(checkbox);

        const label = document.createElement("label");
        label.htmlFor = `store-${store}`;
        label.textContent = store;
        div.appendChild(label);

        storeCheckboxes.appendChild(div);
    }
}

function createStoreTables(cards, storesWithCards) {
    let total = 0;

    for (const store of Object.keys(storesWithCards)) {
        let storeTotal = 0;

        const div = document.createElement("div");
        div.classList.add("store-list");
        div.setAttribute("data-store", store);
        const title = document.createElement("h3");
        title.textContent = store;
        div.appendChild(title);
        const table = document.createElement("table");
        const header = document.createElement("tr");
        const header1 = document.createElement("th");
        header1.textContent = "Number";
        header.appendChild(header1);
        const header2 = document.createElement("th");
        header2.textContent = "Card";
        header.appendChild(header2);
        const header3 = document.createElement("th");
        header3.textContent = "Foil";
        header.appendChild(header3);
        const header4 = document.createElement("th");
        header4.textContent = "Price";
        header.appendChild(header4);
        table.appendChild(header);

        let rowNum = 1;
        for (let card of Object.values(cards)) {
            if (!storesWithCards[store][card.name.toLocaleLowerCase()]) {
                const tr = document.createElement("tr");
                tr.classList.add("not-available");
                tr.setAttribute("data-card", JSON.stringify(card));
                tr.setAttribute("data-row-num", rowNum++);
                const numTd = document.createElement("td");
                tr.appendChild(numTd);
                const nameTd = document.createElement("td");
                nameTd.textContent = " " + card.name;
                tr.appendChild(nameTd);
                const foilTd = document.createElement("td");
                tr.appendChild(foilTd);
                const priceTd = document.createElement("td");
                tr.appendChild(priceTd);
                table.appendChild(tr);
                continue;
            }

            card = storesWithCards[store][card.name.toLocaleLowerCase()];

            const tr = document.createElement("tr");
            tr.classList.add("available");
            tr.setAttribute("data-card", JSON.stringify(card));
            tr.setAttribute("data-row-num", rowNum++);
            tr.addEventListener("mouseenter", rowHoverListener);
            tr.addEventListener("mouseleave", rowHoverOffListener);
            const numTd = document.createElement("td");
            const num = document.createElement("input");
            num.type = "number";
            num.min = 0;
            num.value = card.num;
            if (card.num === 0) {
                num.classList.add("num-zero");
            } else {
                storeTotal += card.num * card.price;
            }
            numTd.appendChild(num);
            tr.appendChild(numTd);
            const nameTd = document.createElement("td");
            nameTd.textContent = " ";
            const a = document.createElement("a");
            a.textContent = card.name;
            a.href = card.url;
            a.target = "_blank";
            nameTd.appendChild(a);
            tr.appendChild(nameTd);
            const foilTd = document.createElement("td");
            foilTd.textContent = card.foil ? "🟩" : " ";
            tr.appendChild(foilTd);
            const priceTd = document.createElement("td");
            priceTd.textContent = card.price.toLocaleString("en-CA", {
                style: "currency",
                currency: "CAD",
            });
            tr.appendChild(priceTd);
            table.appendChild(tr);
        }
        div.appendChild(table);

        const storeTotalEl = document.createElement("div");
        storeTotalEl.textContent = `Store Total: ${storeTotal.toLocaleString(
            "en-CA",
            {
                style: "currency",
                currency: "CAD",
            },
        )}`;
        storeTotalEl.classList.add("total");
        storeTotalEl.setAttribute("data-total", storeTotal);
        div.appendChild(storeTotalEl);
        total += storeTotal;

        cardTable.appendChild(div);
    }

    const totalEl = document.createElement("div");
    totalEl.textContent = `Total: ${total.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
    })}`;
    totalEl.classList.add("total");
    totalEl.setAttribute("data-total", total);
    cardControls.appendChild(totalEl);

    const addToCart = document.createElement("button");
    addToCart.textContent = "Add to Carts";
    addToCart.classList.add("add-to-carts");
    addToCart.addEventListener("click", addToCartsListener);
    cardControls.appendChild(addToCart);
}

function createNotFoundTable(cards) {
    if (cards.length < 1) {
        return;
    }

    cardControls.querySelector(".not-found-list")?.remove();

    const div = document.createElement("div");
    div.classList.add("not-found-list");
    const title = document.createElement("h3");
    title.textContent = "Not Found";
    div.appendChild(title);

    for (const card of cards) {
        const cardDiv = document.createElement("div");
        cardDiv.textContent = `${card.num} ${card.name}`;
        div.appendChild(cardDiv);
    }

    cardControls.appendChild(div);
}

/**
 * @param {Object<string, import("../types.mjs").MissingCards>} storesMissingCards
 */
function updateTableAmountsFromCarts(storesMissingCards) {
    for (const store of Object.keys(storesMissingCards)) {
        const storeEl = cardTable.querySelector(`[data-store="${store}"]`);
        for (const cardRow of Array.from(
            storeEl.querySelectorAll("tr input:not(.num-zero)"),
        ).map((el) => el.closest("tr"))) {
            /**
             * @type {import("../types.mjs").CardWithPrice}
             */
            const card = JSON.parse(cardRow.getAttribute("data-card"));

            if (!storesMissingCards[store][card.name.toLocaleLowerCase()]) {
                const input = cardRow.querySelector("input");
                input.value = 0;
                input.classList.add("num-zero");
            }
        }
        recalculateTotals(storeEl);

        // Add element to show issues
        storeEl.querySelector(".missing-cards")?.remove();
        const missingCards = document.createElement("div");
        missingCards.classList.add("missing-cards");
        const header = document.createElement("h3");
        header.textContent = "Cards missing from cart (errors)";
        missingCards.appendChild(header);

        const cardArr = Object.values(storesMissingCards[store]);
        if (cardArr.length < 1) {
            continue;
        }

        for (const card of cardArr) {
            const cardRow = document.createElement("div");
            cardRow.textContent = `${card.num} ${card.name}`;
            missingCards.appendChild(cardRow);
        }
        storeEl.appendChild(missingCards);
    }
}

socket.addEventListener("message", (ev) => {
    const message = JSON.parse(ev.data);
    switch (message.action) {
        case "getStoresResponse":
            createStoreCheckboxes(message.data);
            form.querySelector("fieldset").disabled = false;
            break;
        case "findCardsResponse":
            loadingSpinner.classList.add("invisible");
            createStoreTables(message.data.cards, message.data.storesWithCards);
            createNotFoundTable(message.data.notFound);
            form.querySelector("fieldset").disabled = false;
            if (notificationsEnabled) {
                new Notification("Find cards complete");
            }
            break;
        case "addToCartsResponse":
            loadingSpinner.classList.add("invisible");
            // Purposfully leaving the card entry form disabled

            // Remove all items that successfully added
            updateTableAmountsFromCarts(message.data);

            document.querySelector("button.add-to-carts").disabled = false;
            console.log(message.data);
            if (notificationsEnabled) {
                new Notification("Add to carts complete");
            }
            break;
        // TODO: clear items added to cart ?
    }
});

form.addEventListener("submit", (ev) => {
    form.querySelector("fieldset").disabled = true;
    loadingSpinner.classList.remove("invisible");
    cardTable.innerHTML = "";
    cardControls.innerHTML = "";
    ev.preventDefault();
    const cardlist = textarea.value;
    const stores = Array.from(
        storeCheckboxes.querySelectorAll('input[type="checkbox"]:checked'),
    ).map((el) => el.value);
    socket.send(
        JSON.stringify({
            action: "findCards",
            cardlist,
            stores,
        }),
    );
});

Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
        notificationsEnabled = true;
        new Notification("MTG Card Finder Notifications Enabled");
    }
});
