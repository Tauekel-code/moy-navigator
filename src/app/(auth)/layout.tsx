export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold">Моё личное расписание</h1>
          <p className="text-sm text-foreground-muted mt-1">Что? Когда? Зачем?</p>
        </div>
        {children}
      </div>
    </div>
  );
}
