/* Admin page only. Uses helpers from store.js */

async function fetchProducts() {
  const response = await fetch("http://localhost:5000/api/products");

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  const products = await response.json();

  return products;
}

async function createProduct(product, imageFile) {
  const formData = new FormData();

  formData.append("name", product.name);
  formData.append("description", product.blurb);
  formData.append("price", product.price);
  formData.append("size", product.size);
  formData.append("featured", product.featured);

  formData.append("image", imageFile);

  const response = await fetch("http://localhost:5000/api/products", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create product");
  }

  return data;
}

async function updateProduct(id, product) {
  const response = await fetch(`http://localhost:5000/api/products/${id}`, {
    method: "PUT",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(product),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update product");
  }

  return data;
}

async function deleteProduct(id) {
  const response = await fetch(`http://localhost:5000/api/products/${id}`, {
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete product");
  }

  return data;
}

function showLoginError(message) {
  var el = document.querySelector("[data-login-error]");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function showFormError(message) {
  var el = document.querySelector("[data-form-error]");
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || "";
}

function showAdminScreen() {
  var login = document.querySelector("[data-login]");
  var dash = document.querySelector("[data-dashboard]");
  var loggedIn = isAdminLoggedIn();
  if (login) login.hidden = loggedIn;
  if (dash) dash.hidden = !loggedIn;
  document.body.classList.toggle("is-admin", loggedIn);
  if (loggedIn) renderAdminList();
}

async function renderAdminList() {
  var box = document.querySelector("[data-admin-list]");
  if (!box) return;
  var list = await fetchProducts();
  if (list.length === 0) {
    box.innerHTML =
      '<p class="muted">No products. Use the form to add one.</p>';
    return;
  }
  box.innerHTML = list
    .map(function (p) {
      return (
        '<article class="admin-item">' +
        '<img src="http://localhost:5000/api/products/' +
        p.id +
        '/image" alt="">' +
        "<div>" +
        "<strong>" +
        escapeHtml(p.name) +
        "</strong>" +
        '<p class="muted">' +
        escapeHtml(p.size) +
        " · " +
        money(p.price) +
        (p.featured ? " · Featured" : "") +
        "</p>" +
        "</div>" +
        '<div class="btn-row">' +
        '<button type="button" class="btn-ghost" data-edit="' +
        escapeHtml(p.id) +
        '">Edit</button>' +
        '<button type="button" class="btn-ghost" data-delete="' +
        escapeHtml(p.id) +
        '">Remove</button>' +
        "</div>" +
        "</article>"
      );
    })
    .join("");
}

function formEl() {
  return document.querySelector("[data-product-form]");
}

function resetForm() {
  var form = formEl();
  form.reset();
  form.elements.id.value = "";
  document.querySelector("[data-form-title]").textContent = "Add product";
  document.querySelector("[data-cancel-edit]").hidden = true;
  var preview = document.querySelector("[data-preview]");
  preview.hidden = true;
  preview.src = "";
  showFormError("");
}

function fillForm(product) {
  var form = formEl();

  form.elements.id.value = product.id;
  form.elements.name.value = product.name;
  form.elements.size.value = product.size;
  form.elements.price.value = product.price;
  form.elements.blurb.value = product.description || "";
  form.elements.featured.checked = !!product.featured;

  form.elements.imageFile.value = "";

  document.querySelector("[data-form-title]").textContent = "Edit product";
  document.querySelector("[data-cancel-edit]").hidden = false;

  var preview = document.querySelector("[data-preview]");

  if (product.image) {
    console.log("EDIT IMAGE:", product.id, preview.src);
    preview.src =
      "http://localhost:5000/api/products/" +
      product.id +
      "/image";

    preview.hidden = false;
    console.log("EDIT IMAGE:", product.id, preview.src);
  } else {
    preview.hidden = true;
  }

  showFormError("");

  form.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function compressImage(file, done) {
  var reader = new FileReader();
  reader.onerror = function () {
    done(null, "Could not read that file.");
  };
  reader.onload = function () {
    var img = new Image();
    img.onload = function () {
      var max = 900;
      var w = img.width;
      var h = img.height;
      if (w > max) {
        h = Math.round((h * max) / w);
        w = max;
      }
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      done(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = function () {
      done(null, "That file is not a valid image.");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function collectProduct(imageData, existing) {
  var form = formEl();

  var image = imageData || (existing && existing.image) || "";

  return {
    id: form.elements.id.value || "",
    name: form.elements.name.value.trim(),
    size: form.elements.size.value.trim(),
    price: Number(form.elements.price.value),
    blurb: form.elements.blurb.value.trim(),
    featured: form.elements.featured.checked,
    image: image,
  };
}

async function saveFromForm(imageFile) {
  var form = formEl();
  var id = form.elements.id.value;

  var serverProducts = await fetchProducts();

  var existing = null;

  for (var i = 0; i < serverProducts.length; i++) {
    if (String(serverProducts[i].id) === String(id)) {
      existing = serverProducts[i];
      break;
    }
  }
  var product = collectProduct(imageFile ? "uploaded-image" : null, existing);
  if (!product.name || !product.size || !(product.price >= 0)) {
    showFormError("Name, size, and price are required.");
    return;
  }
  if (!product.image) {
    showFormError("Add a photo URL or upload a photo.");
    return;
  }
  if (product.featured) {
    console.log("Product marked as featured");
  }
  try {
    if (existing) {
      await updateProduct(product.id, {
        name: product.name,
        description: product.blurb,
        price: product.price,
        stock: existing.stock || 0,
        image: product.image,
        size: product.size,
        featured: product.featured,
      });
    } else {
      const imageFile = form.elements.imageFile.files[0];

      if (!imageFile) {
        showFormError("Please select a product image.");
        return;
      }

      await createProduct(product, imageFile);
    }

    await renderAdminList();
    resetForm();
  } catch (error) {
    console.log(error);
    showFormError(error.message);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  showAdminScreen();

  var loginForm = document.querySelector("[data-login-form]");
  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var user = (loginForm.elements.user.value || "").trim();
      var pass = (loginForm.elements.pass.value || "").trim();
      if (user === STORE.adminUser && pass === STORE.adminPassword) {
        setAdminLoggedIn(true);
        showLoginError("");
        showAdminScreen();
      } else {
        showLoginError("Wrong username or password.");
      }
    });
  }

  var dash = document.querySelector("[data-dashboard]");
  if (!dash) return;

  document
    .querySelector("[data-logout]")
    .addEventListener("click", function () {
      setAdminLoggedIn(false);
      showAdminScreen();
    });

  document
    .querySelector("[data-cancel-edit]")
    .addEventListener("click", resetForm);

  formEl().addEventListener("submit", function (e) {
    e.preventDefault();
    var file = formEl().elements.imageFile.files[0];
    if (file) {
      compressImage(file, function (data, err) {
        if (err) {
          showFormError(err);
          return;
        }
        saveFromForm(file);
      });
    } else {
      saveFromForm(null);
    }
  });

  formEl().elements.imageFile.addEventListener("change", function () {
    var file = formEl().elements.imageFile.files[0];
    if (!file) return;
    compressImage(file, function (data, err) {
      if (err) return;
      var preview = document.querySelector("[data-preview]");
      preview.src = data;
      preview.hidden = false;
    });
  });

  document
    .querySelector("[data-admin-list]")
    .addEventListener("click", function (e) {
      var edit = e.target.closest("[data-edit]");
      var del = e.target.closest("[data-delete]");
      if (edit) {
        var id = edit.getAttribute("data-edit");

        fetchProducts()
          .then(function (products) {
            var product = products.find(function (p) {
              return String(p.id) === String(id);
            });

            if (product) {
              fillForm(product);
            }
          })
          .catch(function (error) {
            console.log(error);
          });
      }
      if (del) {
        var id = del.getAttribute("data-delete");

        if (!confirm("Remove this product from the shop?")) {
          return;
        }

        deleteProduct(id)
          .then(function () {
            return renderAdminList();
          })
          .catch(function (error) {
            console.log(error);
            showFormError(error.message);
          });
      }
    });
});
