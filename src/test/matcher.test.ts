import { afterEach, describe, expect, it } from "vitest";
import { createDetectorConfig } from "../content/config";
import { findContinuePrompt } from "../content/matcher";
import type { DetectorConfig } from "../content/types";
import {
  clearFixtures,
  createContinueWatchingPrompt,
  createUnrelatedDialog
} from "./simulate";

/**
 * Detector behaviour against simulated fixtures.
 *
 * These tests prove that the matcher behaves correctly against a recreation
 * of the prompt. They do NOT prove YouTube compatibility.
 */
const config = createDetectorConfig(false);

afterEach(() => clearFixtures());

describe("genuine prompt fixture detection", () => {
  it("detects the prompt and returns its confirmation button", () => {
    const { confirmButton } = createContinueWatchingPrompt();

    const result = findContinuePrompt(config);

    expect(result).not.toBeNull();
    expect(result?.button).toBe(confirmButton);
    expect(result?.dialog).not.toBeNull();
  });

  it("selects the confirmation button and never the cancel button", () => {
    const { confirmButton, cancelButton } = createContinueWatchingPrompt();

    const result = findContinuePrompt(config);

    expect(result?.button).toBe(confirmButton);
    expect(result?.button).not.toBe(cancelButton);
    expect(result?.button.textContent?.trim()).toBe("Yes");
    expect(cancelButton?.textContent?.trim()).toBe("No");
  });

  it("accepts a label regardless of casing, padding or trailing punctuation", () => {
    const { confirmButton } = createContinueWatchingPrompt({
      confirmLabel: "  YES?  "
    });

    const result = findContinuePrompt(config);

    expect(result?.button).toBe(confirmButton);
  });

  it("detects the structure reported for www.youtube.com", () => {
    const { confirmButton } = createContinueWatchingPrompt({ variant: "web" });

    const result = findContinuePrompt(config);

    expect(result?.button).toBe(confirmButton);
    expect(result?.button.id).toBe("confirm-button");
  });

  it("detects the observed music.youtube.com structure", () => {
    const { dialog, confirmButton } = createContinueWatchingPrompt({
      variant: "music"
    });

    // The outer element is the <tp-yt-paper-dialog role="dialog"> wrapper.
    expect(dialog.tagName.toLowerCase()).toBe("tp-yt-paper-dialog");
    expect(confirmButton?.getAttribute("aria-label")).toBe("Yes");
    // "false" must not be mistaken for a disabled button.
    expect(confirmButton?.getAttribute("aria-disabled")).toBe("false");

    const result = findContinuePrompt(config);

    expect(result?.dialog).toBe(dialog);
    expect(result?.button).toBe(confirmButton);
  });

  it("reads a confirmation label nested inside a span", () => {
    // The observed button carries its label in <span role="text">Yes</span>
    // rather than as direct text content.
    const { confirmButton } = createContinueWatchingPrompt({
      variant: "music"
    });

    expect(confirmButton?.querySelector('span[role="text"]')?.textContent).toBe(
      "Yes"
    );
    expect(findContinuePrompt(config)?.button).toBe(confirmButton);
  });

  it("detects the music structure using only the YouTube Music selectors", () => {
    // Removes the generic [role="dialog"] / button fallbacks so this test
    // fails if the YouTube Music specific selectors stop matching.
    createContinueWatchingPrompt({ variant: "music" });

    const musicOnly: DetectorConfig = {
      ...createDetectorConfig(false),
      dialogSelectors: ["ytmusic-you-there-renderer"],
      buttonSelectors: ["yt-button-shape button"]
    };

    const result = findContinuePrompt(musicOnly);

    expect(result?.button.getAttribute("aria-label")).toBe("Yes");
  });

  it("detects the www.youtube.com structure using only its reported selectors", () => {
    createContinueWatchingPrompt({ variant: "web" });

    const webOnly: DetectorConfig = {
      ...createDetectorConfig(false),
      dialogSelectors: ["yt-confirm-dialog-renderer"],
      buttonSelectors: ["#confirm-button"]
    };

    const result = findContinuePrompt(webOnly);

    expect(result?.button.id).toBe("confirm-button");
  });
});

describe("unrelated dialogs and buttons", () => {
  it("ignores an unrelated dialog that contains a Yes button", () => {
    const { buttons } = createUnrelatedDialog({
      message: "Do you want to save your changes?"
    });

    expect(findContinuePrompt(config)).toBeNull();
    expect(buttons[0].textContent).toBe("Yes");
  });

  it("ignores a dialog that mentions Continue watching without the prompt question", () => {
    createUnrelatedDialog({
      message:
        "Continue watching this video will resume from where you left off.",
      buttonLabels: ["Yes"]
    });

    expect(findContinuePrompt(config)).toBeNull();
  });

  it("ignores an unrelated Yes button that is not inside a dialog", () => {
    const button = document.createElement("button");
    button.textContent = "Yes";
    document.body.appendChild(button);

    expect(findContinuePrompt(config)).toBeNull();

    button.remove();
  });

  it("ignores a hidden prompt dialog", () => {
    createContinueWatchingPrompt({ hidden: true });

    expect(findContinuePrompt(config)).toBeNull();
  });

  it("ignores a dialog whose text is far longer than the genuine prompt", () => {
    createContinueWatchingPrompt({
      message: `Video paused. Continue watching? ${"lorem ipsum ".repeat(40)}`
    });

    expect(findContinuePrompt(config)).toBeNull();
  });
});

describe("confirmation button availability", () => {
  it("returns null when the confirmation button is missing", () => {
    const { confirmButton, cancelButton } = createContinueWatchingPrompt({
      confirmLabel: null
    });

    expect(confirmButton).toBeNull();
    expect(cancelButton).not.toBeNull();
    expect(findContinuePrompt(config)).toBeNull();
  });

  it("returns null when the confirmation button is disabled", () => {
    const { confirmButton } = createContinueWatchingPrompt({
      confirmDisabled: true
    });

    expect(confirmButton).not.toBeNull();
    expect(findContinuePrompt(config)).toBeNull();
  });

  it("returns null when no dialog is present at all", () => {
    expect(findContinuePrompt(config)).toBeNull();
  });
});
