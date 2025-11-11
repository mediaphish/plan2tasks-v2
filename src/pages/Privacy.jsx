import React from "react";

export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-16">
      <div className="max-w-5xl mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm p-12 space-y-6">
        <h1 className="text-4xl font-bold text-stone-900">Privacy Policy</h1>
        <p className="text-lg text-stone-600 leading-relaxed">
          We respect your privacy and are committed to protecting your personal information. This
          policy explains what data we collect, how we use it, and the choices you have. By using
          Plan2Tasks you consent to the practices described here.
        </p>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">Information we collect</h2>
          <p className="text-base text-stone-600">
            We collect information that you provide directly (such as planner profiles, client
            details, and plans) and usage data needed to operate the product. We do not sell your
            data.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">How we use your data</h2>
          <p className="text-base text-stone-600">
            Data is used to deliver the service, improve Plan2Tasks, and communicate with you about
            important updates. Task content is only shared with connected accounts that you authorize.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">Contact</h2>
          <p className="text-base text-stone-600">
            Have questions? Email{" "}
            <a href="mailto:privacy@plan2tasks.com" className="text-stone-900 font-medium hover:underline">
              privacy@plan2tasks.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

