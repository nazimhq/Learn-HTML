/* Shop interactions. Every feature also works without JavaScript; this only makes it smoother. */
(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* Mobile menu */
  var menuBtn = $("#menuBtn"), menu = $("#mobileMenu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () {
      var open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  /* Toast */
  var toast = $("#toast"), toastTimer;
  function showToast(msg) {
    if (!toast) { return; }
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2600);
  }

  /* Add to cart without reloading the page */
  $all("form[data-add-to-cart]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (!window.fetch || !window.FormData) { return; }
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      if (btn) { btn.disabled = true; }
      fetch(form.getAttribute("action"), { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "fetch" }, credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          showToast(data.message || (data.ok ? "Added to cart" : "Could not add to cart"));
          if (typeof data.count === "number") {
            $all("[data-cart-count]").forEach(function (el) {
              el.textContent = data.count;
              el.classList.toggle("hidden", data.count === 0);
            });
          }
          if (data.ok && form.hasAttribute("data-go-cart")) { window.location.href = form.getAttribute("data-go-cart"); }
        })
        .catch(function () { form.submit(); })
        .then(function () { if (btn) { btn.disabled = false; } });
    });
  });

  /* Quantity steppers */
  $all("[data-qty]").forEach(function (wrap) {
    var input = wrap.querySelector("input");
    var max = parseInt(input.getAttribute("max") || "99", 10);
    var min = parseInt(input.getAttribute("min") || "1", 10);
    $all("[data-step]", wrap).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = (parseInt(input.value, 10) || min) + parseInt(b.getAttribute("data-step"), 10);
        input.value = Math.max(min, Math.min(max, v));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    });
  });

  /* Cart page: submit the update form when a quantity changes */
  $all("[data-autosubmit]").forEach(function (input) {
    input.addEventListener("change", function () { input.form.submit(); });
  });

  /* Product gallery */
  var mainImg = $("#galleryMain");
  $all("[data-gallery-thumb]").forEach(function (t) {
    t.addEventListener("click", function () {
      if (!mainImg) { return; }
      mainImg.src = t.getAttribute("data-src");
      $all("[data-gallery-thumb]").forEach(function (o) { o.setAttribute("aria-current", o === t ? "true" : "false"); });
    });
  });

  /* Checkout: update delivery fee and total as the zone changes */
  var summary = $("#checkoutSummary");
  if (summary) {
    var subtotal = parseInt(summary.getAttribute("data-subtotal"), 10);
    var freeMin = parseInt(summary.getAttribute("data-free-min"), 10) || 0;
    var fmt = function (n) { return summary.getAttribute("data-currency") + " " + n.toLocaleString("en-US"); };
    var update = function () {
      var z = $("input[name=zone]:checked");
      if (!z) { return; }
      var fee = parseInt(z.getAttribute("data-fee"), 10);
      if (freeMin > 0 && subtotal >= freeMin) { fee = 0; }
      $("#sumDelivery").textContent = fee === 0 ? "Free" : fmt(fee);
      $("#sumTotal").textContent = fmt(subtotal + fee);
    };
    $all("input[name=zone]").forEach(function (r) { r.addEventListener("change", update); });
    update();

    var pay = function () {
      var m = $("input[name=payment_method]:checked");
      var btn = $("#placeOrderBtn");
      if (!m || !btn) { return; }
      btn.querySelector("span").textContent = btn.getAttribute("data-label-" + m.value) || btn.getAttribute("data-label-cod");
    };
    $all("input[name=payment_method]").forEach(function (r) { r.addEventListener("change", pay); });
    pay();

    var form = $("#checkoutForm");
    if (form) {
      form.addEventListener("submit", function () {
        var btn = $("#placeOrderBtn");
        if (btn) { setTimeout(function () { btn.disabled = true; }, 0); }
      });
    }
  }

  /* Confirm dangerous admin actions */
  $all("form[data-confirm]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      if (!window.confirm(f.getAttribute("data-confirm"))) { e.preventDefault(); }
    });
  });

  /* Floating WhatsApp button appears after scrolling a little */
  var fab = $("#fab");
  if (fab) {
    var onScroll = function () { fab.style.opacity = window.scrollY > 300 ? "1" : "0"; fab.style.pointerEvents = window.scrollY > 300 ? "auto" : "none"; };
    fab.style.transition = "opacity .3s ease";
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Scroll reveal */
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -5% 0px", threshold: 0.05 });
    $all("[data-reveal]").forEach(function (el) { io.observe(el); });
    document.documentElement.classList.add("reveal-ready");
  }
})();
