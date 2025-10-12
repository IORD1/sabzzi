'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';

interface ItemCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: {
    itemName: string;
    itemNameHindi?: string;
    itemNameMarathi?: string;
  }) => void;
  initialName: string;
}

export function ItemCreationDialog({
  isOpen,
  onClose,
  onConfirm,
  initialName,
}: ItemCreationDialogProps) {
  const [itemName, setItemName] = useState(initialName);
  const [itemNameHindi, setItemNameHindi] = useState('');
  const [itemNameMarathi, setItemNameMarathi] = useState('');
  const [defaultValue, setDefaultValue] = useState('1');
  const [defaultUnit, setDefaultUnit] = useState('items');
  const [saveToDatabase, setSaveToDatabase] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!itemName.trim()) {
      haptics.error();
      alert('Item name is required');
      return;
    }

    setIsLoading(true);

    try {
      // Save to database if checkbox is checked
      if (saveToDatabase) {
        const response = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: itemName.trim(),
            itemNameHindi: itemNameHindi.trim() || undefined,
            itemNameMarathi: itemNameMarathi.trim() || undefined,
            defaultQuantity: {
              value: parseFloat(defaultValue) || 1,
              unit: defaultUnit,
            },
          }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log('✅ Item saved to database:', data);
          haptics.success();
          onConfirm({
            itemName: itemName.trim(),
            itemNameHindi: itemNameHindi.trim() || undefined,
            itemNameMarathi: itemNameMarathi.trim() || undefined,
          });
          onClose();
        } else if (response.status === 409) {
          // Item already exists - that's okay, still continue
          console.log('⚠️ Item already exists, continuing anyway');
          haptics.success();
          onConfirm({
            itemName: itemName.trim(),
            itemNameHindi: itemNameHindi.trim() || undefined,
            itemNameMarathi: itemNameMarathi.trim() || undefined,
          });
          onClose();
        } else {
          console.error('❌ Failed to save item:', data);
          haptics.error();
          alert(data.error || 'Failed to save item to database');
        }
      } else {
        // Just add to list without saving to database
        haptics.success();
        onConfirm({
          itemName: itemName.trim(),
          itemNameHindi: itemNameHindi.trim() || undefined,
          itemNameMarathi: itemNameMarathi.trim() || undefined,
        });
        onClose();
      }
    } catch (error) {
      console.error('❌ Error saving item:', error);
      haptics.error();
      alert('Error saving item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setItemName(initialName);
    setItemNameHindi('');
    setItemNameMarathi('');
    setDefaultValue('1');
    setDefaultUnit('items');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add bilingual names for this item
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* English Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Item Name (English) <span className="text-destructive">*</span>
            </label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Tomato"
              className="h-11"
              autoFocus
            />
          </div>

          {/* Hindi Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              नाम (हिंदी)
            </label>
            <Input
              value={itemNameHindi}
              onChange={(e) => setItemNameHindi(e.target.value)}
              placeholder="e.g., टमाटर"
              className="h-11"
            />
          </div>

          {/* Marathi Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              नाव (मराठी)
            </label>
            <Input
              value={itemNameMarathi}
              onChange={(e) => setItemNameMarathi(e.target.value)}
              placeholder="e.g., टोमॅटो"
              className="h-11"
            />
          </div>

          {/* Default Quantity */}
          {saveToDatabase && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Default Amount/Quantity
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                  placeholder="1"
                  className="h-11 flex-1"
                  min="0.1"
                  step="0.1"
                />
                <select
                  value={defaultUnit}
                  onChange={(e) => setDefaultUnit(e.target.value)}
                  className="h-11 px-3 rounded-md border border-input bg-background flex-1"
                >
                  <optgroup label="Count">
                    <option value="items">items</option>
                    <option value="pcs">pcs</option>
                    <option value="dozen">dozen</option>
                  </optgroup>
                  <optgroup label="Weight">
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                  </optgroup>
                  <optgroup label="Volume">
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="gal">gal</option>
                  </optgroup>
                  <optgroup label="Currency">
                    <option value="₹">₹ (Rupees)</option>
                    <option value="$">$ (Dollars)</option>
                  </optgroup>
                </select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This will be suggested when adding this item to lists
              </p>
            </div>
          )}

          {/* Save to database checkbox */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <input
              type="checkbox"
              id="saveToDb"
              checked={saveToDatabase}
              onChange={(e) => {
                haptics.buttonTap();
                setSaveToDatabase(e.target.checked);
              }}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="saveToDb" className="text-sm cursor-pointer">
              <div className="font-medium">Save to item library</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                Make this item available for future lists
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={handleConfirm}
              disabled={!itemName.trim() || isLoading}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
