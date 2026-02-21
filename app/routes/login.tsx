import { Form, Link, useActionData, useNavigation } from "react-router";
import { login, createUserSession, getUserId } from "../lib/auth.server.js";
import type { Route } from "./+types/login";

// ─── Loader ──────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUserId(request);
  if (userId) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }
  return {};
}

// ─── Action ──────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));

  const errors: { email?: string; password?: string; form?: string } = {};

  if (!email || !email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }
  if (!password) {
    errors.password = "Please enter your password.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const user = await login(email, password);
  if (!user) {
    return { errors: { form: "Invalid email or password." } };
  }

  return createUserSession(user.id, "/");
}

// ─── Component ───────────────────────────────────────────

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="mt-2 text-gray-400">
            Log in to continue your conversations.
          </p>
        </div>

        <Form method="post" className="space-y-6">
          {actionData?.errors?.form && (
            <p className="rounded-md bg-red-900/50 px-3 py-2 text-sm text-red-300">
              {actionData.errors.form}
            </p>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="you@example.com"
            />
            {actionData?.errors?.email && (
              <p className="mt-1 text-sm text-red-400">{actionData.errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Your password"
            />
            {actionData?.errors?.password && (
              <p className="mt-1 text-sm text-red-400">{actionData.errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </Form>

        <p className="text-center text-sm text-gray-400">
          Don't have an account?{" "}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
