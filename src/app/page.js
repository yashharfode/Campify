'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  FileText,
  Users,
  Zap,
  ArrowRight,
  GraduationCap,
  Calendar,
} from 'lucide-react';

/** Cinematic landing — GSAP hooks preserved: loader-*, hero-*, problem-panel, solution-*, pillar-anim, stack-card, magnet-btn */
export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const horizontalSectionRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      mouseMultiplier: 1,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      // LOADER ANIMATION
      const tlLoader = gsap.timeline({
        onComplete: () => setIsLoading(false)
      });

      tlLoader
        .to(".loader-text", {
          y: 0,
          duration: 1,
          stagger: 0.1,
          ease: "power4.out"
        })
        .to(".loader-line", {
          scaleX: 1,
          duration: 1,
          ease: "power2.inOut"
        })
        .to(".loader-overlay", {
          yPercent: -100,
          duration: 1,
          ease: "power4.inOut",
          delay: 0.5
        })
        .from(".hero-title", {
          yPercent: 120,
          stagger: 0.1,
          duration: 1.2,
          ease: "power4.out"
        }, "-=0.5")
        .to(".hero-sub", {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 1,
          ease: "power2.out"
        }, "-=0.8");

      // FLOATING HERO CARDS
      gsap.to(".hero-cards-container", {
        y: -20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });

      gsap.from(".hero-card", {
        y: 100,
        opacity: 0,
        stagger: 0.2,
        duration: 1.2,
        ease: "back.out(1.7)",
        delay: 2
      });

      // HORIZONTAL SCROLL
      const panels = gsap.utils.toArray(".problem-panel");
      if (panels.length > 0) {
        gsap.to(panels, {
          xPercent: -100 * (panels.length - 1),
          ease: "none",
          scrollTrigger: {
            trigger: horizontalSectionRef.current,
            pin: true,
            scrub: 1,
            snap: 1 / (panels.length - 1),
            end: () => "+=" + (horizontalSectionRef.current?.offsetWidth || 0)
          }
        });
      }

      // SOLUTION REVEAL
      const solutionTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#solution-center",
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      });

      solutionTl
        .to("#solution-center", { scale: 1, duration: 0.8, ease: "back.out(1.7)" })
        .to(".solution-circle", {
          width: "800px",
          height: "800px",
          duration: 1.5,
          ease: "power2.out"
        }, "-=0.5")
        .to(".pillar-anim", {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.5
        }, "-=1");

      // STACKED CARDS
      const cards = gsap.utils.toArray(".stack-card");
      cards.forEach((card, i) => {
        gsap.from(card, {
          scale: 0.9 + (0.05 * i),
          opacity: 0,
          scrollTrigger: {
            trigger: card,
            start: "top bottom-=100",
            end: "top center",
            scrub: true
          }
        });
      });

    }, containerRef);

    // MAGNETIC BUTTONS
    const magnetBtns = document.querySelectorAll(".magnet-btn");
    magnetBtns.forEach(btn => {
      const handleMouseMove = (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(btn, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: "power2.out"
        });
      };

      const handleMouseLeave = () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)"
        });
      };

      btn.addEventListener("mousemove", handleMouseMove);
      btn.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="landing-cinematic relative isolate min-h-screen overflow-x-hidden bg-[#05080c] text-[#e8e4dc] font-sans antialiased selection:bg-[#c9a86c]/30 selection:text-[#fdfbf7]"
    >
      {/* Film grain + vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,rgba(5,8,12,0.85)_100%)]" />

      {/* PRELOADER */}
      {isLoading && (
        <div className="loader-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-[#05080c]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-24 w-24 animate-pulse rounded-full border border-[#c9a86c]/25 bg-[#0c1219] p-2 backdrop-blur-xl">
              <div className="flex h-full w-full items-center justify-center rounded-full border border-[#5a9a94]/40 bg-[#1a2e2c]/60 text-3xl font-black text-[#c9a86c]">
                C
              </div>
            </div>
            <div className="mb-2 overflow-hidden text-6xl font-black tracking-[-0.04em]">
              <span className="loader-text inline-block translate-y-full text-[#e8e4dc]">CAM</span>
              <span className="loader-text inline-block translate-y-full text-[#c9a86c]">PIFY</span>
            </div>
            <p className="loader-text translate-y-full text-xs uppercase tracking-[0.26em] text-[#8a939e]">
              Campus Reimagined
            </p>
            <div className="mx-auto mt-4 h-px w-48 overflow-hidden bg-[#1a222c]">
              <div className="loader-line h-full w-full origin-left scale-x-0 bg-gradient-to-r from-[#5a9a94] to-[#c9a86c]"></div>
            </div>
          </div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-[#1a222c]/80 bg-[#05080c]/75 px-5 py-5 backdrop-blur-xl md:px-10">
        <a href="#" className="text-xl font-black tracking-[-0.04em] text-[#e8e4dc] md:text-2xl">
          CAMPIFY<span className="text-[#c9a86c]">.</span>
        </a>

        <div className="hidden gap-10 md:flex">
          <a
            href="#problems"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa3ad] transition hover:text-[#c9a86c]"
          >
            Mission
          </a>
          <a
            href="#solutions"
            className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9aa3ad] transition hover:text-[#c9a86c]"
          >
            Features
          </a>
        </div>

        <Link
          href="/login"
          className="magnet-btn rounded-full border border-[#c9a86c]/35 bg-[#c9a86c]/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0e6d4] transition hover:border-[#c9a86c]/60 hover:bg-[#c9a86c]/20"
        >
          Start Beta
        </Link>
      </nav>

      {/* HERO SECTION */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[42%] h-[min(85vw,720px)] w-[min(85vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a3a40]/35 blur-[120px]" />
          <div className="absolute right-[-10%] top-[15%] h-[45vw] max-h-[480px] w-[45vw] max-w-[480px] rounded-full bg-[#c9a86c]/12 blur-[100px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c9a86c]/20 to-transparent" />
        </div>

        <div className="relative z-10 max-w-5xl text-center">
          <div className="mb-1 overflow-hidden">
            <h1 className="hero-title text-[clamp(2.75rem,12vw,8.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-[#f5f1ea]">
              CAMPUS LIFE.
            </h1>
          </div>
          <div className="mb-10 overflow-hidden">
            <h1 className="hero-title text-[clamp(2.75rem,12vw,8.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-r from-[#e8d5b8] via-[#c9a86c] to-[#8fb5b0]">
              REMASTERED.
            </h1>
          </div>

          <p className="hero-sub mx-auto max-w-xl translate-y-10 text-base font-light leading-relaxed text-[#9aa3ad] opacity-0 md:text-lg">
            No more WhatsApp spam. No more missed hackathons.
            <br />
            <span className="text-[#c5cbcf]">The operating system your college actually needs.</span>
          </p>

          <div className="hero-sub mt-12 flex translate-y-10 flex-col items-center justify-center gap-4 opacity-0 sm:flex-row sm:gap-5">
            <Link
              href="/login"
              className="magnet-btn inline-flex items-center justify-center rounded-full bg-gradient-to-b from-[#f2eadc] to-[#dcd4c4] px-10 py-4 text-base font-semibold text-[#0a0f16] shadow-[0_4px_32px_rgba(201,168,108,0.25)] transition hover:scale-[1.02] hover:shadow-[0_8px_40px_rgba(201,168,108,0.35)]"
            >
              Get Started
            </Link>
            <button
              type="button"
              className="magnet-btn inline-flex items-center justify-center gap-2 rounded-full border border-[#2a3544] bg-[#0c1219]/80 px-10 py-4 text-base font-semibold text-[#e8e4dc] backdrop-blur-sm transition hover:border-[#5a9a94]/40 hover:bg-[#111923]"
            >
              <Zap className="h-5 w-5 text-[#c9a86c]" strokeWidth={1.75} /> Demo
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 z-10 flex flex-col items-center gap-2 text-[#6b7480]">
          <span className="text-[10px] font-medium uppercase tracking-[0.28em]">Scroll to Explore</span>
          <div className="h-12 w-px bg-gradient-to-b from-[#c9a86c]/50 to-transparent" />
        </div>
      </section>

      {/* 3D FLOATING CARDS SHOWCASE */}
      <section className="relative px-6 py-24">
        <div className="relative mx-auto h-96 max-w-md hero-cards-container">
          <div className="hero-card absolute left-0 top-0 z-10 h-full w-full -translate-y-4 rotate-[-5deg] transform rounded-2xl border border-[#2a3544] border-l-[3px] border-l-[#c9a86c] bg-[#0c1219]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.2em] text-[#c9a86c]">NOTES</span>
              <FileText className="h-6 w-6 text-[#6b7480]" strokeWidth={1.5} />
            </div>
            <div className="mb-2 h-2 w-1/2 rounded bg-[#1a222c]"></div>
            <div className="mb-8 h-2 w-3/4 rounded bg-[#1a222c]"></div>
            <div className="rounded-xl border border-[#c9a86c]/20 bg-[#c9a86c]/5 p-3">
              <p className="text-xs leading-relaxed text-[#d4cfc4]">
                &ldquo;Bro, Engineering Maths ke notes bhej de pls!&rdquo;
              </p>
            </div>
          </div>

          <div className="hero-card absolute left-4 top-4 z-20 h-full w-full translate-x-3 rotate-[5deg] transform rounded-2xl border border-[#2a3544] border-l-[3px] border-l-[#5a9a94] bg-[#0a1018]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.2em] text-[#8fb5b0]">TEAMS</span>
              <Users className="h-6 w-6 text-[#6b7480]" strokeWidth={1.5} />
            </div>
            <div className="mb-6 flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-[#05080c] bg-[#3d5a73]"></div>
              <div className="h-8 w-8 rounded-full border-2 border-[#05080c] bg-[#5a9a94]"></div>
              <div className="h-8 w-8 rounded-full border-2 border-[#05080c] bg-[#9a6b5c]"></div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#05080c] bg-[#1a222c] text-[10px] font-bold text-[#c9a86c]">
                +1
              </div>
            </div>
            <div className="rounded-xl border border-[#5a9a94]/25 bg-[#5a9a94]/5 p-3">
              <p className="text-xs leading-relaxed text-[#b8c9c6]">
                Looking for a frontend dev for Hackathon!
              </p>
            </div>
          </div>

          <div className="hero-card absolute left-[-10px] top-8 z-30 h-full w-full rounded-2xl border border-[#c9a86c]/25 bg-[#080d14] p-6 shadow-[0_0_48px_rgba(201,168,108,0.12)] backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3 border-b border-[#1a222c] pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1a3a40] to-[#0c1a1c] ring-1 ring-[#c9a86c]/30">
                <GraduationCap className="h-6 w-6 text-[#c9a86c]" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-[#f5f1ea]">CAMPIFY</h3>
                <p className="text-[11px] uppercase tracking-widest text-[#6b7480]">Dashboard</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex cursor-pointer items-center justify-between rounded-lg bg-[#0c1219] p-2.5 ring-1 ring-[#1a222c] transition hover:ring-[#c9a86c]/20">
                <span className="text-sm text-[#c5cbcf]">Found: Blue Drafter</span>
                <span className="text-xs font-semibold text-[#c9a86c]">View</span>
              </div>
              <div className="flex cursor-pointer items-center justify-between rounded-lg bg-[#0c1219] p-2.5 ring-1 ring-[#1a222c] transition hover:ring-[#5a9a94]/25">
                <span className="text-sm text-[#c5cbcf]">Smart India Hackathon</span>
                <span className="text-xs font-semibold text-[#8fb5b0]">Apply</span>
              </div>
              <div className="flex cursor-pointer items-center justify-between rounded-lg bg-[#0c1219] p-2.5 ring-1 ring-[#1a222c] transition hover:ring-[#c9a86c]/20">
                <span className="text-sm text-[#c5cbcf]">PYQ Papers 2024</span>
                <span className="text-xs font-semibold text-[#c9a86c]">Download</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL SCROLL PROBLEMS */}
      <section id="problems" ref={horizontalSectionRef} className="h-screen overflow-hidden bg-[#030609]">
        <div className="horizontal-container flex h-full items-center">
          <div className="problem-panel flex h-full w-screen flex-shrink-0 flex-col justify-center border-r border-[#1a222c]/80 px-10 md:px-32">
            <span className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-[#c9a86c]">
              The Current State
            </span>
            <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight text-[#f5f1ea] md:text-6xl lg:text-7xl">
              Why is everything <br />
              <span className="bg-gradient-to-r from-[#5a6b78] to-[#3d4854] bg-clip-text font-medium text-transparent">
                so scattered?
              </span>
            </h2>
            <div className="mt-12 flex items-center gap-4 text-[#7d8792]">
              <ArrowRight className="h-6 w-6 shrink-0 animate-pulse text-[#c9a86c]" strokeWidth={1.5} />
              <span className="text-sm font-light md:text-base">Scroll right to see the chaos</span>
            </div>
          </div>

          <div className="problem-panel flex h-full w-screen flex-shrink-0 flex-col justify-center border-r border-[#1a222c]/80 bg-[#060a10] px-10 md:px-32">
            <div className="max-w-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5a9a94]/20 bg-[#5a9a94]/10">
                <Zap className="h-8 w-8 text-[#8fb5b0]" strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-[#f5f1ea] md:text-4xl">
                Notification Hell
              </h3>
              <p className="text-lg font-light leading-relaxed text-[#9aa3ad]">
                &ldquo;Does anyone have the Physics pdf?&rdquo; buried under 500 birthday wishes. Important info
                gets lost instantly.
              </p>
            </div>
          </div>

          <div className="problem-panel flex h-full w-screen flex-shrink-0 flex-col justify-center bg-[#080d14] px-10 md:px-32">
            <div className="max-w-2xl">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c9a86c]/20 bg-[#c9a86c]/10">
                <Calendar className="h-8 w-8 text-[#c9a86c]" strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-[#f5f1ea] md:text-4xl">
                Missed Deadlines
              </h3>
              <p className="text-lg font-light leading-relaxed text-[#9aa3ad]">
                Hackathons, Scholarships, Fests. You find out about them the day after registrations close.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTION REVEAL */}
      <section className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#05080c] via-[#070f14] to-[#05080c]">
        <div className="solution-circle pointer-events-none absolute left-1/2 top-1/2 z-0 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c9a86c]/25"></div>
        <div className="solution-circle pointer-events-none absolute left-1/2 top-1/2 z-0 h-0 w-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#5a9a94]/20"></div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,108,0.06)_0%,transparent_55%)]" />

        <div className="relative z-10 scale-0 text-center" id="solution-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a3a40] via-[#0c1a1c] to-[#1a222c] shadow-[0_0_60px_rgba(201,168,108,0.15)] ring-1 ring-[#c9a86c]/35">
            <span className="font-black text-4xl text-[#c9a86c]">C</span>
          </div>
          <h2 className="mb-3 text-5xl font-bold tracking-[-0.03em] text-[#f5f1ea] md:text-7xl">CAMPIFY</h2>
          <p className="mx-auto max-w-md text-lg font-light text-[#9aa3ad] md:text-xl">
            The Operating System for your Campus.
          </p>
          <p className="mx-auto mt-8 max-w-lg text-[10px] font-semibold uppercase tracking-[0.55em] text-[#6b7480] md:text-[11px]">
            <span className="text-[#c9a86c]">Connect</span>
            <span className="mx-2 text-[#2a3544]">·</span>
            <span className="text-[#8fb5b0]">Grow</span>
            <span className="mx-2 text-[#2a3544]">·</span>
            <span className="text-[#c9a86c]">Share</span>
            <span className="mx-2 text-[#2a3544]">·</span>
            <span className="text-[#8fb5b0]">Learn</span>
          </p>
        </div>

        <div className="pillar-anim absolute top-[18%] translate-y-10 opacity-0">
          <span className="rounded-full border border-[#c9a86c]/30 bg-[#c9a86c]/10 px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#e8d5b8]">
            CONNECT
          </span>
        </div>
        <div className="pillar-anim absolute bottom-[18%] translate-y-10 opacity-0">
          <span className="rounded-full border border-[#5a9a94]/30 bg-[#5a9a94]/10 px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#b8c9c6]">
            GROW
          </span>
        </div>
        <div className="pillar-anim absolute left-[8%] translate-y-10 opacity-0 md:left-[22%]">
          <span className="rounded-full border border-[#c9a86c]/25 bg-[#0c1219] px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#c9a86c]">
            SHARE
          </span>
        </div>
        <div className="pillar-anim absolute right-[8%] translate-y-10 opacity-0 md:right-[22%]">
          <span className="rounded-full border border-[#5a9a94]/25 bg-[#0c1219] px-4 py-2 text-[10px] font-bold tracking-[0.2em] text-[#8fb5b0]">
            LEARN
          </span>
        </div>
      </section>

      {/* STACKED CARDS */}
      <section id="solutions" className="bg-[#05080c] px-4 py-32 md:px-10">
        <div className="mb-24 text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c9a86c]">
            Introducing CAMPIFY
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#f5f1ea] md:text-6xl">
            Order from Chaos.
          </h2>
        </div>

        <div className="relative mx-auto max-w-5xl space-y-24">
          <div className="stack-card sticky top-24 flex min-h-[500px] flex-col items-center gap-10 rounded-[1.75rem] border border-[#1a222c] border-t-[3px] border-t-[#c9a86c]/60 bg-[#0c1219]/80 p-8 backdrop-blur-xl md:flex-row md:p-14">
            <div className="w-full md:w-1/2">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c9a86c]/25 bg-[#c9a86c]/10 text-[#c9a86c]">
                <FileText className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-[#f5f1ea] md:text-4xl">
                Resource Hub
              </h3>
              <p className="text-lg font-light leading-relaxed text-[#9aa3ad]">
                A structured library for every semester. Upload notes, get karma, become a legend.
              </p>
            </div>
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-[#2a3544] bg-gradient-to-br from-[#1a2e2c]/40 to-[#05080c] md:w-1/2">
              <div className="rounded-xl border border-[#2a3544] bg-[#080d14]/90 px-6 py-3 backdrop-blur-md">
                <span className="font-mono text-sm text-[#8fb5b0]">/download/sem3_notes.pdf</span>
              </div>
            </div>
          </div>

          <div className="stack-card sticky top-24 flex min-h-[500px] flex-col items-center gap-10 rounded-[1.75rem] border border-[#1a222c] border-t-[3px] border-t-[#5a9a94]/50 bg-[#0c1219]/80 p-8 backdrop-blur-xl md:flex-row md:p-14">
            <div className="w-full md:w-1/2">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5a9a94]/25 bg-[#5a9a94]/10 text-[#8fb5b0]">
                <Users className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-[#f5f1ea] md:text-4xl">
                Team Matchmaking
              </h3>
              <p className="text-lg font-light leading-relaxed text-[#9aa3ad]">
                Don&apos;t have a team for the hackathon? Filter students by skills (React, AI, Design) and
                connect instantly.
              </p>
            </div>
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-[#2a3544] bg-gradient-to-br from-[#0f2422]/50 to-[#05080c] md:w-1/2">
              <div className="flex -space-x-4">
                <div className="h-12 w-12 rounded-full border-2 border-[#05080c] bg-[#3d5a73]"></div>
                <div className="h-12 w-12 rounded-full border-2 border-[#05080c] bg-[#5a9a94]"></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#05080c] bg-[#c9a86c] text-xs font-bold text-[#0a0f16]">
                  +1
                </div>
              </div>
            </div>
          </div>

          <div className="stack-card sticky top-24 flex min-h-[500px] flex-col items-center gap-10 rounded-[1.75rem] border border-[#1a222c] border-t-[3px] border-t-[#c9a86c]/40 bg-[#0c1219]/80 p-8 backdrop-blur-xl md:flex-row md:p-14">
            <div className="w-full md:w-1/2">
              <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#c9a86c]/20 bg-[#1a222c]/80 text-[#c9a86c]">
                <Calendar className="h-8 w-8" strokeWidth={1.5} />
              </div>
              <h3 className="mb-4 text-3xl font-semibold tracking-tight text-[#f5f1ea] md:text-4xl">
                One Calendar
              </h3>
              <p className="text-lg font-light leading-relaxed text-[#9aa3ad]">
                Every fest, workshop, and hackathon in one place. Sync it to your Google Calendar and never
                miss out.
              </p>
            </div>
            <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-[#2a3544] bg-gradient-to-br from-[#2a2218]/40 to-[#05080c] md:w-1/2">
              <div className="rounded-xl border border-[#c9a86c]/20 bg-[#080d14]/90 px-8 py-8 text-center backdrop-blur-md">
                <div className="text-4xl font-light tabular-nums text-[#f5f1ea]">24</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#c9a86c]">
                  October
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="relative flex h-[72vh] flex-col items-center justify-center overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1a222c_1px,transparent_1px),linear-gradient(to_bottom,#1a222c_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.35]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#05080c] via-transparent to-[#05080c]/80" />

        <h2 className="relative z-10 mb-12 text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-[#f5f1ea] md:text-7xl lg:text-8xl">
          GET IN THE <br />
          <span className="bg-gradient-to-r from-[#e8d5b8] via-[#c9a86c] to-[#8fb5b0] bg-clip-text text-transparent">
            LOOP.
          </span>
        </h2>

        <Link
          href="/login"
          className="magnet-btn group relative z-10 flex min-h-[3.75rem] min-w-[14rem] items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[#f2eadc] to-[#d8ccb8] px-12 py-5 text-xl font-semibold text-[#0a0f16] shadow-[0_8px_40px_rgba(201,168,108,0.2)] transition duration-300 hover:scale-[1.03]"
        >
          <span className="relative z-10 transition-opacity group-hover:opacity-0">Launch CAMPIFY</span>
          <span className="absolute inset-0 z-20 flex items-center justify-center bg-[#1a3a40] text-base font-semibold text-[#f5f1ea] opacity-0 transition-opacity group-hover:opacity-100">
            LET&apos;S GO
          </span>
        </Link>

        <div className="relative z-10 mt-20 text-[10px] font-medium uppercase tracking-[0.28em] text-[#5c6570]">
          Designed for Hackathon Winners
        </div>
      </section>
    </div>
  );
}
