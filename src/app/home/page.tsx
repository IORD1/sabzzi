'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { ListCard } from '@/components/list-card';
import { ShareListDialog } from '@/components/share-list-dialog';

interface ListSummary {
  listId: string;
  name: string;
  emoji?: string;
  totalItems: number;
  boughtItems: number;
  createdAt: string;
  creatorName?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'my-lists' | 'to-buy'>('my-lists');
  const [myLists, setMyLists] = useState<ListSummary[]>([]);
  const [toBuyLists, setToBuyLists] = useState<ListSummary[]>([]);
  const [isLoadingMyLists, setIsLoadingMyLists] = useState(true);
  const [isLoadingToBuy, setIsLoadingToBuy] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (!response.ok) {
          // Not authenticated, redirect to login
          router.replace('/');
          return;
        }
        const data = await response.json();
        if (data.authenticated) {
          setCurrentUserId(data.userId);
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.replace('/');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Fetch My Lists
  useEffect(() => {
    // Don't fetch lists until auth check is complete
    if (isCheckingAuth || !currentUserId) return;

    const fetchMyLists = async () => {
      setIsLoadingMyLists(true);
      try {
        const response = await fetch('/api/lists/my-lists');
        if (response.ok) {
          const data = await response.json();
          setMyLists(data.lists || []);
        }
      } catch (error) {
        console.error('Error fetching my lists:', error);
      } finally {
        setIsLoadingMyLists(false);
      }
    };

    fetchMyLists();
  }, [isCheckingAuth, currentUserId]);

  // Fetch To Buy Lists
  useEffect(() => {
    // Don't fetch lists until auth check is complete
    if (isCheckingAuth || !currentUserId) return;

    const fetchToBuyLists = async () => {
      setIsLoadingToBuy(true);
      try {
        const response = await fetch('/api/lists/to-buy');
        if (response.ok) {
          const data = await response.json();
          setToBuyLists(data.lists || []);
        }
      } catch (error) {
        console.error('Error fetching to-buy lists:', error);
      } finally {
        setIsLoadingToBuy(false);
      }
    };

    fetchToBuyLists();
  }, [isCheckingAuth, currentUserId]);

  const handleTabChange = (tab: 'my-lists' | 'to-buy') => {
    haptics.navigation();
    setActiveTab(tab);
  };

  const handleSettingsClick = () => {
    haptics.buttonTap();
    router.push('/settings');
  };

  const handleCreateList = () => {
    haptics.buttonTap();
    router.push('/lists/create');
  };

  const refreshLists = async () => {
    // Refresh both tabs
    try {
      const myListsResponse = await fetch('/api/lists/my-lists');
      if (myListsResponse.ok) {
        const data = await myListsResponse.json();
        setMyLists(data.lists || []);
      }

      const toBuyResponse = await fetch('/api/lists/to-buy');
      if (toBuyResponse.ok) {
        const data = await toBuyResponse.json();
        setToBuyLists(data.lists || []);
      }
    } catch (error) {
      console.error('Error refreshing lists:', error);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-12">
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
        {activeTab === 'my-lists' ? (
          <MyListsTab
            lists={myLists}
            isLoading={isLoadingMyLists}
            router={router}
            onShare={(listId) => {
              setSelectedListId(listId);
              setShowShareDialog(true);
            }}
          />
        ) : (
          <ToBuyTab lists={toBuyLists} isLoading={isLoadingToBuy} router={router} />
        )}
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

      {/* Share Dialog */}
      {selectedListId && (
        <ShareListDialog
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false);
            setSelectedListId(null);
          }}
          listId={selectedListId}
          currentUserId={currentUserId}
          onSuccess={() => {
            refreshLists();
          }}
        />
      )}
    </div>
  );
}

function MyListsTab({
  lists,
  isLoading,
  router,
  onShare,
}: {
  lists: ListSummary[];
  isLoading: boolean;
  router: any;
  onShare: (listId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Loading your lists...</div>
      </div>
    );
  }

  if (lists.length === 0) {
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

  return (
    <div className="space-y-4">
      {lists.map((list) => (
        <ListCard
          key={list.listId}
          listId={list.listId}
          name={list.name}
          emoji={list.emoji}
          totalItems={list.totalItems}
          boughtItems={list.boughtItems}
          createdAt={list.createdAt}
          onOpen={() => {
            router.push(`/lists/${list.listId}`);
          }}
          onShare={() => {
            onShare(list.listId);
          }}
          onDuplicate={() => {
            // TODO: Implement duplicate
            console.log('Duplicate list:', list.listId);
          }}
          onEdit={() => {
            router.push(`/lists/${list.listId}/edit`);
          }}
        />
      ))}
    </div>
  );
}

function ToBuyTab({
  lists,
  isLoading,
  router,
}: {
  lists: ListSummary[];
  isLoading: boolean;
  router: any;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Loading shared lists...</div>
      </div>
    );
  }

  if (lists.length === 0) {
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

  return (
    <div className="space-y-4">
      {lists.map((list) => (
        <ListCard
          key={list.listId}
          listId={list.listId}
          name={list.name}
          emoji={list.emoji}
          totalItems={list.totalItems}
          boughtItems={list.boughtItems}
          createdAt={list.createdAt}
          creatorName={list.creatorName}
          onOpen={() => {
            router.push(`/lists/${list.listId}`);
          }}
        />
      ))}
    </div>
  );
}
