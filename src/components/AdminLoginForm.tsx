"use client";

import { useActionState } from "react";

import { loginAdmin } from "@/app/admin/actions";

type AdminLoginFormProps = {
  isConfigured: boolean;
};

const initialState = {
  error: ""
};

export function AdminLoginForm({ isConfigured }: AdminLoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState);

  return (
    <section className="loginPanel" aria-labelledby="admin-login-title">
      <div className="panelHeader">
        <p className="eyebrow">Admin access</p>
        <h1 id="admin-login-title">Enter password</h1>
      </div>

      {!isConfigured ? (
        <p className="statusMessage errorMessage">
          Set ADMIN_PASSWORD in .env.local and restart the dev server.
        </p>
      ) : null}

      <form className="loginForm" action={formAction}>
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          disabled={!isConfigured || isPending}
          required
        />
        <button
          className="button primaryButton"
          type="submit"
          disabled={!isConfigured || isPending}
        >
          {isPending ? "Checking" : "Sign in"}
        </button>
      </form>

      {state.error ? (
        <p className="statusMessage errorMessage" role="alert">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
