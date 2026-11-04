import type {DetectorConfig, DetectionResult} from "./types";

const normalize = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, " ").trim();

export function findContinuePrompt(
  config: DetectorConfig
): DetectionResult | null {

  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>(
      [
        '[role="dialog"]',
        "tp-yt-paper-dialog",
        "ytd-enforcement-message-view-model"
      ].join(",")
    )
  );

  for (const dialog of dialogs) {
    const text = normalize(dialog.innerText || "");

    const isPrompt = config.promptKeywords.some(
      keyword => text.includes(normalize(keyword))
    );

    if (!isPrompt) continue;

    const buttons = Array.from(
      dialog.querySelectorAll(
        'button, [role="button"], tp-yt-paper-button'
      )
    ) as HTMLElement[];

    for (const button of buttons) {
      const label = normalize(
        button.innerText ||
        button.getAttribute("aria-label") ||
        ""
      );

      const isMatchingButton = config.buttonLabels.some(
        expected => label === normalize(expected)
      );

      if (
        isMatchingButton &&
        !button.hasAttribute("disabled") &&
        button.getAttribute("aria-disabled") !== "true"
      ) {
        return {
          dialog,
          button
        };
      }
    }
  }

  return null;
}