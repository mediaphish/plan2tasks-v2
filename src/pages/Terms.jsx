import React from "react";

export function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-16">
      <div className="max-w-5xl mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm p-12 space-y-6">
        <h1 className="text-4xl font-bold text-stone-900">Terms of Service</h1>
        <p className="text-lg text-stone-600 leading-relaxed">
          These terms govern your use of Plan2Tasks. By accessing the platform you agree to these
          conditions. If you are acting on behalf of a company, you represent that you have authority
          to bind that company to these terms.
        </p>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">Use of the service</h2>
          <p className="text-base text-stone-600">
            You agree to use Plan2Tasks in compliance with applicable laws. You are responsible for
            maintaining the confidentiality of your account and any data you load into the platform.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">Limitation of liability</h2>
          <p className="text-base text-stone-600">
            Plan2Tasks is provided “as is” without warranties of any kind. To the maximum extent
            permitted by law, our liability is limited to the fees paid for the current subscription
            term.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">Contact</h2>
          <p className="text-base text-stone-600">
            Questions about these terms? Email{" "}
            <a href="mailto:legal@plan2tasks.com" className="text-stone-900 font-medium hover:underline">
              legal@plan2tasks.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

