const socket = new WebSocket("/ws");
const form = document.getElementById("card-form");
const textarea = document.getElementById("card-list");
const loadingSpinner = document.getElementById("loading-spinner");
const cardTable = document.getElementById("card-table");

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

const buttonClickListener = (ev) => {
    if (
        ev.target.tagName === "BUTTON" &&
        ev.target.classList.contains("add-to-cart")
    ) {
        ev.target.disabled = true;
        form.querySelector("fieldset").disabled = true;
        loadingSpinner.classList.remove("invisible");

        const cards = {};
        for (const storeEl of cardTable.querySelectorAll(".store-list")) {
            const store = storeEl.getAttribute("data-store");
            const rows = storeEl.querySelectorAll("tr.available");

            for (const row of rows) {
                const card = JSON.parse(row.getAttribute("data-card"));
                card.num = +row.querySelector('input[type="number"]').value;

                if (card.num < 1) {
                    continue;
                }

                if (cards[store]?.constructor !== Object) {
                    cards[store] = {};
                }

                cards[store][card.name] = card;
            }
        }

        socket.send(
            JSON.stringify({
                action: "addToCart",
                cards,
            }),
        );
    }
};
document.body.addEventListener("click", buttonClickListener);

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

    const totalEl = cardTable.querySelector(":scope > .total");
    totalEl.textContent = `Total: ${total.toLocaleString("en-CA", {
        style: "currency",
        currency: "CAD",
    })}`;
    totalEl.setAttribute("data-total", total);
}

socket.addEventListener("open", (ev) => {
    form.querySelector("fieldset").disabled = false;
});

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

        for (let card of Object.values(cards)) {
            if (!storesWithCards[store][card.name]) {
                const tr = document.createElement("tr");
                tr.classList.add("not-available");
                tr.setAttribute("data-card", JSON.stringify(card));
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

            card = storesWithCards[store][card.name];

            const tr = document.createElement("tr");
            tr.classList.add("available");
            tr.setAttribute("data-card", JSON.stringify(card));
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
    cardTable.appendChild(totalEl);

    const addToCart = document.createElement("button");
    addToCart.textContent = "Add to Carts";
    addToCart.classList.add("add-to-cart");
    cardTable.appendChild(addToCart);
}

function createNotFoundTable(cards) {
    if (cards.length < 1) {
        return;
    }

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

    cardTable.appendChild(div);
}

socket.addEventListener("message", (ev) => {
    const message = JSON.parse(ev.data);
    switch (message.action) {
        case "findCardsResponse":
            loadingSpinner.classList.add("invisible");
            createStoreTables(message.data.cards, message.data.storesWithCards);
            createNotFoundTable(message.data.notFound);
            form.querySelector("fieldset").disabled = false;
        case "addToCartResponse":
            loadingSpinner.classList.add("invisible");
        // TODO: clear items added to cart
    }
});

form.addEventListener("submit", (ev) => {
    form.querySelector("fieldset").disabled = true;
    loadingSpinner.classList.remove("invisible");
    cardTable.innerHTML = "";
    ev.preventDefault();
    const cardlist = textarea.value;
    socket.send(
        JSON.stringify({
            action: "findCards",
            cardlist,
        }),
    );
});
