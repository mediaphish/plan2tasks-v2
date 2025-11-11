import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, MessageSquare } from "lucide-react";

const ROTATION_INTERVAL = 5000;
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
    const runTransition = () => {
      setIsTransitioning(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setActiveIndex((prev) => getNextIndex(prev, SCREENSHOTS));

        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, TEXT_FADE_DURATION);
      }, TEXT_FADE_DURATION);
    };

    intervalRef.current = setInterval(runTransition, ROTATION_INTERVAL);

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
    <section
      className="relative bg-white rounded-3xl shadow-lg overflow-hidden h-[495px] px-6 py-16 flex flex-col items-center justify-center text-center lg:grid lg:grid-cols-5 lg:h-[510px] lg:p-0 lg:text-left"
    >
      <div
        className="flex flex-col items-center justify-center h-full w-full lg:col-span-2 lg:items-start lg:px-12 lg:text-left lg:z-30 space-y-4 lg:space-y-6"
        style={textOpacityStyle}
      >
        <div
          className={`w-20 h-20 aspect-square lg:w-32 lg:h-32 lg:aspect-square rounded-full flex items-center justify-center flex-shrink-0 ${
            SCREENSHOTS[activeIndex].iconBg
          }`}
          style={{ borderRadius: "9999px" }}
        >
          {(() => {
            const Icon = SCREENSHOTS[activeIndex].icon;
            return (
              <Icon
                className={`w-9 h-9 lg:w-12 lg:h-12 ${SCREENSHOTS[activeIndex].iconColor}`}
              />
            );
          })()}
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold text-stone-900 text-balance">
          {SCREENSHOTS[activeIndex].title}
        </h2>
        <p className="text-base lg:text-lg text-stone-600 leading-relaxed text-pretty max-w-xl">
          {SCREENSHOTS[activeIndex].description}
        </p>
        <div className="lg:hidden">
          <a
            href="/signup"
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-base"
          >
            Get Started Free
          </a>
        </div>
        <div className="hidden lg:flex gap-4">
          <a
            href="/signup"
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Get a Free Trial
          </a>
          <a
            href="/signup"
            className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>

      <div className="hidden lg:block lg:col-span-3" />

      <div className="hidden lg:block absolute inset-0 pointer-events-none">
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

      <div className="hidden lg:flex absolute bottom-6 left-1/2 -translate-x-1/2 gap-2">
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
    </section>
  );
}

