'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { haptics } from '@/lib/haptics';
import { X } from 'lucide-react';

interface User {
  userId: string;
  name: string;
}

interface SharedUser extends User {}

interface ShareListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  currentUserId: string;
  onSuccess?: () => void;
}

export function ShareListDialog({
  isOpen,
  onClose,
  listId,
  currentUserId,
  onSuccess,
}: ShareListDialogProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, listId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all users
      const usersResponse = await fetch('/api/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Filter out current user
        const filteredUsers = usersData.users.filter(
          (u: User) => u.userId !== currentUserId
        );
        setAllUsers(filteredUsers);
      }

      // Fetch currently shared users
      const sharedResponse = await fetch(`/api/lists/${listId}/share`);
      if (sharedResponse.ok) {
        const sharedData = await sharedResponse.json();
        setSharedUsers(sharedData.sharedWith || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    haptics.buttonTap();
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleShare = async () => {
    if (selectedUserIds.size === 0) {
      haptics.error();
      alert('Please select at least one user');
      return;
    }

    haptics.buttonTap();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/lists/${listId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
        }),
      });

      if (response.ok) {
        haptics.success();
        setSelectedUserIds(new Set());
        await fetchData(); // Refresh shared users
        if (onSuccess) {
          onSuccess();
        }
      } else {
        haptics.error();
        alert('Failed to share list');
      }
    } catch (error) {
      console.error('Error sharing list:', error);
      haptics.error();
      alert('Error sharing list');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    if (!confirm('Remove access for this user?')) {
      return;
    }

    haptics.buttonTap();

    try {
      const response = await fetch(
        `/api/lists/${listId}/unshare/${userId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        haptics.success();
        await fetchData(); // Refresh shared users
        if (onSuccess) {
          onSuccess();
        }
      } else {
        haptics.error();
        alert('Failed to unshare list');
      }
    } catch (error) {
      console.error('Error unsharing list:', error);
      haptics.error();
      alert('Error unsharing list');
    }
  };

  const sharedUserIds = new Set(sharedUsers.map((u) => u.userId));
  const availableUsers = allUsers.filter(
    (u) => !sharedUserIds.has(u.userId)
  );

  const filteredUsers = availableUsers.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share List</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading users...
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Currently Shared Users */}
            {sharedUsers.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Currently Shared With
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                  {sharedUsers.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <span className="text-sm">{user.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnshare(user.userId)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share with new users */}
            <div className="flex flex-col gap-2 flex-1 overflow-hidden">
              <label className="text-sm font-medium">Share With</label>

              {/* Search */}
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="h-11"
              />

              {/* User List */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    {availableUsers.length === 0
                      ? 'All users already have access'
                      : 'No users found'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.userId}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleToggleUser(user.userId)}
                      >
                        <Checkbox
                          checked={selectedUserIds.has(user.userId)}
                          onCheckedChange={() => handleToggleUser(user.userId)}
                          className="h-5 w-5"
                        />
                        <span className="font-medium">{user.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={handleShare}
                disabled={selectedUserIds.size === 0 || isSaving}
              >
                {isSaving ? 'Sharing...' : `Share with ${selectedUserIds.size}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
