import type { DetectorConfig } from "./types";

export function createDetectorConfig(debug: boolean): DetectorConfig {
  return {
    dialogSelectors: [
      '[role="dialog"]',
      "tp-yt-paper-dialog",
      "yt-confirm-dialog-renderer",
      ".yt-confirm-dialog-renderer",
      "ytd-enforcement-message-view-model",
      "ytmusic-you-there-renderer"
    ],

    buttonSelectors: [
      "#confirm-button",
      "button",
      '[role="button"]',
      "tp-yt-paper-button",
      "yt-button-shape button"
    ],

    promptPatterns: [
      /video\s*paused/i,
      /are\s*you\s*still\s*watching/i,
      /still\s*watching/i,
      /continue\s*watching\s*\?/i
    ],

    buttonLabels: ["yes", "ok", "continue", "continue watching"],

    maxPromptTextLength: 300,
    scanInterval: 2000,
    debounceMs: 150,
    debug
  };
}
