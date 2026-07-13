import { formatMoney, getPriceEach } from "./helpers.js";

export function renderLowStock(elements, sunglasses) {
  const lowStockItems = sunglasses
    .filter((item) => Number(item.total_quantity || 0) <= 3)
    .sort((a, b) => Number(a.total_quantity || 0) - Number(b.total_quantity || 0));

  if (!lowStockItems.length) {
    elements.lowStockCard.hidden = true;
    elements.lowStockList.innerHTML = "";
    return;
  }

  elements.lowStockCard.hidden = false;
  elements.lowStockList.innerHTML = "";

  lowStockItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "low-stock-item";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const details = document.createElement("span");
    details.textContent = `${item.total_quantity} left`;

    row.append(name, details);
    elements.lowStockList.appendChild(row);
  });
}

export function renderInventory({ elements, sunglasses, searchTerm, getPopularity }) {
  elements.inventoryList.innerHTML = "";

  const visibleSunglasses = sunglasses.filter((item) =>
    `${item.name} ${item.style_number} ${item.color} ${item.size} ${item.audience} ${item.price_type}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!visibleSunglasses.length) {
    elements.inventoryList.innerHTML = "<p>No sunglasses match your search.</p>";
    return;
  }

  visibleSunglasses.forEach((item) => {
    const node = elements.inventoryTemplate.content.cloneNode(true);

    node.querySelector(".item-name").textContent = `${item.name} ${item.size || ""}`.trim();
    node.querySelector(".item-style-number").textContent = item.style_number ? `Style # ${item.style_number}` : "No style #";
    node.querySelector(".item-mini-stats").textContent = `${item.total_quantity} left - ${item.total_sold || 0} sold`;
    node.querySelector(".quantity").textContent = item.total_quantity;
    node.querySelector(".color").textContent = item.color || "No color added";
    node.querySelector(".style-number").textContent = item.style_number || "No style #";
    node.querySelector(".size").textContent = item.size || "No size added";
    node.querySelector(".audience").textContent = item.audience || "Not set";
    node.querySelector(".total-sold").textContent = item.total_sold || 0;
    node.querySelector(".popularity").textContent = getPopularity(item);

    const price = node.querySelector(".price");
    if (price) {
      price.textContent = `${item.price_type || "Normal"} - ${formatMoney(getPriceEach(item))}`;
    }

    if (Number(item.total_quantity || 0) <= 3) {
      node.querySelector(".quantity").textContent = `${item.total_quantity} - Low stock`;
    }

    if (Number(item.total_quantity || 0) <= 0) {
      const soldButton = node.querySelector(".sold-button");
      soldButton.disabled = true;
      soldButton.textContent = "Sold out";
    }

    node.querySelectorAll("button").forEach((button) => {
      button.dataset.id = item.id;
    });

    elements.inventoryList.appendChild(node);
  });
}

export function renderHistory(elements, history) {
  if (!elements.historyList) return;

  elements.historyList.innerHTML = "";

  if (!history.length) {
    elements.historyList.innerHTML = "<p>No history yet.</p>";
    return;
  }

  history.slice(0, 8).forEach((item) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const copy = document.createElement("div");
    const title = document.createElement("p");
    const date = document.createElement("small");
    title.textContent = `${item.action} ${item.name}`;
    date.textContent = item.date;
    copy.append(title, date);

    const qty = document.createElement("strong");
    qty.className = item.action === "Restocked" ? "positive" : "negative";
    qty.textContent = `${item.action === "Restocked" ? "+" : "-"}${item.quantity}`;

    row.append(copy, qty);
    elements.historyList.appendChild(row);
  });
}
