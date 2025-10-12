'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my-lists' | 'to-buy'>('my-lists');

  const handleTabChange = (tab: 'my-lists' | 'to-buy') => {
    haptics.navigation();
    setActiveTab(tab);
  };

  const handleSettingsClick = () => {
    haptics.buttonTap();
    // TODO: Navigate to settings
    console.log('Settings clicked');
  };

  const handleCreateList = () => {
    haptics.buttonTap();
    router.push('/lists/create');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <h1 className="text-2xl font-bold text-green-700">🥬 Sabzzi</h1>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={handleSettingsClick}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'my-lists'
                ? 'text-green-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange('my-lists')}
          >
            My Lists
            {activeTab === 'my-lists' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />
            )}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'to-buy'
                ? 'text-green-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => handleTabChange('to-buy')}
          >
            To Buy
            {activeTab === 'to-buy' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'my-lists' ? <MyListsTab /> : <ToBuyTab />}
      </main>

      {/* Floating Action Button (only on My Lists tab) */}
      {activeTab === 'my-lists' && (
        <button
          onClick={handleCreateList}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center"
          aria-label="Create new list"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

function MyListsTab() {
  return (
    <div className="space-y-4">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <h2 className="text-xl font-semibold mb-2">No lists yet</h2>
        <p className="text-muted-foreground mb-6">
          Create your first grocery list to get started
        </p>
        <p className="text-sm text-muted-foreground">
          Tap the + button to create a list
        </p>
      </div>
    </div>
  );
}

function ToBuyTab() {
  return (
    <div className="space-y-4">
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-xl font-semibold mb-2">No shared lists</h2>
        <p className="text-muted-foreground">
          Lists shared with you will appear here
        </p>
      </div>
    </div>
  );
}
