"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"signIn" | "signUp" | "reset">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const router = useRouter();

  // Check if username is already taken using the RPC function
  async function checkUsernameUnique(
    usernameToCheck: string,
  ): Promise<boolean> {
    if (usernameToCheck.length < 3) {
      setUsernameAvailable(null);
      return false;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    try {
      const { data, error } = await supabase.rpc("check_username_available", {
        username_to_check: usernameToCheck,
      });

      if (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
        return false;
      }

      const available = data;
      setUsernameAvailable(available);
      console.log(`Username "${usernameToCheck}" available:`, available);
      return available;
    } catch (err) {
      console.error("Failed to check username:", err);
      setUsernameAvailable(null);
      return false;
    } finally {
      setCheckingUsername(false);
    }
  }

  // Check if email is already registered
  async function checkEmailExists(emailToCheck: string): Promise<boolean> {
    if (!emailToCheck || !emailToCheck.includes("@")) {
      setEmailExists(null);
      return false;
    }

    setCheckingEmail(true);
    setEmailExists(null);

    try {
      const { data, error } = await supabase.rpc("check_email_exists", {
        email_to_check: emailToCheck,
      });

      if (error) {
        console.error("Error checking email:", error);
        setEmailExists(null);
        return false;
      }

      const exists = data;
      setEmailExists(exists);
      console.log(`Email "${emailToCheck}" exists:`, exists);
      return exists;
    } catch (err) {
      console.error("Failed to check email:", err);
      setEmailExists(null);
      return false;
    } finally {
      setCheckingEmail(false);
    }
  }

  // Check email on change (debounced)
  let emailTimeoutId: NodeJS.Timeout;

  async function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEmail(value);

    // Clear previous email-related errors
    if (error?.includes("email") || error?.includes("registered")) {
      setError(null);
    }

    // Check email if it looks valid
    if (value.length > 0 && value.includes("@") && value.includes(".")) {
      if (emailTimeoutId) clearTimeout(emailTimeoutId);

      emailTimeoutId = setTimeout(async () => {
        await checkEmailExists(value.trim());
      }, 500);
    } else {
      setEmailExists(null);
    }
  }

  // Check username on change (debounced)
  let usernameTimeoutId: NodeJS.Timeout;

  async function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setUsername(value);

    // Clear previous username-related errors
    if (error?.includes("Username")) {
      setError(null);
    }

    if (value.length >= 3) {
      if (usernameTimeoutId) clearTimeout(usernameTimeoutId);

      usernameTimeoutId = setTimeout(async () => {
        await checkUsernameUnique(value.trim());
      }, 500);
    } else {
      setUsernameAvailable(null);
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Password reset email sent! Check your inbox.");
      }
      return;
    }

    if (mode === "signUp") {
      // Check if email is already registered
      const emailAlreadyExists = await checkEmailExists(email.trim());
      if (emailAlreadyExists) {
        setError("This email is already registered. Please sign in instead.");
        return;
      }

      if (username.trim().length < 3) {
        setError("Username must be at least 3 characters.");
        return;
      }

      // Check if username is unique
      const isAvailable = await checkUsernameUnique(username.trim());
      if (!isAvailable) {
        setError("Username is already taken. Please choose another one.");
        return;
      }
    }

    const { data, error } =
      mode === "signIn"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: username.trim(),
                email: email,
              },
            },
          });

    if (error) {
      // Handle specific error messages
      if (error.message.includes("User already registered")) {
        setError("This email is already registered. Please sign in instead.");
      } else if (error.message.includes("Invalid email")) {
        setError("Please enter a valid email address.");
      } else if (error.message.includes("Password should be at least")) {
        setError("Password must be at least 6 characters.");
      } else if (error.message.toLowerCase().includes("username")) {
        setError("Username is already taken. Please choose another one.");
      } else if (error.message.includes("500")) {
        setError(
          "The server is temporarily unavailable. Please try again in a few moments.",
        );
      } else {
        setError(error.message);
      }
      return;
    }

    if (mode === "signUp") {
      if (!data.session) {
        setMessage(
          "Account created — check your email to confirm it before signing in.",
        );
        // Clear form after successful signup
        setEmail("");
        setPassword("");
        setUsername("");
        setEmailExists(null);
        setUsernameAvailable(null);
        return;
      }

      router.push("/");
      return;
    }

    router.push("/");
  }

  function toggleMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn");
    setUsername("");
    setError(null);
    setMessage(null);
    setUsernameAvailable(null);
    setEmailExists(null);
  }

  function showReset() {
    setMode("reset");
    setError(null);
    setMessage(null);
  }

  function backToSignIn() {
    setMode("signIn");
    setError(null);
    setMessage(null);
  }

  // Check if username is valid
  const isUsernameValid = username.length >= 3 && usernameAvailable === true;
  const isUsernameInvalid = username.length >= 3 && usernameAvailable === false;
  const isUsernameTooShort = username.length > 0 && username.length < 3;
  const isChecking = checkingUsername;

  // Check if email is valid
  const isEmailValid =
    email.length > 0 && email.includes("@") && email.includes(".");
  const isEmailRegistered = emailExists === true;
  const isEmailAvailable = emailExists === false;
  const isCheckingEmail = checkingEmail;

  // Button should be disabled if:
  // 1. Email is invalid or already registered
  // 2. Username is less than 3 characters
  // 3. Still checking username availability
  // 4. Username is not available (taken or null)
  const isSubmitDisabled =
    mode === "signUp" &&
    (!isEmailValid ||
      isEmailRegistered ||
      username.length < 3 ||
      checkingUsername ||
      usernameAvailable !== true);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-instrument border border-haze-50 bg-panelRaised p-6">
        <h1 className="font-display text-xl text-ink">
          {mode === "signIn"
            ? "Sign in"
            : mode === "signUp"
              ? "Create account"
              : "Reset password"}
        </h1>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="instrument-label">Email</span>
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              className={`mt-1 w-full rounded-instrument border px-3 py-2 text-ink ${
                mode === "signUp" &&
                email.length > 0 &&
                isEmailValid &&
                isEmailRegistered
                  ? "border-red-500 bg-red-50/10"
                  : mode === "signUp" &&
                      email.length > 0 &&
                      isEmailValid &&
                      isEmailAvailable
                    ? "border-green-500 bg-green-50/10"
                    : "border-haze-50 bg-panel"
              }`}
              required
            />
            {mode === "signUp" && email.length > 0 && isEmailValid && (
              <div className="mt-1 text-xs">
                {isCheckingEmail && (
                  <span className="text-haze-400">Checking email...</span>
                )}
                {!isCheckingEmail && isEmailRegistered && (
                  <span className="text-red-600">
                    ✗ This email is already registered
                  </span>
                )}
                {!isCheckingEmail && isEmailAvailable && (
                  <span className="text-green-600">✓ Email available</span>
                )}
              </div>
            )}
            {mode === "signUp" && email.length > 0 && !isEmailValid && (
              <div className="mt-1 text-xs">
                <span className="text-haze-400">
                  Please enter a valid email address
                </span>
              </div>
            )}
          </label>

          {mode === "signUp" && (
            <label className="block">
              <span className="instrument-label">Username</span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                minLength={3}
                className={`mt-1 w-full rounded-instrument border px-3 py-2 text-ink ${
                  isUsernameValid
                    ? "border-green-500 bg-green-50/10"
                    : isUsernameInvalid
                      ? "border-red-500 bg-red-50/10"
                      : "border-haze-50 bg-panel"
                }`}
                required
              />
              {mode === "signUp" && username.length > 0 && (
                <div className="mt-1 text-xs">
                  {isChecking && (
                    <span className="text-haze-400">
                      Checking availability...
                    </span>
                  )}
                  {!isChecking && isUsernameValid && (
                    <span className="text-green-600">✓ Username available</span>
                  )}
                  {!isChecking && isUsernameInvalid && (
                    <span className="text-red-600">
                      ✗ Username is already taken
                    </span>
                  )}
                  {!isChecking && isUsernameTooShort && (
                    <span className="text-haze-400">
                      Username must be at least 3 characters ({username.length}
                      /3)
                    </span>
                  )}
                </div>
              )}
            </label>
          )}

          {mode !== "reset" && (
            <label className="block">
              <span className="instrument-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-instrument border border-haze-50 bg-panel px-3 py-2 text-ink"
                required
                minLength={6}
              />
              {mode === "signUp" &&
                password.length > 0 &&
                password.length < 6 && (
                  <p className="mt-1 text-xs text-haze-400">
                    Password must be at least 6 characters
                  </p>
                )}
            </label>
          )}

          {error && <p className="text-sm text-alert">{error}</p>}
          {message && <p className="text-sm text-clear">{message}</p>}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`mt-2 w-full rounded-instrument py-2.5 font-display text-white ${
              isSubmitDisabled
                ? "bg-haze-200 cursor-not-allowed opacity-50"
                : "bg-brand hover:opacity-90"
            }`}
          >
            {mode === "signIn"
              ? "Sign in"
              : mode === "signUp"
                ? "Create account"
                : "Send reset email"}
          </button>
        </form>

        {mode === "reset" ? (
          <button
            onClick={backToSignIn}
            className="mt-3 w-full text-center text-sm text-haze-200 underline underline-offset-4"
          >
            Back to sign in
          </button>
        ) : (
          <>
            <button
              onClick={toggleMode}
              className="mt-3 w-full text-center text-sm text-haze-200 underline underline-offset-4"
            >
              {mode === "signIn"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
            {mode === "signIn" && (
              <button
                onClick={showReset}
                className="mt-1 w-full text-center text-sm text-haze-200 underline underline-offset-4"
              >
                Forgot password?
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
