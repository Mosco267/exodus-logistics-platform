// src/components/home/HomeClient.tsx
'use client';

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useViewportScroll,
  useTransform,
  useAnimation,
  useInView,
} from "framer-motion";
import { Globe, Shield, Clock, Users } from "lucide-react";
import QuickActions from "@/components/QuickActions";
import GetAQuoteForm from "@/components/GetAQuoteForm";

export default function HomeClient() {
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const { scrollY } = useViewportScroll();
  useTransform(scrollY, [100, 400], [1, 0]); // (kept, but not required)

  // Flip cards state
  const [flippedCards, setFlippedCards] = useState<{ [key: string]: boolean }>({});

  const backText: { [key: string]: string } = {
    "Global Network":
      "We provide worldwide coverage, delivering packages to over 200 countries reliably and on time.",
    "Fully Insured":
      "All shipments are covered with full insurance, so you can ship with confidence and peace of mind.",
    "Real-time Tracking":
      "Track your shipments live, with accurate updates on location and expected delivery times.",
    "Expert Support":
      "Our logistics experts are available 24/7 to guide you, answer questions, and ensure smooth deliveries.",
  };

  const features = [
    { icon: Globe, title: "Global Network", description: "Shipping to over 200 countries worldwide with reliable partners" },
    { icon: Shield, title: "Fully Insured", description: "Complete coverage for all your valuable shipments" },
    { icon: Clock, title: "Real-time Tracking", description: "Track your packages 24/7 with live updates" },
    { icon: Users, title: "Expert Support", description: "Dedicated customer service team available around the clock" },
  ];

  const heroWords = [
    {
      text: "Simplified",
      color: "text-cyan-400",
      description:
        "Simplified logistics solutions designed to save you time and reduce complexity while keeping your shipments organized, efficient, and moving smoothly across every destination.",
    },
    {
      text: "Reliable",
      color: "text-orange-400",
      description:
        "Reliable delivery backed by advanced tracking systems and expert coordination, ensuring your cargo arrives safely, securely, and exactly when expected every time.",
    },
    {
      text: "Fast",
      color: "text-cyan-400",
      description:
        "Fast shipping solutions built for speed and precision, helping your business move quicker while maintaining strict safety standards and operational efficiency.",
    },
    {
      text: "Affordable",
      color: "text-orange-400",
      description:
        "Affordable logistics services that provide competitive pricing without sacrificing performance, security, or the professional standards your shipments deserve.",
    },
  ];

  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [animateWord, setAnimateWord] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimateWord(false);
      setTimeout(() => {
        setHeroWordIndex((prev) => (prev + 1) % heroWords.length);
        setAnimateWord(true);
      }, 800);
    }, 8000);

    return () => clearInterval(interval);
  }, [heroWords.length]);

  // Hero scroll effects
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroOffset, setHeroOffset] = useState(0);
  const [heroHeight, setHeroHeight] = useState(800);

  useEffect(() => {
    if (heroRef.current) {
      setHeroOffset(heroRef.current.offsetTop);
      setHeroHeight(heroRef.current.offsetHeight);
    }
  }, []);

  const fadeStart = heroOffset || 0;
  const fadeEnd = heroOffset + (heroHeight || 800);

  const heroOpacity = useTransform(scrollY, [fadeStart, fadeEnd], [1, 0]);
  const heroY = useTransform(scrollY, [fadeStart, fadeEnd], [40, 0]);

  const controls = useAnimation();
  const isInView = useInView(heroRef, { amount: 0.5 });

  useEffect(() => {
    if (isInView) controls.start({ opacity: 1, y: 0 });
    else controls.start({ opacity: 0, y: 40 });
  }, [isInView, controls]);

  // Typing headline
  const rotatingTexts = [
    { text: "With Confidence", color: "text-cyan-300" },
    { text: "With Low Cost", color: "text-orange-500" },
    { text: "With Exodus Logistics", color: "text-white" },
  ];

  const words: { text: string; color: string }[] = [
    { text: "With Confidence?", color: "text-cyan-300" },
    { text: "With Low Cost?", color: "text-orange-500" },
    { text: "With Exodus Logistics?", color: "text-white" },
  ];

  const [displayedText, setDisplayedText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const currentWord = words[wordIndex].text;

    const handleTyping = () => {
      if (!isDeleting) {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
        setTypingSpeed(100);

        if (displayedText === currentWord) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
        setTypingSpeed(50);

        if (displayedText === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    };

    const timer = setTimeout(handleTyping, typingSpeed);
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, wordIndex, typingSpeed, words]);

  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Quote / invoice override pages
  if (showQuoteForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowQuoteForm(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <GetAQuoteForm />
        </div>
      </div>
    );
  }

  if (showInvoice) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setShowInvoice(false)}
            className="mb-8 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <div className="text-center text-2xl font-bold text-gray-600">
            Invoice View Page - Coming Soon
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ================= Hero Section ================= */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative text-white min-h-[100dvh]"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-500" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 via-transparent to-cyan-400/20 animate-pulse" />

          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <motion.path
              d="M100,50 Q300,100 500,50 T900,50"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M50,150 Q250,100 450,150 T850,150"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.path
              d="M150,250 Q350,200 550,250 T950,250"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </svg>

          <motion.div
            className="absolute top-20 left-10 w-20 h-20 bg-white/5 rounded-full backdrop-blur-md"
            animate={{ y: [0, -25, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 right-20 w-32 h-32 bg-white/3 rounded-full backdrop-blur-md"
            animate={{ y: [0, 35, 0], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-16 h-16 bg-white/4 rounded-full backdrop-blur-md"
            animate={{ y: [0, -15, 0], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-15 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-lg tracking-tight">
                Exodus Logistics{" "}
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={heroWordIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: animateWord ? 1 : 0, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className={`${heroWords[heroWordIndex].color} inline-block`}
                  >
                    {heroWords[heroWordIndex].text}
                  </motion.span>
                </AnimatePresence>
              </h1>

              <AnimatePresence mode="wait">
                <motion.p
                  key={heroWordIndex + "-desc"}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: animateWord ? 1 : 0, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="text-lg md:text-xl lg:text-2xl leading-relaxed tracking-wide text-white/90 drop-shadow-md max-w-2xl min-h-[160px]"
                >
                  {heroWords[heroWordIndex].description}
                </motion.p>
              </AnimatePresence>

              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <motion.button
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (window.location.href = "/quote")}
                  className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold shadow-lg transition-all duration-500 ease-in-out flex items-center justify-center cursor-pointer hover:bg-cyan-400 hover:text-white"
                >
                  Get Instant Quote
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.07 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (window.location.href = "/track")}
                  className="bg-transparent text-white px-8 py-4 rounded-2xl font-semibold shadow-lg border-2 border-white transition-all duration-500 ease-in-out cursor-pointer hover:bg-orange-500 hover:text-white hover:border-transparent"
                >
                  Track Shipment
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden lg:block relative w-full h-96"
            >
              <div className="relative w-72 h-72 mx-auto">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-spin-slow" />
                <div className="absolute inset-2 border-2 border-white/10 rounded-full animate-spin-reverse" />
                <div className="absolute inset-8 bg-gradient-to-br from-white/10 to-white/5 rounded-full backdrop-blur-md" />

                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute top-0 left-1/2 w-3 h-3 bg-orange-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-orange-400/50" />
                  <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-blue-300 rounded-full transform -translate-x-1/2 translate-y-1/2 shadow-lg shadow-blue-300/50" />
                  <div className="absolute top-1/2 right-0 w-3 h-3 bg-cyan-300 rounded-full transform translate-x-1/2 -translate-y-1/2 shadow-lg shadow-cyan-300/50" />
                </motion.div>

                <motion.div
                  className="absolute top-10 right-10 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full text-xs font-medium"
                  animate={{ y: [0, -5, 0], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  Exodus Logistics
                </motion.div>

                <motion.div
                  className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-full text-xs font-medium"
                  animate={{ y: [0, 5, 0], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  Real-time Tracking
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Quick Actions */}
      <QuickActions
        onTrackClick={() => (window.location.href = "/track")}
        onInvoiceClick={() => (window.location.href = "/invoice")}
        onQuoteClick={() => (window.location.href = "/quote")}
      />

      {/* ================= Why Choose Exodus Logistics ================= */}
      <section className="py-20 bg-gray-50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 drop-shadow-md">
              Why Choose <span className="text-cyan-500">Exodus Logistics</span>?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We combine cutting-edge technology with decades of logistics expertise to ensure your shipments arrive safely,
              on-time, and within budget.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="relative w-full h-64 cursor-pointer"
                style={{ perspective: "1000px" }}
                onClick={() =>
                  setFlippedCards(() => ({
                    [feature.title]: !flippedCards[feature.title],
                  }))
                }
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <motion.div
                  animate={{ rotateY: flippedCards[feature.title] ? 180 : 0 }}
                  transition={{ duration: 0.8 }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="relative w-full h-full"
                >
                  {/* Front */}
                  <div
                    className="absolute w-full h-full backface-hidden
                               bg-gradient-to-br from-blue-600 to-cyan-500
                               hover:from-orange-400 hover:to-orange-600
                               p-6 rounded-xl shadow-lg hover:shadow-2xl
                               transition-all duration-500 ease-in-out
                               flex flex-col items-center justify-center text-white"
                  >
                    <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-500">
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-white/90 text-center">{feature.description}</p>
                  </div>

                  {/* Back */}
                  <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-cyan-500 text-white p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-center">{backText[feature.title]}</p>
                    <p className="mt-2 text-sm opacity-80 italic">Click again to flip back</p>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= Ready to Ship With Confidence ================= */}
      <section className="relative py-24 bg-gradient-to-tr from-blue-900 via-blue-700 to-cyan-500 overflow-hidden text-white">
        <motion.div
          className="absolute top-0 left-10 w-64 h-64 bg-white/10 rounded-full filter blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-10 w-72 h-72 bg-white/15 rounded-full filter blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">
              Ready to Ship{" "}
              <span className={`${words[wordIndex]?.color} transition-all duration-500`}>
                {displayedText}
                <span className="border-r-2 border-white ml-1 animate-pulse"></span>
              </span>
            </h2>

            <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-4 drop-shadow-sm">
              Ship with low cost solutions designed to protect your business and your customers. At Exodus Logistics, we
              prioritize safety, reliability, and complete transparency in every delivery.
            </p>

            <p className="text-lg max-w-2xl mx-auto mb-6 drop-shadow-sm">
              Gain confidence knowing your cargo is handled by experienced professionals, fully insured, carefully tracked,
              and delivered on time with precision and care.
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => (window.location.href = "/quote")}
              className="bg-white text-blue-600 px-10 py-5 rounded-full font-semibold shadow-lg hover:shadow-2xl hover:bg-orange-500 hover:text-white transition-all duration-500 ease-in-out cursor-pointer"
            >
              Start Your First Shipment
            </motion.button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}