import React from "react";

export function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-16">
      <div className="max-w-5xl mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm p-12">
        <h1 className="text-4xl font-bold text-stone-900 mb-6">About Plan2Tasks</h1>
        <p className="text-lg text-stone-600 leading-relaxed mb-6">
          Plan2Tasks helps coaches, consultants, and planners deliver actionable task plans directly
          into their clients’ daily workflow. We combine AI-assisted planning, Google Tasks
          integration, and real-time completion tracking so you always know what’s happening after
          you hand off a plan.
        </p>
        <p className="text-lg text-stone-600 leading-relaxed mb-6">
          Our mission is simple: remove the guesswork from client follow-through. Whether you run a
          coaching practice or manage a team, Plan2Tasks keeps everyone aligned on the work that
          matters.
        </p>
        <p className="text-lg text-stone-600 leading-relaxed">
          Have questions or want to share feedback? Reach out to{" "}
          <a href="mailto:support@plan2tasks.com" className="text-stone-900 font-medium hover:underline">
            support@plan2tasks.com
          </a>{" "}
          — we’re always listening.
        </p>
      </div>
    </main>
  );
}

