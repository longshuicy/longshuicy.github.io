(function () {
  "use strict";

  // SHA-256 of the shared password. Not real security on a public static
  // site, just enough to keep casual readers and search engines out.
  var PASSWORD_HASH = "c4b2bdf6e8fdc0786315f3b778ccaffa0556e7a3a3e57f7c50e9a91513321a75";
  var STORAGE_KEY = "cw-writing-gate-unlocked";

  var overlay = document.getElementById("gate-overlay");
  var content = document.getElementById("protected-content");
  var form = document.getElementById("gate-form");
  var input = document.getElementById("gate-password");
  var error = document.getElementById("gate-error");

  function reveal() {
    overlay.style.display = "none";
    content.style.display = "";
  }

  function toHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var hex = "";
    for (var i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, "0");
    }
    return hex;
  }

  if (window.localStorage && localStorage.getItem(STORAGE_KEY) === "1") {
    reveal();
    return;
  }

  var checking = false;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (checking) return;
    checking = true;
    var value = input.value;
    crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(value))
      .then(function (digest) {
        if (toHex(digest) === PASSWORD_HASH) {
          try {
            localStorage.setItem(STORAGE_KEY, "1");
          } catch (err) {
            /* ignore, e.g. private browsing */
          }
          error.hidden = true;
          reveal();
        } else {
          error.hidden = false;
          input.value = "";
          input.focus();
        }
      })
      .finally(function () {
        checking = false;
      });
  });
})();
