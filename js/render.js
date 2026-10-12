// ChronoHub page rendering. Reads from PRODUCTS (products.js) and the
// cart helpers (cart.js), and fills in whichever containers exist on
// the current page — each render function no-ops if its page isn't loaded.

function peso(amount) {
  return "\u20b1" + amount.toLocaleString("en-PH");
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Small non-blocking confirmation, replaces alert() for routine
// "it worked" feedback. Auto-dismisses, doesn't stop the page.
function showToast(message) {
  let toast = document.getElementById("chronohub-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "chronohub-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("show");
  // force reflow so the animation restarts if a toast is already visible
  void toast.offsetWidth;
  toast.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2200);
}

function valueOf(selector) {
  const el = document.querySelector(selector);
  return el ? el.value.trim() : "";
}

// Buckets a product's free-text strap description into one of the
// Shop page's filter checkboxes.
function strapBucket(strapText) {
  const s = (strapText || "").toLowerCase();
  if (s.indexOf("leather") !== -1) return "Leather";
  if (s.indexOf("steel") !== -1 || s.indexOf("bracelet") !== -1) return "Metal";
  if (s.indexOf("silicone") !== -1 || s.indexOf("sport band") !== -1) return "Silicone";
  if (s.indexOf("resin") !== -1) return "Resin";
  return null;
}

function productCardHTML(p) {
  const oosTag = p.inStock === false ? '<span class="tag-oos">Out of Stock</span>' : "";
  const oosClass = p.inStock === false ? " is-oos" : "";
  return (
    '<a href="product.html?id=' + p.id + '" class="product-card' + oosClass + '">' +
      '<div class="product-thumb">' + oosTag + '<img src="assets/products/' + p.image + '" alt="' + p.name + '"></div>' +
      '<div class="product-info">' +
        '<div class="product-cat">' + p.category + "</div>" +
        '<div class="product-name">' + p.name + "</div>" +
        '<div class="product-price">' + peso(p.price) + "</div>" +
      "</div>" +
    "</a>"
  );
}

function renderGrid(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = list.map(productCardHTML).join("");
}

// ---------- Home ----------
function renderHome() {
  const el = document.getElementById("best-sellers-grid");
  if (!el) return;
  renderGrid("best-sellers-grid", PRODUCTS.slice(0, 6));
}

// ---------- Shop ----------
function renderShop() {
  const grid = document.getElementById("shop-grid");
  if (!grid) return;

  const catBoxes = Array.prototype.slice.call(document.querySelectorAll(".cat-filter"));
  const strapBoxes = Array.prototype.slice.call(document.querySelectorAll(".strap-filter"));
  const slider = document.getElementById("price-slider");
  const sortSelect = document.getElementById("sort-select");

  function applyFilters() {
    const checkedCats = catBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    const checkedStraps = strapBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    const maxPrice = slider ? parseInt(slider.value, 10) : Infinity;

    if (slider) setText("price-slider-value", peso(maxPrice));

    let list = PRODUCTS.filter(function (p) {
      const catOk = checkedCats.length === 0 || checkedCats.indexOf(p.category) !== -1;
      const strapOk = checkedStraps.length === 0 || checkedStraps.indexOf(strapBucket(p.strap)) !== -1;
      const priceOk = p.price <= maxPrice;
      return catOk && strapOk && priceOk;
    });

    const sortMode = sortSelect ? sortSelect.value : "featured";
    if (sortMode === "price-asc") list = list.slice().sort(function (a, b) { return a.price - b.price; });
    else if (sortMode === "price-desc") list = list.slice().sort(function (a, b) { return b.price - a.price; });
    else if (sortMode === "newest") list = list.slice().sort(function (a, b) { return new Date(b.dateAdded) - new Date(a.dateAdded); });

    renderGrid("shop-grid", list);
    setText("product-count", list.length + (list.length === 1 ? " product" : " products"));

    const emptyMsg = document.getElementById("shop-empty");
    if (emptyMsg) emptyMsg.style.display = list.length === 0 ? "block" : "none";
  }

  catBoxes.forEach(function (b) { b.addEventListener("change", applyFilters); });
  strapBoxes.forEach(function (b) { b.addEventListener("change", applyFilters); });
  if (slider) slider.addEventListener("input", applyFilters);
  if (sortSelect) sortSelect.addEventListener("change", applyFilters);

  // Deep link from the homepage category tiles, e.g. shop.html?category=Smartwatch
  const categoryParam = getQueryParam("category");
  if (categoryParam) {
    catBoxes.forEach(function (b) { b.checked = b.value === categoryParam; });
  }

  applyFilters();
}

// ---------- Product Detail ----------
function renderProductDetail() {
  if (!document.getElementById("pd-name")) return;

  const id = getQueryParam("id") || PRODUCTS[0].id;
  const product = findProduct(id) || PRODUCTS[0];

  document.title = product.name + " \u2013 ChronoHub";
  setText("pd-breadcrumb-name", product.name);
  setText("pd-category", product.category);
  setText("pd-name", product.name);
  setText("pd-price", peso(product.price));
  setText("pd-description", product.description);
  setText("pd-description-tab", product.description);
  setText("pd-water", product.waterResistance);
  setText("pd-strap", product.strap);
  setText("pd-brand", product.brand);

  const mainImg = document.getElementById("pd-main-image");
  if (mainImg) {
    mainImg.src = "assets/products/" + product.image;
    mainImg.alt = product.name;
  }
  setupProductTabs();
  setupProductReviews(product);
  const qtyEl = document.getElementById("pd-qty");
  const minus = document.getElementById("pd-qty-minus");
  const plus = document.getElementById("pd-qty-plus");
  if (qtyEl && minus && plus) {
    minus.addEventListener("click", function () {
      const v = parseInt(qtyEl.textContent, 10);
      if (v > 1) qtyEl.textContent = v - 1;
    });
    plus.addEventListener("click", function () {
      qtyEl.textContent = parseInt(qtyEl.textContent, 10) + 1;
    });
  }

  const addBtn = document.getElementById("pd-add-cart");
  const buyBtn = document.getElementById("pd-buy-now");

  if (product.inStock === false) {
    if (addBtn) { addBtn.textContent = "Out of Stock"; addBtn.disabled = true; }
    if (buyBtn) { buyBtn.disabled = true; }
    if (qtyEl) { qtyEl.parentElement.style.opacity = "0.5"; }
  } else {
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
        addToCart(product.id, qty);
        showToast("\u2713 Added to cart");
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener("click", function () {
        const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
        addToCart(product.id, qty);
        window.location.href = "checkout.html";
      });
    }
  }

  let related = PRODUCTS.filter(function (p) {
    return p.id !== product.id && p.category === product.category;
  });
  if (related.length < 3) {
    const others = PRODUCTS.filter(function (p) {
      return p.id !== product.id && related.indexOf(p) === -1;
    });
    related = related.concat(others).slice(0, 3);
  } else {
    related = related.slice(0, 3);
  }
  renderGrid("related-grid", related);
}

function setupProductTabs() {
  const descriptionTab = document.getElementById("pd-description-tab-button");
  const reviewsTab = document.getElementById("pd-reviews-tab-button");
  const descriptionPanel = document.getElementById("pd-description-panel");
  const reviewsPanel = document.getElementById("pd-reviews-panel");
  if (!descriptionTab || !reviewsTab || !descriptionPanel || !reviewsPanel) return;

  function showPanel(panelName) {
    const showReviews = panelName === "reviews";
    descriptionTab.classList.toggle("active", !showReviews);
    reviewsTab.classList.toggle("active", showReviews);
    descriptionTab.setAttribute("aria-selected", String(!showReviews));
    reviewsTab.setAttribute("aria-selected", String(showReviews));
    descriptionPanel.hidden = showReviews;
    reviewsPanel.hidden = !showReviews;
  }

  descriptionTab.addEventListener("click", function () { showPanel("description"); });
  reviewsTab.addEventListener("click", function () { showPanel("reviews"); });
}

function getProductReviews(productId) {
  try {
    const reviews = JSON.parse(localStorage.getItem("chronohub_reviews_" + productId) || "[]");
    return Array.isArray(reviews) ? reviews : [];
  } catch (e) {
    return [];
  }
}

function renderProductReviews(productId) {
  const list = document.getElementById("pd-reviews-list");
  if (!list) return;
  const reviews = getProductReviews(productId);
  list.replaceChildren();

  if (reviews.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No reviews yet. Be the first to review this item.";
    list.appendChild(empty);
    return;
  }

  reviews.forEach(function (review) {
    const card = document.createElement("article");
    card.className = "review-card";
    const title = document.createElement("div");
    const rating = document.createElement("span");
    rating.className = "review-rating";
    const score = Math.max(1, Math.min(5, Number(review.rating) || 0));
    rating.textContent = "★".repeat(score) + "☆".repeat(5 - score);
    rating.setAttribute("aria-label", score + " out of 5 stars");
    const name = document.createElement("h3");
    name.textContent = review.name || "Guest";
    const date = document.createElement("span");
    date.className = "review-date";
    date.textContent = review.date || "";
    title.append(rating, name, date);
    const comment = document.createElement("p");
    comment.className = "review-comment";
    comment.textContent = review.comment || "";
    card.append(title, comment);
    list.appendChild(card);
  });
}

function setupProductReviews(product) {
  const form = document.getElementById("pd-review-form");
  if (!form) return;
  renderProductReviews(product.id);
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = document.getElementById("pd-review-name").value.trim();
    const rating = Number(document.getElementById("pd-review-rating").value);
    const comment = document.getElementById("pd-review-comment").value.trim();
    if (!name || !comment || rating < 1 || rating > 5) return;

    const reviews = getProductReviews(product.id);
    reviews.unshift({
      name: name,
      rating: rating,
      comment: comment,
      date: new Date().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
    });
    try {
      localStorage.setItem("chronohub_reviews_" + product.id, JSON.stringify(reviews));
      form.reset();
      renderProductReviews(product.id);
      showToast("Review added");
    } catch (e) {
      showToast("Could not save review in this browser");
    }
  });
}

// ---------- Cart ----------
function cartLineHTML(d) {
  return (
    '<div class="cart-line">' +
      '<div class="cart-thumb"><img src="assets/products/' + d.product.image + '" alt="' + d.product.name + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
      "<div>" +
        '<div class="cart-line-name">' + d.product.name + "</div>" +
        '<div class="cart-line-meta">' + d.product.strap + "</div>" +
        '<div class="cart-line-remove" data-remove="' + d.product.id + '">Remove</div>' +
      "</div>" +
      '<div class="qty-stepper">' +
        '<button type="button" data-minus="' + d.product.id + '">\u2212</button>' +
        "<span>" + d.quantity + "</span>" +
        '<button type="button" data-plus="' + d.product.id + '">+</button>' +
      "</div>" +
      '<div class="product-price">' + peso(d.lineTotal) + "</div>" +
    "</div>"
  );
}

function renderTotalsInto(prefix, details, totals) {
  setText(prefix + "-subtotal", peso(totals.subtotal));
  setText(prefix + "-shipping", details.length === 0 ? "\u2013" : (totals.shipping === 0 ? "Free" : peso(totals.shipping)));
  setText(prefix + "-total", peso(totals.total));

  const discountRow = document.getElementById(prefix + "-discount-row");
  if (discountRow) {
    if (totals.discount > 0) {
      discountRow.style.display = "flex";
      setText(prefix + "-discount", "\u2212" + peso(totals.discount));
    } else {
      discountRow.style.display = "none";
    }
  }
}

function renderCart() {
  const container = document.getElementById("cart-lines");
  if (!container) return;

  const details = getCartDetails();
  const emptyMsg = document.getElementById("cart-empty");

  if (details.length === 0) {
    container.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = "block";
  } else {
    if (emptyMsg) emptyMsg.style.display = "none";
    container.innerHTML = details.map(cartLineHTML).join("");
  }

  const totals = getCartTotals();
  renderTotalsInto("cart", details, totals);

  const cartIds = details.map(function (d) { return d.product.id; });
  const suggestions = PRODUCTS.filter(function (p) { return cartIds.indexOf(p.id) === -1; }).slice(0, 3);
  renderGrid("cart-suggestions", suggestions);

  const applyBtn = document.getElementById("promo-apply");
  const promoInput = document.getElementById("promo-input");
  const promoMsg = document.getElementById("promo-msg");
  if (applyBtn && promoInput) {
    applyBtn.onclick = function () {
      const result = applyPromoCode(promoInput.value);
      if (promoMsg) {
        promoMsg.textContent = result.message;
        promoMsg.className = "promo-msg show " + (result.ok ? "ok" : "error");
      }
      if (result.ok) renderCart();
    };
  }

  const checkoutLink = document.getElementById("cart-checkout-link");
  if (checkoutLink) {
    checkoutLink.onclick = function (e) {
      if (getCartDetails().length === 0) {
        e.preventDefault();
        alert("Your cart is empty. Add something first.");
      }
    };
  }
}

function handleCartClick(e) {
  const minusId = e.target.getAttribute("data-minus");
  const plusId = e.target.getAttribute("data-plus");
  const removeId = e.target.getAttribute("data-remove");
  if (!minusId && !plusId && !removeId) return;

  if (minusId) {
    const item = getCart().find(function (i) { return i.productId === minusId; });
    if (item) updateQuantity(minusId, item.quantity - 1);
  } else if (plusId) {
    const item = getCart().find(function (i) { return i.productId === plusId; });
    if (item) updateQuantity(plusId, item.quantity + 1);
  } else if (removeId) {
    removeFromCart(removeId);
  }
  renderCart();
}

// ---------- Checkout ----------
function markInvalid(fieldSelector, show) {
  const el = document.querySelector(fieldSelector);
  if (!el) return;
  const field = el.closest(".field");
  if (field) field.classList.toggle("invalid", show);
}

function validateCheckout(paymentMethod) {
  const requiredFields = [
    "#checkout-name", "#checkout-phone", "#checkout-address",
    "#checkout-city", "#checkout-province", "#checkout-zip"
  ];
  let ok = true;
  requiredFields.forEach(function (sel) {
    const empty = valueOf(sel) === "";
    markInvalid(sel, empty);
    if (empty) ok = false;
  });

  if (paymentMethod === "Card") {
    ["#checkout-card-number", "#checkout-card-expiry", "#checkout-card-cvc"].forEach(function (sel) {
      const empty = valueOf(sel) === "";
      markInvalid(sel, empty);
      if (empty) ok = false;
    });
  } else if (paymentMethod === "GCash") {
    const empty = valueOf("#checkout-gcash-number") === "";
    markInvalid("#checkout-gcash-number", empty);
    if (empty) ok = false;
  }
  return ok;
}

function renderCheckout() {
  const summaryEl = document.getElementById("checkout-lines");
  if (!summaryEl) return;

  const details = getCartDetails();
  summaryEl.innerHTML = details
    .map(function (d) {
      return '<div class="mini-line"><span>' + d.product.name + " \u00d7" + d.quantity + "</span><span>" + peso(d.lineTotal) + "</span></div>";
    })
    .join("");

  const totals = getCartTotals();
  renderTotalsInto("checkout", details, totals);

  const placeOrderBtn = document.getElementById("place-order-btn");
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (getCartDetails().length === 0) {
        alert("Your cart is empty.");
        return;
      }

      const paymentEl = document.querySelector('input[name="pay"]:checked');
      const paymentMethod = paymentEl ? paymentEl.value : "Card";

      if (!validateCheckout(paymentMethod)) {
        alert("Please fill in the required fields before placing your order.");
        return;
      }

      const shippingInfo = {
        name: valueOf("#checkout-name"),
        phone: valueOf("#checkout-phone"),
        address: valueOf("#checkout-address"),
        city: valueOf("#checkout-city"),
        province: valueOf("#checkout-province"),
        zip: valueOf("#checkout-zip")
      };
      if (paymentMethod === "GCash") shippingInfo.gcashNumber = valueOf("#checkout-gcash-number");

      const notes = valueOf("#checkout-notes");
      const order = buildOrderFromCart(shippingInfo, paymentMethod, notes);
      saveOrder(order);
      clearCart();
      window.location.href = "orders.html";
    });
  }

  // Clear the red outline on a field as soon as the visitor starts fixing it.
  document.querySelectorAll(".field input").forEach(function (input) {
    input.addEventListener("input", function () {
      const field = input.closest(".field");
      if (field && input.value.trim() !== "") field.classList.remove("invalid");
    });
  });

  // Card/GCash details only matter for their respective payment method.
  const cardFields = document.getElementById("card-fields");
  const gcashFields = document.getElementById("gcash-fields");
  function syncPaymentFields() {
    const checked = document.querySelector('input[name="pay"]:checked');
    const method = checked ? checked.value : "Card";
    if (cardFields) cardFields.style.display = method === "Card" ? "block" : "none";
    if (gcashFields) gcashFields.style.display = method === "GCash" ? "block" : "none";
  }
  document.querySelectorAll('input[name="pay"]').forEach(function (r) {
    r.addEventListener("change", syncPaymentFields);
  });
  syncPaymentFields();
}

// ---------- My Orders ----------
function renderOrders() {
  const container = document.getElementById("orders-list");
  if (!container) return;

  const orders = getOrders();
  const emptyMsg = document.getElementById("orders-empty");

  if (orders.length === 0) {
    container.innerHTML = "";
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  container.innerHTML = orders.map(orderCardHTML).join("");
}

function orderCardHTML(order) {
  const itemLines = order.items
    .map(function (item) {
      const product = findProduct(item.productId);
      const name = product ? product.name : "(product no longer available)";
      return '<div class="mini-line"><span>' + name + " \u00d7" + item.quantity + "</span><span>" + peso(item.priceAtAdd * item.quantity) + "</span></div>";
    })
    .join("");

  const discountLine = order.discount > 0
    ? '<div class="mini-line discount-row"><span>Discount' + (order.promoCode ? " (" + order.promoCode + ")" : "") + '</span><span>\u2212' + peso(order.discount) + "</span></div>"
    : "";

  const notesLine = order.notes
    ? '<div class="order-card-notes"><strong>Note:</strong> ' + order.notes + "</div>"
    : "";

  const name = order.shippingInfo && order.shippingInfo.name ? order.shippingInfo.name : "\u2014";

  return (
    '<div class="order-card">' +
      '<div class="order-card-head">' +
        "<div><strong>" + order.id + "</strong><div class=\"order-card-date\">" + order.date + "</div></div>" +
        '<div class="product-price">' + peso(order.total) + "</div>" +
      "</div>" +
      '<div class="order-card-body">' +
        itemLines +
        discountLine +
        '<div class="mini-line"><span>Shipping</span><span>' + (order.shipping === 0 ? "Free" : peso(order.shipping)) + "</span></div>" +
        notesLine +
      "</div>" +
      '<div class="order-card-foot">' +
        "<span>" + order.paymentMethod + "</span><span>" + name + "</span>" +
      "</div>" +
    "</div>"
  );
}

document.addEventListener("DOMContentLoaded", function () {
  renderHome();
  renderShop();
  renderProductDetail();
  renderCart();
  renderCheckout();
  renderOrders();

  const cartLines = document.getElementById("cart-lines");
  if (cartLines) cartLines.addEventListener("click", handleCartClick);
});
