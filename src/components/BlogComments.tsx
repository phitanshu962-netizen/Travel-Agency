'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { ThumbsUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface CommentItem {
  id: string;
  blogSlug: string;
  blogId?: string;
  name: string;
  comment: string;
  createdAt: string;
  likes: number;
}

interface BlogCommentsProps {
  blogSlug: string;
  blogId?: string;
  blogTitle?: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffSec < 45) return 'Just now';
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? 's' : ''} ago`;
    if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function BlogComments({ blogSlug, blogId }: BlogCommentsProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [agreed, setAgreed] = useState<boolean>(false);

  // Status & Feedback
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const nameInputId = useId();
  const emailInputId = useId();
  const commentInputId = useId();
  const agreeCheckId = useId();

  const isFormValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    comment.trim().length >= 3 &&
    agreed;

  // Load liked comments from localStorage
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('tripdm_liked_comments');
      if (savedLikes) {
        setLikedMap(JSON.parse(savedLikes));
      }
    } catch (err) {
      console.error('Error loading liked comments:', err);
    }
  }, []);

  // Fetch comments
  useEffect(() => {
    if (!blogSlug && !blogId) return;

    let isMounted = true;
    const fetchUrl = `/api/blog/comments?slug=${encodeURIComponent(blogSlug || '')}&blogId=${encodeURIComponent(blogId || '')}`;

    fetch(fetchUrl)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && Array.isArray(data.comments)) {
            setComments(data.comments);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load comments:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [blogSlug, blogId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client-side validations
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanComment = comment.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!cleanComment || cleanComment.length < 3) {
      setErrorMsg('Please write your comment before submitting.');
      return;
    }

    if (!agreed) {
      setErrorMsg('Please check the consent box to agree to data storage policies.');
      return;
    }

    setSubmitting(true);

    // Optimistic comment creation
    const tempId = 'temp_' + Date.now();
    const optimisticComment: CommentItem = {
      id: tempId,
      blogSlug,
      blogId: blogId || '',
      name: cleanName,
      comment: cleanComment,
      createdAt: new Date().toISOString(),
      likes: 0,
    };

    setComments((prev) => [optimisticComment, ...prev]);

    try {
      const res = await fetch('/api/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          comment: cleanComment,
          agreedToPolicy: agreed,
          blogSlug,
          blogId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Rollback optimistic comment
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setErrorMsg(data.error || 'Failed to post comment. Please try again.');
        setSubmitting(false);
        return;
      }

      // Replace optimistic comment with confirmed server comment
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? data.comment : c))
      );

      // Reset form
      setName('');
      setEmail('');
      setComment('');
      setAgreed(false);
      setSuccessMsg('Your comment has been posted successfully!');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setErrorMsg('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeToggle = async (commentId: string) => {
    const isCurrentlyLiked = !!likedMap[commentId];
    const newLikedState = !isCurrentlyLiked;

    // 1. Optimistic UI update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            likes: Math.max(0, c.likes + (newLikedState ? 1 : -1)),
          };
        }
        return c;
      })
    );

    const updatedLikesMap = { ...likedMap, [commentId]: newLikedState };
    setLikedMap(updatedLikesMap);
    try {
      localStorage.setItem('tripdm_liked_comments', JSON.stringify(updatedLikesMap));
    } catch {
      // Ignore localStorage errors
    }

    // 2. Call API
    try {
      await fetch('/api/blog/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          action: newLikedState ? 'like' : 'unlike',
        }),
      });
    } catch (err) {
      console.error('Failed to update like status:', err);
    }
  };

  return (
    <section className="blog-comments-container" id="comments">
      <style jsx>{`
        .blog-comments-container {
          margin-top: 48px;
          padding-top: 36px;
          border-top: 1px solid #e2e8f0;
          font-family: 'Lato', 'Inter', system-ui, sans-serif;
          max-width: 800px;
        }

        /* Leave a Comment Header */
        .thrill-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 22px;
          letter-spacing: -0.3px;
          line-height: 1.25;
        }

        /* Two-Column Inputs Row */
        .thrill-input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
          max-width: 800px;
        }

        .thrill-pill-input {
          width: 100%;
          height: 46px;
          padding: 0 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14.5px;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          box-sizing: border-box;
        }

        .thrill-pill-input::placeholder {
          color: #64748b;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }

        .thrill-pill-input:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
          background: #ffffff;
        }

        /* Comment Textarea Box */
        .thrill-textarea-wrap {
          margin-bottom: 18px;
          max-width: 800px;
        }

        .thrill-textarea {
          width: 100%;
          min-height: 120px;
          height: 130px;
          padding: 14px 18px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 14.5px;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          outline: none;
          resize: vertical;
          line-height: 1.6;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          box-sizing: border-box;
        }

        .thrill-textarea::placeholder {
          color: #64748b;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
        }

        .thrill-textarea:focus {
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
          background: #ffffff;
        }

        /* Checkbox Row */
        .thrill-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 22px;
          font-size: 13.5px;
          color: #475569;
          font-family: 'Inter', sans-serif;
          line-height: 1.5;
          cursor: pointer;
          user-select: none;
          max-width: 800px;
        }

        .thrill-checkbox {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          accent-color: #f97316;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .thrill-privacy-link {
          color: #ea580c;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }

        .thrill-privacy-link:hover {
          color: #c2410c;
          text-decoration: underline;
        }

        /* Submit Button */
        .thrill-submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 28px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
          border: none;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Disabled / Neutral State (matches screenshot) */
        .thrill-submit-btn.disabled {
          background: #a8abae;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          cursor: not-allowed;
          opacity: 0.9;
        }

        /* Active / Filled State (TripDM vibrant orange) */
        .thrill-submit-btn.active {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          box-shadow: 0 4px 16px rgba(249, 115, 22, 0.35);
          cursor: pointer;
        }

        .thrill-submit-btn.active:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 22px rgba(249, 115, 22, 0.45);
          opacity: 0.96;
        }

        .thrill-submit-btn.active:active:not(:disabled) {
          transform: translateY(0);
        }

        /* Spinner */
        .btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Alerts */
        .alert-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 22px;
          font-family: 'Inter', sans-serif;
          max-width: 800px;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #b91c1c;
        }

        .alert-success {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          color: #15803d;
        }

        /* Comments List Section (Only visible when comments exist) */
        .thrill-comments-feed {
          margin-top: 44px;
          padding-top: 32px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 800px;
        }

        /* Individual Thrillophilia-Style Comment Card (Matches 2nd Screenshot) */
        .thrill-comment-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 28px 32px;
          display: flex;
          gap: 24px;
          align-items: flex-start;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
          transition: box-shadow 0.2s ease;
        }

        .thrill-comment-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        /* Left Square Avatar Container */
        .thrill-avatar-box {
          width: 88px;
          height: 88px;
          background: #b0b4b8;
          border-radius: 6px;
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .thrill-avatar-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Right Content Box */
        .thrill-comment-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .thrill-author-name {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 19px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 10px;
          letter-spacing: -0.2px;
          line-height: 1.3;
        }

        .thrill-comment-text {
          font-family: 'Lato', sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: #374151;
          margin: 0 0 10px;
          white-space: pre-line;
          word-break: break-word;
        }

        .thrill-comment-source {
          font-family: 'Lato', sans-serif;
          font-size: 15px;
          color: #0f172a;
          font-weight: 500;
          margin: 0 0 14px;
        }

        /* Action Row: Circular Right Arrow & Like Button */
        .thrill-action-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .thrill-arrow-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0f172a;
          cursor: default;
          transition: transform 0.2s;
        }

        .thrill-like-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .thrill-like-btn:hover {
          background: #fff7ed;
          color: #ea580c;
          border-color: #fed7aa;
        }

        .thrill-like-btn.liked {
          background: #fff7ed;
          color: #ea580c;
          border-color: #f97316;
        }

        @media (max-width: 768px) {
          .thrill-input-row {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .thrill-title {
            font-size: 28px;
          }
          .thrill-pill-input {
            height: 48px;
            padding: 0 16px;
          }
          .thrill-textarea {
            padding: 16px 20px;
            min-height: 160px;
            border-radius: 6px;
          }
          .thrill-submit-btn {
            width: 100%;
          }
          .thrill-comment-card {
            padding: 20px 18px;
            gap: 16px;
          }
          .thrill-avatar-box {
            width: 64px;
            height: 64px;
          }
          .thrill-author-name {
            font-size: 17px;
          }
          .thrill-comment-text {
            font-size: 14.5px;
          }
        }
      `}</style>

      {/* Leave a Comment Title */}
      <h2 className="thrill-title">Leave a Comment</h2>

      {errorMsg && (
        <div className="alert-box alert-error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-box alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Two-Column Name & Email Pill Inputs */}
        <div className="thrill-input-row">
          <input
            id={nameInputId}
            type="text"
            placeholder="Your Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="thrill-pill-input"
            required
            maxLength={80}
          />
          <input
            id={emailInputId}
            type="email"
            placeholder="Your E-mail *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="thrill-pill-input"
            required
            maxLength={100}
          />
        </div>

        {/* Comment Textarea Box */}
        <div className="thrill-textarea-wrap">
          <textarea
            id={commentInputId}
            placeholder="Your comment *"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="thrill-textarea"
            rows={6}
            required
            maxLength={3000}
          />
        </div>

        {/* Privacy Policy Checkbox */}
        <label htmlFor={agreeCheckId} className="thrill-checkbox-row">
          <input
            id={agreeCheckId}
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="thrill-checkbox"
            required
          />
          <span>
            I agree that my submitted data is being collected and stored. For further details on handling user data, see our{' '}
            <Link href="/policies/privacy-notice" target="_blank" className="thrill-privacy-link">
              Privacy Policy
            </Link>
          </span>
        </label>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={submitting || !name || !email || !comment || !agreed}
            className={`thrill-submit-btn ${isFormValid ? 'active' : 'disabled'}`}
          >
            {submitting ? (
              <>
                <span className="btn-spinner" />
                <span>Posting...</span>
              </>
            ) : (
              'LEAVE A COMMENT'
            )}
          </button>
        </div>
      </form>

      {/* ONLY Display comments when there are actually comments (completely hidden when 0) */}
      {!loading && comments.length > 0 && (
        <div className="thrill-comments-feed">
          {comments.map((item) => {
            const isLiked = !!likedMap[item.id];
            return (
              <div key={item.id} className="thrill-comment-card">
                {/* Left Square Silhouette Avatar */}
                <div className="thrill-avatar-box">
                  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="thrill-avatar-svg">
                    <rect width="100" height="100" fill="#b0b4b8"/>
                    <circle cx="50" cy="38" r="17" fill="#ffffff"/>
                    <path d="M18 90C18 68 32 58 50 58C68 58 82 68 82 90H18Z" fill="#ffffff"/>
                  </svg>
                </div>

                {/* Right Content */}
                <div className="thrill-comment-content">
                  <h3 className="thrill-author-name">{item.name}</h3>
                  <p className="thrill-comment-text">{item.comment}</p>
                  <div className="thrill-comment-source">
                    TripDM Blog {item.createdAt ? `• ${formatRelativeTime(item.createdAt)}` : ''}
                  </div>

                  {/* Circular Arrow & Like Action Row */}
                  <div className="thrill-action-row">
                    <div className="thrill-arrow-icon" title="Discussion">
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="#0f172a">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                      </svg>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLikeToggle(item.id)}
                      className={`thrill-like-btn ${isLiked ? 'liked' : ''}`}
                      title={isLiked ? 'Unlike' : 'Helpful'}
                      aria-label="Like comment"
                    >
                      <ThumbsUp size={12} fill={isLiked ? 'currentColor' : 'none'} />
                      <span>{item.likes > 0 ? `${item.likes} Helpful` : 'Helpful'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
