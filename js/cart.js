// ChronoHub cart logic.
// Cart Items live in localStorage so they survive a page reload,
// but only on this one browser/device (see Database_Structure_Design.docx, section 5).

const CART_KEY = "chronohub_cart";
const PROMO_KEY = "chronohub_promo";
const FREE_SHIPPING_THRESHOLD = 3000;
const SHIPPING_FEE = 150;

// Demo promo codes only — not tied to anything real.
const PROMO_CODES = {
  "CHRONO10": { type: "percent", value: 10, label: "10% off" },
  "FREESHIP": { type: "freeship", label: "Free shipping" }
};

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function findProduct(productId) {
  return PRODUCTS.find(function (p) { return p.id === productId; });
}

// Returns true if it actually added something, false if blocked (out of stock / unknown product).
function addToCart(productId, quantity) {
  quantity = quantity || 1;
  const product = findProduct(productId);
  if (!product || product.inStock === false) return false;

  const cart = getCart();
  const existing = cart.find(function (item) { return item.productId === productId; });
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId: productId, quantity: quantity, priceAtAdd: product.price });
  }
  saveCart(cart);
  updateCartBadge();
  return true;
}

function updateQuantity(productId, quantity) {
  let cart = getCart();
  if (quantity <= 0) {
    cart = cart.filter(function (item) { return item.productId !== productId; });
  } else {
    const item = cart.find(function (i) { return i.productId === productId; });
    if (item) item.quantity = quantity;
  }
  saveCart(cart);
  updateCartBadge();
}

function removeFromCart(productId) {
  const cart = getCart().filter(function (item) { return item.productId !== productId; });
  saveCart(cart);
  updateCartBadge();
}

function clearCart() {
  saveCart([]);
  clearPromo();
  updateCartBadge();
}

// Cart items joined with their product info, skipping any that no longer exist.
// Uses each item's stored priceAtAdd, not the product's current price —
// so a later price change doesn't silently reprice items already in the cart.
function getCartDetails() {
  return getCart()
    .map(function (item) {
      const product = findProduct(item.productId);
      if (!product) return null;
      return {
        product: product,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
        lineTotal: item.priceAtAdd * item.quantity
      };
    })
    .filter(Boolean);
}

function getCartCount() {
  return getCart().reduce(function (sum, item) { return sum + item.quantity; }, 0);
}

// ---------- Promo codes ----------
function getAppliedPromo() {
  const code = localStorage.getItem(PROMO_KEY);
  return code && PROMO_CODES[code] ? { code: code, info: PROMO_CODES[code] } : null;
}

function applyPromoCode(rawCode) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a promo code first." };
  if (!PROMO_CODES[code]) return { ok: false, message: "That code isn't valid." };
  localStorage.setItem(PROMO_KEY, code);
  return { ok: true, message: PROMO_CODES[code].label + " applied." };
}

function clearPromo() {
  localStorage.removeItem(PROMO_KEY);
}

function getCartTotals() {
  const details = getCartDetails();
  const subtotal = details.reduce(function (sum, d) { return sum + d.lineTotal; }, 0);
  if (details.length === 0) {
    return { subtotal: 0, discount: 0, shipping: 0, total: 0, promo: null };
  }

  const promo = getAppliedPromo();
  let discount = 0;
  let shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

  if (promo) {
    if (promo.info.type === "percent") {
      discount = Math.round(subtotal * (promo.info.value / 100));
    } else if (promo.info.type === "freeship") {
      shipping = 0;
    }
  }

  const total = subtotal - discount + shipping;
  return { subtotal: subtotal, discount: discount, shipping: shipping, total: total, promo: promo };
}

function updateCartBadge() {
  const badge = document.querySelector(".cart-count");
  if (badge) badge.textContent = getCartCount();
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
