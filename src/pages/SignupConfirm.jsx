import React, { useEffect, useState } from "react";

export function SignupConfirmPage() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setStatus("error");
      setMessage("Missing checkout session. Please return to the signup flow and try again.");
      return;
    }

    const verify = async () => {
      try {
        const response = await fetch("/api/signup/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Unable to finalize signup.");
        }

        setStatus("success");
        setMessage("Signup complete! Check your email for the magic link to finish logging in.");
      } catch (err) {
        console.error("[SIGNUP_CONFIRM] verify error:", err);
        setStatus("error");
        setMessage(err.message || "We could not confirm your signup. Please contact support.");
      }
    };

    verify();
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F3F0] px-6 py-16 flex items-center justify-center">
      <div className="max-w-xl mx-auto bg-white border border-stone-200 rounded-2xl p-10 shadow-sm text-center">
        {status === "loading" && (
          <>
            <h1 className="text-3xl font-bold text-stone-900 mb-4">Finishing up…</h1>
            <p className="text-base text-stone-600">
              We’re finalizing your account. This only takes a moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-3xl font-bold text-stone-900 mb-4">You’re all set!</h1>
            <p className="text-base text-stone-600 mb-6">{message}</p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-stone-900 text-white rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Go to Dashboard
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-3xl font-bold text-stone-900 mb-4">We hit a snag</h1>
            <p className="text-base text-stone-600 mb-6">{message}</p>
            <a
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
            >
              Return to Signup
            </a>
          </>
        )}
      </div>
    </main>
  );
}

