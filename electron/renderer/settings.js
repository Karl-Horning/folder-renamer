const pathDisplay = document.getElementById("path-display");
const chooseBtn = document.getElementById("choose-btn");
const cancelBtn = document.getElementById("cancel-btn");
const confirmBtn = document.getElementById("confirm-btn");
const revealLink = document.getElementById("reveal-link");

let directoryPath = "";

function render() {
    pathDisplay.textContent = directoryPath || "No folder selected";
    pathDisplay.classList.toggle("empty", !directoryPath);
}

chooseBtn.addEventListener("click", async () => {
    const chosen = await window.api.chooseDirectory();
    if (chosen) {
        directoryPath = chosen;
        render();
    }
});

confirmBtn.addEventListener("click", async () => {
    await window.api.saveSettings({ directoryPath });
    window.close();
});

cancelBtn.addEventListener("click", () => {
    window.close();
});

revealLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.api.revealConfigFolder();
});

window.api.getSettings().then((settings) => {
    directoryPath = settings.directoryPath;
    render();
});
