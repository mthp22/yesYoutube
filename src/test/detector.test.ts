import { afterEach, describe, expect, it, vi } from "vitest";
import { createDetectorConfig } from "../content/config";
import { YouTubeDetector } from "../content/detector";
import {
  clearFixtures,
  createContinueWatchingPrompt,
  createUnrelatedDialog
} from "./simulate";

/**
 * Detector lifecycle against simulated fixtures.
 *
 * These tests prove lifecycle and click-safety behaviour against a
 * recreation of the prompt. They do NOT prove YouTube compatibility.
 */

/** A short debounce keeps the observer-driven tests fast. */
const DEBOUNCE_MS = 50;
/** A long interval keeps the polling fallback out of the fast tests. */
const LONG_INTERVAL_MS = 60_000;

const activeDetectors: YouTubeDetector[] = [];

function makeDetector(debug = false): YouTubeDetector {
  const config = createDetectorConfig(debug);
  config.debounceMs = DEBOUNCE_MS;
  config.scanInterval = LONG_INTERVAL_MS;

  const detector = new YouTubeDetector(config);
  activeDetectors.push(detector);
  return detector;
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/** Waits long enough for mutation delivery plus the debounce timer. */
const flushScans = (): Promise<void> => sleep(DEBOUNCE_MS + 100);

afterEach(() => {
  for (const detector of activeDetectors) {
    detector.stop();
  }
  activeDetectors.length = 0;

  clearFixtures();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("dynamic prompt detection", () => {
  it("clicks the confirmation button when the prompt appears after start", async () => {
    const detector = makeDetector();
    detector.start();

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    await flushScans();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("clicks an unrelated dialog never", async () => {
    const detector = makeDetector();

    const { buttons } = createUnrelatedDialog({
      message: "Do you want to save your changes?"
    });
    const click = vi.spyOn(buttons[0], "click");

    detector.start();
    await flushScans();

    expect(click).not.toHaveBeenCalled();
  });

  it("confirms the observed YouTube Music structure end-to-end", async () => {
    const detector = makeDetector();
    detector.start();

    const { confirmButton } = createContinueWatchingPrompt({
      variant: "music"
    });
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    await flushScans();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("uses the polling interval as a fallback when no mutation is observed", async () => {
    const config = createDetectorConfig(false);
    config.debounceMs = 60_000;
    config.scanInterval = 50;
    const detector = new YouTubeDetector(config);
    activeDetectors.push(detector);

    detector.start();

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    await sleep(300);

    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("duplicate click prevention", () => {
  it("clicks the same button only once across repeated scans", async () => {
    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    const detector = makeDetector();
    detector.start();

    detector.scan();
    detector.scan();

    document.body.appendChild(document.createElement("div"));
    await flushScans();

    detector.scan();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("does not click again after stop() followed by start()", async () => {
    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    const detector = makeDetector();
    detector.start();
    expect(click).toHaveBeenCalledTimes(1);

    detector.stop();
    detector.start();
    await flushScans();

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("confirms the prompt again when YouTube re-shows the same dialog", async () => {
    const { dialog, confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    const detector = makeDetector();
    detector.start();
    expect(click).toHaveBeenCalledTimes(1);

    dialog.style.display = "none";
    await flushScans();

    dialog.style.display = "";
    await flushScans();

    expect(click).toHaveBeenCalledTimes(2);
  });
});

describe("dialog removal and recreation", () => {
  it("confirms a recreated prompt", async () => {    const detector = makeDetector();
    detector.start();

    const first = createContinueWatchingPrompt();
    const firstClick = vi.spyOn(first.confirmButton as HTMLElement, "click");
    await flushScans();
    expect(firstClick).toHaveBeenCalledTimes(1);

    first.dialog.remove();

    const second = createContinueWatchingPrompt();
    const secondClick = vi.spyOn(second.confirmButton as HTMLElement, "click");
    await flushScans();

    expect(secondClick).toHaveBeenCalledTimes(1);
    expect(firstClick).toHaveBeenCalledTimes(1);
  });
});

describe("start and stop lifecycle", () => {
  it("start() is idempotent and stop() clears every timer", () => {
    vi.useFakeTimers();

    const detector = makeDetector();

    detector.start();
    const timersAfterStart = vi.getTimerCount();
    expect(timersAfterStart).toBeGreaterThan(0);

    detector.start();
    expect(vi.getTimerCount()).toBe(timersAfterStart);

    detector.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(detector.isRunning).toBe(false);
  });

  it("installs only one MutationObserver when start() is called twice", () => {
    const created: unknown[] = [];
    const OriginalMutationObserver = globalThis.MutationObserver;

    class CountingMutationObserver extends OriginalMutationObserver {
      constructor(...args: ConstructorParameters<typeof MutationObserver>) {
        super(...args);
        created.push(this);
      }
    }

    vi.stubGlobal("MutationObserver", CountingMutationObserver);

    const detector = makeDetector();
    detector.start();
    detector.start();

    expect(created).toHaveLength(1);
  });

  it("stops detecting after stop()", async () => {
    const detector = makeDetector();
    detector.start();
    detector.stop();

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    await flushScans();

    expect(click).not.toHaveBeenCalled();
  });
});

describe("YouTube SPA navigation", () => {
  it("rescans immediately when YouTube's navigation event fires", () => {
    window.history.pushState({}, "", "/watch?v=audit123");

    const detector = makeDetector();
    detector.start();

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    // The prompt was inserted after start(), so only the debounced scan could
    // reach it; the navigation event must trigger a scan without waiting.
    document.dispatchEvent(new Event("yt-navigate-finish"));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it("ignores navigation events once the detector is stopped", () => {
    const detector = makeDetector();
    detector.start();
    detector.stop();

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    document.dispatchEvent(new Event("yt-navigate-finish"));
    window.dispatchEvent(new Event("popstate"));

    expect(click).not.toHaveBeenCalled();
  });

  it("keeps detecting across a client-side navigation", async () => {
    const detector = makeDetector();
    detector.start();

    window.history.pushState({}, "", "/results?search_query=audit");
    document.dispatchEvent(new Event("yt-navigate-finish"));

    const { confirmButton } = createContinueWatchingPrompt();
    const click = vi.spyOn(confirmButton as HTMLElement, "click");

    await flushScans();

    expect(click).toHaveBeenCalledTimes(1);
  });
});
