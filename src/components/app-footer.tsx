'use client';

import { useState } from 'react';
import { APP_VERSION } from '@/lib/version';

export function AppFooter() {
  const [showHearts, setShowHearts] = useState(false);
  const version = APP_VERSION;

  return (
    <footer className="fixed bottom-0 left-0 right-0 py-2 text-center pointer-events-none z-50 bg-gradient-to-t from-background to-transparent">
      <div
        className="inline-block pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110"
        onMouseEnter={() => setShowHearts(true)}
        onMouseLeave={() => setShowHearts(false)}
        onClick={() => {
          // Easter egg: show hearts on click
          setShowHearts(true);
          setTimeout(() => setShowHearts(false), 2000);
        }}
      >
        <p className="text-[10px] text-gray-400 hover:text-green-600 transition-colors duration-300">
          <span className="font-medium">v{version}</span>
          <span className="mx-1.5">•</span>
          <span>
            made with{' '}
            <span
              className={`inline-block transition-all duration-300 ${
                showHearts ? 'text-red-500 scale-125' : ''
              }`}
            >
              {showHearts ? '❤️' : '🥬'}
            </span>{' '}
            by{' '}
            <span className="font-semibold hover:underline">Pratham</span>
          </span>
        </p>
      </div>
    </footer>
  );
}
