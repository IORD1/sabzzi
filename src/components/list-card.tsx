'use client';

import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { Share2, Copy, Edit } from 'lucide-react';

interface ListCardProps {
  listId: string;
  name: string;
  emoji?: string;
  totalItems: number;
  boughtItems: number;
  createdAt: Date | string;
  creatorName?: string;
  onOpen: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
}

export function ListCard({
  listId,
  name,
  emoji = '🛒',
  totalItems,
  boughtItems,
  createdAt,
  creatorName,
  onOpen,
  onShare,
  onDuplicate,
  onEdit,
}: ListCardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const progressPercentage = totalItems > 0 ? (boughtItems / totalItems) * 100 : 0;

  return (
    <div
      className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => {
        haptics.buttonTap();
        onOpen();
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{emoji}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {creatorName && <span>By {creatorName}</span>}
            {creatorName && <span>•</span>}
            <span>{formatDate(createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">
            {boughtItems} of {totalItems} items
          </span>
          <span className="font-medium">{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {onShare && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              haptics.buttonTap();
              onShare();
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
        {onDuplicate && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              haptics.buttonTap();
              onDuplicate();
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
        )}
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              haptics.buttonTap();
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
