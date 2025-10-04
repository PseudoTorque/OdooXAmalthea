import SignupForm from "@/components/SignupForm";
import { PublicRoute } from "@/lib/auth-context";

export default function SignupPage() {
  return (
    <PublicRoute>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SignupForm />
        </div>
      </div>
    </PublicRoute>
  );
}
