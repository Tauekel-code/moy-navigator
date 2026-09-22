"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message);
      setLoading(false);
      return;
    }

    router.push(searchParams.get("next") || "/today");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Входим..." : "Войти"}
      </Button>
      <div className="flex justify-between text-sm text-foreground-muted pt-1">
        <Link href="/reset-password" className="hover:text-foreground">
          Забыли пароль?
        </Link>
        <Link href="/register" className="hover:text-foreground">
          Регистрация
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
