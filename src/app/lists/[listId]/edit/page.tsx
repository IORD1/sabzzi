'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';
import { QuantitySelector } from '@/components/quantity-selector';
import { ItemCreationDialog } from '@/components/item-creation-dialog';

interface ListItem {
  itemId?: string;
  itemName: string;
  itemNameHindi?: string;
  itemNameMarathi?: string;
  quantity: {
    value: number;
    unit: string;
  };
  quantityType?: 'weight' | 'money' | 'count';
  isBought?: boolean;
  boughtBy?: string | null;
  boughtAt?: Date | null;
}

interface SearchResultItem {
  itemId: string;
  itemName: string;
  itemNameHindi?: string;
  itemNameMarathi?: string;
  defaultQuantity: {
    value: number;
    unit: string;
  };
  usageCount?: number;
}

export default function EditListPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.listId as string;

  const [listName, setListName] = useState('');
  const [emoji, setEmoji] = useState('🛒');
  const [items, setItems] = useState<ListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allAvailableItems, setAllAvailableItems] = useState<SearchResultItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchResultItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [showItemCreationDialog, setShowItemCreationDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [selectedItem, setSelectedItem] = useState<{
    itemId?: string;
    itemName: string;
    itemNameHindi?: string;
    itemNameMarathi?: string;
    defaultQuantity?: { value: number; unit: string };
  } | null>(null);

  // Load existing list and available items on mount
  useEffect(() => {
    loadList();
    loadAllItems();
  }, [listId]);

  // Filter items when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredItems(allAvailableItems);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allAvailableItems.filter(
      (item) =>
        item.itemName.toLowerCase().includes(query) ||
        item.itemNameHindi?.toLowerCase().includes(query) ||
        item.itemNameMarathi?.toLowerCase().includes(query)
    );
    setFilteredItems(filtered);
  }, [searchQuery, allAvailableItems]);

  const loadList = async () => {
    setIsLoadingList(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_ORIGIN}/api/lists/${listId}`);
      if (response.ok) {
        const data = await response.json();
        const list = data.list;
        setListName(list.name);
        setEmoji(list.emoji || '🛒');
        setItems(list.items || []);
      } else {
        haptics.error();
        alert('Failed to load list');
        router.push('/home');
      }
    } catch (error) {
      console.error('Error loading list:', error);
      haptics.error();
      alert('Error loading list');
      router.push('/home');
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadAllItems = async () => {
    setIsLoadingItems(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_ORIGIN}/api/items`);
      if (response.ok) {
        const data = await response.json();
        setAllAvailableItems(data.items || []);
        setFilteredItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleBack = () => {
    haptics.buttonTap();
    router.push(`/lists/${listId}`);
  };

  const handleAddItem = (item: ListItem) => {
    haptics.buttonTap();
    setItems([...items, item]);
    setSearchQuery('');
  };

  const handleSelectItem = (result: SearchResultItem) => {
    haptics.buttonTap();
    setSelectedItem({
      itemId: result.itemId,
      itemName: result.itemName,
      itemNameHindi: result.itemNameHindi,
      itemNameMarathi: result.itemNameMarathi,
      defaultQuantity: result.defaultQuantity,
    });
    setShowQuantitySelector(true);
  };

  const handleQuantityConfirm = (
    quantity: { value: number; unit: string },
    quantityType: 'weight' | 'money' | 'count'
  ) => {
    if (selectedItem) {
      handleAddItem({
        itemId: selectedItem.itemId,
        itemName: selectedItem.itemName,
        itemNameHindi: selectedItem.itemNameHindi,
        itemNameMarathi: selectedItem.itemNameMarathi,
        quantity,
        quantityType,
        isBought: false,
        boughtBy: null,
        boughtAt: null,
      });
      setSelectedItem(null);
    }
  };

  const handleCreateNewItem = (itemName: string) => {
    haptics.buttonTap();
    setNewItemName(itemName);
    setShowItemCreationDialog(true);
  };

  const handleItemCreated = async (item: {
    itemName: string;
    itemNameHindi?: string;
    itemNameMarathi?: string;
  }) => {
    // Refresh the items list to include the newly created item
    await loadAllItems();

    // After creating item details, show quantity selector
    setSelectedItem({
      itemName: item.itemName,
      itemNameHindi: item.itemNameHindi,
      itemNameMarathi: item.itemNameMarathi,
      defaultQuantity: { value: 1, unit: 'items' },
    });
    setShowQuantitySelector(true);
  };

  const handleRemoveItem = (index: number) => {
    haptics.buttonTap();
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveList = async () => {
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    haptics.buttonTap();
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_ORIGIN}/api/lists/${listId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: listName,
          emoji,
          items: items.map(item => ({
            itemId: item.itemId || crypto.randomUUID(),
            itemName: item.itemName,
            itemNameHindi: item.itemNameHindi,
            itemNameMarathi: item.itemNameMarathi,
            quantity: item.quantity,
            isBought: item.isBought || false,
            boughtBy: item.boughtBy || null,
            boughtAt: item.boughtAt || null,
          })),
        }),
      });

      if (response.ok) {
        haptics.success();
        router.push(`/lists/${listId}`);
      } else {
        haptics.error();
        alert('Failed to update list');
      }
    } catch (error) {
      console.error('Error updating list:', error);
      haptics.error();
      alert('Error updating list');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingList) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading list...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 px-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={handleBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <button
              className="text-2xl"
              onClick={() => {
                haptics.buttonTap();
                // TODO: Open emoji picker
                const emojis = ['🛒', '🥬', '🍎', '🥕', '🍞', '🥛'];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                setEmoji(randomEmoji);
              }}
            >
              {emoji}
            </button>
            <Input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-2"
              placeholder="List name"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Search Section */}
        <div className="mb-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="h-12"
          />
        </div>

        {/* Available Items as Tags */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-3 block">
            Available Items ({filteredItems.length})
          </label>
          {isLoadingItems ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading items...
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredItems.map((item) => (
                <button
                  key={item.itemId}
                  onClick={() => handleSelectItem(item)}
                  className="inline-flex items-center px-4 py-2 rounded-full border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-colors text-sm font-medium"
                >
                  {item.itemName}
                  {item.itemNameHindi && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {item.itemNameHindi}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">No items found for "{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={() => handleCreateNewItem(searchQuery)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create new item: "{searchQuery}"
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No items available
            </div>
          )}
        </div>

        {/* Items List */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-muted-foreground">No items in this list</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click on an item tag above to add it to your list
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium mb-2">
              Items ({items.length})
            </h3>
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg bg-card"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.itemName}</div>
                  {item.itemNameHindi && (
                    <div className="text-sm text-muted-foreground">
                      {item.itemNameHindi}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {item.quantity.value} {item.quantity.unit}
                  </div>
                  {item.isBought && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Bought
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-10 bg-background border-t">
        <Button
          className="w-full h-12 text-lg"
          onClick={handleSaveList}
          disabled={isLoading || items.length === 0}
        >
          <Save className="h-5 w-5 mr-2" />
          {isLoading ? 'Updating...' : 'Update List'}
        </Button>
      </div>

      {/* Item Creation Dialog */}
      <ItemCreationDialog
        isOpen={showItemCreationDialog}
        onClose={() => {
          setShowItemCreationDialog(false);
          setNewItemName('');
        }}
        onConfirm={handleItemCreated}
        initialName={newItemName}
      />

      {/* Quantity Selector Dialog */}
      {selectedItem && (
        <QuantitySelector
          isOpen={showQuantitySelector}
          onClose={() => {
            setShowQuantitySelector(false);
            setSelectedItem(null);
          }}
          onConfirm={handleQuantityConfirm}
          itemName={selectedItem.itemName}
          defaultQuantity={selectedItem.defaultQuantity}
        />
      )}
    </div>
  );
}
