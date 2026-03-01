'use client';

import { useState, useCallback } from 'react';
import {
  Group,
  Avatar,
  Text,
  Box,
  Stack,
  ActionIcon,
  Button,
  TextInput,
  Collapse,
  Paper,
  Menu,
} from '@mantine/core';
import {
  IconMessageCircle,
  IconDots,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';
import type {
  ActivityLogResponse,
  CommentResponse,
  ReactionSummary,
} from '@fitsy/shared';
import { ALLOWED_EMOJIS } from '@fitsy/shared';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { UserLink } from './UserLink';

interface FeedItemProps {
  activity: ActivityLogResponse;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function FeedItem({ activity }: FeedItemProps) {
  const { user } = useAuth();
  const initial = activity.userName?.charAt(0)?.toUpperCase() || '?';

  // Reactions state
  const [reactions, setReactions] = useState<ReactionSummary[]>(
    activity.reactions || [],
  );

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentCount, setCommentCount] = useState(activity.commentCount || 0);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Toggle reaction
  const handleReaction = useCallback(
    async (emoji: string) => {
      try {
        const res = await api.post<{ added: boolean }>(
          `/activity-logs/${activity.id}/reactions`,
          { emoji },
        );
        setReactions((prev) => {
          const existing = prev.find((r) => r.emoji === emoji);
          if (res.added) {
            if (existing) {
              return prev.map((r) =>
                r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r,
              );
            }
            return [...prev, { emoji, count: 1, userReacted: true }];
          } else {
            if (existing && existing.count <= 1) {
              return prev.filter((r) => r.emoji !== emoji);
            }
            return prev.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r,
            );
          }
        });
      } catch {
        // ignore
      }
    },
    [activity.id],
  );

  // Load comments
  const loadComments = useCallback(async () => {
    try {
      const res = await api.get<CommentResponse[]>(
        `/activity-logs/${activity.id}/comments`,
      );
      setComments(res);
      setCommentsLoaded(true);
    } catch {
      // ignore
    }
  }, [activity.id]);

  // Toggle comments
  const toggleComments = useCallback(() => {
    const willOpen = !commentsOpen;
    setCommentsOpen(willOpen);
    if (willOpen && !commentsLoaded) {
      loadComments();
    }
  }, [commentsOpen, commentsLoaded, loadComments]);

  // Add comment
  const handleAddComment = useCallback(async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const comment = await api.post<CommentResponse>(
        `/activity-logs/${activity.id}/comments`,
        { text: newComment.trim() },
      );
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
      setNewComment('');
    } catch {
      // ignore
    } finally {
      setPostingComment(false);
    }
  }, [activity.id, newComment]);

  // Delete comment
  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      try {
        await api.delete(`/activity-logs/${activity.id}/comments/${commentId}`);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    },
    [activity.id],
  );

  // Save edited comment
  const handleSaveEdit = useCallback(
    async (commentId: string) => {
      if (!editText.trim()) return;
      try {
        const updated = await api.patch<CommentResponse>(
          `/activity-logs/${activity.id}/comments/${commentId}`,
          { text: editText.trim() },
        );
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? updated : c)),
        );
        setEditingCommentId(null);
        setEditText('');
      } catch {
        // ignore
      }
    },
    [activity.id, editText],
  );

  return (
    <Stack gap="xs">
      {/* Main activity line */}
      <Group gap="sm" wrap="nowrap">
        <Avatar color="teal" radius="xl" size="md">
          {initial}
        </Avatar>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" lineClamp={1}>
            <UserLink userId={activity.userId} name={activity.userName} />{' '}
            did{' '}
            <Text span fw={600}>
              {activity.activityTypeName}
            </Text>
          </Text>
          <Group gap="xs">
            <Text size="xs" c="teal" fw={600}>
              +{activity.pointsEarned} pts
            </Text>
            <Text size="xs" c="dimmed">
              {timeAgo(activity.createdAt)}
            </Text>
          </Group>
        </Box>
      </Group>

      {/* Note display */}
      {activity.note && (
        <Text size="sm" fs="italic" c="dimmed" pl={54}>
          {activity.note}
        </Text>
      )}

      {/* Reaction bar */}
      <Group gap={4} pl={54}>
        {ALLOWED_EMOJIS.map((emoji) => {
          const reaction = reactions.find((r) => r.emoji === emoji);
          const count = reaction?.count || 0;
          const reacted = reaction?.userReacted || false;

          return (
            <ActionIcon
              key={emoji}
              variant={reacted ? 'filled' : 'subtle'}
              color={reacted ? 'teal' : 'gray'}
              radius="xl"
              size="sm"
              onClick={() => handleReaction(emoji)}
            >
              <Text size="xs">
                {emoji}
                {count > 0 ? ` ${count}` : ''}
              </Text>
            </ActionIcon>
          );
        })}

        {/* Comment toggle */}
        <Button
          variant="subtle"
          color="gray"
          size="compact-xs"
          leftSection={<IconMessageCircle size={14} />}
          onClick={toggleComments}
        >
          {commentCount > 0 ? `Comments (${commentCount})` : 'Comments'}
        </Button>
      </Group>

      {/* Expandable comment section */}
      <Collapse in={commentsOpen}>
        <Paper p="xs" ml={54} withBorder radius="sm">
          <Stack gap="xs">
            {/* Comment list */}
            {comments.map((comment) => (
              <Box key={comment.id}>
                {editingCommentId === comment.id ? (
                  <Group gap="xs">
                    <TextInput
                      size="xs"
                      value={editText}
                      onChange={(e) => setEditText(e.currentTarget.value)}
                      style={{ flex: 1 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(comment.id);
                      }}
                    />
                    <Button
                      size="compact-xs"
                      onClick={() => handleSaveEdit(comment.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Group>
                ) : (
                  <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Text size="xs">
                      <UserLink userId={comment.userId} name={comment.userName} size="xs" fw={700} />{' '}
                      {comment.text}{' '}
                      <Text span c="dimmed">
                        {timeAgo(comment.createdAt)}
                      </Text>
                    </Text>
                    {user && comment.userId === user.id && (
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                          >
                            <IconDots size={12} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEdit size={14} />}
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditText(comment.text);
                            }}
                          >
                            Edit
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    )}
                  </Group>
                )}
              </Box>
            ))}

            {/* Add comment */}
            <Group gap="xs">
              <TextInput
                size="xs"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.currentTarget.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment();
                }}
              />
              <Button
                size="compact-xs"
                onClick={handleAddComment}
                loading={postingComment}
                disabled={!newComment.trim()}
              >
                Post
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Collapse>
    </Stack>
  );
}
