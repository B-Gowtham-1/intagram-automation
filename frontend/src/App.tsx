import { Home } from './pages/Home';

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              IG
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">
              Hermes Orchestrator
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Instagram Carousel v1.0
          </div>
        </div>
      </header>

      <div className="flex-1">
        <Home />
      </div>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        Instagram Business Carousel Automation &bull; Built with FastAPI &amp; Vite
      </footer>
    </main>
  );
}
