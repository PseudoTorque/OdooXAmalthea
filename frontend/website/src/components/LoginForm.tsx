"use client";
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const result = await login(email, password);
      console.log(result)
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-black p-4 md:rounded-2xl md:p-8">
      <h2 className="text-4xl font-bold tracking-tight text-neutral-200">
        Welcome back
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-300">
        Sign in to your account to continue
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            placeholder="Enter your email"
            type="email"
            required
            disabled={isLoading}
          />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            placeholder="Enter your password"
            type="password"
            required
            disabled={isLoading}
          />
        </LabelInputContainer>

        <button
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-zinc-900 to-zinc-900 font-medium text-white shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
          <BottomGradient />
        </button>

        <div className="mt-4 text-center">
          <a href="/signup" className="text-sm text-neutral-400 hover:text-neutral-300">
            Don't have an account? Sign up
          </a>
        </div>
      </form>
    </div>
  );
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("flex w-full flex-col space-y-2", className)}>
      {children}
    </div>
  );
};
