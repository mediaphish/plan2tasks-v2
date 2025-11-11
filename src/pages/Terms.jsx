import React from "react";

const LAST_UPDATED = "November 11, 2025";
const COMPANY_NAME = "Archetype Original, LLC (d/b/a Plan2Tasks)";
const ADDRESS = "2104 Pearl St, Carthage, MO 64836";
const CONTACT_EMAIL = "bart@archetypeoriginal.com";
const GOVERNING_STATE = "Missouri";
const GOVERNING_COUNTY = "Jasper County";

export function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-16">
      <div className="max-w-5xl mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm p-12 space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-4xl font-bold text-stone-900">Terms of Service</h1>
          <p className="text-sm uppercase tracking-wide text-stone-500">
            Last updated: {LAST_UPDATED}
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">1. Agreement to Terms</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            These Terms of Service (“Terms”) constitute a legally binding agreement made between you
            (“you”, “your”) and {COMPANY_NAME} (“we”, “us”, “our”) regarding your access to and use of
            the Plan2Tasks website, mobile application and software service (the “Service”). By
            accessing or using the Service, you agree to be bound by these Terms. If you do not agree to
            all of the Terms, you must not access the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">2. Changes to Terms</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            We may revise and update these Terms from time to time in our sole discretion. We will notify
            you of changes by posting the updated Terms on the Service and updating the “Last updated”
            date. Your continued use of the Service following the posting of changes constitutes your
            acceptance of such changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">3. Accounts, Registration &amp; Security</h2>
          <ul className="list-disc list-inside text-base text-stone-600 leading-relaxed space-y-1">
            <li>To access certain features you may be required to create an account.</li>
            <li>You are responsible for providing accurate information and keeping your credentials secure.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>Notify us immediately if you suspect unauthorized use of your account.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">4. Subscription, Fees &amp; Payment</h2>
          <ul className="list-disc list-inside text-base text-stone-600 leading-relaxed space-y-1">
            <li>Some features may require a subscription or payment of fees.</li>
            <li>You agree to pay all applicable fees and taxes in a timely manner.</li>
            <li>We may suspend or terminate your subscription if payment is not received.</li>
            <li>All fees are non-refundable unless explicitly stated otherwise.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">5. License to Use the Service</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable
            license to access and use the Service for your internal business or personal use. You may not
            sublicense, resell, assign or otherwise transfer your rights without our prior written consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">6. User Conduct</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            You agree you will not:
          </p>
          <ul className="list-disc list-inside text-base text-stone-600 leading-relaxed space-y-1">
            <li>Use the Service in violation of any applicable law or regulation.</li>
            <li>Reverse engineer, decompile or attempt to derive the source code of the Service.</li>
            <li>Use the Service to store or transmit unlawful, infringing, defamatory or harmful content.</li>
            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            <li>Use the Service to generate or facilitate spam, malware or any other harmful use.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">7. Intellectual Property</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            All rights, title and interest in and to the Service (including software, design, text,
            graphics, logos, interfaces) are owned by us or our licensors. If you provide feedback or
            suggestions, you grant us a non-exclusive, royalty-free, worldwide license to use such feedback
            without obligation to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">8. Termination</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            We may suspend or terminate your access to the Service at any time for any reason, including
            your breach of these Terms. Upon termination, your rights to use the Service will immediately
            cease. Sections that by their nature should survive termination will survive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">9. Disclaimers</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            The Service is provided “as is” and “as available” without warranties of any kind, express or
            implied. We do not guarantee that the Service will be uninterrupted, error-free or secure. Your
            use of the Service is at your own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">10. Limitation of Liability</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            To the maximum extent permitted by law, neither we nor our affiliates, officers, agents or
            employees will be liable for indirect, incidental, special, consequential or punitive damages.
            Our aggregate liability for all claims arising under these Terms will not exceed the amount you
            paid to us in the twelve (12) months preceding the claim (or $100 if you have not paid fees).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">11. Indemnification</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            You agree to defend, indemnify and hold harmless Plan2Tasks and its affiliates, officers,
            directors, employees and agents from and against any claims, liabilities, damages, losses and
            expenses (including reasonable attorneys’ fees) arising out of or in connection with your use of
            the Service or your violation of these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">12. Governing Law &amp; Dispute Resolution</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            These Terms and any dispute arising out of or relating to them will be governed by the laws of
            the State of {GOVERNING_STATE}, United States, without regard to conflict-of-law principles.
            You and we agree to submit to the personal and exclusive jurisdiction of the courts located in{" "}
            {GOVERNING_COUNTY}, {GOVERNING_STATE} for resolution of any dispute.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">13. Miscellaneous</h2>
          <ul className="list-disc list-inside text-base text-stone-600 leading-relaxed space-y-1">
            <li>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions remain in effect.</li>
            <li>These Terms constitute the entire agreement between you and us relating to the Service.</li>
            <li>You may not assign your rights under these Terms without our prior written consent; we may assign without restriction.</li>
            <li>No waiver of any term will be effective unless in writing.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">14. Contact Information</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            If you have questions about these Terms, please contact us at:
          </p>
          <p className="text-base text-stone-600 leading-relaxed">
            {COMPANY_NAME}
            <br />
            {ADDRESS}
            <br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-stone-900 hover:underline">{CONTACT_EMAIL}</a>
          </p>
        </section>
      </div>
    </main>
  );
}