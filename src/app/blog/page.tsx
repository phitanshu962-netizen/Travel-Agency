import { Metadata } from 'next';
import Link from 'next/link';
import BlogClient from './BlogClient';
import Footer from '@/components/Footer';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Travel Blog | Expert Tips, Guides & Destinations | TripDM',
  description: 'Explore travel tips, destination guides, and expert advice from TripDM. Find inspiration for your next trip with our curated travel blog.',
  keywords: ['travel blog', 'travel tips', 'destination guides', 'India travel', 'TripDM blog'],
  openGraph: {
    title: 'TripDM Travel Blog – Expert Tips & Destination Guides',
    description: 'Discover travel tips, destination guides, and insider advice from TripDM travel experts.',
    type: 'website',
    url: 'https://tripdm.com/blog',
    siteName: 'TripDM',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TripDM Travel Blog',
    description: 'Expert travel tips, destination guides, and travel inspiration.',
  },
  alternates: {
    canonical: 'https://tripdm.com/blog',
  },
};

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

async function getPublishedBlogs(): Promise<Blog[]> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'blogs' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'published' },
            op: 'EQUAL',
            value: { booleanValue: true },
          },
        },
        limit: 10000,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data
      .filter((item: any) => item.document)
      .map((item: any) => {
        const doc = item.document;
        const fields = doc.fields || {};
        const nameParts = doc.name.split('/');
        return {
          id: nameParts[nameParts.length - 1],
          title: fields.title?.stringValue || '',
          slug: fields.slug?.stringValue || '',
          excerpt: fields.excerpt?.stringValue || '',
          coverImage: fields.coverImage?.stringValue || '',
          category: fields.category?.stringValue || 'Travel',
          tags: fields.tags?.arrayValue?.values?.map((v: any) => v.stringValue) || [],
          author: fields.author?.stringValue || 'TripDM Team',
          publishedAt: fields.publishedAt?.stringValue || '',
          readTime: fields.readTime?.stringValue || '5 min read',
        };
      })
      .sort((a: Blog, b: Blog) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      });
  } catch { return []; }
}

function formatDate(d: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

const CATEGORY_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  'Travel Tips':        { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
  'Destinations':       { bg: 'rgba(167,139,250,0.12)', text: '#7c3aed', border: 'rgba(167,139,250,0.25)' },
  'Budget Travel':      { bg: 'rgba(52,211,153,0.12)', text: '#059669', border: 'rgba(52,211,153,0.25)' },
  'Luxury Travel':      { bg: 'rgba(251,191,36,0.12)', text: '#d97706', border: 'rgba(251,191,36,0.25)' },
  'Adventure':          { bg: 'rgba(239,68,68,0.12)', text: '#dc2626', border: 'rgba(239,68,68,0.25)' },
  'India Travel':       { bg: 'rgba(99,179,237,0.12)', text: '#3182ce', border: 'rgba(99,179,237,0.25)' },
  'Family Travel':      { bg: 'rgba(236,72,153,0.12)', text: '#db2777', border: 'rgba(236,72,153,0.25)' },
  'Solo Travel':        { bg: 'rgba(34,211,238,0.12)', text: '#0891b2', border: 'rgba(34,211,238,0.25)' },
  'default':            { bg: 'rgba(249,115,22,0.12)', text: '#ea580c', border: 'rgba(249,115,22,0.25)' },
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#f8fafc 0%,#e2e8f0 100%)',
  'linear-gradient(135deg,#fdf4ff 0%,#f3e8ff 100%)',
  'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)',
  'linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)',
];

export default async function BlogPage() {
  const blogs = await getPublishedBlogs();
  const featured = blogs[0];
  const rest = blogs.slice(1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'TripDM Travel Blog',
    description: 'Expert travel tips, destination guides, and travel inspiration from TripDM.',
    url: 'https://tripdm.com/blog',
    publisher: { '@type': 'Organization', name: 'TripDM', url: 'https://tripdm.com' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Lato:wght@300;400;700&family=Nunito:wght@600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        .blog-card { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
        .blog-card:hover { transform: translateY(-3px); border-color: rgba(249,115,22,0.22) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.08) !important; }
        .featured-card { transition: box-shadow 0.25s ease; }
        .featured-card:hover { box-shadow: 0 24px 60px rgba(0,0,0,0.09) !important; }
        .nav-link:hover { color: #0f172a !important; }
        .search-bar-wrap:focus-within { border-color: rgba(234,88,12,0.45) !important; box-shadow: 0 0 0 3px rgba(234,88,12,0.08) !important; }
        /* Hide scrollbar on category row */
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-scroll { scrollbar-width: none; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#334155', fontFamily: 'Inter, sans-serif' }}>

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
            </Link>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Link href="/" className="nav-link" style={{ color: '#64748b', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>
                Find Travel Agents →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px 60px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Ultra-realistic Panoramic Background Image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/blog-hero-bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 32%',
            opacity: 0.22,
            filter: 'saturate(1.25) contrast(1.05)',
            pointerEvents: 'none',
          }} />
          {/* Smooth editorial gradient overlay for high contrast & seamless page blend */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(248,250,252,0.75) 0%, rgba(248,250,252,0.4) 50%, #f8fafc 100%)',
            pointerEvents: 'none',
          }} />
          {/* Soft warm sun glow */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 700, height: 280, background: 'radial-gradient(ellipse, rgba(249,115,22,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* BLOG label — Nunito font, plain text */}
            <div style={{ marginBottom: 18 }}>
              <span style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: 6,
                textTransform: 'uppercase',
                color: '#ea580c',
              }}>
                Blog
              </span>
            </div>

            {/* Main heading — Playfair Display (editorial serif) */}
            <h1 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(36px, 6vw, 68px)',
              fontWeight: 900,
              color: '#0f172a',
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: '-0.5px',
            }}>
              Travel Stories
              <span style={{
                display: 'block',
                fontStyle: 'italic',
                background: 'linear-gradient(135deg,#f97316,#fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                &amp; Guides
              </span>
            </h1>

            {/* Subtitle — Lato light */}
            <p style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 17,
              fontWeight: 300,
              color: '#64748b',
              maxWidth: 500,
              margin: '0 auto 28px',
              lineHeight: 1.8,
              letterSpacing: '0.2px',
            }}>
              Destination guides, travel tips, and trip ideas —{' '}
              <span style={{ fontWeight: 700, color: '#475569' }}>curated for every kind of traveler.</span>
            </p>

            {/* Article count pill — Nunito */}
            {blogs.length > 0 && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.18)',
                borderRadius: '6px',
                padding: '6px 16px',
                fontFamily: "'Nunito', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: '#ea580c',
              }}>
                {blogs.length} articles published
              </div>
            )}
          </div>
        </section>

        {blogs.length === 0 ? (
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 80px' }}>
            <div style={{ textAlign: 'center', padding: '80px 40px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Coming Soon</h2>
              <p style={{ color: '#64748b', marginBottom: 28 }}>Our travel blog is launching soon. Check back for expert travel guides!</p>
              <Link href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#f97316,#ea580c)', color: '#fff', textDecoration: 'none', borderRadius: '6px', padding: '12px 28px', fontWeight: 600, fontSize: 14 }}>
                Explore Travel Packages →
              </Link>
            </div>
          </div>
        ) : (
          <BlogClient initialBlogs={blogs} />
        )}

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <Footer />
      </div>
    </>
  );
}
