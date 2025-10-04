"use client";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { Country } from "@/lib/api-context";
import { useApi } from "@/lib/api-context";

export default function SignupForm() {
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>("");
  const api = useApi();
  const { signup } = useAuth();
  const router = useRouter();

  // Fetch countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setCountriesLoading(true);
        const countryData = await api.getCountries();
        setCountries(countryData);
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setCountriesLoading(false);
      }
    };

    fetchCountries();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    setPasswordError("");

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstname') as string;
    const lastName = formData.get('lastname') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const companyName = formData.get('company') as string;
    const countryId = parseInt(selectedCountry);

    // Validate password confirmation
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      // Call the signup function from auth context
      const signupData = {
        full_name: `${firstName} ${lastName}`,
        email,
        password,
        confirm_password: confirmPassword,
        company_name: companyName,
        country_id: countryId
      };

      const result = await signup(signupData);

      if (result.success===true) {
        // Signup successful and user is already logged in
        router.push('/dashboard');
      } else {
        setSubmitError(result.error || 'Signup failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setSubmitError(error.error || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-black p-4 md:rounded-2xl md:p-8">
      <h2 className="text-4xl font-bold tracking-tight text-neutral-200">
        Create your account
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-300">
        Sign up to get started with managing your company's expenses in a secure and efficient way.
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        {submitError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-md">
            <p className="text-sm text-red-400">{submitError}</p>
          </div>
        )}

        <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
          <LabelInputContainer>
            <Label htmlFor="firstname">First name</Label>
            <Input
              id="firstname"
              name="firstname"
              placeholder="Enter your first name"
              type="text"
              required
              disabled={isSubmitting}
            />
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="lastname">Last name</Label>
            <Input
              id="lastname"
              name="lastname"
              placeholder="Enter your last name"
              type="text"
              required
              disabled={isSubmitting}
            />
          </LabelInputContainer>
        </div>
        <LabelInputContainer className="mb-4">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            name="email"
            placeholder="Enter your email address"
            type="email"
            required
            disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={() => passwordError && setPasswordError("")}
          />
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Confirm your password"
            type="password"
            required
            disabled={isSubmitting}
            onChange={() => passwordError && setPasswordError("")}
          />
          {passwordError && (
            <p className="text-sm text-red-400 mt-1">{passwordError}</p>
          )}
        </LabelInputContainer>

        <LabelInputContainer className="mb-4">
          <Label htmlFor="company">Company Name</Label>
          <Input
            id="company"
            name="company"
            placeholder="Enter your company name"
            type="text"
            required
            disabled={isSubmitting}
          />
        </LabelInputContainer>
        <LabelInputContainer className="mb-8">
          <Label htmlFor="country">Country</Label>
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              {[...countries]
                .sort((a, b) => a.name_common.localeCompare(b.name_common))
                .map((country) => (
                <SelectItem key={country.id} value={country.id.toString()}>
                  <div className="flex gap-2">
                    <span className="font-medium text-md">{country.name_common}</span>
                    <span className="text-sm text-neutral-400">
                      {country.currency_code} • {country.currency_name} • {country.currency_symbol}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </LabelInputContainer>

        <button
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-zinc-900 to-zinc-900 font-medium text-white shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating Account...' : 'Create Account'}
          <BottomGradient />
        </button>

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-neutral-400 hover:text-neutral-300">
            Already have an account? Sign in
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
