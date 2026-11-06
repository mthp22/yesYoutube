import type { DetectionResult, DetectorConfig } from "./types";

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeLabel(value: string): string {
  return normalizeText(value).replace(/[?!.:,;]+$/g, "");
}

function readText(element: Element): string {
  const inner: unknown = (element as HTMLElement).innerText;
  return typeof inner === "string" ? inner : (element.textContent ?? "");
}

export function isElementVisible(element: Element): boolean {
  let current: Element | null = element;
  let depth = 0;

  while (current !== null && depth < 50) {
    if (current.hasAttribute("hidden")) return false;
    if (current.getAttribute("aria-hidden") === "true") return false;

    const style = window.getComputedStyle(current);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    ) {
      return false;
    }

    current = current.parentElement;
    depth += 1;
  }

  return true;
}

function isDisabled(element: Element): boolean {
  if (element.hasAttribute("disabled")) return true;
  if (element.getAttribute("aria-disabled") === "true") return true;
  return element instanceof HTMLButtonElement && element.disabled;
}

function buttonCandidates(button: Element): string[] {
  const text = normalizeLabel(readText(button));
  const ariaLabel = normalizeLabel(button.getAttribute("aria-label") ?? "");
  return [text, ariaLabel].filter(label => label !== "");
}

function findConfirmButton(
  dialog: HTMLElement,
  config: DetectorConfig
): HTMLElement | null {
  const selector = config.buttonSelectors.join(",");
  if (selector === "") return null;

  const allowedLabels = config.buttonLabels.map(normalizeLabel);
  const candidates = dialog.querySelectorAll<HTMLElement>(selector);

  for (const button of candidates) {
    if (!button.isConnected) continue;
    if (!isElementVisible(button)) continue;
    if (isDisabled(button)) continue;

    const labels = buttonCandidates(button);
    if (labels.some(label => allowedLabels.includes(label))) {
      return button;
    }
  }

  return null;
}

export function findContinuePrompt(
  config: DetectorConfig
): DetectionResult | null {
  const dialogSelector = config.dialogSelectors.join(",");
  if (dialogSelector === "") return null;

  const dialogs = document.querySelectorAll<HTMLElement>(dialogSelector);

  for (const dialog of dialogs) {
    if (!isElementVisible(dialog)) continue;

    const text = normalizeText(readText(dialog));
    if (text === "" || text.length > config.maxPromptTextLength) continue;

    const isPrompt = config.promptPatterns.some(pattern => {
      pattern.lastIndex = 0;
      return pattern.test(text);
    });
    if (!isPrompt) continue;

    const button = findConfirmButton(dialog, config);
    if (button !== null) {
      return { dialog, button };
    }
  }

  return null;
}