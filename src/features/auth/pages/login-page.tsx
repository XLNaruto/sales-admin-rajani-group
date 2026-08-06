import { Eye, EyeOff, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginForm } from "../hooks/use-login-form";

const FIELD_CLASS =
  "h-11 border-foreground/15 bg-transparent pl-10 text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:ring-0";

/** Sign-in: username + password, exchanged for a session by the backend. */
export function LoginPage() {
  const {
    register,
    errors,
    onSubmit,
    showPassword,
    toggleShowPassword,
    isPending,
    isError,
    error,
  } = useLoginForm();

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your username and password to access the portal.
      </p>

      {/* autoComplete="off" throughout — the browser must not offer saved
          credentials or fill this form on its own. */}
      <form onSubmit={onSubmit} autoComplete="off" className="mt-8 space-y-5">
        {isError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error?.message}
          </p>
        )}

        <div className="space-y-3.5">
          <Label htmlFor="username" className="mb-3 block text-foreground/90">
            Username
          </Label>
          <div className="group relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              id="username"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="your.username"
              className={FIELD_CLASS}
              {...register("username")}
            />
          </div>
          {errors.username && (
            <p className="text-xs text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-3.5">
          <Label htmlFor="password" className="mb-3 block text-foreground/90">
            Password
          </Label>
          <div className="group relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              // Chrome ignores "off" on password inputs; "new-password" is the
              // value it actually honours to suppress the saved-password fill.
              autoComplete="new-password"
              placeholder="••••••••"
              className={`${FIELD_CLASS} pr-10`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={toggleShowPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex w-fit items-center gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            id="remember"
            className="border-foreground/15 bg-transparent shadow-none"
            {...register("remember")}
          />
          <Label
            htmlFor="remember"
            className="cursor-pointer select-none font-normal text-muted-foreground"
          >
            Remember me
          </Label>
        </div>

        <Button
          type="submit"
          className="group h-11 w-full text-sm font-semibold text-white"
          disabled={isPending}
        >
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
