// Scroll motion for the whole site: Lenis smooth scroll driving GSAP
// ScrollTrigger. Every effect is opt-in through a data attribute, so a page
// without them pays only for Lenis.
//
//   data-reveal            fade + rise when it enters the viewport
//   data-reveal-stagger    same, for each direct child in turn
//   data-hero              pinned hero: headline recedes as you scroll
//   data-scrub-words       pinned statement, words light up with the scroll
//   data-hscroll           pinned horizontal track (desktop only)
//
// prefers-reduced-motion: no Lenis, no pinning, everything shown at rest.

import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Spotlight cards ───────────────────────────────────────────────────────
// The light follows the pointer 1:1 (no easing on the position, so it never
// lags the hand); only its fade in and out is eased, in CSS. Not motion,
// so it stays on under reduced motion too.
document.addEventListener('pointermove', (e) => {
  const card = (e.target as Element | null)?.closest?.('.glow-card') as HTMLElement | null;
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - r.left}px`);
  card.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

if (!reduce) {
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ lerp: 0.1, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── Hero: the headline recedes into the helix ─────────────────────────
  const hero = document.querySelector<HTMLElement>('[data-hero]');
  if (hero) {
    const inner = hero.querySelector('[data-hero-inner]');
    const cue = hero.querySelector('[data-hero-cue]');
    gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: '+=70%', scrub: true, pin: true },
    })
      .to(inner, { scale: 0.9, opacity: 0, y: -60, ease: 'none' }, 0)
      .to(cue, { opacity: 0, ease: 'none' }, 0);
  }

  // ── Statement: words light up one by one ──────────────────────────────
  gsap.utils.toArray<HTMLElement>('[data-scrub-words]').forEach((el) => {
    const target = el.querySelector<HTMLElement>('[data-words]') ?? el;
    const nodes = Array.from(target.childNodes);
    target.innerHTML = '';
    nodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        (n.textContent ?? '').split(/(\s+)/).forEach((w) => {
          if (!w.trim()) { target.append(w); return; }
          const s = document.createElement('span');
          s.className = 'scrub-word'; s.textContent = w; target.append(s);
        });
      } else {
        (n as HTMLElement).classList.add('scrub-word'); target.append(n);
      }
    });
    gsap.to(target.querySelectorAll('.scrub-word'), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top top', end: '+=120%', scrub: true, pin: true },
    });
  });

  // ── Horizontal track, desktop only ────────────────────────────────────
  const mm = gsap.matchMedia();
  mm.add('(min-width: 1024px)', () => {
    gsap.utils.toArray<HTMLElement>('[data-hscroll]').forEach((wrap) => {
      const track = wrap.querySelector<HTMLElement>('[data-hscroll-track]');
      const bar = wrap.querySelector<HTMLElement>('[data-hscroll-bar]');
      if (!track) return;
      // The track starts at the content column, not at the screen edge, so
      // the distance is measured from where it really sits: the last card
      // must end fully on screen, with the same gutter as the first.
      const dist = () => {
        const left = track.getBoundingClientRect().left - (gsap.getProperty(track, 'x') as number);
        return Math.max(0, left + track.scrollWidth - window.innerWidth + left);
      };
      gsap.timeline({
        scrollTrigger: {
          trigger: wrap, start: 'top top', end: () => `+=${dist()}`,
          scrub: true, pin: true, invalidateOnRefresh: true,
        },
      })
        .to(track, { x: () => -dist(), ease: 'none' }, 0)
        .fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
    });
  });
  // Reveals are created after every pin, so their start positions
  // already include the pin spacing above them.
  // ── Reveals ───────────────────────────────────────────────────────────
  // Cards carry a CSS transition for their hover lift; it would fight the
  // tween, so it is switched off for the reveal and handed back after.
  const reveal = (targets: Element[] | HTMLCollection, trigger: Element, start: string, y: number, stagger = 0) => {
    const els = Array.from(targets) as HTMLElement[];
    els.forEach((e) => (e.style.transition = 'none'));
    gsap.fromTo(els, { y, opacity: 0 }, {
      y: 0, opacity: 1, duration: 0.85, ease: 'power3.out', stagger,
      scrollTrigger: { trigger, start, once: true },
      onComplete: () => gsap.set(els, { clearProps: 'transition,transform,opacity' }),
    });
  };
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => reveal([el], el, 'top 88%', 40));
  gsap.utils.toArray<HTMLElement>('[data-reveal-stagger]').forEach((el) => reveal(el.children, el, 'top 85%', 32, 0.08));
  window.addEventListener('load', () => ScrollTrigger.refresh());
} else {
  document.documentElement.classList.add('reduce-motion');
}
