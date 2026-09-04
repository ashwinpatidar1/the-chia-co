/* =========================================================
   EDIT THIS FILE TO CHANGE YOUR SHOP
   Brand name, prices, products, and contact live here.
   ========================================================= */

const STORE = {
  brand: "the Gami.Co",
  tagline: "Premium packed organic chia. No pesticides.",
  phone: "+91 90000 00000",
  email: "hello@sealandseed.com",
  instagram: "https://instagram.com/",

  /* Shown in the header announcement bar */
  announcement:
    "Sealed packing · Organic · Pesticide-free · Ships across India",

  /* Hero text on the landing page */
  heroTitle: "Organic chia, sealed for freshness.",
  heroText:
    "Single-origin chia seeds, packed in premium food-grade pouches. No pesticides. No fillers. Just clean seeds for your kitchen.",

  /* Admin login — change these. This is a front-end demo, not real security. */
  adminUser: "admin",
  adminPassword: "chia123"

  
};

let serverProducts = [];

async function loadProductsFromServer() {
  const response = await fetch("http://localhost:5000/api/products");

  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  serverProducts = await response.json();

  return serverProducts;
}

function findProduct(id) {

    for (var i = 0; i < serverProducts.length; i++) {

        if (String(serverProducts[i].id) === String(id)) {
            return serverProducts[i];
        }

    }

    return null;
}
/* =========================================================
   CART + PAGE LOGIC
   You usually do not need to edit below this line.
   ========================================================= */

const CART_KEY = "seal_seed_cart";
const ADMIN_KEY = "seal_seed_admin";

function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


var adminSessionMemory = false;

function isAdminLoggedIn() {
  if (adminSessionMemory) return true;
  try {
    return sessionStorage.getItem(ADMIN_KEY) === "yes";
  } catch (e) {
    return false;
  }
}

function setAdminLoggedIn(on) {
  adminSessionMemory = !!on;
  try {
    if (on) sessionStorage.setItem(ADMIN_KEY, "yes");
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch (e) {}
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function cartCount() {
  return getCart().reduce(function (sum, item) {
    return sum + item.qty;
  }, 0);
}

function cartTotal() {
  return getCart().reduce(function (sum, item) {
    var product = findProduct(item.id);
    if (!product) return sum;
    return sum + product.price * item.qty;
  }, 0);
}


function addToCart(id) {
  var cart = getCart();
  var found = false;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === id) {
      cart[i].qty += 1;
      found = true;
      break;
    }
  }
  if (!found) cart.push({ id: id, qty: 1 });
  saveCart(cart);
  renderCart();
  openCart();
}

function setQty(id, qty) {
  qty = Number(qty);
  var cart = getCart().filter(function (item) {
    if (item.id !== id) return true;
    return qty > 0;
  });
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === id) cart[i].qty = qty;
  }
  saveCart(cart);
  renderCart();
}

function fillBrandBits() {
  var brandEls = document.querySelectorAll("[data-brand]");
  brandEls.forEach(function (el) {
    el.textContent = STORE.brand;
  });

  var tagline = document.querySelector("[data-tagline]");
  if (tagline) tagline.textContent = STORE.tagline;

  var announcement = document.querySelector("[data-announcement]");
  if (announcement) announcement.textContent = STORE.announcement;

  var heroTitle = document.querySelector("[data-hero-title]");
  if (heroTitle) heroTitle.textContent = STORE.heroTitle;

  var heroText = document.querySelector("[data-hero-text]");
  if (heroText) heroText.textContent = STORE.heroText;

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  var email = document.querySelector("[data-email]");
  if (email) {
    email.textContent = STORE.email;
    email.href = "mailto:" + STORE.email;
  }

  var phone = document.querySelector("[data-phone]");
  if (phone) {
    phone.textContent = STORE.phone;
    phone.href = "tel:" + STORE.phone.replace(/\s/g, "");
  }

  document.title = STORE.brand + " · " + document.title;
}

function productCardHtml(product, extraClass) {
  extraClass = extraClass || "";
  var img =
  "http://localhost:5000/api/products/" +
  product.id +
  "/image";
  return (
    '<article class="card ' +
    extraClass +
    '">' +
    '<img class="card-img" src="' +
    escapeHtml(img) +
    '" alt="' +
    escapeHtml(product.name + " " + product.size) +
    '">' +
    '<div class="card-body">' +
    '<p class="eyebrow">' +
    escapeHtml(product.size) +
    "</p>" +
    "<h3>" +
    escapeHtml(product.name) +
    "</h3>" +
    "<p>" +
    escapeHtml(product.description) +
    "</p>" +
    '<div class="card-row">' +
    '<span class="price">' +
    money(product.price) +
    "</span>" +
    '<button type="button" class="btn" data-add="' +
    escapeHtml(product.id) +
    '">Add to cart</button>' +
    "</div>" +
    "</div>" +
    "</article>"
  );
}

function renderFeatured() {
  var box = document.querySelector("[data-featured]");
  if (!box) return;
  var list = serverProducts;
  if (list.length === 0) {
    box.innerHTML = '<p class="muted">No products yet. Add some in Admin.</p>';
    return;
  }
  var product = null;
  for (var i = 0; i < list.length; i++) {
    if (list[i].featured) {
      product = list[i];
      break;
    }
  }
  if (!product) product = list[0];
  box.innerHTML = productCardHtml(product, "card-wide");
}

async function renderShopGrid() {
  var box = document.querySelector("[data-shop-grid]");
  if (!box) return;
  var list = await loadProductsFromServer();
  if (list.length === 0) {
    box.innerHTML = '<p class="muted">No products yet. Add some in Admin.</p>';
    return;
  }
  box.innerHTML = list
    .map(function (p) {
      return productCardHtml(p);
    })
    .join("");
}

function renderCart() {
  var list = document.querySelector("[data-cart-list]");
  var total = document.querySelector("[data-cart-total]");
  if (!list || !total) return;

  var cart = getCart();
  if (cart.length === 0) {
    list.innerHTML = '<p class="muted">Your cart is empty.</p>';
    total.textContent = money(0);
    updateCartCount();
    return;
  }

  list.innerHTML = cart
    .map(function (item) {
      var product = findProduct(item.id);
      if (!product) return "";
      return (
        '<div class="cart-item">' +
        "<div>" +
        "<strong>" +
        product.name +
        "</strong>" +
        '<p class="muted">' +
        product.size +
        " · " +
        money(product.price) +
        "</p>" +
        "</div>" +
        '<div class="qty">' +
        '<button type="button" data-qty="' +
        product.id +
        '" data-delta="-1">−</button>' +
        "<span>" +
        item.qty +
        "</span>" +
        '<button type="button" data-qty="' +
        product.id +
        '" data-delta="1">+</button>' +
        "</div>" +
        "</div>"
      );
    })
    .join("");

  total.textContent = money(cartTotal());
  updateCartCount();
}

function updateCartCount() {
  var el = document.querySelector("[data-cart-count]");
  if (el) el.textContent = String(cartCount());
}

function openCart() {
  var drawer = document.querySelector("[data-cart]");
  var backdrop = document.querySelector("[data-backdrop]");
  if (drawer) drawer.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
}

function closeCart() {
  var drawer = document.querySelector("[data-cart]");
  var backdrop = document.querySelector("[data-backdrop]");
  if (drawer) drawer.classList.remove("open");
  if (backdrop) backdrop.classList.remove("open");
}

function onClick(e) {
  var add = e.target.closest("[data-add]");
  if (add) addToCart(add.getAttribute("data-add"));

  var open = e.target.closest("[data-open-cart]");
  if (open) openCart();

  var close = e.target.closest("[data-close-cart]");
  if (close) closeCart();

  var qtyBtn = e.target.closest("[data-qty]");
  if (qtyBtn) {
    var id = qtyBtn.getAttribute("data-qty");
    var delta = Number(qtyBtn.getAttribute("data-delta"));
    var item = getCart().find(function (c) {
      return c.id === id;
    });
    var next = item ? item.qty + delta : 1;
    setQty(id, next);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  fillBrandBits();

  try {
    await loadProductsFromServer();

    renderFeatured();
    renderShopGrid();
  } catch (error) {
    console.log(error);
  }

  renderCart();

  document.body.addEventListener("click", onClick);
});
