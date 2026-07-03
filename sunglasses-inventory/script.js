const demoImages = {
  Aviator: "./assets/aviator.png",
  Round: "./assets/round.png",
  Sport: "./assets/sport.png",
  Square: "./assets/square.png",
};

const defaultSupabaseUrl = "https://ruqkfurdtwflkrworyhn.supabase.co";
const defaultSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWtmdXJkdHdmbGtyd29yeWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTg5NDgsImV4cCI6MjA5NzM5NDk0OH0.XxvKG3VHEljes46eWdlLLtAaZrffL-9FGWhQF0Ur7dU";

let sunglasses = [
  { id: "aviator-demo", name: "Aviator", color: "Gold frame, dark green lens", size: "Med", audience: "Mens", total_quantity: 25, total_sold: 4, image_url: demoImages.Aviator },
  { id: "round-demo", name: "Round", color: "Black frame, smoky lens", size: "Small", audience: "Womens", total_quantity: 3, total_sold: 1, image_url: demoImages.Round },
  { id: "sport-demo", name: "Sport", color: "Matte black frame, blue lens", size: "Large", audience: "Mens", total_quantity: 18, total_sold: 5, image_url: demoImages.Sport },
  { id: "square-demo", name: "Square", color: "Clear gray frame, dark lens", size: "Med", audience: "Womens", total_quantity: 2, total_sold: 0, image_url: demoImages.Square },
  { id: "cateye-demo", name: "Cateye", color: "Pink frame, brown lens", size: "Med", audience: "Womens", total_quantity: 12, total_sold: 2, image_url: demoImages.Square },
];

let history = [
  { action: "Restocked", name: "Aviator", quantity: 10, rawDate: "2026-06-26", date: "6/26/2026" },
  { action: "Sold", name: "Round", quantity: 1, rawDate: "2026-06-26", date: "6/26/2026" },
  { action: "Sold", name: "Sport", quantity: 3, rawDate: "2026-06-25", date: "6/25/2026" },
  { action: "Sold", name: "Sport", quantity: 2, rawDate: "2026-06-24", date: "6/24/2026" },
];

let salesHistory = [
  { sunglasses_name: "Round", quantity: 1, sold_at: "2026-06-26T14:15:00" },
  { sunglasses_name: "Sport", quantity: 3, sold_at: "2026-06-25T11:40:00" },
  { sunglasses_name: "Sport", quantity: 2, sold_at: "2026-06-24T16:05:00" },
];

let client = null;
let connected = false;
let searchTerm = "";

const elements = {
  connectionStatus: document.querySelector("#connectionStatus"),
  searchInput: document.querySelector("#searchInput"),
  inventoryList: document.querySelector("#inventoryList"),
  inventoryTemplate: document.querySelector("#inventoryTemplate"),
  bestSellersList: document.querySelector("#bestSellersList"),
  historyList: document.querySelector("#historyList"),
  salesHistoryBody: document.querySelector("#salesHistoryBody"),
  addForm: document.querySelector("#addForm"),
  newName: document.querySelector("#newName"),
  newColor: document.querySelector("#newColor"),
  newSize: document.querySelector("#newSize"),
  newAudience: document.querySelector("#newAudience"),
  newQuantity: document.querySelector("#newQuantity"),
  newImageUrl: document.querySelector("#newImageUrl"),
};

function getImage(item) {
  return item.image_url || demoImages[item.name] || "./assets/sunglasses-cover.png";
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPopularity(totalSold) {
  if (totalSold >= 5) return "Popular";
  if (totalSold >= 2) return "Okay";
  return "Slow";
}

function renderInventory() {
  elements.inventoryList.innerHTML = "";

  const visibleSunglasses = sunglasses.filter((item) =>
    `${item.name} ${item.color} ${item.size} ${item.audience}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!visibleSunglasses.length) {
    elements.inventoryList.innerHTML = "<p>No sunglasses match your search.</p>";
    return;
  }

  visibleSunglasses.forEach((item) => {
    const node = elements.inventoryTemplate.content.cloneNode(true);
    const image = node.querySelector(".item-image");

    image.src = getImage(item);
    image.alt = `${item.name} sunglasses`;
    node.querySelector("h3").textContent = `${item.name} ${item.size || ""}`.trim();
    node.querySelector(".quantity").textContent = item.total_quantity;
    node.querySelector(".color").textContent = item.color || "No color added";
    node.querySelector(".size").textContent = item.size || "No size added";
    node.querySelector(".audience").textContent = item.audience || "Not set";
    node.querySelector(".total-sold").textContent = item.total_sold || 0;
    node.querySelector(".popularity").textContent = getPopularity(item.total_sold || 0);

    node.querySelectorAll("button").forEach((button) => {
      button.dataset.id = item.id;
    });

    elements.inventoryList.appendChild(node);
  });
}

function renderHistory() {
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

function renderSalesHistory() {
  elements.salesHistoryBody.innerHTML = "";

  if (!salesHistory.length) {
    elements.salesHistoryBody.innerHTML = '<tr><td colspan="3">No sales yet.</td></tr>';
    return;
  }

  salesHistory.slice(0, 12).forEach((sale) => {
    const soldAt = new Date(sale.sold_at);
    const row = document.createElement("tr");
    const name = document.createElement("td");
    const quantity = document.createElement("td");
    const date = document.createElement("td");

    name.textContent = sale.sunglasses_name;
    quantity.textContent = sale.quantity;
    date.textContent = soldAt.toLocaleDateString();

    row.append(name, quantity, date);
    elements.salesHistoryBody.appendChild(row);
  });
}

function renderBestSellers() {
  elements.bestSellersList.innerHTML = "";

  const bestSellers = sunglasses
    .filter((item) => Number(item.total_sold || 0) > 0)
    .sort((a, b) => Number(b.total_sold || 0) - Number(a.total_sold || 0))
    .slice(0, 4);

  if (!bestSellers.length) {
    elements.bestSellersList.innerHTML = "<p>No sales yet.</p>";
    return;
  }

  bestSellers.forEach((item) => {
    const row = document.createElement("div");
    row.className = "best-seller-item";

    const image = document.createElement("img");
    image.src = getImage(item);
    image.alt = `${item.name} sunglasses`;

    const copy = document.createElement("div");
    const title = document.createElement("p");
    const detail = document.createElement("small");
    const count = document.createElement("strong");

    title.textContent = item.name;
    detail.textContent = getPopularity(item.total_sold || 0);
    count.textContent = `${item.total_sold || 0} sold`;

    copy.append(title, detail, count);
    row.append(image, copy);
    elements.bestSellersList.appendChild(row);
  });
}

async function connectSupabase(url, key) {
  if (!window.supabase) {
    elements.connectionStatus.textContent = "Supabase could not load. Check internet.";
    return;
  }

  try {
    client = window.supabase.createClient(url, key);
    connected = true;
    elements.connectionStatus.textContent = "Connected to Supabase.";
    await loadFromSupabase();
  } catch (error) {
    connected = false;
    client = null;
    elements.connectionStatus.textContent = `Connection failed: ${error.message}`;
  }
}

async function loadFromSupabase() {
  if (!connected) return;

  const { data, error } = await client
    .from("sunglasses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    elements.connectionStatus.textContent = `Supabase error: ${error.message}. Make sure the sunglasses table exists and RLS is off for testing.`;
    return;
  }

  sunglasses = data || [];
  history = [];
  await loadSalesHistory();
  renderInventory();
  renderHistory();
  renderBestSellers();
}

async function loadSalesHistory() {
  const { data, error } = await client
    .from("sales_history")
    .select("*")
    .order("sold_at", { ascending: false })
    .limit(12);

  if (error) {
    salesHistory = [];
    elements.connectionStatus.textContent = `Connected. Sales history table not ready yet: ${error.message}`;
    renderSalesHistory();
    return;
  }

  salesHistory = data || [];
  renderSalesHistory();
}

async function changeStock(type, sunglassesId, quantity) {
  const item = sunglasses.find((entry) => entry.id === sunglassesId);
  if (!item || quantity <= 0) return;

  item.total_quantity = type === "restock"
    ? Number(item.total_quantity) + quantity
    : Math.max(0, Number(item.total_quantity) - quantity);

  if (type === "sold") {
    item.total_sold = Number(item.total_sold || 0) + quantity;
  }

  if (connected) {
    const { error } = await client
      .from("sunglasses")
      .update({
        total_quantity: item.total_quantity,
        total_sold: item.total_sold || 0,
      })
      .eq("id", item.id);

    if (error) {
      elements.connectionStatus.textContent = `Save failed: ${error.message}`;
      return;
    }

    if (type === "sold") {
      const saleResult = await client
        .from("sales_history")
        .insert({
          sunglasses_id: item.id,
          sunglasses_name: item.name,
          quantity,
        });

      if (saleResult.error) {
        elements.connectionStatus.textContent = `Stock saved, but sales history failed: ${saleResult.error.message}`;
      }
    }
  }

  if (type === "sold") {
    salesHistory = [
      {
        sunglasses_id: item.id,
        sunglasses_name: item.name,
        quantity,
        sold_at: new Date().toISOString(),
      },
      ...salesHistory,
    ];
  }

  history = [
    {
      action: type === "restock" ? "Restocked" : "Sold",
      name: item.name,
      quantity,
      rawDate: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
    },
    ...history,
  ];

  renderInventory();
  renderHistory();
  renderSalesHistory();
  renderBestSellers();
}

async function addSunglasses(event) {
  event.preventDefault();

  const item = {
    id: makeId(),
    name: elements.newName.value.trim(),
    color: elements.newColor.value.trim(),
    size: elements.newSize.value.trim(),
    audience: elements.newAudience.value.trim(),
    total_quantity: Number(elements.newQuantity.value),
    total_sold: 0,
    image_url: elements.newImageUrl.value.trim() || null,
  };

  if (connected) {
    delete item.id;
    const { data, error } = await client
      .from("sunglasses")
      .insert(item)
      .select()
      .single();

    if (error) {
      elements.connectionStatus.textContent = `Add failed: ${error.message}`;
      return;
    }

    sunglasses.unshift(data);
  } else {
    sunglasses.unshift(item);
  }

  elements.addForm.reset();
  renderInventory();
  renderBestSellers();
}

elements.addForm.addEventListener("submit", addSunglasses);
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderInventory();
});
elements.inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  changeStock(button.dataset.action, button.dataset.id, Number(button.dataset.amount));
});

renderInventory();
renderHistory();
renderSalesHistory();
renderBestSellers();
connectSupabase(defaultSupabaseUrl, defaultSupabaseKey);
