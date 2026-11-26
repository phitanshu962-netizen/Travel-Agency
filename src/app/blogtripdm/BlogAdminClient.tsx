'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getDbInstance } from '@/lib/firebase';
import { compressMultipleImages } from '@/lib/imageUtils';

const BLOG_ADMIN_EMAIL = 'tripdm26@gmail.com';

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  author: string;
  published: boolean;
  publishedAt: string;
  updatedAt: string;
  metaTitle: string;
  metaDescription: string;
  readTime: string;
}

export interface BulkItem {
  id: string;
  title: string;
  category: string;
  keywords?: string;
  competitorUrls?: string[];
  status: 'pending' | 'generating' | 'success' | 'failed' | 'skipped';
  error?: string;
  wordCount?: number;
  timeTaken?: number;
  slug?: string;
  richData?: any;
  blogFormData?: any;
  published?: boolean;
}

export interface BulkLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

const CATEGORIES = [
  'Travel Tips', 'Destinations', 'Budget Travel', 'Luxury Travel',
  'Adventure', 'Family Travel', 'Solo Travel', 'Food & Culture',
  'Travel Guides', 'India Travel', 'International Travel', 'News & Updates'
];

const defaultForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImage: '',
  category: 'Travel Tips',
  tags: '',
  author: 'TripDM Team',
  metaTitle: '',
  metaDescription: '',
  published: false,
};

// Preset Titles from User Request
const UTTARAKHAND_PRIORITY_TITLES = [
  "Uttarakhand Travel Guide 2026: Best Places, Itinerary, Budget & Travel Tips",
  "Uttarakhand 7-Day Itinerary: Complete Day-by-Day Travel Plan",
  "Uttarakhand Trip Cost: Complete Budget Breakdown",
  "Best Places to Visit in Uttarakhand: 25 Must-Visit Destinations",
  "How to Plan an Uttarakhand Trip from Mumbai",
  "Best Time to Visit Uttarakhand: Month-by-Month Guide",
  "Nainital vs Mussoorie: Which Is Better for Your Trip?",
  "Best Uttarakhand Tour Packages for Families, Couples & Groups",
  "Kedarnath Travel Guide: Route, Budget & Itinerary",
  "Auli Travel Guide: Snowfall, Skiing, Cost & Best Time"
];

const UTTARAKHAND_ALL_TITLES = [
  "10-Day Uttarakhand Itinerary: Mountains, Temples, Lakes & Hill Stations",
  "Mussoorie Travel Guide: Places to Visit, Budget, Hotels & Best Time",
  "Nainital Travel Guide: Best Places, Things to Do & 3-Day Itinerary",
  "Rishikesh Travel Guide: Best Places, Adventure Activities & Trip Cost",
  "Haridwar Travel Guide: Temples, Ganga Aarti, Itinerary & Travel Tips",
  "Auli Travel Guide: Best Time, Snowfall, Skiing, Cost & How to Reach",
  "Jim Corbett Travel Guide: Safari Zones, Booking, Cost & Best Time to Visit",
  "Chopta Tungnath Travel Guide: Trek, Budget, Itinerary & Best Time",
  "Kedarnath Travel Guide: Route, Trek Distance, Budget & Complete Itinerary",
  "Badrinath Travel Guide: How to Reach, Best Time, Cost & Places to Visit",
  "Valley of Flowers Trek Guide: Cost, Route, Difficulty & Best Time",
  "How Much Does an Uttarakhand Trip Cost? Complete Budget Guide",
  "How Many Days Are Enough for an Uttarakhand Trip?",
  "Which Is the Best Month to Visit Uttarakhand?",
  "Is Uttarakhand Safe for Solo Travellers? Complete Safety Guide",
  "Which Is Better: Nainital or Mussoorie? Complete Comparison",
  "Which Is Better: Auli or Manali for a Snow Trip?",
  "How to Reach Uttarakhand from Mumbai? Cheapest & Fastest Routes",
  "Where Can You See Snow in Uttarakhand? 10 Best Snow Destinations",
  "What Are the Best Places to Visit in Uttarakhand with Family?",
  "What Are the Best Places to Visit in Uttarakhand for Couples?",
  "15 Hidden Places in Uttarakhand Away from Tourist Crowds",
  "10 Offbeat Places in Uttarakhand You Should Visit in 2026",
  "Best Hill Stations in Uttarakhand for a Peaceful Vacation",
  "Best Places to Visit in Uttarakhand in December for Snowfall",
  "Best Places to Visit in Uttarakhand in May and June",
  "Best Places to Visit in Uttarakhand During Monsoon",
  "Best Weekend Trips in Uttarakhand from Delhi",
  "Uttarakhand Road Trip: Best Routes, Stops, Budget & Itinerary",
  "Best Treks in Uttarakhand for Beginners: Difficulty, Cost & Duration",
  "Best Camping Places in Uttarakhand: Location, Cost & Best Time",
  "Best Adventure Activities in Uttarakhand: Rafting, Trekking, Skiing & More",
  "Best Waterfalls in Uttarakhand: 15 Beautiful Waterfalls to Visit",
  "Uttarakhand Travel Guide 2026: Best Places, Itinerary, Budget & Travel Tips",
  "Uttarakhand 7-Day Itinerary: Complete Day-by-Day Travel Plan",
  "Uttarakhand Trip Cost: Complete Budget Breakdown",
  "Best Places to Visit in Uttarakhand: 25 Must-Visit Destinations",
  "How to Plan an Uttarakhand Trip from Mumbai",
  "Best Time to Visit Uttarakhand: Month-by-Month Guide",
  "Nainital vs Mussoorie: Which Is Better for Your Trip?",
  "Best Uttarakhand Tour Packages for Families, Couples & Groups",
  "Kedarnath Travel Guide: Route, Budget & Itinerary",
  "Auli Travel Guide: Snowfall, Skiing, Cost & Best Time"
];

function renderMarkdownToHtml(content: string): string {
  if (!content) return '';

  let html = content.replace(/<!--[\s\S]*?-->/g, '');

  // Strip visible Focus Keyword callout line
  html = html.replace(/^\s*> ?\*\*Focus Keyword:\*\*.*$/gmi, '');
  html = html.replace(/^\s*Focus Keyword:.*$/gmi, '');

  // Deduplicate duplicate FAQ sections if present
  const faqHeaderRegex = /(?:^|\n)(?:---|\*\*\*|___)?\s*\n?##\s*(Frequently Asked Questions|FAQs)[\s\S]*?(?=\n##\s+|\n---\s*\n##\s+|$)/gi;
  const faqMatches = html.match(faqHeaderRegex);
  if (faqMatches && faqMatches.length > 1) {
    let count = 0;
    html = html.replace(faqHeaderRegex, (match) => {
      count++;
      return count === 1 ? '' : match;
    });
  }

  // Strip decorative standalone dots, commas, quotes, and dashes
  html = html
    .replace(/^\s*[\.\…\,`'"\s]{1,}\s*$/gm, '')
    .replace(/^\s*[\-\*_]{3,}\s*$/gm, '');

  html = html
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^### (.+)$/gm, (_, t) => `<h3 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h3>`)
    .replace(/^## (.+)$/gm, (_, t) => `<h2 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h2>`)
    .replace(/^# (.+)$/gm, (_, t) => `<h1 id="${t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}">${t}</h1>`)
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/^[\*\-\+] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      const isHeader = cells.every(c => /^\s*[-:]+\s*$/.test(c));
      if (isHeader) return '';
      return '<tr>' + cells.map(c => `<td>${c.trim().replace(/^[\*\-\+]\s+/, '')}</td>`).join('') + '</tr>';
    });

  html = html.replace(/(<tr>[\s\S]*?<\/tr>\n?)+/g, (match) => `<div class="table-wrap"><table class="blog-table"><tbody>${match}</tbody></table></div>`);

  html = html.split('\n\n').map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|ul|ol|blockquote|hr|div|table|tbody|tr)/.test(trimmed)) return trimmed;
    if (/^\s*[\.\…\,`'"\-\*\_\s]+\s*$/.test(trimmed)) return '';
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean).join('\n');

  return html;
}

export default function BlogAdminClient() {
  const { user, signIn, signInWithGoogle, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [view, setView] = useState<'dashboard' | 'create' | 'bulk'>('dashboard');
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [editingOriginalPublishedAt, setEditingOriginalPublishedAt] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveMsgType, setSaveMsgType] = useState<'success' | 'error'>('success');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');

  // Single AI States
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiCompetitors, setAiCompetitors] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiRichData, setAiRichData] = useState<any>(null);
  const [aiGenStep, setAiGenStep] = useState('');

  // Image Upload Method States
  const [imageMethod, setImageMethod] = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Bulk Generator States
  const [bulkInputText, setBulkInputText] = useState<string>('');
  const [bulkQueue, setBulkQueue] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState<boolean>(false);
  const [bulkPaused, setBulkPaused] = useState<boolean>(false);
  const [bulkCurrentIndex, setBulkCurrentIndex] = useState<number>(-1);
  const [bulkCoolingTimer, setBulkCoolingTimer] = useState<number>(0);
  const [bulkDelaySeconds, setBulkDelaySeconds] = useState<number>(15); // 15s recommended to stay within TPM rate limits
  const [bulkSaveMode, setBulkSaveMode] = useState<'draft' | 'publish'>('draft');
  const [bulkCategoryOverride, setBulkCategoryOverride] = useState<string>('Auto-Detect');
  const [bulkLogs, setBulkLogs] = useState<BulkLog[]>([]);
  const [previewModalItem, setPreviewModalItem] = useState<BulkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<'render' | 'markdown' | 'seo' | 'faq'>('render');
  const [bulkFilterStatus, setBulkFilterStatus] = useState<'all' | 'pending' | 'success' | 'failed'>('all');
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');

  const bulkRunningRef = useRef<boolean>(false);
  const bulkPausedRef = useRef<boolean>(false);
  const terminalLogsEndRef = useRef<HTMLDivElement | null>(null);

  const isAuthorized = user?.email === BLOG_ADMIN_EMAIL;

  useEffect(() => {
    bulkRunningRef.current = bulkRunning;
  }, [bulkRunning]);

  useEffect(() => {
    bulkPausedRef.current = bulkPaused;
  }, [bulkPaused]);

  useEffect(() => {
    if (form.title && !form.slug) {
      const slug = form.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setForm(f => ({ ...f, slug }));
    }
  }, [form.title]);

  useEffect(() => {
    if (form.title && !form.metaTitle) {
      setForm(f => ({ ...f, metaTitle: form.title.slice(0, 60) }));
    }
  }, [form.title]);

  useEffect(() => {
    if (form.excerpt && !form.metaDescription) {
      setForm(f => ({ ...f, metaDescription: form.excerpt.slice(0, 160) }));
    }
  }, [form.excerpt]);

  // Auto-scroll log console
  useEffect(() => {
    if (terminalLogsEndRef.current) {
      terminalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bulkLogs, bulkCoolingTimer]);

  const addLog = useCallback((type: 'info' | 'success' | 'error' | 'warn', message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setBulkLogs(prev => [...prev.slice(-400), { id: Math.random().toString(), timestamp, type, message }]);
  }, []);

  const fetchBlogs = useCallback(async () => {
    setBlogsLoading(true);
    try {
      const db = getDbInstance();
      if (!db) return;
      const q = query(collection(db, 'blogs'), orderBy('publishedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedBlogs: Blog[] = [];
      querySnapshot.forEach(d => {
        const data = d.data();
        fetchedBlogs.push({
          id: d.id,
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          coverImage: data.coverImage || '',
          category: data.category || 'Travel',
          tags: data.tags || [],
          author: data.author || 'TripDM Team',
          published: data.published ?? false,
          publishedAt: data.publishedAt || '',
          updatedAt: data.updatedAt || '',
          metaTitle: data.metaTitle || '',
          metaDescription: data.metaDescription || '',
          readTime: data.readTime || '5 min read',
        });
      });
      setBlogs(fetchedBlogs);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setBlogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAuthorized) {
      fetchBlogs();
    }
  }, [user, isAuthorized, fetchBlogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEdit = (blog: Blog) => {
    setEditingBlogId(blog.id);
    setEditingOriginalPublishedAt(blog.publishedAt || '');
    setForm({
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      coverImage: blog.coverImage || '',
      category: blog.category || 'Travel Tips',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : (blog.tags || ''),
      author: blog.author || 'TripDM Team',
      metaTitle: blog.metaTitle || blog.title || '',
      metaDescription: blog.metaDescription || blog.excerpt || '',
      published: blog.published || false,
    });
    setAiRichData(null);
    setView('create');
  };

  const startNewPost = () => {
    setEditingBlogId(null);
    setEditingOriginalPublishedAt('');
    setForm(defaultForm);
    setAiRichData(null);
    setView('create');
  };

  const handleSubmit = async (publish: boolean) => {
    setSaving(true);
    setSaveMsg('');
    try {
      const db = getDbInstance();
      if (!db) throw new Error('DB not initialized');
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const wordCount = form.content.trim().split(/\s+/).length;
      const readTime = `${Math.ceil(wordCount / 200)} min read`;
      const now = new Date().toISOString();
      const docId = editingBlogId || form.slug || form.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g,'-').trim();

      const publishedAtDate = publish
        ? (editingOriginalPublishedAt || now)
        : (editingBlogId ? editingOriginalPublishedAt : '');

      const blogData: any = {
        title: form.title,
        slug: form.slug || docId,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        category: form.category || 'Travel',
        tags,
        author: user?.email === BLOG_ADMIN_EMAIL ? 'TripDM Travel Expert' : 'Guest',
        published: publish,
        updatedAt: now,
        metaTitle: form.metaTitle || form.title,
        metaDescription: form.metaDescription || form.excerpt,
        readTime,
        wordCount,
      };

      if (aiRichData) {
        blogData.focusKeyword = aiRichData.seo?.focusKeyword || '';
        blogData.secondaryKeywords = aiRichData.seo?.secondaryKeywords || [];
        blogData.ogTitle = aiRichData.seo?.ogTitle || blogData.metaTitle;
        blogData.ogDescription = aiRichData.seo?.ogDescription || blogData.metaDescription;
        blogData.canonical = aiRichData.seo?.canonical || `https://tripdm.com/blog/${docId}`;
        blogData.faq = aiRichData.faq || [];
        blogData.schema = JSON.stringify(aiRichData.schema || {});
        blogData.relatedTopics = aiRichData.relatedTopics || [];
        blogData.tableOfContents = aiRichData.article?.tableOfContents || [];
        blogData.photoPlaces = aiRichData.photoPlaces || aiRichData.imageSearchQueries || [];
      }

      const docRef = doc(db, 'blogs', docId);
      await setDoc(docRef, { ...blogData, publishedAt: publishedAtDate }, { merge: true });

      setSaveMsgType('success');
      setSaveMsg(
        publish
          ? (editingBlogId ? '🚀 Blog updated and published successfully!' : '🚀 Blog published successfully!')
          : (editingBlogId ? '💾 Draft updated!' : '💾 Draft saved!')
      );
      setEditingBlogId(null);
      setEditingOriginalPublishedAt('');
      setForm(defaultForm);
      setView('dashboard');
      fetchBlogs();
    } catch (err: any) {
      setSaveMsgType('error');
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    setUploadingImage(true);
    try {
      if (!user) throw new Error('User Auth not initialized');

      let fileToUpload = file;
      if (file.size > 2 * 1024 * 1024) {
        const compressed = await compressMultipleImages([file]);
        if (compressed.length > 0) {
          fileToUpload = compressed[0];
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('category', 'covers');
      formData.append('userId', user?.uid || 'admin');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setForm(f => ({ ...f, coverImage: data.url }));
      } else {
        throw new Error(data.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic) {
      setAiError('Please enter a topic');
      return;
    }
    setAiError('');
    setAiGenerating(true);
    setAiGenStep(aiCompetitors.trim() ? '🕷️ Crawling competitor pages & extracting SEO gaps...' : '🔍 Researching keywords and search intent...');
    try {
      if (aiCompetitors.trim()) {
        setTimeout(() => setAiGenStep('📊 Running semantic gap analysis against competitors...'), 3000);
        setTimeout(() => setAiGenStep('📝 Constructing high-authority tiered itinerary & sections...'), 7000);
        setTimeout(() => setAiGenStep('✍️ Writing 2500–4000 word outranking article...'), 12000);
        setTimeout(() => setAiGenStep('🔧 Building elevation, budget & permit comparison tables...'), 18000);
        setTimeout(() => setAiGenStep('✅ Finalizing schema, jumplinks & 9+ snippet FAQs...'), 24000);
      } else {
        setTimeout(() => setAiGenStep('📝 Generating detailed article outline & pass guide...'), 2000);
        setTimeout(() => setAiGenStep('✍️ Writing 2500–4000 word EEAT article...'), 6000);
        setTimeout(() => setAiGenStep('📊 Creating cost tables, tiered itineraries & FAQs...'), 12000);
        setTimeout(() => setAiGenStep('🔧 Optimizing metadata & JSON-LD schema...'), 18000);
        setTimeout(() => setAiGenStep('✅ Finalizing and validating JSON output...'), 24000);
      }

      const res = await fetch('/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic, keywords: aiKeywords, competitorUrls: aiCompetitors }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setAiRichData(data.richData || null);
        setForm(f => ({
          ...f,
          title: d.title || f.title,
          slug: d.slug || f.slug,
          excerpt: d.excerpt || f.excerpt,
          content: d.content || f.content,
          metaTitle: d.metaTitle || f.metaTitle,
          metaDescription: d.metaDescription || f.metaDescription,
          category: d.category || f.category,
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || f.tags),
        }));
        setShowAiModal(false);
        setSaveMsgType('success');
        const wordCount = (d.content || '').trim().split(/\s+/).length;
        setSaveMsg(`✨ EEAT Article generated! ~${wordCount.toLocaleString()} words. Review & publish!`);
      } else {
        setAiError(data.error || 'Failed to generate blog. Please try again.');
      }
    } catch (err: any) {
      setAiError(err.message || 'An error occurred');
    } finally {
      setAiGenerating(false);
      setAiGenStep('');
    }
  };

  const handleTogglePublish = async (blog: Blog) => {
    try {
      const db = getDbInstance();
      if (!db) return;
      await updateDoc(doc(db, 'blogs', blog.id), {
        published: !blog.published,
        publishedAt: !blog.published ? new Date().toISOString() : blog.publishedAt,
        updatedAt: new Date().toISOString()
      });
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (blog: Blog) => {
    if (!confirm(`Are you sure you want to delete "${blog.title}"?`)) return;
    try {
      const db = getDbInstance();
      if (!db) return;
      await deleteDoc(doc(db, 'blogs', blog.id));
      fetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };



  // BULK GENERATOR LOGIC
  const autoDetectCategory = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('itinerary') || t.includes('day') || t.includes('plan')) return 'Travel Guides';
    if (t.includes('cost') || t.includes('budget') || t.includes('cheapest') || t.includes('price')) return 'Budget Travel';
    if (t.includes('trek') || t.includes('rafting') || t.includes('camping') || t.includes('adventure') || t.includes('skiing')) return 'Adventure';
    if (t.includes('snow') || t.includes('family') || t.includes('couples') || t.includes('solo') || t.includes('safety') || t.includes('tips')) return 'Travel Tips';
    return 'Destinations';
  };

  const parseBulkInputToItems = (rawText: string, categoryOverride: string): BulkItem[] => {
    const trimmed = rawText.trim();
    if (!trimmed) return [];

    // 1. Check if input is a JSON array
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            const title = item.title || item.topic || '';
            if (!title) return null;
            let competitorUrls: string[] = [];
            if (Array.isArray(item.competitorUrls)) {
              competitorUrls = item.competitorUrls.filter(Boolean);
            } else if (typeof item.competitorUrls === 'string') {
              competitorUrls = item.competitorUrls.split(/[\n,]+/).map((u: string) => u.trim()).filter((u: string) => u.startsWith('http'));
            }
            return {
              id: Math.random().toString(36).substring(2, 9),
              title: title.trim(),
              keywords: item.keywords || item.focusKeywords || '',
              competitorUrls: competitorUrls.length > 0 ? competitorUrls : undefined,
              category: item.category || (categoryOverride === 'Auto-Detect' ? autoDetectCategory(title) : categoryOverride),
              status: 'pending' as const,
            };
          }).filter(Boolean) as BulkItem[];
        }
      } catch (e) {
        console.warn('Could not parse bulk input as JSON, falling back to line parser:', e);
      }
    }

    // 2. Line by line parser (supports Title | Keywords | URLs or simple titles)
    const lines = trimmed.split('\n');
    const items: BulkItem[] = [];

    for (const line of lines) {
      let cleaned = line.trim();
      if (!cleaned) continue;

      cleaned = cleaned.replace(/^(\d+[\.\)]\s*|[\*\-\•]\s*)/, '').trim();
      if (cleaned.length < 4) continue;

      // Check for pipe-separated format: Title | Keywords | URL1, URL2...
      if (cleaned.includes('|')) {
        const parts = cleaned.split('|').map(p => p.trim()).filter(Boolean);
        const title = parts[0];
        let keywords = '';
        let competitorUrls: string[] = [];

        if (parts.length >= 3) {
          keywords = parts[1];
          competitorUrls = parts[2].split(/[,\s]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
        } else if (parts.length === 2) {
          // If part 1 contains http, it's competitor URLs, otherwise keywords
          if (parts[1].includes('http://') || parts[1].includes('https://')) {
            competitorUrls = parts[1].split(/[,\s]+/).map(u => u.trim()).filter(u => u.startsWith('http'));
          } else {
            keywords = parts[1];
          }
        }

        if (title && !items.some(it => it.title.toLowerCase() === title.toLowerCase())) {
          items.push({
            id: Math.random().toString(36).substring(2, 9),
            title,
            keywords: keywords || undefined,
            competitorUrls: competitorUrls.length > 0 ? competitorUrls : undefined,
            category: categoryOverride === 'Auto-Detect' ? autoDetectCategory(title) : categoryOverride,
            status: 'pending',
          });
        }
      } else {
        // Plain title line
        cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
        if (!items.some(it => it.title.toLowerCase() === cleaned.toLowerCase())) {
          items.push({
            id: Math.random().toString(36).substring(2, 9),
            title: cleaned,
            category: categoryOverride === 'Auto-Detect' ? autoDetectCategory(cleaned) : categoryOverride,
            status: 'pending',
          });
        }
      }
    }

    return items;
  };

  const handleLoadPreset = (type: 'priority' | 'all' | 'multi_url_sample') => {
    if (type === 'multi_url_sample') {
      const sampleText = `Kashmir Travel Guide 2026 | kashmir travel guide, budget, safety | https://www.tourmyindia.com/states/jammu-kashmir/kashmir.html, https://www.triphills.com/kashmir-travel-guide-everything-you-need-to-know-before-you-go/
Spiti Valley Road Trip Planner | spiti valley 7 day itinerary, kunzum pass | https://www.traveljunky.in/blog/spiti-valley-guide, https://travelcoffee.in/blog/spiti-valley
Bali vs Maldives Honeymoon Guide 2026 | bali vs maldives cost, best for couples | https://www.tripadvisor.in/Tourism-g294226-Bali-Vacations.html
Best Places to Visit in Meghalaya | cherrapunji, living root bridges, dawki | https://www.tourmyindia.com/states/meghalaya/
Goa vs Gokarna for Beach Vacation | goa vs gokarna budget, beaches | https://travelcoffee.in/blog/goa-vs-gokarna
7 Days in Kerala Itinerary | kerala backwaters, munnar, alleppey | https://www.tourmyindia.com/states/kerala/
Kedarnath Trek Guide 2026 | kedarnath trek distance, registration, budget | https://travelcoffee.in/blog/kedarnath
20 Cheapest Countries to Visit from India | budget international travel, visa on arrival | https://travelcoffee.in/blog/cheap-countries-india
Auli Snowfall & Skiing Guide | auli ropeway, best snowfall month, cost | https://www.tourmyindia.com/states/uttarakhand/auli.html
15 Best Things to Do in Dubai 2026 | dubai tourist places, burj khalifa, desert safari | https://www.tripadvisor.in/Tourism-g295424-Dubai-Vacations.html`;
      setBulkInputText(sampleText);
      const items = parseBulkInputToItems(sampleText, bulkCategoryOverride);
      setBulkQueue(items);
      addLog('info', `📌 Loaded sample: 10 High-Intent Articles with Focus Keywords & Competitor URLs.`);
      return;
    }

    const titles = type === 'priority' ? UTTARAKHAND_PRIORITY_TITLES : UTTARAKHAND_ALL_TITLES;
    const text = titles.join('\n');
    setBulkInputText(text);

    const items = parseBulkInputToItems(text, bulkCategoryOverride);
    setBulkQueue(items);
    addLog('info', `📌 Loaded preset: ${titles.length} Uttarakhand titles.`);
  };

  const handleParseInputToQueue = () => {
    if (!bulkInputText.trim()) {
      alert('Please paste or enter blog titles, keywords, or competitor URLs first.');
      return;
    }
    const items = parseBulkInputToItems(bulkInputText, bulkCategoryOverride);
    if (items.length === 0) {
      alert('No valid blog items found. Please check your format.');
      return;
    }

    setBulkQueue(items);
    const withUrls = items.filter(i => i.competitorUrls && i.competitorUrls.length > 0).length;
    addLog('info', `📥 Loaded ${items.length} articles into generation queue (${withUrls} with Competitor URLs for live crawling).`);
  };

  const runBulkProcess = async () => {
    if (bulkQueue.length === 0) {
      alert('Queue is empty. Load titles first.');
      return;
    }

    setBulkRunning(true);
    bulkRunningRef.current = true;
    setBulkPaused(false);
    bulkPausedRef.current = false;

    addLog('info', `🚀 Starting bulk generation for ${bulkQueue.length} articles. Cooling delay: ${bulkDelaySeconds}s between calls.`);

    const db = getDbInstance();

    for (let i = 0; i < bulkQueue.length; i++) {
      if (!bulkRunningRef.current) {
        addLog('warn', '⏹ Bulk process cancelled by user.');
        break;
      }

      while (bulkPausedRef.current && bulkRunningRef.current) {
        addLog('warn', '⏸ Process paused. Waiting to resume...');
        await new Promise(r => setTimeout(r, 1000));
      }
      if (!bulkRunningRef.current) break;

      const item = bulkQueue[i];

      if (item.status === 'success') {
        addLog('info', `⏭️ Skipping completed item [${i + 1}/${bulkQueue.length}]: "${item.title}"`);
        continue;
      }

      setBulkCurrentIndex(i);

      setBulkQueue(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'generating', error: undefined } : it));
      
      const compCount = item.competitorUrls?.length || 0;
      if (compCount > 0) {
        addLog('info', `🕷️ [${i + 1}/${bulkQueue.length}] Crawling ${compCount} competitor URLs & generating: "${item.title}"...`);
      } else {
        addLog('info', `⚡ [${i + 1}/${bulkQueue.length}] Generating: "${item.title}"...`);
      }

      const startTime = Date.now();
      let success = false;
      let lastErr = '';
      let resultData: any = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        if (!bulkRunningRef.current) break;
        try {
          if (attempt > 1) {
            addLog('warn', `⚠️ Retrying attempt ${attempt}/3 for "${item.title}" (Waiting 12s rate-limit backoff)...`);
            await new Promise(r => setTimeout(r, 12000));
          }

          const controller = new AbortController();
          const fetchTimeout = setTimeout(() => controller.abort(), 120000);

          const res = await fetch('/api/ai/generate-blog', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic: item.title,
              keywords: item.keywords,
              competitorUrls: item.competitorUrls,
              category: item.category
            }),
          });
          clearTimeout(fetchTimeout);

          const data = await res.json();
          if (data.success && data.data) {
            resultData = data;
            success = true;
            break;
          } else {
            lastErr = data.error || 'AI generation failed';
            addLog('warn', `Attempt ${attempt} error: ${lastErr}`);
          }
        } catch (err: any) {
          lastErr = err.message || 'Network error';
          addLog('warn', `Attempt ${attempt} fetch failure: ${lastErr}`);
        }
      }

      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      if (success && resultData) {
        const d = resultData.data;
        const richData = resultData.richData;
        const wordCount = (d.content || '').trim().split(/\s+/).length;
        const docId = d.slug || item.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

        if (db) {
          try {
            const now = new Date().toISOString();
            const isPublish = bulkSaveMode === 'publish';

            const blogData: any = {
              title: d.title || item.title,
              slug: docId,
              excerpt: d.excerpt || '',
              content: d.content || '',
              coverImage: '',
              category: d.category || item.category || 'Travel Guides',
              tags: d.tags || [],
              author: 'TripDM Travel Expert',
              published: isPublish,
              publishedAt: isPublish ? now : '',
              updatedAt: now,
              metaTitle: d.metaTitle || d.title,
              metaDescription: d.metaDescription || d.excerpt,
              readTime: `${Math.ceil(wordCount / 200)} min read`,
              wordCount,
            };

            if (richData) {
              blogData.focusKeyword = richData.seo?.focusKeyword || '';
              blogData.secondaryKeywords = richData.seo?.secondaryKeywords || [];
              blogData.ogTitle = richData.seo?.ogTitle || blogData.metaTitle;
              blogData.ogDescription = richData.seo?.ogDescription || blogData.metaDescription;
              blogData.canonical = richData.seo?.canonical || `https://tripdm.com/blog/${docId}`;
              blogData.faq = richData.faq || [];
              blogData.schema = JSON.stringify(richData.schema || {});
              blogData.relatedTopics = richData.relatedTopics || [];
              blogData.tableOfContents = richData.article?.tableOfContents || [];
              blogData.photoPlaces = richData.photoPlaces || richData.imageSearchQueries || d?.photoPlaces || [];
            }

            await setDoc(doc(db, 'blogs', docId), blogData, { merge: true });
            addLog('success', `💾 Saved to Firestore as ${isPublish ? '🚀 Published' : '📋 Draft'}: "${docId}" (${wordCount.toLocaleString()} words in ${timeTaken}s)`);
          } catch (fsErr: any) {
            addLog('error', `Firestore save failure: ${fsErr.message}`);
          }
        }

        setBulkQueue(prev => prev.map((it, idx) => idx === i ? {
          ...it,
          status: 'success',
          wordCount,
          timeTaken,
          slug: docId,
          richData,
          blogFormData: d,
          published: bulkSaveMode === 'publish'
        } : it));

        fetchBlogs();
      } else {
        setBulkQueue(prev => prev.map((it, idx) => idx === i ? {
          ...it,
          status: 'failed',
          error: lastErr,
          timeTaken
        } : it));
        addLog('error', `❌ Failed to generate "${item.title}": ${lastErr}`);
      }

      if (i < bulkQueue.length - 1 && bulkRunningRef.current) {
        addLog('info', `⏳ Rate Limit Guard: Cooling down for ${bulkDelaySeconds}s...`);
        for (let sec = bulkDelaySeconds; sec > 0; sec--) {
          if (!bulkRunningRef.current) break;
          setBulkCoolingTimer(sec);
          await new Promise(r => setTimeout(r, 1000));
        }
        setBulkCoolingTimer(0);
      }
    }

    setBulkRunning(false);
    bulkRunningRef.current = false;
    setBulkCurrentIndex(-1);
    addLog('success', '🎉 Bulk process complete!');
  };

  const handlePauseBulk = () => {
    setBulkPaused(p => !p);
    addLog('warn', !bulkPaused ? '⏸ Pausing bulk execution...' : '▶ Resuming bulk execution...');
  };

  const handleStopBulk = () => {
    setBulkRunning(false);
    bulkRunningRef.current = false;
    setBulkPaused(false);
    bulkPausedRef.current = false;
    setBulkCoolingTimer(0);
    addLog('error', '⏹ Process stopped by user.');
  };

  const handleRetryFailedBulk = () => {
    setBulkQueue(prev => prev.map(it => it.status === 'failed' ? { ...it, status: 'pending', error: undefined } : it));
    addLog('info', '🔄 Reset failed items to pending state.');
  };

  const handleSingleItemRetry = async (index: number) => {
    const item = bulkQueue[index];
    if (!item) return;

    setBulkQueue(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'generating', error: undefined } : it));
    addLog('info', `🔄 Retrying single item: "${item.title}"`);

    const db = getDbInstance();
    const startTime = Date.now();
    try {
      const res = await fetch('/api/ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: item.title, category: item.category }),
      });
      const data = await res.json();
      const timeTaken = Math.round((Date.now() - startTime) / 1000);

      if (data.success && data.data) {
        const d = data.data;
        const richData = data.richData;
        const wordCount = (d.content || '').trim().split(/\s+/).length;
        const docId = d.slug || item.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

        if (db) {
          const now = new Date().toISOString();
          const isPublish = bulkSaveMode === 'publish';
          const blogData: any = {
            title: d.title || item.title,
            slug: docId,
            excerpt: d.excerpt || '',
            content: d.content || '',
            coverImage: '',
            category: d.category || item.category || 'Travel Guides',
            tags: d.tags || [],
            author: 'TripDM Travel Expert',
            published: isPublish,
            publishedAt: isPublish ? now : '',
            updatedAt: now,
            metaTitle: d.metaTitle || d.title,
            metaDescription: d.metaDescription || d.excerpt,
            readTime: `${Math.ceil(wordCount / 200)} min read`,
            wordCount,
          };
          await setDoc(doc(db, 'blogs', docId), blogData, { merge: true });
        }

        setBulkQueue(prev => prev.map((it, idx) => idx === index ? {
          ...it,
          status: 'success',
          wordCount,
          timeTaken,
          slug: docId,
          richData,
          blogFormData: d
        } : it));

        addLog('success', `✅ Re-generated and saved "${docId}" (${wordCount} words)`);
        fetchBlogs();
      } else {
        throw new Error(data.error || 'Failed generation');
      }
    } catch (err: any) {
      setBulkQueue(prev => prev.map((it, idx) => idx === index ? { ...it, status: 'failed', error: err.message } : it));
      addLog('error', `❌ Retry failed for "${item.title}": ${err.message}`);
    }
  };

  const handleRemoveItem = (index: number) => {
    setBulkQueue(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleClearAllBulk = () => {
    if (bulkRunning) {
      alert('Cannot clear while generator is running.');
      return;
    }
    if (confirm('Clear all titles in queue?')) {
      setBulkQueue([]);
      setBulkInputText('');
      setBulkLogs([]);
    }
  };

  const exportBulkResults = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bulkQueue, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tripdm_bulk_blogs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredQueue = bulkQueue.filter(item => {
    const matchesStatus = bulkFilterStatus === 'all' || item.status === bulkFilterStatus;
    const matchesSearch = !bulkSearchQuery || item.title.toLowerCase().includes(bulkSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const completedCount = bulkQueue.filter(i => i.status === 'success').length;
  const failedCount = bulkQueue.filter(i => i.status === 'failed').length;
  const pendingCount = bulkQueue.filter(i => i.status === 'pending' || i.status === 'generating').length;
  const progressPercent = bulkQueue.length > 0 ? Math.round((completedCount / bulkQueue.length) * 100) : 0;
  const estimatedTimeMin = Math.ceil((pendingCount * (20 + bulkDelaySeconds)) / 60);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const getRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(dateStr);
  };

  const filteredBlogs = blogs.filter(blog => {
    if (activeTab === 'published') return blog.published;
    if (activeTab === 'draft') return !blog.published;
    return true;
  });

  if (loading) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.loadSpinner} />
        <p style={{ color: '#64748b', fontSize: 14 }}>Initializing Blog Admin...</p>
      </div>
    );
  }

  // LOGIN VIEW
  if (!user || !isAuthorized) {
    return (
      <div style={s.loginWrapper}>
        <div style={s.orb1} />
        <div style={s.orb2} />

        <div style={s.loginCard}>
          <div style={s.loginHeader}>
            <div style={s.loginBrand}>
              <div style={s.loginBrandIcon}>✈</div>
              <span style={s.loginBrandName}>TripDM</span>
              <span style={s.loginBrandBadge}>ADMIN</span>
            </div>
            <h1 style={s.loginH1}>Welcome back</h1>
            <p style={s.loginSub}>Sign in to manage your travel blog & AI content generator</p>
          </div>

          <button
            className="google-btn"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loginLoading}
            style={s.googleBtn}
          >
            {googleLoading ? (
              <div style={{ ...s.btnSpinner, borderTopColor: '#0f172a' }} />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or continue with email</span>
            <div style={s.dividerLine} />
          </div>

          <form onSubmit={handleLogin} style={s.loginForm}>
            <div style={s.field}>
              <label style={s.fieldLabel}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tripdm26@gmail.com"
                style={s.fieldInput}
                required
                autoFocus
              />
            </div>
            <div style={s.field}>
              <label style={s.fieldLabel}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...s.fieldInput, paddingRight: 44 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={s.eyeBtn}
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {loginError && (
              <div style={s.errorAlert}>
                <span>⚠️</span> {loginError}
              </div>
            )}

            <button
              className="glow-btn"
              type="submit"
              disabled={loginLoading || googleLoading}
              style={{ ...s.signInBtn, opacity: (loginLoading || googleLoading) ? 0.7 : 1 }}
            >
              {loginLoading ? <div style={s.btnSpinner} /> : null}
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p style={s.loginFooter}>
            🔒 Restricted access for authorized TripDM administrators only.
          </p>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD UI
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .dash-main { animation: fadeIn .3s ease both; }
        .nav-item:hover { background: rgba(249,115,22,0.08) !important; color: #ea580c !important; }
        .blog-row:hover { border-color: rgba(249,115,22,0.25) !important; background: rgba(249,115,22,0.02) !important; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .action-btn:hover { background: rgba(0,0,0,0.04) !important; color: #0f172a !important; }
        .edit-btn:hover { background: rgba(59,130,246,0.1) !important; color: #2563eb !important; }
        .del-btn:hover { background: rgba(239,68,68,0.1) !important; color: #dc2626 !important; }
        .pub-btn:hover { background: rgba(16,185,129,0.1) !important; color: #059669 !important; }
        .tab:hover { color: #0f172a !important; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: rgba(249,115,22,0.5) !important; box-shadow: 0 0 0 3px rgba(249,115,22,0.1) !important; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 3px; }
        .terminal-scroll { font-family: 'Fira Code', monospace; font-size: 12px; line-height: 1.6; }

        /* Full Preview HTML Styling */
        .live-preview-content { font-family: 'Merriweather', Georgia, serif; font-size: 16px; line-height: 1.85; color: #292524; }
        .live-preview-content h1 { font-family: 'Merriweather', serif; font-size: 28px; font-weight: 900; color: #1c1917; margin: 32px 0 16px; }
        .live-preview-content h2 { font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 800; color: #1c1917; margin: 36px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
        .live-preview-content h3 { font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 700; color: #292524; margin: 28px 0 12px; }
        .live-preview-content p { margin-bottom: 20px; }
        .live-preview-content strong { font-weight: 700; color: #1c1917; }
        .live-preview-content blockquote { border-left: 4px solid #f97316; background: #fff7ed; padding: 14px 20px; margin: 24px 0; border-radius: 0 8px 8px 0; font-style: italic; color: #44403c; }
        .live-preview-content ul { margin: 0 0 20px 0; padding-left: 20px; }
        .live-preview-content ul li { margin-bottom: 8px; }
        .live-preview-content .table-wrap { overflow-x: auto; margin: 24px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .live-preview-content table { width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif; font-size: 13px; }
        .live-preview-content table tr:first-child td { background: #0f172a; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
        .live-preview-content table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
        .live-preview-content table tr:nth-child(even) td { background: #f8fafc; }
      `}</style>

      <div style={s.dash}>
        {/* Sidebar */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTop}>
            <div style={s.sidebarBrand}>
              <img src="/tripdm-logo.png" alt="TripDM Logo" style={{ height: 72, width: 'auto', objectFit: 'contain' }} />
            </div>
            <nav style={s.nav}>
              <button
                className="nav-item"
                onClick={() => setView('dashboard')}
                style={{ ...s.navItem, ...(view === 'dashboard' ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>⊞</span> Dashboard
              </button>
              <button
                className="nav-item"
                onClick={startNewPost}
                style={{ ...s.navItem, ...(view === 'create' && !editingBlogId ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>✦</span> New Post
              </button>
              <button
                className="nav-item"
                onClick={() => setView('bulk')}
                style={{ ...s.navItem, ...(view === 'bulk' ? s.navItemActive : {}) }}
              >
                <span style={s.navIcon}>⚡</span> Bulk Generator
              </button>
              <a
                href="/blog"
                target="_blank"
                className="nav-item"
                style={{ ...s.navItem, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              >
                <span style={s.navIcon}>↗</span> View Blog
              </a>
            </nav>
          </div>

          <div style={s.sidebarBottom}>
            <div style={s.sidebarUser}>
              <div style={s.userAvatar}>{user.email?.charAt(0).toUpperCase()}</div>
              <div style={s.userInfo}>
                <div style={s.userName}>Blog Admin</div>
                <div style={s.userEmail}>{user.email}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="dash-main" style={s.main}>

          {/* ── Dashboard View ── */}
          {view === 'dashboard' && (
            <div>
              <div style={s.topBar}>
                <div>
                  <h1 style={s.pageTitle}>Blog Dashboard</h1>
                  <p style={s.pageSub}>Manage and publish your travel blog content</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setView('bulk')}
                    style={{ ...s.newPostBtn, background: 'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow: '0 4px 12px rgba(15,23,42,0.15)' }}
                  >
                    <span>⚡</span> Bulk AI Generator
                  </button>
                  <button
                    onClick={startNewPost}
                    style={s.newPostBtn}
                  >
                    <span>+</span> New Post
                  </button>
                </div>
              </div>

              {saveMsg && (
                <div style={{ ...s.toast, background: saveMsgType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: saveMsgType === 'success' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)', color: saveMsgType === 'success' ? '#059669' : '#dc2626' }}>
                  {saveMsg}
                </div>
              )}

              {/* Stats */}
              <div style={s.statsRow}>
                {[
                  { label: 'Total Posts', value: blogs.length, color: '#ea580c', icon: '📝' },
                  { label: 'Published', value: blogs.filter(b => b.published).length, color: '#059669', icon: '✅' },
                  { label: 'Drafts', value: blogs.filter(b => !b.published).length, color: '#d97706', icon: '📋' },
                  { label: 'This Month', value: blogs.filter(b => b.publishedAt && new Date(b.publishedAt).getMonth() === new Date().getMonth()).length, color: '#7c3aed', icon: '📅' },
                ].map(stat => (
                  <div key={stat.label} style={s.statCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ ...s.statVal, color: stat.color }}>{stat.value}</div>
                        <div style={s.statLabel}>{stat.label}</div>
                      </div>
                      <span style={{ fontSize: 22 }}>{stat.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab filters */}
              <div style={s.tabs}>
                {(['all', 'published', 'draft'] as const).map(tab => (
                  <button
                    key={tab}
                    className="tab"
                    onClick={() => setActiveTab(tab)}
                    style={{ ...s.tab, ...(activeTab === tab ? s.tabActive : {}) }}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    <span style={{ ...s.tabCount, background: activeTab === tab ? 'rgba(249,115,22,0.1)' : 'rgba(0,0,0,0.06)', color: activeTab === tab ? '#ea580c' : '#64748b' }}>
                      {tab === 'all' ? blogs.length : tab === 'published' ? blogs.filter(b => b.published).length : blogs.filter(b => !b.published).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Blog list */}
              {blogsLoading ? (
                <div style={s.empty}>
                  <div style={s.loadSpinner} />
                  <p style={{ color: '#64748b', marginTop: 16 }}>Loading posts...</p>
                </div>
              ) : filteredBlogs.length === 0 ? (
                <div style={s.empty}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                  <p style={{ color: '#64748b', marginBottom: 20 }}>No posts yet. Create your first blog post!</p>
                  <button onClick={startNewPost} style={s.newPostBtn}>
                    + Write First Post
                  </button>
                </div>
              ) : (
                <div style={s.postList}>
                  {filteredBlogs.map(blog => (
                    <div key={blog.id} className="blog-row" style={s.postRow}>
                      {blog.coverImage ? (
                        <img src={blog.coverImage} alt={blog.title} style={s.postThumb} />
                      ) : (
                        <div style={{ ...s.postThumb, background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#94a3b8' }}>✈</div>
                      )}
                      <div style={s.postInfo}>
                        <div style={s.postMeta}>
                          <span style={{ ...s.postBadge, ...(blog.published ? s.publishedBadge : s.draftBadge) }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: blog.published ? '#10b981' : '#f59e0b', display: 'inline-block' }} />
                            {blog.published ? 'Published' : 'Draft'}
                          </span>
                          <span style={s.categoryChip}>{blog.category}</span>
                          <span style={s.postDate}>{formatDate(blog.publishedAt || blog.updatedAt)}</span>
                          <span style={s.postDate}>·</span>
                          <span style={s.postDate}>Written {getRelativeTime(blog.publishedAt || blog.updatedAt)}</span>
                        </div>
                        <h3 style={s.postTitle}>{blog.title}</h3>
                        <p style={s.postExcerpt}>{blog.excerpt?.slice(0, 110)}{blog.excerpt?.length > 110 ? '...' : ''}</p>
                      </div>
                      <div style={s.postActions}>
                        <a href={`/blog/${blog.slug}${blog.published ? '' : '?preview=true'}`} target="_blank" className="action-btn" style={{ ...s.actionBtn, color: '#0284c7', border: '1px solid rgba(2,132,199,0.2)', background: 'rgba(2,132,199,0.05)' }}>
                          👁️ View Live
                        </a>
                        <button onClick={() => handleEdit(blog)} className="edit-btn action-btn" style={{ ...s.actionBtn, color: '#2563eb', border: '1px solid rgba(59,130,246,0.2)', background: 'rgba(59,130,246,0.05)' }}>
                          Edit
                        </button>
                        <button onClick={() => handleTogglePublish(blog)} className={blog.published ? 'action-btn' : 'pub-btn action-btn'} style={{ ...s.actionBtn, ...(blog.published ? {} : { color: '#059669', border: '1px solid rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.05)' }) }}>
                          {blog.published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button onClick={() => handleDelete(blog)} className="del-btn action-btn" style={{ ...s.actionBtn, color: '#64748b' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Create / Edit View ── */}
          {view === 'create' && (
            <div>
              <div style={s.topBar}>
                <div>
                  <h1 style={s.pageTitle}>{editingBlogId ? 'Edit Blog Post' : 'New Blog Post'}</h1>
                  <p style={s.pageSub}>{editingBlogId ? 'Update the details below and save your changes' : 'Fill in the details below to create a SEO-optimized blog post'}</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={() => { setAiTopic(''); setAiKeywords(''); setAiError(''); setShowAiModal(true); }} 
                    style={{ ...s.backBtn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
                  >
                    ✨ Auto-Generate with AI
                  </button>
                  <button onClick={() => { setEditingBlogId(null); setEditingOriginalPublishedAt(''); setView('dashboard'); }} style={s.backBtn}>← Back</button>
                </div>
              </div>

              {saveMsg && (
                <div style={{ ...s.toast, background: saveMsgType === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: saveMsgType === 'success' ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(239,68,68,0.25)', color: saveMsgType === 'success' ? '#059669' : '#dc2626' }}>
                  {saveMsg}
                </div>
              )}

              <div style={s.formLayout}>
                <div style={s.formMain}>
                  <div style={s.formCard}>
                    <div style={s.cardTitle}>Post Content</div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Post Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleFormChange}
                        placeholder="e.g. 10 Best Places to Visit in Bali"
                        style={s.fInput}
                      />
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>URL Slug</label>
                      <div style={s.slugWrap}>
                        <span style={s.slugPrefix}>/blog/</span>
                        <input
                          type="text"
                          name="slug"
                          value={form.slug}
                          onChange={handleFormChange}
                          placeholder="10-best-places-to-visit-in-bali"
                          style={{ ...s.fInput, borderRadius: '0 8px 8px 0' }}
                        />
                      </div>
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Excerpt / Brief Summary *</label>
                      <textarea
                        name="excerpt"
                        value={form.excerpt}
                        onChange={handleFormChange}
                        rows={3}
                        placeholder="A short hook summarizing this article..."
                        style={s.fTextarea}
                      />
                    </div>
                    <div style={s.fieldGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <label style={s.fLabel}>Full Content (Markdown Format) *</label>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Supports standard markdown syntax</span>
                      </div>
                      <textarea
                        name="content"
                        value={form.content}
                        onChange={handleFormChange}
                        rows={18}
                        placeholder="# Heading 1&#10;&#10;Write your article here..."
                        style={{ ...s.fTextarea, fontFamily: 'Fira Code, monospace', fontSize: 13 }}
                      />
                    </div>
                  </div>

                  {/* SEO Section */}
                  <div style={s.formCard}>
                    <div style={s.cardTitle}>Search Engine Optimization (SEO)</div>
                    <div style={s.googlePreview}>
                      <div style={s.googlePreviewLabel}>Google Search Result Preview</div>
                      <div style={s.googlePreviewUrl}>https://tripdm.com › blog › {form.slug || 'url-slug'}</div>
                      <div style={s.googlePreviewTitle}>{form.metaTitle || form.title || 'Post Title'}</div>
                      <div style={s.googlePreviewDesc}>{form.metaDescription || form.excerpt || 'Meta description will appear here...'}</div>
                    </div>
                    <div style={s.fieldGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={s.fLabel}>Meta Title</label>
                        <span style={{ fontSize: 11, color: form.metaTitle.length > 60 ? '#ef4444' : '#64748b' }}>{form.metaTitle.length}/60 chars</span>
                      </div>
                      <input
                        type="text"
                        name="metaTitle"
                        value={form.metaTitle}
                        onChange={handleFormChange}
                        placeholder="Title for search engine results"
                        style={s.fInput}
                      />
                    </div>
                    <div style={s.fieldGroup}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label style={s.fLabel}>Meta Description</label>
                        <span style={{ fontSize: 11, color: form.metaDescription.length > 160 ? '#ef4444' : '#64748b' }}>{form.metaDescription.length}/160 chars</span>
                      </div>
                      <textarea
                        name="metaDescription"
                        value={form.metaDescription}
                        onChange={handleFormChange}
                        rows={3}
                        placeholder="Description for search engine results"
                        style={s.fTextarea}
                      />
                    </div>
                  </div>
                </div>

                {/* Sidebar controls */}
                <div style={s.formSidebar}>
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Publish</h2>
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={saving || !form.title || !form.content || !form.excerpt}
                      style={{ ...s.publishBtn, opacity: (saving || !form.title || !form.content || !form.excerpt) ? 0.5 : 1 }}
                    >
                      {saving ? <div style={{ ...s.btnSpinner, width: 16, height: 16, marginRight: 8, borderTopColor: '#fff' }} /> : '🚀 '}
                      {saving ? 'Saving...' : (editingBlogId ? 'Update & Publish' : 'Publish Now')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={saving || !form.title || !form.content}
                      style={{ ...s.draftBtn, opacity: (saving || !form.title || !form.content) ? 0.5 : 1 }}
                    >
                      {saving ? 'Saving...' : (editingBlogId ? '💾 Update Draft' : '💾 Save as Draft')}
                    </button>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>
                      Published posts are immediately visible on <strong style={{ color: '#475569' }}>tripdm.com/blog</strong>
                    </p>
                  </div>

                  {/* Post Details */}
                  <div style={s.formCard}>
                    <h2 style={s.cardTitle}>Post Details</h2>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Category</label>
                      <select name="category" value={form.category} onChange={handleFormChange} style={s.fSelect}>
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div style={s.fieldGroup}>
                      <label style={s.fLabel}>Tags (comma-separated)</label>
                      <input
                        type="text"
                        name="tags"
                        value={form.tags}
                        onChange={handleFormChange}
                        placeholder="Bali, Budget, Beach, Asia"
                        style={s.fInput}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
                      <button
                        onClick={() => handleSubmit(true)}
                        disabled={saving}
                        style={{ ...s.publishBtn, opacity: saving ? 0.7 : 1 }}
                      >
                        {saving ? 'Publishing...' : '🚀 Publish Now'}
                      </button>
                      <button
                        onClick={() => handleSubmit(false)}
                        disabled={saving}
                        style={{ ...s.draftBtn, opacity: saving ? 0.7 : 1 }}
                      >
                        {saving ? 'Saving...' : '💾 Save as Draft'}
                      </button>
                    </div>
                  </div>

                  <div style={s.formCard}>
                    <div style={s.cardTitle}>Cover Image</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <button
                        onClick={() => setImageMethod('upload')}
                        style={{ ...s.tabBtn, ...(imageMethod === 'upload' ? s.tabBtnActive : {}) }}
                      >
                        Upload
                      </button>
                      <button
                        onClick={() => setImageMethod('url')}
                        style={{ ...s.tabBtn, ...(imageMethod === 'url' ? s.tabBtnActive : {}) }}
                      >
                        Image URL
                      </button>
                    </div>
                    {imageMethod === 'upload' ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{ ...s.dropzone, border: isDragging ? '2px dashed #f97316' : '2px dashed rgba(0,0,0,0.15)' }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => e.target.files && handleImageFileChange(e.target.files[0])}
                          style={s.fileInputHidden}
                          id="cover-upload"
                        />
                        <label htmlFor="cover-upload" style={{ cursor: 'pointer', textAlign: 'center', display: 'block', width: '100%' }}>
                          {uploadingImage ? (
                            <div>
                              <div style={s.loadSpinner} />
                              <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Uploading & compressing...</p>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontSize: 24, display: 'block', marginBottom: 4 }}>📷</span>
                              <p style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>Click or drag image here</p>
                              <span style={{ fontSize: 11, color: '#64748b' }}>PNG, JPG, WebP up to 5MB</span>
                            </div>
                          )}
                        </label>
                      </div>
                    ) : (
                      <div style={s.fieldGroup}>
                        <input
                          type="text"
                          name="coverImage"
                          value={form.coverImage}
                          onChange={handleFormChange}
                          placeholder="https://images.unsplash.com/..."
                          style={s.fInput}
                        />
                      </div>
                    )}
                    {form.coverImage && (
                      <img src={form.coverImage} alt="Preview" style={s.coverPreview} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Bulk Generator View ── */}
          {view === 'bulk' && (
            <div>
              {/* Header */}
              <div style={s.topBar}>
                <div>
                  <h1 style={{ ...s.pageTitle, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>⚡ EEAT Bulk Article Generator</span>
                    <span style={s.activeBadge}>Gemini 2.0 / Flash Engine</span>
                  </h1>
                  <p style={s.pageSub}>
                    Paste multiple blog titles to generate 1500–2500 word EEAT travel guides with automated rate limit protection & live tracking
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => exportBulkResults()} disabled={bulkQueue.length === 0} style={{ ...s.backBtn, opacity: bulkQueue.length === 0 ? 0.5 : 1 }}>
                    📥 Export JSON ({bulkQueue.filter(i => i.status === 'success').length})
                  </button>
                  <button onClick={() => setView('dashboard')} style={s.backBtn}>
                    ← Back to Dashboard
                  </button>
                </div>
              </div>

              {/* Stat Cards */}
              <div style={s.statsRow}>
                <div style={s.statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...s.statVal, color: '#0f172a' }}>{bulkQueue.length}</div>
                      <div style={s.statLabel}>Total Queue Titles</div>
                    </div>
                    <span style={{ fontSize: 24 }}>📋</span>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...s.statVal, color: '#059669' }}>{completedCount}</div>
                      <div style={s.statLabel}>Completed ({progressPercent}%)</div>
                    </div>
                    <span style={{ fontSize: 24 }}>✅</span>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...s.statVal, color: '#d97706' }}>{pendingCount}</div>
                      <div style={s.statLabel}>Pending Generation</div>
                    </div>
                    <span style={{ fontSize: 24 }}>⏳</span>
                  </div>
                </div>
                <div style={s.statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...s.statVal, color: '#dc2626' }}>{failedCount}</div>
                      <div style={s.statLabel}>Failed Items</div>
                    </div>
                    <span style={{ fontSize: 24 }}>⚠️</span>
                  </div>
                </div>
              </div>

              {/* Configuration & Input Section */}
              <div style={s.bulkCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={s.cardTitle}>1. Upload / Paste Blog Topics & Competitors</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Supports: <strong>Title | Focus Keywords | Competitor URLs</strong> OR JSON Array OR Plain Titles (one per line)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => handleLoadPreset('multi_url_sample')} style={{ ...s.presetBtn, background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.25)' }}>
                      ⚡ Load 10 Sample Multi-Competitor Articles
                    </button>
                    <button onClick={() => handleLoadPreset('priority')} style={s.presetBtn}>
                      📌 Load Uttarakhand Top 10
                    </button>
                    <button onClick={() => handleLoadPreset('all')} style={s.presetBtn}>
                      🏔️ Load All 35+ Titles
                    </button>
                  </div>
                </div>

                <textarea
                  value={bulkInputText}
                  onChange={e => setBulkInputText(e.target.value)}
                  rows={8}
                  placeholder={`Paste batch items here (one per line). Supported formats:

Format 1 (Recommended with Competitors):
Kashmir Travel Guide 2026 | kashmir guide, budget, safety | https://tourmyindia.com/kashmir, https://triphills.com/kashmir

Format 2 (Title + Competitors):
Bali vs Maldives Honeymoon 2026 | https://tripadvisor.com/bali, https://theholidaze.com/maldives

Format 3 (Plain Titles):
Spiti Valley 7-Day Road Trip Guide

Format 4 (JSON Array):
[ { "topic": "...", "keywords": "...", "competitorUrls": ["..."] } ]`}
                  style={{ ...s.fTextarea, fontFamily: 'Fira Code, monospace', fontSize: 12, lineHeight: 1.5 }}
                  disabled={bulkRunning}
                />

                <div style={s.settingsGrid}>
                  <div style={s.settingBox}>
                    <label style={s.settingLabel}>⏱️ Rate Limit Protection Delay</label>
                    <select
                      value={bulkDelaySeconds}
                      onChange={e => setBulkDelaySeconds(Number(e.target.value))}
                      disabled={bulkRunning}
                      style={s.fSelect}
                    >
                      <option value={5}>5 Seconds (Fast - Paid Tier)</option>
                      <option value={8}>8 Seconds (Recommended Safe Tier)</option>
                      <option value={12}>12 Seconds (Extra Safe Tier)</option>
                      <option value={15}>15 Seconds (Strict Rate Limit Guard)</option>
                    </select>
                  </div>

                  <div style={s.settingBox}>
                    <label style={s.settingLabel}>💾 Auto-Save Destination</label>
                    <select
                      value={bulkSaveMode}
                      onChange={e => setBulkSaveMode(e.target.value as any)}
                      disabled={bulkRunning}
                      style={s.fSelect}
                    >
                      <option value="draft">Save as Drafts in Firestore (Review first)</option>
                      <option value="publish">Publish Immediately to Live Blog</option>
                    </select>
                  </div>

                  <div style={s.settingBox}>
                    <label style={s.settingLabel}>🏷️ Category Assignment</label>
                    <select
                      value={bulkCategoryOverride}
                      onChange={e => setBulkCategoryOverride(e.target.value)}
                      disabled={bulkRunning}
                      style={s.fSelect}
                    >
                      <option value="Auto-Detect">Auto-Detect Category from Keywords</option>
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    onClick={handleParseInputToQueue}
                    disabled={bulkRunning}
                    style={s.parseBtn}
                  >
                    📥 Parse & Load into Queue
                  </button>
                  {bulkQueue.length > 0 && (
                    <button
                      onClick={handleClearAllBulk}
                      disabled={bulkRunning}
                      style={s.clearBtn}
                    >
                      🗑️ Clear Queue
                    </button>
                  )}
                </div>
              </div>

              {/* Progress & Live Monitor Container */}
              {bulkQueue.length > 0 && (
                <div style={s.bulkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={s.cardTitle}>2. Live Processing Dashboard</div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>
                        Progress: {completedCount} / {bulkQueue.length} done ({progressPercent}%) · ~{estimatedTimeMin} mins remaining
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {!bulkRunning ? (
                        <button onClick={runBulkProcess} style={s.startBulkBtn}>
                          ▶ Start Generation Queue
                        </button>
                      ) : (
                        <>
                          <button onClick={handlePauseBulk} style={s.pauseBulkBtn}>
                            {bulkPaused ? '▶ Resume' : '⏸ Pause'}
                          </button>
                          <button onClick={handleStopBulk} style={s.stopBulkBtn}>
                            ⏹ Stop Process
                          </button>
                        </>
                      )}
                      {failedCount > 0 && !bulkRunning && (
                        <button onClick={handleRetryFailedBulk} style={s.retryAllBtn}>
                          🔄 Retry Failed ({failedCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={s.progressBarTrack}>
                    <div style={{ ...s.progressBarFill, width: `${progressPercent}%` }} />
                  </div>

                  {/* Active Task Card & Cooling Timer */}
                  {bulkCurrentIndex >= 0 && bulkQueue[bulkCurrentIndex] && (
                    <div style={s.activeTaskCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={s.activeSpinner} />
                        <div>
                          <div style={{ fontSize: 11, color: '#ea580c', fontWeight: 700, textTransform: 'uppercase' }}>
                            Currently Processing Item [{bulkCurrentIndex + 1}/{bulkQueue.length}]
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                            {bulkQueue[bulkCurrentIndex].title}
                          </div>
                        </div>
                      </div>
                      {bulkCoolingTimer > 0 && (
                        <div style={s.coolingTimerBadge}>
                          ⏳ Cooling down for API rate-limit: <strong>{bulkCoolingTimer}s</strong> remaining
                        </div>
                      )}
                    </div>
                  )}

                  {/* Terminal Console Logs */}
                  <div style={s.terminalContainer}>
                    <div style={s.terminalHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 8, fontWeight: 600 }}>TripDM AI Console Stream</span>
                      </div>
                      <button onClick={() => setBulkLogs([])} style={s.clearLogBtn}>Clear Log</button>
                    </div>
                    <div className="terminal-scroll" style={s.terminalLogs}>
                      {bulkLogs.length === 0 ? (
                        <div style={{ color: '#64748b' }}>Console output will stream here when generation starts...</div>
                      ) : (
                        bulkLogs.map(log => (
                          <div key={log.id} style={{
                            color: log.type === 'success' ? '#34d399' : log.type === 'error' ? '#f87171' : log.type === 'warn' ? '#fbbf24' : '#cbd5e1',
                            marginBottom: 3
                          }}>
                            <span style={{ color: '#64748b', marginRight: 8 }}>[{log.timestamp}]</span>
                            {log.message}
                          </div>
                        ))
                      )}
                      <div ref={terminalLogsEndRef} />
                    </div>
                  </div>
                </div>
              )}

              {/* Queue Items Table */}
              {bulkQueue.length > 0 && (
                <div style={s.bulkCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                    <div style={s.cardTitle}>3. Queue & Generation Status ({filteredQueue.length})</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Search queue titles..."
                        value={bulkSearchQuery}
                        onChange={e => setBulkSearchQuery(e.target.value)}
                        style={{ ...s.fInput, width: 200, padding: '6px 10px', fontSize: 12 }}
                      />
                      <select
                        value={bulkFilterStatus}
                        onChange={e => setBulkFilterStatus(e.target.value as any)}
                        style={{ ...s.fSelect, width: 130, padding: '6px 10px', fontSize: 12 }}
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>#</th>
                          <th style={s.th}>Article Title</th>
                          <th style={s.th}>Category</th>
                          <th style={s.th}>Status</th>
                          <th style={s.th}>Word Count</th>
                          <th style={s.th}>Time</th>
                          <th style={s.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQueue.map((item, idx) => (
                          <tr key={item.id} style={{ ...s.tr, background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ ...s.td, color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={s.td}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                              {item.keywords && (
                                <div style={{ fontSize: 11, color: '#475569', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: '#ea580c', fontWeight: 600 }}>🔑</span> {item.keywords}
                                </div>
                              )}
                              {item.competitorUrls && item.competitorUrls.length > 0 && (
                                <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                    🕷️ {item.competitorUrls.length} Competitors (Live Crawl)
                                  </span>
                                </div>
                              )}
                              {item.slug && <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>/blog/{item.slug}</div>}
                              {item.error && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>⚠️ {item.error}</div>}
                            </td>
                            <td style={s.td}>
                              <span style={s.categoryChip}>{item.category}</span>
                            </td>
                            <td style={s.td}>
                              {item.status === 'pending' && <span style={s.badgePending}>⏳ Pending</span>}
                              {item.status === 'generating' && <span style={s.badgeGenerating}><div style={s.miniSpinner} /> Generating...</span>}
                              {item.status === 'success' && <span style={s.badgeSuccess}>✅ Success</span>}
                              {item.status === 'failed' && <span style={s.badgeFailed}>❌ Failed</span>}
                            </td>
                            <td style={s.td}>
                              {item.wordCount ? `${item.wordCount.toLocaleString()} words` : '-'}
                            </td>
                            <td style={s.td}>
                              {item.timeTaken ? `${item.timeTaken}s` : '-'}
                            </td>
                            <td style={s.td}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {item.status === 'success' && (
                                  <button onClick={() => { setPreviewModalItem(item); setPreviewTab('render'); }} style={{ ...s.miniActionBtn, color: '#ea580c', border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.06)' }}>
                                    👁️ Preview Page
                                  </button>
                                )}
                                {item.status === 'failed' && !bulkRunning && (
                                  <button onClick={() => handleSingleItemRetry(idx)} style={{ ...s.miniActionBtn, color: '#ea580c' }}>
                                    🔄 Retry
                                  </button>
                                )}
                                <button onClick={() => handleRemoveItem(idx)} disabled={bulkRunning} style={{ ...s.miniActionBtn, color: '#94a3b8' }}>
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── PREVIEW ARTICLE MODAL (PROPER LIVE WEB PAGE VIEW) ── */}
      {previewModalItem && (
        <div style={s.modalOverlay} onClick={() => setPreviewModalItem(null)}>
          <div style={{ ...s.modalContent, maxWidth: 960, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{previewModalItem.title}</span>
                  <span style={{ fontSize: 11, background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                    {previewModalItem.wordCount ? `${previewModalItem.wordCount.toLocaleString()} words` : 'Generated Article'}
                  </span>
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>Live format preview of your EEAT article</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={`/blog/${previewModalItem.slug || previewModalItem.id}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(249,115,22,0.25)' }}
                >
                  ↗ Open Full Page Preview
                </a>
                <button onClick={() => setPreviewModalItem(null)} style={s.closeModalBtn}>✕</button>
              </div>
            </div>

            {/* Modal Tab Switcher */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={() => setPreviewTab('render')} style={{ ...s.tabBtn, ...(previewTab === 'render' ? s.tabBtnActive : {}) }}>🌐 Live HTML Page View</button>
              <button onClick={() => setPreviewTab('seo')} style={{ ...s.tabBtn, ...(previewTab === 'seo' ? s.tabBtnActive : {}) }}>🔍 SEO & Schema Metadata</button>
              <button onClick={() => setPreviewTab('faq')} style={{ ...s.tabBtn, ...(previewTab === 'faq' ? s.tabBtnActive : {}) }}>❓ FAQs ({previewModalItem.richData?.faq?.length || 0})</button>
              <button onClick={() => setPreviewTab('markdown')} style={{ ...s.tabBtn, ...(previewTab === 'markdown' ? s.tabBtnActive : {}) }}>📄 Raw Markdown</button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)' }}>
              
              {/* Tab 1: Live HTML Rendered Page */}
              {previewTab === 'render' && (
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                  {/* Article Hero Preview Header */}
                  <div style={{ background: 'linear-gradient(135deg, #1c1917, #292524)', padding: '24px 28px', borderRadius: 12, color: '#fff', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                    <span style={{ background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 10px', borderRadius: 4, display: 'inline-block', marginBottom: 10 }}>
                      {previewModalItem.category || 'Travel Guides'}
                    </span>
                    <h1 style={{ fontFamily: 'Merriweather, Georgia, serif', fontSize: 24, fontWeight: 900, lineHeight: 1.3, marginBottom: 14 }}>
                      {previewModalItem.title}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 11 }}>T</div>
                        <span style={{ fontWeight: 600, color: '#fff' }}>TripDM Travel Expert</span>
                      </div>
                      <span>•</span>
                      <span>⏱️ {Math.ceil((previewModalItem.wordCount || 1500) / 200)} min read</span>
                      <span>•</span>
                      <span>📅 {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Excerpt Box */}
                  {previewModalItem.blogFormData?.excerpt && (
                    <div style={{ fontFamily: 'Merriweather, Georgia, serif', fontSize: 16, lineHeight: 1.7, color: '#44403c', borderLeft: '4px solid #f97316', padding: '14px 20px', background: '#fff7ed', borderRadius: '0 8px 8px 0', marginBottom: 24, fontStyle: 'italic' }}>
                      {previewModalItem.blogFormData.excerpt}
                    </div>
                  )}

                  {/* Rendered HTML Article Body */}
                  <div
                    className="live-preview-content"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownToHtml(previewModalItem.blogFormData?.content || '')
                    }}
                  />
                </div>
              )}

              {/* Tab 2: SEO & Schema Metadata */}
              {previewTab === 'seo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={s.googlePreview}>
                    <div style={s.googlePreviewLabel}>Google Search Result Preview</div>
                    <div style={s.googlePreviewUrl}>https://tripdm.com › blog › {previewModalItem.slug || 'url-slug'}</div>
                    <div style={s.googlePreviewTitle}>{previewModalItem.richData?.seo?.title || previewModalItem.title}</div>
                    <div style={s.googlePreviewDesc}>{previewModalItem.richData?.seo?.metaDescription || previewModalItem.blogFormData?.excerpt}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Targeting SEO Metadata</div>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                      <strong>Primary Keyword:</strong> <span style={{ color: '#ea580c', fontWeight: 600 }}>{previewModalItem.richData?.seo?.focusKeyword || 'Uttarakhand Travel'}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>
                      <strong>Secondary Keywords:</strong> {previewModalItem.richData?.seo?.secondaryKeywords?.join(', ') || 'N/A'}
                    </div>
                    <div style={{ fontSize: 13, color: '#334155' }}>
                      <strong>Canonical URL:</strong> <a href={previewModalItem.richData?.seo?.canonical || `#`} target="_blank" style={{ color: '#0284c7' }}>{previewModalItem.richData?.seo?.canonical || `https://tripdm.com/blog/${previewModalItem.slug}`}</a>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>JSON-LD Schema Payload</div>
                    <pre style={{ fontFamily: 'Fira Code, monospace', fontSize: 11, background: '#0f172a', color: '#34d399', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
                      {JSON.stringify(previewModalItem.richData?.schema || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Tab 3: FAQ Accordions */}
              {previewTab === 'faq' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                    Frequently Asked Questions ({previewModalItem.richData?.faq?.length || 0})
                  </div>
                  {(!previewModalItem.richData?.faq || previewModalItem.richData.faq.length === 0) ? (
                    <div style={{ color: '#64748b', fontSize: 13 }}>No separate FAQs generated for this item.</div>
                  ) : (
                    previewModalItem.richData.faq.map((faq: any, i: number) => (
                      <div key={i} style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 14, marginBottom: 6 }}>❓ {faq.question}</div>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{faq.answer}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 4: Raw Markdown Code */}
              {previewTab === 'markdown' && (
                <pre style={{ fontFamily: 'Fira Code, monospace', fontSize: 12, whiteSpace: 'pre-wrap', color: '#334155', lineHeight: 1.6 }}>
                  {previewModalItem.blogFormData?.content || previewModalItem.richData?.article?.contentMarkdown}
                </pre>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE POST AI MODAL ── */}
      {showAiModal && (
        <div style={s.modalOverlay} onClick={() => setShowAiModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>✨ Generate Single Article with AI</h3>
              <button onClick={() => setShowAiModal(false)} style={s.closeModalBtn}>✕</button>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.fLabel}>Blog Topic or Title *</label>
              <input
                type="text"
                value={aiTopic}
                onChange={e => setAiTopic(e.target.value)}
                placeholder="e.g. Kedarnath Travel Guide 2026"
                style={s.fInput}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.fLabel}>Focus Keywords (optional)</label>
              <input
                type="text"
                value={aiKeywords}
                onChange={e => setAiKeywords(e.target.value)}
                placeholder="e.g. kedarnath trek, budget, itinerary"
                style={s.fInput}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.fLabel}>
                Competitor URLs to Outrank (optional)
                <span style={{ fontSize: 11, color: '#ea580c', marginLeft: 6, fontWeight: 500 }}>
                  (Crawl & Semantic Gap Analysis)
                </span>
              </label>
              <textarea
                value={aiCompetitors}
                onChange={e => setAiCompetitors(e.target.value)}
                placeholder="Paste 1 to 5 Google 1st-page competitor URLs (one per line or comma separated)&#10;e.g. https://competitor.com/blog/offbeat-kashmir"
                rows={3}
                style={{ ...s.fTextarea, fontSize: 12, height: 72 }}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                💡 AI crawls competitor pages live, extracts keyword gaps & ensures your article covers missing topics, tables, and itineraries.
              </div>
            </div>
            {aiError && (
              <div style={{ ...s.errorAlert, marginBottom: 12 }}>⚠️ {aiError}</div>
            )}
            {aiGenStep && (
              <div style={{ fontSize: 13, color: '#7c3aed', marginBottom: 12, fontWeight: 600 }}>
                {aiGenStep}
              </div>
            )}
            <button
              onClick={handleAiGenerate}
              disabled={aiGenerating}
              style={{ ...s.publishBtn, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', opacity: aiGenerating ? 0.7 : 1 }}
            >
              {aiGenerating ? 'Generating High-Ranking EEAT Article...' : '✨ Generate Outranking Article'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s: { [key: string]: React.CSSProperties } = {
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' },
  loadSpinner: { width: 32, height: 32, borderWidth: 3, borderStyle: 'solid', borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loginWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', position: 'relative', overflow: 'hidden', padding: 24 },
  orb1: { position: 'absolute', top: '-10%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', pointerEvents: 'none' },
  orb2: { position: 'absolute', bottom: '-10%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' },
  loginCard: { background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 420, position: 'relative', zIndex: 2, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' },
  loginHeader: { textAlign: 'center', marginBottom: 32 },
  loginBrand: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 24 },
  loginBrandIcon: { width: 36, height: 36, background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700 },
  loginBrandName: { fontSize: 18, fontWeight: 800, color: '#0f172a' },
  loginBrandBadge: { background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#ea580c', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 },
  loginH1: { fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6 },
  loginSub: { color: '#64748b', fontSize: 14 },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '11px 16px', color: '#334155', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' },
  dividerText: { color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' },
  loginForm: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { color: '#475569', fontSize: 13, fontWeight: 500 },
  fieldInput: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 10, padding: '11px 14px', color: '#0f172a', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', fontFamily: 'inherit', width: '100%' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 4 },
  errorAlert: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' },
  signInBtn: { background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: 'none', borderRadius: 10, padding: '12px 20px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'box-shadow 0.2s', fontFamily: 'inherit', width: '100%', boxShadow: '0 4px 12px rgba(249,115,22,0.2)' },
  btnSpinner: { width: 16, height: 16, borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.1)', borderTopColor: '#0f172a', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  loginFooter: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 20 },

  dash: { display: 'flex', minHeight: '100vh', background: '#f8fafc', color: '#334155' },
  sidebar: { width: 220, background: '#ffffff', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 10 },
  sidebarTop: { padding: '20px 16px' },
  sidebarBrand: { display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.06)' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%' },
  navItemActive: { background: 'rgba(249,115,22,0.1)', color: '#ea580c' },
  navIcon: { fontSize: 16 },
  sidebarBottom: { padding: 16, borderTop: '1px solid rgba(0,0,0,0.06)' },
  sidebarUser: { display: 'flex', alignItems: 'center', gap: 10 },
  userAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  userInfo: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, color: '#0f172a' },
  userEmail: { fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  main: { marginLeft: 220, flex: 1, padding: 32, maxWidth: 1400 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  activeBadge: { fontSize: 11, fontWeight: 600, color: '#ea580c', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: 12 },
  newPostBtn: { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', gap: 6 },
  backBtn: { background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' },
  toast: { padding: '12px 16px', borderRadius: 8, border: '1px solid transparent', marginBottom: 20, fontSize: 13, fontWeight: 500 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 18, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  statVal: { fontSize: 28, fontWeight: 800, marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },

  tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 8 },
  tab: { background: 'none', border: 'none', padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: '#ffffff', color: '#ea580c', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  tabCount: { fontSize: 11, padding: '1px 6px', borderRadius: 10 },

  postList: { display: 'flex', flexDirection: 'column', gap: 10 },
  postRow: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.2s' },
  postThumb: { width: 72, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0 },
  postInfo: { flex: 1, minWidth: 0 },
  postMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' },
  postBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  publishedBadge: { background: 'rgba(16,185,129,0.1)', color: '#059669' },
  draftBadge: { background: 'rgba(245,158,11,0.1)', color: '#d97706' },
  categoryChip: { fontSize: 11, color: '#475569', background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: 10 },
  postDate: { fontSize: 11, color: '#64748b' },
  postTitle: { fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.4, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  postExcerpt: { fontSize: 12, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  postActions: { display: 'flex', gap: 6, flexShrink: 0 },
  actionBtn: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#475569', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' },
  empty: { background: '#ffffff', border: '1px dashed rgba(0,0,0,0.15)', borderRadius: 12, padding: 48, textAlign: 'center' },

  formLayout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' },
  formMain: { display: 'flex', flexDirection: 'column', gap: 20 },
  formSidebar: { display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 },
  formCard: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.06)' },
  fieldGroup: { marginBottom: 16 },
  fLabel: { display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 },
  fInput: { width: '100%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'inherit' },
  fTextarea: { width: '100%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 },
  fSelect: { width: '100%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '9px 12px', color: '#0f172a', fontSize: 13, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
  slugWrap: { display: 'flex' },
  slugPrefix: { background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.15)', borderRight: 'none', borderRadius: '8px 0 0 8px', padding: '9px 10px', fontSize: 12, color: '#64748b' },
  googlePreview: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 16 },
  googlePreviewLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  googlePreviewUrl: { fontSize: 12, color: '#166534', marginBottom: 2 },
  googlePreviewTitle: { fontSize: 16, color: '#1a0dab', marginBottom: 4, lineHeight: 1.3 },
  googlePreviewDesc: { fontSize: 12, color: '#475569', lineHeight: 1.4 },
  tabBtn: { flex: 1, padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: '#f8fafc', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' },
  tabBtnActive: { background: '#ffffff', border: '1px solid #ea580c', color: '#ea580c' },
  dropzone: { border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' },
  fileInputHidden: { display: 'none' },
  coverPreview: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 10 },
  publishBtn: { width: '100%', background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none', borderRadius: 8, padding: '11px 0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' },
  draftBtn: { width: '100%', background: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 0', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer' },

  bulkCard: { background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  presetBtn: { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#ea580c', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  settingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 16 },
  settingBox: { background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' },
  settingLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 },
  parseBtn: { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.2)' },
  clearBtn: { background: '#fff', border: '1px solid rgba(0,0,0,0.15)', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#64748b', cursor: 'pointer' },
  startBulkBtn: { background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' },
  pauseBulkBtn: { background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  stopBulkBtn: { background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  retryAllBtn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  progressBarTrack: { height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #f97316, #10b981)', transition: 'width 0.4s ease' },
  activeTaskCard: { background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  activeSpinner: { width: 22, height: 22, borderWidth: 3, borderStyle: 'solid', borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  coolingTimerBadge: { background: '#fff', border: '1px solid rgba(245,158,11,0.3)', color: '#d97706', padding: '4px 10px', borderRadius: 20, fontSize: 12 },

  terminalContainer: { background: '#0f172a', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b' },
  terminalHeader: { background: '#1e293b', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  terminalLogs: { padding: 14, height: 180, overflowY: 'auto' },
  clearLogBtn: { background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid rgba(0,0,0,0.08)' },
  tr: { borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.15s' },
  td: { padding: '10px 12px', fontSize: 13, color: '#334155' },
  badgePending: { background: '#f1f5f9', color: '#64748b', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  badgeGenerating: { background: 'rgba(249,115,22,0.1)', color: '#ea580c', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 },
  miniSpinner: { width: 10, height: 10, borderWidth: 2, borderStyle: 'solid', borderColor: 'rgba(249,115,22,0.2)', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 0.6s linear infinite' },
  badgeSuccess: { background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  badgeFailed: { background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10 },
  miniActionBtn: { background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: '#ffffff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
  closeModalBtn: { background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer' },
};
