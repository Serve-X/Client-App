import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const backendBaseUrl = process.env.BACKEND_BASE_URL || "http://localhost:8080";
const buildUrl = (baseUrl, path) => new URL(path, baseUrl).toString();
const itemsApiUrl = process.env.ITEMS_API_URL || buildUrl(backendBaseUrl, "/api/items");
const uiOrdersUrl = process.env.UI_ORDERS_URL || buildUrl(backendBaseUrl, "/ui/orders");
const uiReviewsUrl = process.env.UI_REVIEWS_URL || buildUrl(backendBaseUrl, "/ui/reviews");
const itemCacheTtlMs = Number(process.env.ITEM_CACHE_TTL_MS) || 30000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const parseJsonBody = async (response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const itemCache = {
  data: [],
  lastFetched: 0
};

const normalizeItem = (item) => {
  const priceValue = Number.parseFloat(item.itemPrice ?? item.price ?? 0);
  return {
    id: String(item.itemId ?? item.id ?? ""),
    name: item.itemName ?? item.name ?? "Unnamed Item",
    description: item.itemDescription ?? item.description ?? "",
    price: Number.isFinite(priceValue) ? priceValue : 0
  };
};

const fetchItemsFromBackend = async () => {
  const response = await fetch(itemsApiUrl);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to load items");
  }
  const payload = await response.json();
  const list = Array.isArray(payload) ? payload : payload.items;
  return (list || [])
    .map(normalizeItem)
    .filter((item) => item.id);
};

const getItems = async () => {
  const now = Date.now();
  if (itemCache.data.length && now - itemCache.lastFetched < itemCacheTtlMs) {
    return itemCache.data;
  }
  const items = await fetchItemsFromBackend();
  itemCache.data = items;
  itemCache.lastFetched = now;
  return items;
};

app.get("/api/items", async (req, res) => {
  try {
    const items = await getItems();
    res.json({ items });
  } catch (error) {
    res.status(502).json({ error: "Unable to load items from backend." });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const url = new URL(uiOrdersUrl);
    if (req.query.tableNumber) {
      url.searchParams.set("tableNumber", req.query.tableNumber);
    }
    const response = await fetch(url);
    if (!response.ok) {
      const payload = await parseJsonBody(response);
      return res.status(502).json({ error: payload?.message || "Unable to load orders from backend." });
    }
    const orders = await parseJsonBody(response);
    res.json({ orders });
  } catch (error) {
    res.status(502).json({ error: "Unable to load orders from backend." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { tableNumber, customer, items } = req.body;
  const parsedTable = Number(tableNumber);
  if (!Number.isFinite(parsedTable) || parsedTable <= 0 || !customer || !items || !items.length) {
    return res.status(400).json({ error: "Table number, customer, and items are required." });
  }
  const normalizedItems = items
    .map((item) => ({
      itemId: item.itemId,
      quantity: Number(item.quantity)
    }))
    .filter((item) => item.itemId && Number.isFinite(item.quantity) && item.quantity > 0);
  if (!normalizedItems.length) {
    return res.status(400).json({ error: "At least one valid item is required." });
  }

  try {
    const response = await fetch(uiOrdersUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber: parsedTable, customer, items: normalizedItems })
    });
    const payload = await parseJsonBody(response);
    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.message || "Unable to place order." });
    }
    res.status(201).json({ order: payload });
  } catch (error) {
    res.status(502).json({ error: "Unable to place order right now." });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const url = new URL(uiReviewsUrl);
    if (req.query.itemId) {
      url.searchParams.set("itemId", req.query.itemId);
    }
    const response = await fetch(url);
    if (!response.ok) {
      const payload = await parseJsonBody(response);
      return res.status(502).json({ error: payload?.message || "Unable to load reviews from backend." });
    }
    const reviews = await parseJsonBody(response);
    res.json({ reviews });
  } catch (error) {
    res.status(502).json({ error: "Unable to load reviews from backend." });
  }
});

app.post("/api/reviews", async (req, res) => {
  const { itemId, text, rating } = req.body;
  if (!itemId || !text || !String(text).trim()) {
    return res.status(400).json({ error: "itemId and text are required." });
  }
  const parsedRating = rating !== undefined && rating !== null && rating !== ""
    ? Number(rating)
    : null;

  try {
    const response = await fetch(uiReviewsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        text: String(text).trim(),
        rating: Number.isFinite(parsedRating) ? parsedRating : null
      })
    });
    const payload = await parseJsonBody(response);
    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.message || "Unable to save review." });
    }
    res.status(201).json({ review: payload });
  } catch (error) {
    res.status(502).json({ error: "Unable to save review right now." });
  }
});

app.listen(port, () => {
  console.log(`ServeX client app running at http://localhost:${port}`);
});
