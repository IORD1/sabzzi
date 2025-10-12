'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Share2, Copy, Trash2, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { haptics } from '@/lib/haptics';
import { ShareListDialog } from '@/components/share-list-dialog';

interface ListItem {
  itemId: string;
  itemName: string;
  itemNameHindi?: string;
  itemNameMarathi?: string;
  quantity: {
    value: number;
    unit: string;
  };
  isBought: boolean;
  boughtBy: string | null;
  boughtAt: Date | null;
}

interface Comment {
  commentId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date | string;
}

interface ListDetail {
  listId: string;
  name: string;
  emoji?: string;
  createdBy: string;
  sharedWith: string[];
  items: ListItem[];
  comments: any[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function ListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.listId as string;

  const [list, setList] = useState<ListDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const currentUserId = 'localhost-dev-user'; // TODO: Get from session/auth

  useEffect(() => {
    fetchList();
    fetchComments();
  }, [listId]);

  const fetchList = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/lists/${listId}`);
      if (response.ok) {
        const data = await response.json();
        setList(data.list);
      } else {
        haptics.error();
        alert('Failed to load list');
        router.push('/home');
      }
    } catch (error) {
      console.error('Error fetching list:', error);
      haptics.error();
      alert('Error loading list');
      router.push('/home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    haptics.buttonTap();
    router.push('/home');
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/lists/${listId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    haptics.buttonTap();
    setIsAddingComment(true);

    try {
      const response = await fetch(`/api/lists/${listId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (response.ok) {
        haptics.success();
        setCommentText('');
        await fetchComments();
      } else {
        haptics.error();
        alert('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      haptics.error();
      alert('Error adding comment');
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) {
      return;
    }

    haptics.buttonTap();

    try {
      const response = await fetch(
        `/api/lists/${listId}/comments/${commentId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        haptics.success();
        await fetchComments();
      } else {
        haptics.error();
        alert('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      haptics.error();
      alert('Error deleting comment');
    }
  };

  const handleToggleItem = async (itemId: string, currentBought: boolean) => {
    if (togglingItems.has(itemId)) return;

    haptics.buttonTap();
    setTogglingItems((prev) => new Set(prev).add(itemId));

    try {
      const endpoint = currentBought
        ? `/api/lists/${listId}/items/${itemId}/unmark-bought`
        : `/api/lists/${listId}/items/${itemId}/mark-bought`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });

      if (response.ok) {
        haptics.success();
        // Refresh list
        await fetchList();
      } else {
        haptics.error();
        alert('Failed to update item');
      }
    } catch (error) {
      console.error('Error toggling item:', error);
      haptics.error();
      alert('Error updating item');
    } finally {
      setTogglingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDuplicate = async () => {
    haptics.buttonTap();
    try {
      const response = await fetch(`/api/lists/${listId}/duplicate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        haptics.success();
        router.push(`/lists/${data.listId}`);
      } else {
        haptics.error();
        alert('Failed to duplicate list');
      }
    } catch (error) {
      console.error('Error duplicating list:', error);
      haptics.error();
      alert('Error duplicating list');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this list?')) {
      return;
    }

    haptics.buttonTap();
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        haptics.success();
        router.push('/home');
      } else {
        haptics.error();
        alert('Failed to delete list');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      haptics.error();
      alert('Error deleting list');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading list...</div>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  const totalItems = list.items.length;
  const boughtItems = list.items.filter((item) => item.isBought).length;
  const progressPercentage = totalItems > 0 ? (boughtItems / totalItems) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{list.emoji || '🛒'}</span>
            <h1 className="text-lg font-semibold truncate">{list.name}</h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {boughtItems} of {totalItems} items bought
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
      </header>

      {/* Items List */}
      <main className="flex-1 overflow-y-auto p-4 pb-40">
        {list.items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-muted-foreground">No items in this list</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.items.map((item) => (
              <div
                key={item.itemId}
                className={`flex items-start gap-3 p-4 border rounded-lg bg-card transition-all ${
                  item.isBought ? 'opacity-60' : ''
                }`}
              >
                <Checkbox
                  checked={item.isBought}
                  onCheckedChange={() =>
                    handleToggleItem(item.itemId, item.isBought)
                  }
                  disabled={togglingItems.has(item.itemId)}
                  className="mt-1 h-6 w-6"
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      item.isBought ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {item.itemName}
                  </div>
                  {(item.itemNameHindi || item.itemNameMarathi) && (
                    <div className="text-sm text-muted-foreground">
                      {item.itemNameHindi}
                      {item.itemNameHindi && item.itemNameMarathi && ' • '}
                      {item.itemNameMarathi}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.quantity.value} {item.quantity.unit}
                  </div>
                  {item.isBought && item.boughtAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Bought {new Date(item.boughtAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-8">
          <button
            onClick={() => {
              haptics.buttonTap();
              setShowComments(!showComments);
            }}
            className="flex items-center gap-2 text-sm font-medium mb-4"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Comments ({comments.length})</span>
          </button>

          {showComments && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.commentId}
                      className="p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                        {comment.userId === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteComment(comment.commentId)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment Input */}
              <div className="flex gap-2">
                <Input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || isAddingComment}
                  className="h-11 w-11 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => {
              haptics.buttonTap();
              setShowShareDialog(true);
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={handleDuplicate}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            className="h-12 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareListDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        listId={listId}
        currentUserId={currentUserId}
        onSuccess={() => {
          // Optionally refresh the list to see updated shared users
          fetchList();
        }}
      />
    </div>
  );
}
