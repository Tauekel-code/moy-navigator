"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { detectBrowserTimezone } from "@/lib/dates";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { timezone: detectBrowserTimezone() } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/today");
      router.refresh();
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-2">
        <p className="font-medium">Проверьте почту</p>
        <p className="text-sm text-foreground-muted">
          Мы отправили письмо для подтверждения на {email}. Перейдите по ссылке, чтобы завершить регистрацию.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
      </Button>
      <p className="text-sm text-foreground-muted text-center pt-1">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
