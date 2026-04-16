'use client';

import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import type { CommentItem } from '../lib/types';
import { postComment } from '../lib/api';

function formatCommentDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Just now';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U'
  );
}

export default function CommentSection({
  videoId,
  comments,
  token,
}: {
  videoId: string;
  comments: CommentItem[];
  token: string | null;
}) {
  const [body, setBody] = useState('');
  const [items, setItems] = useState<CommentItem[]>(comments);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commentLabel = useMemo(
    () => `${items.length} comment${items.length === 1 ? '' : 's'}`,
    [items.length],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError('Sign in to post comments.');
      return;
    }
    if (!body.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const comment = await postComment(token, { video_id: videoId, content: body.trim() });
      setItems((current) => [comment, ...current]);
      setBody('');
    } catch (err) {
      console.error(err);
      setError('Unable to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-panel/95 p-4 shadow-glow sm:rounded-[28px] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between sm:pb-5">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Comments</h2>
        </div>
        <span className="no-min-h self-start rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-muted sm:self-auto">
          {commentLabel}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          placeholder="Leave a comment..."
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 sm:rounded-2xl sm:rows-4"
        />

        {/* Inline error */}
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {token ? null : (
            <p className="text-xs text-muted sm:text-sm">Sign in to leave a comment.</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="no-min-h w-full rounded-lg bg-[#114a70] border border-white/10 px-5 py-3 text-sm font-semibold text-white transition active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto hover:bg-[#1a5b87]"
          >
            {isSubmitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
        {items.length ? (
          items.map((comment) => (
            <article
              key={comment.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3 sm:rounded-2xl sm:p-4"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#114a70] text-xs font-semibold text-white sm:h-11 sm:w-11 sm:text-sm border border-white/10">
                  {initials(comment.author)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold text-white">{comment.author}</span>
                    <span className="text-muted">{formatCommentDate(comment.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text">{comment.content}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/15 p-4 text-sm text-muted sm:rounded-2xl sm:p-5">
            No comments yet.
          </div>
        )}
      </div>
    </section>
  );
}
