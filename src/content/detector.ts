import { findContinuePrompt, isElementVisible } from "./matcher";
import type { DetectorConfig, DetectionResult } from "./types";

export class YouTubeDetector {
  private observer: MutationObserver | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private lastUrl = "";

  private readonly confirmedButtons = new Set<HTMLElement>();

  constructor(private readonly config: DetectorConfig) {}

  public get isRunning(): boolean {
    return this.running;
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[yesYouTube] ${message}`);
    }
  }

  private pruneConfirmedButtons(): void {
    for (const button of this.confirmedButtons) {
      if (!button.isConnected || !isElementVisible(button)) {
        this.confirmedButtons.delete(button);
      }
    }
  }
 
  public scan(): void {
    if (!this.running) return;

    this.pruneConfirmedButtons();

    const result: DetectionResult | null = findContinuePrompt(this.config);
    if (result === null) return;

    const { button } = result;
    if (this.confirmedButtons.has(button)) return;

    this.confirmedButtons.add(button);

    this.log("Inactivity prompt detected.");

    try {
      button.click();
      this.log("Confirmation button clicked.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.log(`Confirmation click failed: ${detail}`);
    }
  }

  private scheduleScan(): void {
    if (!this.running || this.debounceTimer !== null) return;

    this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
    this.scan();
    }, this.config.debounceMs);
  }

  private readonly handleNavigation = (): void => {
    if (!this.running) return;
    this.lastUrl = window.location.href;
    this.log("Navigation detected, rescanning.");
    this.scan();
  };

  private handleInterval(): void {
    if (window.location.href !== this.lastUrl) {
      this.lastUrl = window.location.href;
      this.log("URL changed, rescanning.");
    }
    this.scan();
  }

  public start(): void {
    if (this.running) return;

    const root = document.documentElement;
    if (root === null) {
      this.log("Cannot start: document has no root element.");
      return;
    }

    this.running = true;
    this.lastUrl = window.location.href;

    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-label", "aria-disabled", "disabled", "hidden", "style"]
    });

    this.interval = setInterval(() => this.handleInterval(), this.config.scanInterval);

    document.addEventListener("yt-navigate-finish", this.handleNavigation);
    window.addEventListener("popstate", this.handleNavigation);
    window.addEventListener("hashchange", this.handleNavigation);

    this.scan();

    this.log("Detector started.");
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;

    this.observer?.disconnect();
    this.observer = null;

    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    document.removeEventListener("yt-navigate-finish", this.handleNavigation);
    window.removeEventListener("popstate", this.handleNavigation);
    window.removeEventListener("hashchange", this.handleNavigation);

    this.log("Detector stopped.");
  }
}