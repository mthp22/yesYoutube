export function simulateContinuePrompt(): HTMLElement {
  document.querySelector("#auto-continue-test")?.remove();

  const dialog = document.createElement("div");

  dialog.id = "auto-continue-test";
  dialog.setAttribute("role", "dialog");

  dialog.style.cssText = `
    position: fixed;
    z-index: 999999;
    top: 35%;
    left: 50%;
    transform: translateX(-50%);
    width: 320px;
    padding: 24px;
    background: #202020;
    color: white;
    border-radius: 12px;
    font: 16px Arial;
    text-align: center;
  `;

  dialog.innerHTML = `
    <p>Video paused. Are you still watching?</p>
    <button id="auto-continue-test-yes">
      Yes
    </button>
  `;

  dialog.querySelector("button")?.addEventListener("click", () => {
    console.log("[Test] Confirmation received!");
    dialog.remove();
  });

  document.body.appendChild(dialog);

  return dialog;
}

declare global {
  interface Window {
    simulateContinuePrompt: typeof simulateContinuePrompt;
  }
}

window.simulateContinuePrompt = simulateContinuePrompt;