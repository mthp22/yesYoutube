import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let cleanup: (() => void) | undefined;

export function initMotion() {
  // Prevent duplicate animations and ScrollTriggers.
  cleanup?.();
  cleanup = undefined;

  const elements = gsap.utils.toArray<HTMLElement>('[data-reveal]');

  if (!elements.length) return;
  
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (reducedMotion) {
    gsap.set(elements, {opacity: 1, y: 0, clearProps: 'all'});

    return;
  }

  const context = gsap.context(() => {

    elements.forEach((element) => {

      gsap.fromTo(element, {opacity: 0, y: 28}, {
          opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            once: true
          }
        }
      );
    });

  });

  cleanup = () => {
    context.revert();
  };

  ScrollTrigger.refresh();
}

document.addEventListener('astro:before-swap', () => {
  cleanup?.();
  cleanup = undefined;
});