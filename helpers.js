export function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPriceEach(item) {
  if (Number(item.price_each || 0) > 0) {
    return Number(item.price_each);
  }

  if (item.price_type === "Vintage") return 35;
  if (item.price_type === "Polarized") return 25;
  return 20;
}

export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}
