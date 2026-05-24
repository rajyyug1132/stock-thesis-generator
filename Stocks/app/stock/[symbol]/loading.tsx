export default function Loading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-gray-200" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="h-24 rounded-xl bg-gray-200" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
        <div className="h-40 rounded-xl bg-gray-200" />
        <div className="h-10 rounded-lg bg-gray-200" />
      </div>
    </main>
  );
}
