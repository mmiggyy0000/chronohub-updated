// UI-only behavior for the Design phase mockup.
// Cart/checkout data logic comes later in Development.

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("navToggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", links.classList.contains("open"));
    });
  }
});
