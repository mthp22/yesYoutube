import { YouTubeDetector } from "./detector";
import type { DetectorConfig } from "./types";

const config: DetectorConfig = {
  promptKeywords: [
    "video paused",
    "continue watching",
    "are you still watching?"
  ],

  buttonLabels: [
    "yes",
    "continue",
    "continue watching"
  ],

  scanInterval: 2000,
  debug: true
};

const detector = new YouTubeDetector(config);

detector.start();

// Expose a small debugging interface.
declare global {
  interface Window {
    youtubeAutoContinue?: {
      stop: () => void;
      start: () => void;
      scan: () => void;
    };
  }
}

window.youtubeAutoContinue = {
  start: () => detector.start(),
  stop: () => detector.stop(),
  scan: () => {
    const event = new Event("youtube-auto-continue-scan");
    document.dispatchEvent(event);
  }
};

document.addEventListener(
  "youtube-auto-continue-scan",
  () => {
    detector.stop();
    detector.start();
  }
);