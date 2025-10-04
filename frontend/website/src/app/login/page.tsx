import LoginForm from "@/components/LoginForm";
import { PublicRoute } from "@/lib/auth-context";

export default function LoginPage() {
  return (
    <PublicRoute>
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </PublicRoute>
  );
}
