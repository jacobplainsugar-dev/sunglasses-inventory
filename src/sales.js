import { formatMoney, getDateKey, getPriceEach } from "./helpers.js";

export function isBadSalesDay(date, badSalesDays) {
  const dateKey = typeof date === "string" ? date : getDateKey(date);
  return badSalesDays.includes(dateKey);
}

export function getGoodSalesDayKeys(dayCount, badSalesDays) {
  const goodDays = [];
  const cursor = new Date();
  let checkedDays = 0;

  while (goodDays.length < dayCount && checkedDays < 45) {
    const dateKey = getDateKey(cursor);

    if (!isBadSalesDay(dateKey, badSalesDays)) {
      goodDays.push(dateKey);
    }

    cursor.setDate(cursor.getDate() - 1);
    checkedDays += 1;
  }

  return goodDays;
}

export function getRecentSold(item, salesHistory, badSalesDays, dayCount = 5) {
  const goodSalesDays = getGoodSalesDayKeys(dayCount, badSalesDays);

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

export function getAllTimeSold(item, salesHistory) {
  const historyTotal = salesHistory
    .filter((sale) => {
      return sale.sunglasses_id
        ? sale.sunglasses_id === item.id
        : sale.sunglasses_name === item.name;
    })
    .reduce((total, sale) => total + Number(sale.quantity || 0), 0);

  return Math.max(historyTotal, Number(item.total_sold || 0));
}

export function getPopularity(item, salesHistory, badSalesDays) {
  const soldThisWeek = getRecentSold(item, salesHistory, badSalesDays, 7);

  if (soldThisWeek >= 60) return "Popular";
  if (soldThisWeek >= 25) return "Okay";
  return "Slow";
}

export function renderBadDayControl(elements, badSalesDays) {
  const todayKey = getDateKey();
  const todayIsBad = isBadSalesDay(todayKey, badSalesDays);

  elements.badDayButton.textContent = todayIsBad
    ? "Remove bad day from today"
    : "Mark today as bad weather/fire day";

  elements.badDayStatus.textContent = todayIsBad
    ? "Today is being skipped for popularity and no-sales alerts."
    : "Today is counting as a normal sales day.";
}

export function renderNoSalesAlert(elements, sunglasses, salesHistory, badSalesDays) {
  const noSalesItems = sunglasses
    .filter((item) => Number(item.total_quantity || 0) > 0)
    .filter((item) => getRecentSold(item, salesHistory, badSalesDays, 4) === 0)
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

export function renderSalesHistory(elements, salesHistory, sunglasses, showAllSalesHistory) {
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
