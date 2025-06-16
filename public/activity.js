// Filter buttons interaction
document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", function () {
    document.querySelectorAll(".filter-button").forEach((btn) => {
      btn.classList.remove("active");
    });
    this.classList.add("active");
    alert("Filtering by: " + this.textContent);
  });
});

// Blockchain info copy functionality
document.querySelectorAll(".blockchain-info").forEach((info) => {
  info.addEventListener("click", function () {
    navigator.clipboard.writeText(this.textContent);
    alert("Copied to clipboard!");
  });
});

// Action buttons
document.querySelectorAll(".action-button").forEach((button) => {
  button.addEventListener("click", function (e) {
    e.stopPropagation();
    alert("Action: " + this.textContent);
  });
});

// Load more functionality
document.querySelector(".load-more").addEventListener("click", function () {
  alert("Loading more activities...");
});

function goBack() {
  window.location = "./profile.html";
}
