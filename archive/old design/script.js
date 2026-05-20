(function () {
  window.addEventListener("beforeunload", function () {
    document.body.classList.add("animate-out");
  });

  function onReady() {
    var ageElement = document.getElementById("age");
    if (ageElement) {
      var currentYear = new Date().getFullYear();
      ageElement.textContent = String(currentYear - 1988);
    }

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    var isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) {
      document
        .querySelectorAll('a[href^="http://"], a[href^="https://"]')
        .forEach(function (a) {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        });
    } else {
      document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
        a.removeAttribute("target");
        a.removeAttribute("rel");
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
