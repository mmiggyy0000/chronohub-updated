// ChronoHub order storage.
// Matches the "Orders" collection from Database_Structure_Design.docx.
// No login system, so userId is always null (guest checkout).

const ORDERS_KEY = "chronohub_orders";

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order); // newest first
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function buildOrderFromCart(shippingInfo, paymentMethod, notes) {
  const details = getCartDetails();
  const totals = getCartTotals();
  return {
    id: "order-" + Date.now(),
    userId: null,
    items: details.map(function (d) {
      return { productId: d.product.id, quantity: d.quantity, priceAtAdd: d.priceAtAdd };
    }),
    shippingInfo: shippingInfo,
    paymentMethod: paymentMethod,
    notes: notes || "",
    subtotal: totals.subtotal,
    discount: totals.discount,
    promoCode: totals.promo ? totals.promo.code : null,
    shipping: totals.shipping,
    total: totals.total,
    date: new Date().toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
  };
}
