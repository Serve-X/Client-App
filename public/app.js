const reviewsContainer = document.getElementById("reviews");

const orderForm = document.getElementById("order-form");
const orderTable = document.getElementById("order-table");
const orderName = document.getElementById("order-name");
const orderEmail = document.getElementById("order-email");
const orderPhone = document.getElementById("order-phone");
const orderItem = document.getElementById("order-item");
const orderQuantity = document.getElementById("order-quantity");
const orderStatus = document.getElementById("order-status");

const reviewForm = document.getElementById("review-form");
const reviewItem = document.getElementById("review-item");
const reviewText = document.getElementById("review-text");
const reviewStatus = document.getElementById("review-status");

let itemsCache = [];

const formatMoney = (value) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
}).format(value);

const setStatus = (element, message, isError = false) => {
  element.textContent = message;
  element.style.color = isError ? "#a33" : "#5e5e5e";
};

const getSelectedRating = () => {
  const selected = document.querySelector('input[name="review-rating"]:checked');
  return selected ? Number(selected.value) : null;
};

const createOption = (item) => {
  const option = document.createElement("option");
  option.value = item.id;
  option.textContent = `${item.name} (${formatMoney(item.price)})`;
  return option;
};

const renderReviews = (reviews) => {
  reviewsContainer.innerHTML = "";
  if (!reviews.length) {
    reviewsContainer.textContent = "No reviews yet.";
    return;
  }

  reviews.forEach((review) => {
    const item = itemsCache.find((entry) => entry.id === review.itemId);
    const card = document.createElement("div");
    card.className = "list-card";

    const name = document.createElement("strong");
    name.textContent = review.itemName || (item ? item.name : review.itemId);

    const meta = document.createElement("div");
    const ratingText = review.rating ? `Rating: ${review.rating}/5` : "Rating: N/A";
    const createdAt = review.createdAt ? new Date(review.createdAt).toLocaleString() : "Unknown time";
    meta.textContent = `${ratingText} · ${createdAt}`;

    const text = document.createElement("div");
    text.textContent = review.text;

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = review.category || "Suggestions";

    card.append(name, meta, text, tag);
    reviewsContainer.append(card);
  });
};

const loadItems = async () => {
  const response = await fetch("/api/items");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load items.");
  }
  itemsCache = data.items || [];

  orderItem.innerHTML = "";
  reviewItem.innerHTML = "";
  itemsCache.forEach((item) => {
    orderItem.append(createOption(item));
    reviewItem.append(createOption(item));
  });

};

const loadReviews = async () => {
  const response = await fetch("/api/reviews");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to load reviews.");
  }
  renderReviews(data.reviews || []);
};

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(orderStatus, "Submitting order...");

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNumber: Number(orderTable.value),
        customer: {
          name: orderName.value.trim(),
          email: orderEmail.value.trim(),
          phone: orderPhone.value.trim()
        },
        items: [
          {
            itemId: orderItem.value,
            quantity: Number(orderQuantity.value)
          }
        ]
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Could not place order.");
    }

    setStatus(orderStatus, "Order placed successfully.");
    orderForm.reset();
    orderQuantity.value = 1;
  } catch (error) {
    setStatus(orderStatus, error.message, true);
  }
});

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(reviewStatus, "Posting review...");

  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: reviewItem.value,
        rating: getSelectedRating(),
        text: reviewText.value.trim()
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Could not post review.");
    }

    setStatus(reviewStatus, "Review posted. Categorization applied.");
    reviewForm.reset();
    const selected = document.querySelector('input[name="review-rating"]:checked');
    if (selected) {
      selected.checked = false;
    }
    await loadReviews();
  } catch (error) {
    setStatus(reviewStatus, error.message, true);
  }
});

const initialize = async () => {
  try {
    await loadItems();
    await loadReviews();
  } catch (error) {
    setStatus(orderStatus, "Failed to load data.", true);
    setStatus(reviewStatus, "Failed to load data.", true);
  }
};

initialize();
