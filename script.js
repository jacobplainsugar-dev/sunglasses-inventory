const demoImages = {
  Aviator: "./assets/aviator.png",
  Round: "./assets/round.png",
  Sport: "./assets/sport.png",
  Square: "./assets/square.png",
};

const defaultSupabaseUrl = "https://ruqkfurdtwflkrworyhn.supabase.co";
const defaultSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWtmdXJkdHdmbGtyd29yeWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTg5NDgsImV4cCI6MjA5NzM5NDk0OH0.XxvKG3VHEljes46eWdlLLtAaZrffL-9FGWhQF0Ur7dU";
const autoLogoutMs = 5 * 60 * 1000;

let sunglasses = [];

let history = [];

let salesHistory = [];

let client = null;
let connected = false;
let searchTerm = "";
let autoLogoutTimer = null;

const elements = {
  loginScreen: document.querySelector("#loginScreen"),
  appScreen: document.querySelector("#appScreen"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  logoutButton: document.querySelector("#logoutButton"),
  connectionStatus: document.querySelector("#connectionStatus"),
  searchInput: document.querySelector("#searchInput"),
  lowStockCard: document.querySelector("#lowStockCard"),
  lowStockList: document.querySelector("#lowStockList"),
  noSalesCard: document.querySelector("#noSalesCard"),
  noSalesList: document.querySelector("#noSalesList"),
  inventoryList: document.querySelector("#inventoryList"),
  inventoryTemplate: document.querySelector("#inventoryTemplate"),
  bestSellersList: document.querySelector("#bestSellersList"),
  historyList: document.querySelector("#historyList"),
  dailySalesTables: document.querySelector("#dailySalesTables"),
  addForm: document.querySelector("#addForm"),
  newName: document.querySelector("#newName"),
  newColor: document.querySelector("#newColor"),
  newSize: document.querySelector("#newSize"),
  newAudience: document.querySelector("#newAudience"),
  newQuantity: document.querySelector("#newQuantity"),
  newImageUrl: document.querySelector("#newImageUrl"),
};

function showLogin(message = "") {
  stopAutoLogoutTimer();
  elements.loginScreen.hidden = false;
  elements.appScreen.hidden = true;
  elements.loginStatus.textContent = message;
}

function showApp() {
  elements.loginScreen.hidden = true;
  elements.appScreen.hidden = false;
  resetAutoLogoutTimer();
}

function stopAutoLogoutTimer() {
  window.clearTimeout(autoLogoutTimer);
  autoLogoutTimer = null;
}

function resetAutoLogoutTimer() {
  if (elements.appScreen.hidden) return;

  stopAutoLogoutTimer();
  autoLogoutTimer = window.setTimeout(() => {
    logOut("The app logged out because nobody used it for 5 minutes.");
  }, autoLogoutMs);
}

function getImage(item) {
  return item.image_url || demoImages[item.name] || "./assets/sunglasses-cover.png";
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getRecentSold(item, dayCount = 5) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dayCount);

  return salesHistory
    .filter((sale) => {
      const soldAt = new Date(sale.sold_at);
      const matchesItem = sale.sunglasses_id
        ? sale.sunglasses_id === item.id
        : sale.sunglasses_name === item.name;

      return matchesItem && soldAt >= startDate;
    })
    .reduce((total, sale) => total + Number(sale.quantity || 0), 0);
}

function getPopularity(item) {
  const recentSold = getRecentSold(item, 5);

  if (recentSold >= 20) return "Popular";
  if (recentSold >= 5) return "Okay";
  return "Slow";
}

function renderLowStock() {
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

function renderNoSalesAlert() {
  const noSalesItems = sunglasses
    .filter((item) => Number(item.total_quantity || 0) > 0)
    .filter((item) => getRecentSold(item, 4) === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!noSalesItems.length) {
    elements.noSalesCard.hidden = true;
    elements.noSalesList.innerHTML = "";
    return;
  }

  elements.noSalesCard.hidden = false;
  elements.noSalesList.innerHTML = "";

  noSalesItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "no-sales-item";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const details = document.createElement("span");
    details.textContent = "0 sold in 4 days";

    row.append(name, details);
    elements.noSalesList.appendChild(row);
  });
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
    node.querySelector(".popularity").textContent = getPopularity(item);

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

function renderHistory() {
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

function renderSalesHistory() {
  if (!elements.dailySalesTables) return;

  elements.dailySalesTables.innerHTML = "";

  if (!salesHistory.length) {
    elements.dailySalesTables.innerHTML = '<p class="empty-sales">No sales yet.</p>';
    return;
  }

  const salesByDay = salesHistory.reduce((groups, sale) => {
    const soldAt = new Date(sale.sold_at);
    const dayKey = soldAt.toLocaleDateString();

    if (!groups[dayKey]) {
      groups[dayKey] = [];
    }

    groups[dayKey].push(sale);
    return groups;
  }, {});

  Object.entries(salesByDay).forEach(([day, sales]) => {
    const dailyCard = document.createElement("section");
    dailyCard.className = "daily-sales-card";

    const title = document.createElement("h3");
    const dailyTotal = sales.reduce((total, sale) => total + Number(sale.quantity || 0), 0);
    title.textContent = `${day} - ${dailyTotal} sold`;

    const tableWrap = document.createElement("div");
    tableWrap.className = "sales-table-wrap";

    const table = document.createElement("table");
    table.className = "sales-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pair</th>
          <th>Qty</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const body = table.querySelector("tbody");

    sales.forEach((sale) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const quantity = document.createElement("td");

      name.textContent = sale.sunglasses_name;
      quantity.textContent = sale.quantity;

      row.append(name, quantity);
      body.appendChild(row);
    });

    tableWrap.appendChild(table);
    dailyCard.append(title, tableWrap);
    elements.dailySalesTables.appendChild(dailyCard);
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
    detail.textContent = getPopularity(item);
    count.textContent = `${item.total_sold || 0} sold`;

    copy.append(title, detail, count);
    row.append(image, copy);
    elements.bestSellersList.appendChild(row);
  });
}

async function connectSupabase(url, key) {
  if (!window.supabase) {
    showLogin("Supabase could not load. Check internet.");
    return;
  }

  try {
    client = window.supabase.createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
    connected = true;
    elements.loginStatus.textContent = "Checking login...";

    const { data, error } = await client.auth.getSession();
    if (error) {
      showLogin(`Login check failed: ${error.message}`);
      return;
    }

    if (data.session) {
      showApp();
      elements.connectionStatus.textContent = "Connected to Supabase.";
      await loadFromSupabase();
    } else {
      showLogin("Please sign in to open the inventory.");
    }
  } catch (error) {
    connected = false;
    client = null;
    showLogin(`Connection failed: ${error.message}`);
  }
}

async function logIn(event) {
  event.preventDefault();

  if (!client) {
    showLogin("Supabase is not connected yet.");
    return;
  }

  elements.loginStatus.textContent = "Signing in...";

  const { error } = await client.auth.signInWithPassword({
    email: elements.loginEmail.value.trim(),
    password: elements.loginPassword.value,
  });

  if (error) {
    elements.loginStatus.textContent = `Login failed: ${error.message}`;
    return;
  }

  elements.loginForm.reset();
  showApp();
  elements.connectionStatus.textContent = "Connected to Supabase.";
  await loadFromSupabase();
}

async function logOut(message = "You are logged out.") {
  if (client) {
    await client.auth.signOut();
  }

  showLogin(message);
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
  renderLowStock();
  renderNoSalesAlert();
}

async function loadSalesHistory() {
  const { data, error } = await client
    .from("sales_history")
    .select("*")
    .order("sold_at", { ascending: false })
    .limit(100);

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

  if (type === "sold" && Number(item.total_quantity || 0) <= 0) {
    elements.connectionStatus.textContent = `${item.name} is sold out. Restock before selling more.`;
    return;
  }

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
  renderLowStock();
  renderNoSalesAlert();
}

async function deleteSunglasses(sunglassesId) {
  const item = sunglasses.find((entry) => entry.id === sunglassesId);
  if (!item) return;

  const shouldDelete = window.confirm(`Delete ${item.name}?`);
  if (!shouldDelete) return;

  if (connected) {
    const { error } = await client
      .from("sunglasses")
      .delete()
      .eq("id", item.id);

    if (error) {
      elements.connectionStatus.textContent = `Delete failed: ${error.message}`;
      return;
    }
  }

  sunglasses = sunglasses.filter((entry) => entry.id !== sunglassesId);
  elements.connectionStatus.textContent = `${item.name} was deleted.`;
  renderInventory();
  renderBestSellers();
  renderLowStock();
  renderNoSalesAlert();
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
  renderLowStock();
  renderNoSalesAlert();
}

elements.addForm.addEventListener("submit", addSunglasses);
elements.loginForm.addEventListener("submit", logIn);
elements.logoutButton.addEventListener("click", () => logOut());
["click", "keydown", "input", "touchstart"].forEach((eventName) => {
  document.addEventListener(eventName, resetAutoLogoutTimer);
});
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderInventory();
});
elements.inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "delete") {
    deleteSunglasses(button.dataset.id);
    return;
  }

  changeStock(button.dataset.action, button.dataset.id, Number(button.dataset.amount));
});

showLogin("Checking security...");
connectSupabase(defaultSupabaseUrl, defaultSupabaseKey);
