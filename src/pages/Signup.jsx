import React, { useMemo, useState } from "react";

const PLANS = [
  {
    id: "starter",
    label: "Starter",
    description: "Up to 10 users",
    monthlyPrice: "$9.99",
    annualPrice: "$99.99",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Up to 50 users",
    monthlyPrice: "$24.99",
    annualPrice: "$249.99",
  },
  {
    id: "business",
    label: "Business",
    description: "Up to 100 users",
    monthlyPrice: "$49.99",
    annualPrice: "$499.99",
  },
];

export function SignupPage({ signupEnabled }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [planId, setPlanId] = useState("professional");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [couponCode, setCouponCode] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPlan = useMemo(
    () => PLANS.find((plan) => plan.id === planId) || PLANS[1],
    [planId]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!signupEnabled) {
      setError("Signups are not currently open.");
      return;
    }
    if (!agree) {
      setError("You must agree to the Terms and Privacy Policy.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/signup/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          company,
          email,
          phone,
          plan: planId,
          billingCycle,
          couponCode,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Unable to start signup session");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error("[SIGNUP] Submit error:", err);
      setError(err.message || "An unexpected error occurred");
      setSubmitting(false);
    }
  };

  if (!signupEnabled) {
    return (
      <main className="min-h-screen bg-[#F5F3F0] px-6 py-16">
        <div className="max-w-3xl mx-auto text-center bg-white border border-stone-200 rounded-2xl p-10 shadow-sm">
          <h1 className="text-4xl font-bold text-stone-900 mb-4">Signups Coming Soon</h1>
          <p className="text-lg text-stone-600 mb-6">
            We're putting the finishing touches on the new signup experience. Join the waitlist on the home page and we'll notify you the moment access opens.
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-12">
      <div className="max-w-5xl mx-auto bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="px-8 py-10 bg-stone-50 border-r border-stone-200">
            <h1 className="text-4xl font-bold text-stone-900 mb-4">Start your 14-day free trial</h1>
            <p className="text-base text-stone-600 mb-6">
              Plans include full access to AI planning, Google Tasks delivery, and detailed analytics. Cancel anytime within 14 days with no charge.
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-stone-700 mb-2">Select plan</div>
                <div className="space-y-3">
                  {PLANS.map((plan) => (
                    <label
                      key={plan.id}
                      className={`block rounded-xl border ${
                        plan.id === planId ? "border-stone-800 bg-white shadow-sm" : "border-stone-200"
                      } px-4 py-3 cursor-pointer transition-colors`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={planId === plan.id}
                        onChange={() => setPlanId(plan.id)}
                        className="hidden"
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-stone-900">{plan.label}</div>
                          <div className="text-sm text-stone-600">{plan.description}</div>
                        </div>
                        <div className="text-sm text-stone-600 text-right">
                          <div>{plan.monthlyPrice}/mo</div>
                          <div className="text-xs text-stone-500">{plan.annualPrice}/yr</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-stone-700 mb-2">Billing cadence</div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium ${
                      billingCycle === "monthly"
                        ? "border-stone-800 text-stone-900 shadow-sm"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium ${
                      billingCycle === "annual"
                        ? "border-stone-800 text-stone-900 shadow-sm"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                14-day free trial · Card charged on day 14 unless cancelled
              </div>
            </div>
          </div>

          <div className="px-8 py-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                    placeholder="Jane"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Company or team</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                  placeholder="Acme Coaching"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Promotion code</label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                  placeholder="Optional"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-stone-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-1 w-4 h-4 border border-stone-300 rounded focus:ring-2 focus:ring-stone-800/10 focus:border-stone-800"
                  required
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms" className="text-stone-900 font-medium hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-stone-900 font-medium hover:underline">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              {error && (
                <div className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-[oklch(62.7%_0.194_149.214)] text-white rounded-lg font-semibold text-lg hover:bg-[oklch(52.7%_0.154_150.069)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Starting secure checkout…" : "Continue to secure checkout"}
              </button>

              <p className="text-sm text-stone-500 text-center">
                Already have an account?{" "}
                <a href="/" className="text-stone-900 font-medium hover:underline">
                  Sign in
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

