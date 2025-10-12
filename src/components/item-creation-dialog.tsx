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
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const handleConfirm = () => {
    if (!itemName.trim()) {
      haptics.error();
      alert('Item name is required');
      return;
    }

    haptics.success();
    onConfirm({
      itemName: itemName.trim(),
      itemNameHindi: itemNameHindi.trim() || undefined,
      itemNameMarathi: itemNameMarathi.trim() || undefined,
    });
    onClose();
  };

  const handleClose = () => {
    setItemName(initialName);
    setItemNameHindi('');
    setItemNameMarathi('');
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
              disabled={!itemName.trim()}
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
