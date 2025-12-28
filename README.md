# ServeX Client App

This folder contains the HTML/CSS/JS client and a small Node/Express API for orders and reviews.

## Run

```bash
npm install
npm start
```

The app runs at `http://localhost:3000` and serves the UI plus `/api/orders` and `/api/reviews`.

## Environment

- `PORT` (optional): port for the server.
- `BACKEND_BASE_URL` (optional): ServeX backend base URL (default: `http://localhost:8080`).
- `ITEMS_API_URL` (optional): ServeX backend items endpoint (default: `${BACKEND_BASE_URL}/api/items`).
- `UI_ORDERS_URL` (optional): ServeX backend UI orders endpoint (default: `${BACKEND_BASE_URL}/ui/orders`).
- `UI_REVIEWS_URL` (optional): ServeX backend UI reviews endpoint (default: `${BACKEND_BASE_URL}/ui/reviews`).
- `ITEM_CACHE_TTL_MS` (optional): cache duration for items in milliseconds (default: `30000`).
