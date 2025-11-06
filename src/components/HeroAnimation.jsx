import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, MessageSquare } from "lucide-react";

const ROTATION_INTERVAL = 7000;
const TEXT_FADE_DURATION = 200;
const TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

const SCREENSHOTS = [
  {
    id: "dashboard",
    src: "/images/p2t-dashboard-mockup.png",
    alt: "Dashboard Analytics",
    title: "Real-Time Dashboard Analytics",
    description:
      "Monitor task completions, user engagement, and activity across all your users in one unified view.",
    primaryCtaLabel: "Get Started",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    icon: BarChart3,
  },
  {
    id: "plan",
    src: "/images/p2t-plan-mockup.png",
    alt: "AI Plan Creation",
    title: "AI-Powered Plan Creation",
    description:
      "Create comprehensive plans through conversation with our AI assistant. Choose from multiple planning approaches.",
    primaryCtaLabel: "Start Your Free Trial",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    icon: MessageSquare,
  },
];

function getNextIndex(current, items) {
  return (current + 1) % items.length;
}

export function HeroAnimation() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setActiveIndex((prev) => getNextIndex(prev, SCREENSHOTS));
        setIsTransitioning(false);
      }, TEXT_FADE_DURATION);
    }, ROTATION_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const textOpacityStyle = useMemo(
    () => ({
      transition: "opacity 400ms ease-in-out",
      opacity: isTransitioning ? 0.3 : 1,
    }),
    [isTransitioning]
  );

  return (
    <div
      className="relative bg-white rounded-3xl shadow-lg overflow-hidden"
      style={{ height: "510px" }}
    >
      <div className="grid grid-cols-5 h-full">
        {/* Left Column */}
        <div className="col-span-2 flex flex-col items-center justify-center px-12 text-center">
          <div style={textOpacityStyle}>
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                SCREENSHOTS[activeIndex].iconBg
              } mx-auto`}
            >
              {(() => {
                const Icon = SCREENSHOTS[activeIndex].icon;
                return <Icon className={`w-8 h-8 ${SCREENSHOTS[activeIndex].iconColor}`} />;
              })()}
            </div>
            <h2 className="text-4xl font-bold text-stone-900 mb-4 text-balance">
              {SCREENSHOTS[activeIndex].title}
            </h2>
            <p className="text-lg text-stone-600 mb-8 text-pretty">
              {SCREENSHOTS[activeIndex].description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/signup"
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                {SCREENSHOTS[activeIndex].primaryCtaLabel}
              </a>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-3 relative overflow-hidden">
          {SCREENSHOTS.map((shot, index) => {
            const isActive = index === activeIndex;
            const left = isActive ? "45%" : "65%";
            const scale = isActive ? 1.1 : 0.9;
            const rotate = isActive ? 5 : -5;
            const zIndex = isActive ? 20 : 10;

            return (
              <div
                key={shot.id}
                className="absolute"
                style={{
                  top: "50%",
                  left,
                  transform: `translate(-50%, -50%) translateY(-20px) scale(${scale}) rotateY(${rotate}deg)`,
                  transformOrigin: "center",
                  zIndex,
                  maxWidth: "380px",
                  maxHeight: "420px",
                  transition: `all 800ms ${TRANSITION_EASING}`,
                }}
              >
                <img
                  src={shot.src}
                  alt={shot.alt}
                  className="w-full h-auto"
                  loading={isActive ? "eager" : "lazy"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicator Dots */}
      <div
        className="absolute flex gap-2"
        style={{
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {SCREENSHOTS.map((_, index) => (
          <div
            key={index}
            className={
              index === activeIndex
                ? "w-2 h-2 rounded-full bg-stone-900"
                : "w-2 h-2 rounded-full border-2 border-stone-300 bg-transparent"
            }
          />
        ))}
      </div>
    </div>
  );
}

