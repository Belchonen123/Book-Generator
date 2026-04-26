export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-editorial-bg px-4 py-12">
      <div className="mx-auto w-full max-w-md">{children}</div>
      <p className="mt-10 text-center font-serif text-xs tracking-wide text-editorial-muted">
        ChapterAI
      </p>
    </div>
  );
}
