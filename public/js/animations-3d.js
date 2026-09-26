/**
 * 3D Animations & Interactive Engine
 * Integrates Lenis Smooth Scroll, GSAP 3D ScrollTrigger, and 3D Card Tilt
 */

(function () {
  'use strict';


  // 2. INTERACTIVE 3D MOUSE TILT FOR CARDS
  function init3dCardTilt() {
    const selector = '.tilt-card-3d, .room-card, .portal-card, .feature-card, .metric-card, .stat-pill, .pricing-card';
    const cards = document.querySelectorAll(selector);

    cards.forEach((card) => {
      card.classList.add('tilt-card-3d');
      const parent = card.parentElement;
      if (parent) parent.classList.add('perspective-3d');

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(16px)`;

        card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
      });
    });
  }

  // 3. MAGNETIC BUTTON HOVER EFFECT
  function initMagneticButtons() {
    const btns = document.querySelectorAll('.btn-primary, .btn-secondary, .magnetic-btn, .hero-badge-tag');

    btns.forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.03)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px) scale(1)';
      });
    });
  }

  // 4. GSAP & SCROLLTRIGGER 3D REVEAL ANIMATIONS
  function initGsapAnimations() {
    if (typeof gsap === 'undefined') return;

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Hero Section Entrance
    gsap.from('.hero-badge-tag', {
      duration: 0.9,
      y: -30,
      opacity: 0,
      ease: 'back.out(1.7)'
    });

    gsap.from('.hero-title', {
      duration: 1.1,
      y: 40,
      rotateX: -15,
      opacity: 0,
      ease: 'power3.out',
      delay: 0.2
    });

    gsap.from('.hero-subtitle', {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: 'power2.out',
      delay: 0.4
    });

    gsap.from('.stat-pill', {
      duration: 0.8,
      scale: 0.85,
      y: 20,
      opacity: 0,
      stagger: 0.12,
      ease: 'back.out(1.5)',
      delay: 0.6
    });

    // Scroll-Triggered Cards Reveal
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.utils.toArray('.room-card, .portal-card, .feature-card, .faq-item').forEach((element, i) => {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: 'top 88%',
            toggleActions: 'play none none reverse'
          },
          duration: 0.9,
          y: 50,
          rotateX: -10,
          opacity: 0,
          ease: 'power3.out',
          delay: (i % 3) * 0.1
        });
      });
    }
  }

  // 5. LENIS SMOOTH SCROLLING
  function initLenisScroll() {
    if (typeof Lenis === 'undefined') return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  // DOM Content Loaded Handler
  document.addEventListener('DOMContentLoaded', () => {
    init3dCardTilt();
    initMagneticButtons();
    initLenisScroll();
    initGsapAnimations();
  });
})();


