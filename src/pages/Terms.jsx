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
            These Terms of Service ("Terms") constitute a legally binding agreement made between you
            ("you", "your") and {COMPANY_NAME} ("we", "us", "our") regarding your access to and use of
            the Plan2Tasks website, mobile application and software service (the "Service"). By
            accessing or using the Service, you agree to be bound by these Terms. If you do not agree to
            all of the Terms, you must not access the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">2. Changes to Terms</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            We may revise and update these Terms from time to time in our sole discretion. We will notify
            you of changes by posting the updated Terms on the Service and updating the "Last updated"
            date. Your continued use of the Service following the posting of changes constitutes your
            acceptance of such changes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">3. Eligibility</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            You must be at least 18 years old to use the Service. By using the Service, you represent and
            warrant that you are of legal age and have the legal capacity to enter into these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">4. Account Registration & Security</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            To access certain features of the Service, you may be required to register for an account.
            You agree to provide accurate, current and complete information as prompted and to update this
            information to keep it accurate, current and complete. You are responsible for safeguarding any
            credentials associated with your account and for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">5. Subscription Plans & Payment</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            We offer subscription plans with recurring fees. By purchasing a subscription, you authorize us
            (and our payment processor) to charge you the subscription fee at the interval indicated in your
            plan. If a free trial applies, your payment method will be charged at the end of the trial
            unless you cancel before the trial expires. You can cancel your subscription at any time; the
            cancellation will take effect at the end of the current billing cycle unless otherwise stated.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">6. Acceptable Use</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            You agree not to use the Service for any unlawful purpose or in any manner that could damage,
            disable, overburden or impair the Service. You agree not to interfere with any other party's use
            of the Service. You also agree not to reverse engineer or attempt to gain unauthorized access to
            any portion of the Service, or harvest or collect information about other users without their
            consent.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">7. User Content</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            You retain ownership of any content, data or materials you submit or upload to the Service ("User
            Content"). By submitting User Content, you grant us a worldwide, non-exclusive, royalty-free
            license to use, reproduce, modify and display such content solely for the purpose of operating
            and improving the Service. You represent and warrant that you have the necessary rights to
            provide the User Content and that it does not violate any third-party rights.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">8. Intellectual Property</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            The Service, including all software, text, graphics, logos, and other content provided by us,
            are our proprietary property or the property of our licensors and are protected by intellectual
            property laws. Except as expressly permitted by these Terms, you may not copy, modify, distribute,
            sell, or lease any part of our Service or included software, nor may you reverse engineer or
            attempt to extract the source code.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">9. Third-Party Services & Links</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            The Service may include links to third-party websites or services that are not owned or
            controlled by us. We are not responsible for the content or practices of any third-party websites
            or services. You acknowledge and agree that we shall not be responsible or liable for any damage or
            loss caused by your use of any third-party services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">10. Disclaimers</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
            FOR A PARTICULAR PURPOSE, TITLE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED OR ERROR-FREE, NOR DO WE MAKE ANY WARRANTY AS TO THE RESULTS THAT MAY BE OBTAINED
            FROM USE OF THE SERVICE.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">11. Limitation of Liability</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT WILL WE OR OUR AFFILIATES BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
            REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
            INTANGIBLE LOSSES, RESULTING FROM (A) YOUR USE OR INABILITY TO USE THE SERVICE; (B) ANY UNAUTHORIZED
            ACCESS TO OR USE OF OUR SERVERS OR ANY PERSONAL INFORMATION STORED THEREIN; OR (C) ANY OTHER MATTERS
            RELATING TO THE SERVICE.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-stone-900">12. Governing Law &amp; Dispute Resolution</h2>
          <p className="text-base text-stone-600 leading-relaxed">
            These Terms and any dispute arising out of or relating to them will be governed by the laws of the
            State of {GOVERNING_STATE}, United States, without regard to conflict-of-law principles. You and we
            agree to submit to the personal and exclusive jurisdiction of the courts located in {GOVERNING_COUNTY},
            {GOVERNING_STATE} for resolution of any dispute.
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