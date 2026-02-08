import React from 'react';
import { createBrowserRouter, RouterProvider, RouteObject, Link } from 'react-router-dom';
import HallOfFights from '../pages/HallOfFights';
import { ToastsProvider } from '../ui/Toasts';
import RunRoundPanel from '../panels/RunRoundPanel';

const routes: RouteObject[] = [
  { path: '/', element: <RunRoundPanel simulate={() => ({ tagsA: [], tagsD: [], winnerSide: null, by: 'Draw', minutes: 3 })} /> },
  { path: '/hall-of-fights', element: <HallOfFights /> },
];

const router = createBrowserRouter(routes);

export default function AppRoot() {
  return (
    <ToastsProvider>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between p-3">
            <nav className="flex items-center gap-4 text-sm font-medium">
              <Link to="/" className="hover:text-emerald-300">Run Round</Link>
              <Link to="/hall-of-fights" className="hover:text-emerald-300">Hall of Fights</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4">
          <RouterProvider router={router} />
        </main>
      </div>
    </ToastsProvider>
  );
}
