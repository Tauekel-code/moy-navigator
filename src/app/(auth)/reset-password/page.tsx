"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/settings`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-2">
        <p className="font-medium">Письмо отправлено</p>
        <p className="text-sm text-foreground-muted">Проверьте почту {email} для восстановления доступа.</p>
        <Link href="/login" className="text-accent text-sm hover:underline block pt-2">
          Вернуться ко входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Отправляем..." : "Восстановить доступ"}
      </Button>
      <Link href="/login" className="text-sm text-foreground-muted hover:text-foreground block text-center pt-1">
        Вернуться ко входу
      </Link>
    </form>
  );
}
