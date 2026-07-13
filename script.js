import { getDateKey, getPriceEach, makeId } from "./src/helpers.js";
import {
  renderHistory as renderHistoryView,
  renderInventory as renderInventoryView,
  renderLowStock as renderLowStockView,
} from "./src/inventory.js";
import { createLoginSecurity } from "./src/login.js";
import {
  getPopularity as getPopularityRating,
  isBadSalesDay,
  renderBadDayControl as renderBadDayControlView,
  renderNoSalesAlert as renderNoSalesAlertView,
  renderSalesHistory as renderSalesHistoryView,
} from "./src/sales.js";

let sunglasses = [];

let history = [];

let salesHistory = [];

let badSalesDays = [];

let client = null;
let connected = false;
let searchTerm = "";
let showAllSalesHistory = false;

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
  newStyleNumber: document.querySelector("#newStyleNumber"),
  newColor: document.querySelector("#newColor"),
  newSize: document.querySelector("#newSize"),
  newAudience: document.querySelector("#newAudience"),
  newQuantity: document.querySelector("#newQuantity"),
  newPriceType: document.querySelector("#newPriceType"),
  newImageUrl: document.querySelector("#newImageUrl"),
};

function renderBadDayControl() {
  renderBadDayControlView(elements, badSalesDays);
}

function renderLowStock() {
  renderLowStockView(elements, sunglasses);
}

function renderNoSalesAlert() {
  renderNoSalesAlertView(elements, sunglasses, salesHistory, badSalesDays);
}

function renderInventory() {
  renderInventoryView({
    elements,
    sunglasses,
    searchTerm,
    getPopularity: (item) => getPopularityRating(item, salesHistory, badSalesDays),
  });
}

function renderHistory() {
  renderHistoryView(elements, history);
}

function renderSalesHistory() {
  renderSalesHistoryView(elements, salesHistory, sunglasses, showAllSalesHistory);
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
  const todayIsBad = isBadSalesDay(todayKey, badSalesDays);

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
    style_number: elements.newStyleNumber.value.trim() || null,
    color: elements.newColor.value.trim() || null,
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

const loginSecurity = createLoginSecurity({
  elements,
  getClient: () => client,
  setClient: (newClient) => {
    client = newClient;
  },
  setConnected: (isConnected) => {
    connected = isConnected;
  },
  loadFromSupabase,
});

elements.addForm.addEventListener("submit", addSunglasses);
elements.loginForm.addEventListener("submit", loginSecurity.logIn);
elements.logoutButton.addEventListener("click", () => loginSecurity.logOut());
elements.badDayButton.addEventListener("click", toggleBadSalesDay);
if (elements.showSalesHistoryButton) {
  elements.showSalesHistoryButton.addEventListener("click", () => {
    showAllSalesHistory = !showAllSalesHistory;
    renderSalesHistory();
  });
}
["click", "keydown", "input", "touchstart"].forEach((eventName) => {
  document.addEventListener(eventName, loginSecurity.resetAutoLogoutTimer);
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

loginSecurity.start();
