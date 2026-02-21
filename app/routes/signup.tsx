import { Form, Link, useActionData, useNavigation } from "react-router";
import { signup, createUserSession, getUserId } from "../lib/auth.server.js";
import { prisma } from "../lib/db.server.js";
import type { Route } from "./+types/signup";

// ─── Loader ──────────────────────────────────────────────
// If user is already logged in, redirect them away.

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
// Runs on the server when the form is submitted.

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email")).trim();
  const password = String(formData.get("password"));

  // Validate inputs
  const errors: { email?: string; password?: string } = {};

  if (!email || !email.includes("@")) {
    errors.email = "Please enter a valid email address.";
  }
  if (!password || password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { errors: { email: "An account with this email already exists." } };
  }

  // Create user and log them in
  const user = await signup(email, password);
  return createUserSession(user.id, "/");
}

// ─── Component ───────────────────────────────────────────

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="mt-2 text-gray-400">
            Sign up to start chatting with your favorite characters.
          </p>
        </div>

        <Form method="post" className="space-y-6">
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
              autoComplete="new-password"
              required
              className="mt-1 block w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="At least 8 characters"
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
            {isSubmitting ? "Creating account..." : "Sign Up"}
          </button>
        </Form>

        <p className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
