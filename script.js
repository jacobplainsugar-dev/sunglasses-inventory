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

let badSalesDays = [];

let client = null;
let connected = false;
let searchTerm = "";
let autoLogoutTimer = null;
let showAllSalesHistory = false;
let connectionPromise = null;

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
  badDayButton: document.querySelector("#badDayButton"),
  badDayStatus: document.querySelector("#badDayStatus"),
  lowStockCard: document.querySelector("#lowStockCard"),
  lowStockList: document.querySelector("#lowStockList"),
  noSalesCard: document.querySelector("#noSalesCard"),
  noSalesList: document.querySelector("#noSalesList"),
  inventoryList: document.querySelector("#inventoryList"),
  inventoryTemplate: document.querySelector("#inventoryTemplate"),
  historyList: document.querySelector("#historyList"),
  dailySalesTables: document.querySelector("#dailySalesTables"),
  showSalesHistoryButton: document.querySelector("#showSalesHistoryButton"),
  addForm: document.querySelector("#addForm"),
  newName: document.querySelector("#newName"),
  newColor: document.querySelector("#newColor"),
  newSize: document.querySelector("#newSize"),
  newAudience: document.querySelector("#newAudience"),
  newQuantity: document.querySelector("#newQuantity"),
  newPriceType: document.querySelector("#newPriceType"),
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

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBadSalesDay(date) {
  const dateKey = typeof date === "string" ? date : getDateKey(date);
  return badSalesDays.includes(dateKey);
}

function getGoodSalesDayKeys(dayCount) {
  const goodDays = [];
  const cursor = new Date();
  let checkedDays = 0;

  while (goodDays.length < dayCount && checkedDays < 45) {
    const dateKey = getDateKey(cursor);

    if (!isBadSalesDay(dateKey)) {
      goodDays.push(dateKey);
    }

    cursor.setDate(cursor.getDate() - 1);
    checkedDays += 1;
  }

  return goodDays;
}

function renderBadDayControl() {
  const todayKey = getDateKey();
  const todayIsBad = isBadSalesDay(todayKey);

  elements.badDayButton.textContent = todayIsBad
    ? "Remove bad day from today"
    : "Mark today as bad weather/fire day";

  elements.badDayStatus.textContent = todayIsBad
    ? "Today is being skipped for popularity and no-sales alerts."
    : "Today is counting as a normal sales day.";
}

function getRecentSold(item, dayCount = 5) {
  const goodSalesDays = getGoodSalesDayKeys(dayCount);

  return salesHistory
    .filter((sale) => {
      const soldAt = new Date(sale.sold_at);
      const soldDateKey = getDateKey(soldAt);
      const matchesItem = sale.sunglasses_id
        ? sale.sunglasses_id === item.id
        : sale.sunglasses_name === item.name;

      return matchesItem && goodSalesDays.includes(soldDateKey);
    })
    .reduce((total, sale) => total + Number(sale.quantity || 0), 0);
}

function getAllTimeSold(item) {
  const historyTotal = salesHistory
    .filter((sale) => {
      return sale.sunglasses_id
        ? sale.sunglasses_id === item.id
        : sale.sunglasses_name === item.name;
    })
    .reduce((total, sale) => total + Number(sale.quantity || 0), 0);

  return Math.max(historyTotal, Number(item.total_sold || 0));
}

function getAverageSold() {
  if (!sunglasses.length) return 0;

  const totalSold = sunglasses.reduce((total, item) => total + getAllTimeSold(item), 0);
  return totalSold / sunglasses.length;
}

function getPopularity(item) {
  const soldThisWeek = getRecentSold(item, 7);

  if (soldThisWeek >= 60) return "Popular";
  if (soldThisWeek >= 25) return "Okay";
  return "Slow";
}

function getPriceEach(item) {
  if (Number(item.price_each || 0) > 0) {
    return Number(item.price_each);
  }

  if (item.price_type === "Vintage") return 35;
  if (item.price_type === "Polarized") return 25;
  return 20;
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
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
    details.textContent = "0 sold in last 4 good sales days";

    row.append(name, details);
    elements.noSalesList.appendChild(row);
  });
}

function renderInventory() {
  elements.inventoryList.innerHTML = "";

  const visibleSunglasses = sunglasses.filter((item) =>
    `${item.name} ${item.color} ${item.size} ${item.audience} ${item.price_type}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!visibleSunglasses.length) {
    elements.inventoryList.innerHTML = "<p>No sunglasses match your search.</p>";
    return;
  }

  visibleSunglasses.forEach((item) => {
    const node = elements.inventoryTemplate.content.cloneNode(true);

    node.querySelector(".item-name").textContent = `${item.name} ${item.size || ""}`.trim();
    node.querySelector(".item-mini-stats").textContent = `${item.total_quantity} left - ${item.total_sold || 0} sold`;
    node.querySelector(".quantity").textContent = item.total_quantity;
    node.querySelector(".color").textContent = item.color || "No color added";
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
    if (elements.showSalesHistoryButton) {
      elements.showSalesHistoryButton.hidden = true;
    }
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

  const dayEntries = Object.entries(salesByDay);
  const visibleDayEntries = showAllSalesHistory ? dayEntries : dayEntries.slice(0, 1);

  if (elements.showSalesHistoryButton) {
    elements.showSalesHistoryButton.hidden = dayEntries.length <= 1;
    elements.showSalesHistoryButton.textContent = showAllSalesHistory ? "Hide old tables" : "Show all tables";
  }

  visibleDayEntries.forEach(([day, sales]) => {
    const dailyCard = document.createElement("section");
    dailyCard.className = "daily-sales-card";

    const title = document.createElement("h3");
    const dailyTotal = sales.reduce((total, sale) => total + Number(sale.quantity || 0), 0);
    const dailyMoney = sales.reduce((total, sale) => {
      const pair = sunglasses.find((item) => item.id === sale.sunglasses_id || item.name === sale.sunglasses_name);
      const unitPrice = Number(sale.unit_price || getPriceEach(pair || {}));
      return total + Number(sale.quantity || 0) * unitPrice;
    }, 0);
    title.textContent = `${day} - ${dailyTotal} sold - ${formatMoney(dailyMoney)}`;

    const tableWrap = document.createElement("div");
    tableWrap.className = "sales-table-wrap";

    const table = document.createElement("table");
    table.className = "sales-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Pair</th>
          <th>Qty</th>
          <th>Money</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const body = table.querySelector("tbody");

    const totalsByPair = sales.reduce((totals, sale) => {
      const pairName = sale.sunglasses_name || "Unknown pair";
      const pair = sunglasses.find((item) => item.id === sale.sunglasses_id || item.name === pairName);
      const unitPrice = Number(sale.unit_price || getPriceEach(pair || {}));

      if (!totals[pairName]) {
        totals[pairName] = { quantity: 0, money: 0 };
      }

      totals[pairName].quantity += Number(sale.quantity || 0);
      totals[pairName].money += Number(sale.quantity || 0) * unitPrice;
      return totals;
    }, {});

    Object.entries(totalsByPair).forEach(([pairName, total]) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const quantity = document.createElement("td");
      const money = document.createElement("td");

      name.textContent = pairName;
      quantity.textContent = total.quantity;
      money.textContent = formatMoney(total.money);

      row.append(name, quantity, money);
      body.appendChild(row);
    });

    tableWrap.appendChild(table);
    dailyCard.append(title, tableWrap);
    elements.dailySalesTables.appendChild(dailyCard);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadSupabaseLibrary() {
  if (window.supabase) return true;

  const fallbackUrls = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
    "https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js",
  ];

  for (const url of fallbackUrls) {
    try {
      await loadScript(url);
      if (window.supabase) return true;
    } catch (error) {
      // Try the next CDN.
    }
  }

  return false;
}

async function connectSupabase(url, key) {
  const supabaseReady = await loadSupabaseLibrary();

  if (!supabaseReady) {
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
    elements.loginStatus.textContent = "Connecting to Supabase...";
    connectionPromise = connectionPromise || connectSupabase(defaultSupabaseUrl, defaultSupabaseKey);
    await connectionPromise;

    if (!client) {
      showLogin("Supabase still is not connected. Refresh the app and try again.");
      return;
    }
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
  await loadBadSalesDays();
  renderInventory();
  renderHistory();
  renderLowStock();
  renderNoSalesAlert();
  renderBadDayControl();
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

async function loadBadSalesDays() {
  const { data, error } = await client
    .from("bad_sales_days")
    .select("day")
    .order("day", { ascending: false })
    .limit(45);

  if (error) {
    badSalesDays = [];
    renderBadDayControl();
    elements.badDayStatus.textContent = "Bad day button needs the updated Supabase SQL first.";
    return;
  }

  badSalesDays = (data || []).map((entry) => entry.day);
  renderBadDayControl();
}

async function toggleBadSalesDay() {
  const todayKey = getDateKey();
  const todayIsBad = isBadSalesDay(todayKey);

  if (!connected) {
    elements.connectionStatus.textContent = "Supabase needs to be connected before saving bad sales days.";
    return;
  }

  if (todayIsBad) {
    const { error } = await client
      .from("bad_sales_days")
      .delete()
      .eq("day", todayKey);

    if (error) {
      elements.connectionStatus.textContent = `Could not remove bad day: ${error.message}`;
      return;
    }

    badSalesDays = badSalesDays.filter((day) => day !== todayKey);
    elements.connectionStatus.textContent = "Today is counting as a normal sales day again.";
  } else {
    const { error } = await client
      .from("bad_sales_days")
      .insert({ day: todayKey });

    if (error) {
      elements.connectionStatus.textContent = `Could not mark bad day: ${error.message}`;
      return;
    }

    badSalesDays = [todayKey, ...badSalesDays];
    elements.connectionStatus.textContent = "Today will be skipped for popularity and no-sales alerts.";
  }

  renderBadDayControl();
  renderInventory();
  renderNoSalesAlert();
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
          unit_price: getPriceEach(item),
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
        unit_price: getPriceEach(item),
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
    price_type: elements.newPriceType ? elements.newPriceType.value : "Normal",
    price_each: getPriceEach({ price_type: elements.newPriceType ? elements.newPriceType.value : "Normal" }),
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
  renderLowStock();
  renderNoSalesAlert();
}

elements.addForm.addEventListener("submit", addSunglasses);
elements.loginForm.addEventListener("submit", logIn);
elements.logoutButton.addEventListener("click", () => logOut());
elements.badDayButton.addEventListener("click", toggleBadSalesDay);
if (elements.showSalesHistoryButton) {
  elements.showSalesHistoryButton.addEventListener("click", () => {
    showAllSalesHistory = !showAllSalesHistory;
    renderSalesHistory();
  });
}
["click", "keydown", "input", "touchstart"].forEach((eventName) => {
  document.addEventListener(eventName, resetAutoLogoutTimer);
});
elements.searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  renderInventory();
});
elements.inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    const toggle = event.target.closest(".item-toggle");

    if (toggle) {
      const item = toggle.closest(".inventory-item");
      const panel = item.querySelector(".item-panel");
      const isOpen = !panel.hidden;

      panel.hidden = isOpen;
      toggle.setAttribute("aria-expanded", String(!isOpen));
      item.classList.toggle("is-open", !isOpen);
    }

    return;
  }

  if (button.dataset.action === "delete") {
    deleteSunglasses(button.dataset.id);
    return;
  }

  changeStock(button.dataset.action, button.dataset.id, Number(button.dataset.amount));
});

showLogin("Checking security...");
connectionPromise = connectSupabase(defaultSupabaseUrl, defaultSupabaseKey);
