import { findContinuePrompt } from "./matcher";
import type { DetectorConfig } from "./types";

export class YouTubeDetector {
  private observer: MutationObserver | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastClickedButton: HTMLElement | null = null;

  constructor(private config: DetectorConfig) {}

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[Auto Continue] ${message}`);
    }
  }

  private scan(): void {
    const result = findContinuePrompt(this.config);

    if (!result) {
      this.lastClickedButton = null;
      return;
    }

    const { button } = result;

    if (button === this.lastClickedButton) return;

    this.lastClickedButton = button;

    this.log("Continue-watching prompt detected.");

    button.click();

    this.log("Confirmation button clicked.");
  }

  public start(): void {
    if (this.observer) return;

    this.observer = new MutationObserver(() => {
      this.scan();
    });

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "disabled"]
    });

    this.interval = setInterval(
      () => this.scan(),
      this.config.scanInterval
    );

    this.scan();

    this.log("Detector started.");
  }

  public stop(): void {
    this.observer?.disconnect();
    this.observer = null;

    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.lastClickedButton = null;

    this.log("Detector stopped.");
  }
}