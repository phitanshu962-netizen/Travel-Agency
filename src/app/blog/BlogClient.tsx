'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: string;
}

const CATEGORIES = [
  'All',
  'Travel Tips',
  'Destinations',
  'Budget Travel',
  'Luxury Travel',
  'Adventure',
  'Family Travel',
  'Solo Travel',
  'Food & Culture',
  'Travel Guides',
  'India Travel',
  'International Travel',
  'News & Updates',
];

const CATEGORY_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  'Travel Tips':          { bg: 'rgba(249,115,22,0.1)', text: '#c2410c', border: 'rgba(249,115,22,0.2)' },
  'Destinations':         { bg: 'rgba(124,58,237,0.1)', text: '#6d28d9', border: 'rgba(124,58,237,0.2)' },
  'Budget Travel':        { bg: 'rgba(5,150,105,0.1)', text: '#047857', border: 'rgba(5,150,105,0.2)' },
  'Luxury Travel':        { bg: 'rgba(217,119,6,0.1)', text: '#b45309', border: 'rgba(217,119,6,0.2)' },
  'Adventure':            { bg: 'rgba(220,38,38,0.1)', text: '#b91c1c', border: 'rgba(220,38,38,0.2)' },
  'India Travel':         { bg: 'rgba(37,99,235,0.1)', text: '#1d4ed8', border: 'rgba(37,99,235,0.2)' },
  'Family Travel':        { bg: 'rgba(219,39,119,0.1)', text: '#be185d', border: 'rgba(219,39,119,0.2)' },
  'Solo Travel':          { bg: 'rgba(8,145,178,0.1)', text: '#0e7490', border: 'rgba(8,145,178,0.2)' },
  'Food & Culture':       { bg: 'rgba(225,29,72,0.1)', text: '#be123c', border: 'rgba(225,29,72,0.2)' },
  'Travel Guides':        { bg: 'rgba(79,70,229,0.1)', text: '#4338ca', border: 'rgba(79,70,229,0.2)' },
  'International Travel': { bg: 'rgba(2,132,199,0.1)', text: '#0369a1', border: 'rgba(2,132,199,0.2)' },
  'News & Updates':       { bg: 'rgba(71,85,105,0.1)', text: '#475569', border: 'rgba(71,85,105,0.2)' },
  'default':              { bg: 'rgba(249,115,22,0.1)', text: '#c2410c', border: 'rgba(249,115,22,0.2)' },
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#f1f5f9 0%,#e2e8f0 100%)',
  'linear-gradient(135deg,#fdf4ff 0%,#ede9fe 100%)',
  'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
  'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)',
  'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)',
];

function formatDate(d: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return d; }
}

export default function BlogClient({ initialBlogs }: { initialBlogs: Blog[] }) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useCallback(() => {
    setSearchQuery(inputValue.trim());
  }, [inputValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setSearchQuery('');
    inputRef.current?.focus();
  }, []);

  const filteredBlogs = useMemo(() => {
    return initialBlogs.filter(blog => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        blog.title.toLowerCase().includes(q) ||
        blog.excerpt.toLowerCase().includes(q) ||
        blog.tags.some(t => t.toLowerCase().includes(q)) ||
        blog.category.toLowerCase().includes(q) ||
        blog.author.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'All' || blog.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [initialBlogs, searchQuery, selectedCategory]);

  const featured = useMemo(() => {
    if (searchQuery || selectedCategory !== 'All') return null;
    return filteredBlogs[0] || null;
  }, [filteredBlogs, searchQuery, selectedCategory]);

  const restBlogs = useMemo(() => {
    return featured ? filteredBlogs.slice(1) : filteredBlogs;
  }, [filteredBlogs, featured]);

  const isFiltering = !!searchQuery || selectedCategory !== 'All';

  return (
    <div>
      {/* Search & Filter */}
      <section style={{ padding: '0 24px 40px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Search bar with button */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{
              flex: 1,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s',
            }}>
              <span style={{ padding: '0 12px 0 16px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.5" y1="16.5" x2="22" y2="22" />
                </svg>
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search articles, destinations, tags..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: '#0f172a',
                  padding: '13px 0',
                  fontFamily: 'inherit',
                  background: 'transparent',
                }}
              />
              {inputValue && (
                <button
                  onClick={handleClear}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '0 10px',
                    fontSize: 20,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              style={{
                background: 'linear-gradient(135deg,#f97316,#ea580c)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '13px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(234,88,12,0.25)',
                transition: 'opacity 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </button>
          </div>

          {/* Category filters — horizontal scroll */}
          <div className="cat-scroll" style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat ? '#ea580c' : '#fff',
                    color: selectedCategory === cat ? '#fff' : '#64748b',
                    border: selectedCategory === cat ? '1.5px solid #ea580c' : '1.5px solid rgba(0,0,0,0.08)',
                    borderRadius: '6px',
                    padding: '7px 16px',
                    fontSize: 13,
                    fontWeight: selectedCategory === cat ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.18s',
                    boxShadow: selectedCategory === cat ? '0 4px 12px rgba(234,88,12,0.2)' : 'none',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active filters summary */}
          {isFiltering && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
              <span>
                {filteredBlogs.length} {filteredBlogs.length === 1 ? 'result' : 'results'} found
                {searchQuery && <> for "<strong style={{ color: '#0f172a' }}>{searchQuery}</strong>"</>}
                {selectedCategory !== 'All' && <> in <strong style={{ color: '#0f172a' }}>{selectedCategory}</strong></>}
              </span>
              <button
                onClick={() => { setInputValue(''); setSearchQuery(''); setSelectedCategory('All'); }}
                style={{ background: 'none', border: 'none', color: '#ea580c', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, textDecoration: 'underline' }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Blog content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
        {filteredBlogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No Articles Found</h2>
            <p style={{ color: '#64748b', marginBottom: 20, fontSize: 14 }}>
              We couldn't find any articles matching your search. Try different keywords or browse by category.
            </p>
            <button
              onClick={() => { setInputValue(''); setSearchQuery(''); setSelectedCategory('All'); }}
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', border: 'none', borderRadius: '6px', padding: '12px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.2)' }}
            >
              Browse All Articles
            </button>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featured && (
              <section style={{ marginBottom: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 1.5, flexShrink: 0 }}>
                    Featured Story
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
                </div>

                <Link href={`/blog/${featured.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <article
                    className="featured-card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.07)',
                      background: '#fff',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Image */}
                    <div style={{ position: 'relative', overflow: 'hidden', minHeight: 340 }}>
                      {featured.coverImage ? (
                        <img
                          src={featured.coverImage}
                          alt={featured.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: 340, display: 'block' }}
                        />
                      ) : (
                        <div style={{ height: '100%', minHeight: 340, background: FALLBACK_GRADIENTS[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src="/tripdm-logo.png" alt="TripDM" style={{ width: 120, opacity: 0.18, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
                      {(() => {
                        const p = CATEGORY_PALETTE[featured.category] || CATEGORY_PALETTE.default;
                        return (
                          <span style={{ display: 'inline-block', background: p.bg, color: p.text, border: `1px solid ${p.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: '6px', marginBottom: 14, alignSelf: 'flex-start', letterSpacing: 0.3 }}>
                            {featured.category}
                          </span>
                        );
                      })()}

                      <h2 style={{ fontSize: 'clamp(18px,2.2vw,26px)', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, marginBottom: 14, letterSpacing: '-0.4px' }}>
                        {featured.title}
                      </h2>
                      <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.75, marginBottom: 28 }}>
                        {featured.excerpt}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {featured.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{featured.author}</div>
                            {featured.publishedAt && (
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(featured.publishedAt)}</div>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#ea580c' }}>Read Article →</span>
                      </div>
                    </div>
                  </article>
                </Link>
              </section>
            )}

            {/* All Posts Grid */}
            {restBlogs.length > 0 && (
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, flexShrink: 0 }}>
                    {isFiltering ? 'Search Results' : 'Latest Articles'}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.07)' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>
                    {restBlogs.length} {restBlogs.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                  {restBlogs.map((blog, i) => {
                    const palette = CATEGORY_PALETTE[blog.category] || CATEGORY_PALETTE.default;
                    return (
                      <Link key={blog.id} href={`/blog/${blog.slug}`} style={{ textDecoration: 'none' }}>
                        <article
                          className="blog-card"
                          style={{
                            background: '#fff',
                            border: '1px solid rgba(0,0,0,0.07)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Thumbnail */}
                          <div style={{ position: 'relative', height: 190, overflow: 'hidden', flexShrink: 0 }}>
                            {blog.coverImage ? (
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/tripdm-logo.png" alt="TripDM" style={{ width: 80, opacity: 0.18, objectFit: 'contain' }} />
                              </div>
                            )}
                            <span style={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              background: palette.bg,
                              color: palette.text,
                              border: `1px solid ${palette.border}`,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              backdropFilter: 'blur(10px)',
                              backgroundColor: 'rgba(255,255,255,0.88)',
                            }}>
                              {blog.category}
                            </span>
                          </div>

                          {/* Body */}
                          <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.45, marginBottom: 8, letterSpacing: '-0.2px' }}>
                              {blog.title}
                            </h3>
                            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 16, flex: 1 }}>
                              {blog.excerpt?.slice(0, 110)}{(blog.excerpt?.length ?? 0) > 110 ? '…' : ''}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 13, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                  {blog.author.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>{blog.author}</div>
                                  {blog.publishedAt && (
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDate(blog.publishedAt)}</div>
                                  )}
                                </div>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#ea580c' }}>Read →</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
