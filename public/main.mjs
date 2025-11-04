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
    }
};

document.body.addEventListener("change", numberChangeListener);

socket.addEventListener("open", (ev) => {
    form.querySelector("fieldset").disabled = false;
});

function createStoreTables(cards, storesWithCards) {
    let total = 0;

    for (const store of Object.keys(storesWithCards)) {
        let storeTotal = 0;

        const div = document.createElement("div");
        div.classList.add("store-list");
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

    cardTable.appendChild(totalEl);
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
