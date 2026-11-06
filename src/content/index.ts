import { YouTubeDetector } from "./detector";
import { createDetectorConfig } from "./config";

declare const __YESYOUTUBE_DEBUG__: boolean;

const detector = new YouTubeDetector(createDetectorConfig(__YESYOUTUBE_DEBUG__));

detector.start();

declare global {
  interface Window {
    youtubeAutoContinue?: {
      start: () => void;
      stop: () => void;
      scan: () => void;
      readonly isRunning: boolean;
    };
  }
}

if (__YESYOUTUBE_DEBUG__) {
  window.youtubeAutoContinue = {
    start: () => detector.start(),
    stop: () => detector.stop(),
    scan: () => detector.scan(),
    get isRunning(): boolean {
      return detector.isRunning;
    }
  };
}