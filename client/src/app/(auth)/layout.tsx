// ABOUTME: Auth layout — centered card on dark background for login and verify pages.
// ABOUTME: Max-width container with CollabSphere branding.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
