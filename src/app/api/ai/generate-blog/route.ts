import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-static';

/**
 * Robust JSON parser for LLM outputs.
 * Handles markdown fences, invalid escape sequences (\', \*, \$), unescaped newlines/tabs inside strings,
 * trailing commas, and truncated braces/brackets.
 */
function cleanAndParseJson(raw: string): any {
  // 1. Direct parse attempt
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // 2. Strip code fences and find outer object boundaries
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (_) {}

  // 3. Fix invalid backslash escapes (JSON only allows: " \ / b f n r t u)
  let sanitized = text.replace(/\\([^"\\\/bfnrtu])/g, (match, char) => {
    if (char === "'") return "'";
    return `\\\\${char}`;
  });

  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // 4. Fix raw/unescaped control characters (newlines, carriage returns, tabs) inside string values
  let insideString = false;
  let isEscaped = false;
  const out: string[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    const c = sanitized[i];
    if (c === '"' && !isEscaped) {
      insideString = !insideString;
      out.push(c);
    } else if (insideString) {
      if (c === '\n') {
        out.push('\\n');
      } else if (c === '\r') {
        // drop CR
      } else if (c === '\t') {
        out.push('\\t');
      } else if (c.charCodeAt(0) < 32) {
        // drop invalid ASCII control characters
      } else {
        out.push(c);
      }
    } else {
      out.push(c);
    }
    isEscaped = (c === '\\' && !isEscaped);
  }
  sanitized = out.join('');

  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // 5. Remove trailing commas before } and ]
  sanitized = sanitized.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(sanitized);
  } catch (_) {}

  // 6. Auto-close truncated JSON if the response ended abruptly
  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < sanitized.length; i++) {
    const c = sanitized[i];
    if (c === '"' && !esc) inStr = !inStr;
    else if (!inStr) {
      if (c === '{') openBraces++;
      else if (c === '}') openBraces = Math.max(0, openBraces - 1);
      else if (c === '[') openBrackets++;
      else if (c === ']') openBrackets = Math.max(0, openBrackets - 1);
    }
    esc = (c === '\\' && !esc);
  }
  if (inStr) sanitized += '"';
  while (openBrackets > 0) { sanitized += ']'; openBrackets--; }
  while (openBraces > 0) { sanitized += '}'; openBraces--; }

  try {
    return JSON.parse(sanitized);
  } catch (finalError: any) {
    throw new Error(`JSON parse failed: ${finalError.message}`);
  }
}

/**
 * Server-side helper to fetch and clean text from competitor URLs.
 */
async function fetchCompetitorContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();

    // Extract title, description, headings, and clean body text
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                      html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const h2Matches = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    const h3Matches = [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

    // Clean body text by stripping scripts, styles, svgs, and tags
    let bodyText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    bodyText = bodyText.slice(0, 3500);

    return `URL: ${url}
Title: ${title}
Description: ${description}
H1 Headings: ${h1Matches.join(' | ')}
H2 Headings: ${h2Matches.slice(0, 15).join(' | ')}
H3 Headings: ${h3Matches.slice(0, 15).join(' | ')}
Content Snippet: ${bodyText}`;
  } catch (err: any) {
    console.warn(`Could not fetch competitor URL ${url}:`, err.message);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, keywords, competitorUrls, category } = body;

    if (!topic) {
      return NextResponse.json({ success: false, error: 'Topic is required' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'Gemini API Key is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const today = new Date().toISOString().split('T')[0];

    // Process competitor URLs if provided
    let competitorEvidenceText = '';
    let parsedCompetitorUrls: string[] = [];

    if (Array.isArray(competitorUrls)) {
      parsedCompetitorUrls = competitorUrls.filter(Boolean);
    } else if (typeof competitorUrls === 'string' && competitorUrls.trim()) {
      parsedCompetitorUrls = competitorUrls
        .split(/[\n,]+/)
        .map(u => u.trim())
        .filter(u => u.startsWith('http'));
    }

    if (parsedCompetitorUrls.length > 0) {
      console.log(`Crawling ${parsedCompetitorUrls.length} competitor URLs for topic "${topic}"...`);
      const crawlResults = await Promise.all(parsedCompetitorUrls.slice(0, 5).map(fetchCompetitorContent));
      const validResults = crawlResults.filter(Boolean);
      if (validResults.length > 0) {
        competitorEvidenceText = `
### LIVE COMPETITOR BENCHMARK EVIDENCE (Google 1st-Page Rankings):
The following data was extracted directly from live top-ranking competitor pages for this topic:

${validResults.join('\n\n---\n\n')}

CRITICAL COMPETITOR ANALYSIS RULES (INFORMATION GAIN & OUTRANKING PROTOCOL):
DO NOT merely paraphrase or copy the competitor content. Google penalizes regurgitated content.
Instead, perform an intelligent semantic gap analysis:
1. **Identify Missing Topics & Angles:** What key details, logistical warnings, or local realities did competitors omit or skim over?
2. **Missing Entities & Attractions:** What specific viewpoints, routes, base camps, or local food did they miss?
3. **Missing Semantic Keywords:** Extract and naturally integrate the high-value search terms and phrases that appear across top rankings.
4. **Questions Answered Better:** Identify what travelers are asking on Google (PPA) and provide more direct, accurate, snippet-optimized answers.
5. **Information Gain (Unique Value):** Add real 2026 ground intelligence, exact INR cost breakdowns, realistic driving hours, and weather buffer days that competitors lack.
6. **Correct Outdated/Inaccurate Information:** Fix outdated tariffs, obsolete permit rules, or vague advice present in older competitor blogs.
7. **Strict Originality:** Maintain TripDM's distinct, authoritative, helpful expert tone. Never duplicate competitor phrasing.
`;
      }
    }

    const prompt = `
You are the CHIEF SEO STRATEGIST, VETERAN GLOBAL TRAVEL JOURNALIST, and GOOGLE EEAT ARCHITECT for TripDM (a premier travel agency platform).

Your mission: Write the ultimate, definitive, 100% field-tested travel guide for this topic that dominates Google search, outranking TripAdvisor, Lonely Planet, MakeMyTrip, and Thrillophilia.

TOPIC: ${topic}
${keywords ? `FOCUS KEYWORDS: ${keywords}` : ''}
${category ? `PREFERRED CATEGORY: ${category}` : ''}
DATE: ${today}
${competitorEvidenceText}

================================================================================
DYNAMIC TOPIC-AWARE ARCHITECTURE RULES (CRITICAL):
================================================================================

You MUST FIRST detect the exact intent & archetype of the topic "${topic}" and dynamically generate the most appropriate high-ranking structure. DO NOT force irrelevant sections (e.g. do NOT put mountain passes on beach comparisons; do NOT put border checkposts on city guides).

### ARCHETYPE 1: Destination / Regional / Offbeat Guide (e.g., "Hidden Places in Kashmir", "Spiti Valley Guide", "Kerala Backwaters")
- **Structure**:
  1. Introduction: The Core Appeal & What Offbeat Actually Means Here
  2. Quick Facts & Essential Logistics (Entry rules, SIM connectivity, cash/ATMs, fuel/transit)
  3. Best Time to Visit & Seasonal Access Table (Include Pass/Road elevation table ONLY if it is an alpine/mountain region; otherwise, weather/monsoon table)
  4. Categorized Destinations / Attractions (Split by logistics, e.g., Category A: Accessible Day Trips vs Category B: Remote Multi-Day Circuits)
  5. Practical Multi-Day / 7-Day Itinerary Table (with realistic driving hours and Weather/Road Buffer Days)
  6. Permits & Local Regulations (Include border/checkpost rules ONLY if it is a border/tribal/protected area; otherwise local permits/tickets)
  7. Where to Stay: Accommodation Guide Table (Homestays / JKTDC / Resorts / Guest Houses with INR tariffs)
  8. Local Food & Authentic Dining Culture (Home specialties, breakfast bakery/tea culture, renowned local food spots)
  9. Realistic Multi-Tier 2026 Budget Breakdown Table in INR (Budget Backpacking vs Mid-Range vs Private Comfort)
  10. Audience & Fitness Suitability (Families with kids, Seniors, Couples, Solo/Trekkers)
  11. Packing Checklist & Mountain/Terrain Safety Tips
  12. Responsible Travel & Local Etiquette
  13. TripDM Custom Tour Packages CTA

### ARCHETYPE 2: Comparison Article (X vs Y) (e.g., "Bali vs Maldives", "Goa vs Gokarna", "Kedarnath vs Badrinath", "Thailand vs Vietnam")
- **Structure**:
  1. Introduction & The Fundamental Dilemma: Which is Right for You in 2026?
  2. Quick Comparison Scorecard Table (Vibe, Average Cost/Day, Best For, Ideal Duration, Flight/Visa, Winner)
  3. Vibe, Scenery & Atmosphere Showdown
  4. Top Beaches / Attractions / Activities Face-Off
  5. Cost & Budget Comparison Table (Side-by-side INR comparison for Stays, Food, Local Transport, Activities)
  6. Best Time to Visit, Weather & Seasonality Comparison
  7. Food, Dining & Nightlife Face-Off
  8. Where to Stay: Accommodation Comparison (Luxury vs Boutique vs Budget in both)
  9. Audience Match: Which Wins for Honeymooners, Families, Solo Travelers, or Budget Travelers?
  10. Practical Transit & Flight Logistics (How to reach, flight costs, visa on arrival)
  11. The Final Verdict & Decision Matrix (Pick X if..., Pick Y if...)
  12. TripDM Custom Tour Packages CTA

### ARCHETYPE 3: Itinerary Guide (e.g., "7 Days in Kerala", "10 Days in Vietnam", "5 Days in Dubai")
- **Structure**:
  1. Introduction & Route Overview Summary
  2. Quick Trip Facts (Ideal days, best starting airport, total route distance, transport choice)
  3. Best Season & Weather Window for this Route
  4. Day-by-Day Step-by-Step Itinerary (Morning, Afternoon, Evening, Recommended Stay Base, Transit Time)
  5. Interactive Route Logistics (Private cab vs trains vs domestic flights, booking tips)
  6. Where to Stay along the Circuit (Table of base towns with recommended stays & INR rates)
  7. Realistic Route Budget Breakdown Table in INR
  8. What to Book in Advance & Passes/Tickets Guide
  9. Audience Feasibility & Pacing (Is it rushed? Advice for seniors/kids)
  10. Packing Checklist & Essential Transit Hacks
  11. TripDM Custom Tour Packages CTA

### ARCHETYPE 4: Budget / Visa / Travel Hacks (e.g., "20 Cheapest Countries from India", "Visa on Arrival Countries")
- **Structure**:
  1. Introduction & 2026 Travel Cost Realities
  2. Master Comparison Table (Destination, Daily Budget in INR, Visa Status, Flight Estimate, Ideal Stay Duration)
  3. In-Depth Breakdown for Top Destinations (Highlights, cheap stays, street food, budget hacks)
  4. Flight Booking Hacks & Seasonality Secrets
  5. Visa Application / On-Arrival Process & Exact Fees
  6. Daily Cost Management (Hostels/Guesthouses, local food, SIMs & Forex Cards)
  7. Common Tourist Traps & Safety Mistakes to Avoid
  8. TripDM Custom Tour Packages CTA

### ARCHETYPE 5: Best Places / Things to Do Listicle (e.g., "15 Best Places in Jaipur", "Top 10 Cafes in Manali")
- **Structure**:
  1. Introduction: What Makes These Places Iconic
  2. Curated Grouping / Categorization (e.g., Heritage & Palaces, Sunset Viewpoints, Food & Bazaars)
  3. Spot-by-Spot In-Depth Guide (Timings, Entry Tickets in INR, Best Time of Day, Photography Advice, Pro Tip)
  4. Master Summary Table (Spot name, Category, Entry Fee, Ideal time spent, Location)
  5. Suggested 1 to 3 Day Sightseeing Circuit
  6. How to Get Around (Local autos, metro, cabs, walking routes)
  7. Local Food & Iconic Dining Spots Near Attractions
  8. Best Time to Visit & Crowd Avoidance Strategies
  9. TripDM Custom Tour Packages CTA

================================================================================
STRICT QUALITY & WRITING PRINCIPLES (EEAT):
================================================================================
1. **100% Human-Expert Voice**:
   - Zero generic AI fluff. No "nestled", "tapestry", "delve", "bustling", "vibrant", "breathtaking tapestry".
   - Short, punchy paragraphs (2–4 sentences max). Use contractions naturally.
   - Ground everything in real-world facts: exact numbers (INR, driving hours, flight times, pass elevations, ticket costs), real shop/homestay/restaurant names, and genuine insider warnings.
2. **Markdown Tables**:
   - Every article MUST contain 2 to 4 responsive Markdown tables (e.g., Comparison Scorecard, Itinerary, Stays, Budget, or Pass Elevation).
   - Valid Markdown pipes and separator rows. NEVER put bullet points inside table cells.
3. **9+ Featured-Snippet-Optimized FAQs**:
   - 9 to 12 direct, concise, factual answers (2–4 sentences) targeting "People Also Ask" questions.
4. **Length**:
   - \`contentMarkdown\` MUST be rich, complete, and approximately **2,500 to 4,000 words** of dense, original travel intelligence.

================================================================================
EXACT JSON OUTPUT STRUCTURE:
================================================================================
Return ONLY a valid JSON object matching this schema:

{
  "seo": {
    "title": "Compelling SEO Title (55-65 chars) with primary keyword near start and 2026",
    "metaDescription": "150-160 chars. High CTR description ending with benefit and keyword.",
    "focusKeyword": "primary search keyword phrase",
    "secondaryKeywords": ["keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
    "slug": "url-friendly-slug-with-hyphens",
    "canonical": "https://tripdm.com/blog/[slug]",
    "ogTitle": "Social media optimized title",
    "ogDescription": "Social media description"
  },

  "article": {
    "title": "Full H1 article headline with power words and 2026 guide context",
    "excerpt": "Compelling 1-2 sentence hook summarizing the entire article. 120-160 chars.",
    "readingTime": "12 min read",
    "category": "One of: Destinations | Travel Tips | Budget Travel | Luxury Travel | Adventure | India Travel | International Travel | Food & Culture | Travel Guides",
    "tableOfContents": [
      {"id": "section-slug-1", "title": "Section Title 1", "level": 2},
      {"id": "section-slug-2", "title": "Section Title 2", "level": 2}
    ],
    "contentMarkdown": "FULL DETAILED MARKDOWN ARTICLE (2,500-4,000 words) strictly following the chosen Archetype. Include clean Markdown tables, H2 (##) and H3 (###) tags, anchor link IDs (<div id='section-slug'></div>) matching tableOfContents, pro tips (💡), and common mistakes (⚠️). (DO NOT put an FAQ section in contentMarkdown since it is placed in the faq array below)."
  },

  "faq": [
    {
      "question": "Specific high-intent search query 1?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 2?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 3?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 4?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 5?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 6?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 7?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 8?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    },
    {
      "question": "Specific high-intent search query 9?",
      "answer": "Direct 2-4 sentence featured snippet answer."
    }
  ],

  "schema": {
    "article": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "",
      "description": "",
      "author": {"@type": "Person", "name": "TripDM Travel Expert"},
      "publisher": {"@type": "Organization", "name": "TripDM", "url": "https://tripdm.com"},
      "datePublished": "${today}",
      "dateModified": "${today}"
    },
    "faq": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": []
    },
    "breadcrumb": {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": []
    }
  },

  "callToAction": "Clear CTA paragraph inviting readers to customize their dream holiday with verified local operators on TripDM: https://tripdm.com",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"],

  "photoPlaces": [
    "Specific photogenic landmark 1 (e.g. Kedarnath Temple Uttarakhand, Betaab Valley, Nainital Lake)",
    "Specific photogenic landmark 2 (e.g. Mandakini River, Kempty Falls, Pangong Lake)",
    "Specific photogenic landmark 3",
    "Specific photogenic landmark 4",
    "Specific photogenic landmark 5"
  ],

  "photoPlacesGuidance": "CRITICAL: If the blog is an advice, booking, packing, comparison, or travel tips article WITHOUT physical geographical tourist attractions, DO NOT output random English dictionary words or guide sentences. Instead, return clean curated aesthetic travel concepts like ['Travel Planning', 'Airplane Travel', 'Travel Luggage', 'Vacation Planning'] or an empty array [].",

  "relatedTopics": ["Related Topic Guide 1", "Related Topic Guide 2", "Related Topic Guide 3"]
}

NOW GENERATE THE COMPLETE, ULTRA-HIGH-QUALITY JSON FOR: "${topic}"
`;

    // Verified active & working models for this project (HTTP 200 verified)
    const tryModels = [
      'gemini-2.5-flash',       // Primary: high quality, fast
      'gemini-3.5-flash',       // Active fallback 1
      'gemini-3.5-flash-lite',  // Active fallback 2: lightweight, high rate-limit ceiling
      'gemini-3.6-flash',       // Active fallback 3
    ];
    let result = null;
    let lastError = null;

    for (const modelName of tryModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
          },
        });
        console.log(`Trying model: ${modelName}...`);
        result = await model.generateContent(prompt);
        console.log(`Successfully generated content using: ${modelName}`);
        break; // Success
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!result) {
      throw lastError || new Error('All AI models failed');
    }

    const response = await result.response;
    let text = response.text();

    try {
      const fullData = cleanAndParseJson(text);

      // Map the rich structure to what the blog form expects
      const blogFormData = {
        title: fullData.article?.title || fullData.seo?.title || '',
        slug: fullData.seo?.slug || '',
        excerpt: fullData.article?.excerpt || '',
        content: buildFullContent(fullData),
        category: fullData.article?.category || category || 'Destinations',
        tags: fullData.tags || [],
        metaTitle: fullData.seo?.title || '',
        metaDescription: fullData.seo?.metaDescription || '',
        photoPlaces: Array.isArray(fullData.photoPlaces) ? fullData.photoPlaces : (fullData.imageSearchQueries || []),
        _richData: fullData,
      };

      return NextResponse.json({ success: true, data: blogFormData, richData: fullData });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, '\nRaw text (first 500 chars):', text.substring(0, 500));
      return NextResponse.json({ success: false, error: 'AI returned malformed JSON. Please try again.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error generating blog with Gemini:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred during generation' }, { status: 500 });
  }
}

/**
 * Assembles the final, publish-ready Markdown content from all sections of the rich JSON.
 */
function buildFullContent(data: any): string {
  const parts: string[] = [];

  const article = data.article || {};
  const faq = data.faq || [];
  const cta = data.callToAction || '';
  const schema = data.schema || {};
  const seo = data.seo || {};
  const relatedTopics = data.relatedTopics || [];
  const toc = article.tableOfContents || [];

  // --- SEO JSON-LD Schema Block ---
  if (schema.article || schema.faq) {
    const schemaPayload = {
      article: schema.article || {},
      faq: schema.faq || {},
      breadcrumb: schema.breadcrumb || {},
    };
    parts.push(`<!-- SCHEMA_JSON:${JSON.stringify(schemaPayload)} -->`);
  }

  // --- Focus Keyword ---
  if (seo.focusKeyword) {
    parts.push(`<!-- FOCUS_KEYWORD: ${seo.focusKeyword} -->`);
  }

  // --- Quick Jumplinks to Navigate ---
  if (toc.length > 0) {
    parts.push('## Quick Jumplinks to Navigate\n');
    toc.forEach((item: any) => {
      const indent = item.level === 3 ? '  ' : '';
      const targetId = item.id || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      parts.push(`${indent}- [${item.title}](#${targetId})`);
    });
    parts.push('');
  }

  // --- Main Article Content ---
  if (article.contentMarkdown) {
    let cleanMarkdown = article.contentMarkdown;
    // Strip duplicate FAQ section from contentMarkdown if structured faq array is present
    if (faq.length > 0) {
      cleanMarkdown = cleanMarkdown.replace(/(?:^|\n)##\s*(Frequently Asked Questions|FAQs)[\s\S]*?(?=\n##\s+|\n---\s*\n##\s+|$)/gi, '').trim();
    }
    parts.push(cleanMarkdown);
    parts.push('');
  }

  // --- Call to Action ---
  if (cta) {
    parts.push('---');
    parts.push('');
    parts.push('## ✈️ Book Your Trip with TripDM\n');
    parts.push(cta);
    parts.push('');
  }

  // --- FAQ Section ---
  if (faq.length > 0) {
    parts.push('---');
    parts.push('');
    parts.push('## Frequently Asked Questions\n<div id="faq"></div>\n');
    faq.forEach((item: any, i: number) => {
      parts.push(`### ${i + 1}. ${item.question}\n`);
      parts.push(`${item.answer}\n`);
    });
  }

  // --- Secondary Keywords ---
  if (seo.secondaryKeywords?.length > 0) {
    parts.push('');
    parts.push(`<!-- SECONDARY_KEYWORDS: ${seo.secondaryKeywords.join(', ')} -->`);
  }

  // --- Related Topics ---
  if (relatedTopics.length > 0) {
    parts.push('');
    parts.push('## You Might Also Like\n');
    relatedTopics.forEach((topic: string) => {
      parts.push(`- ${topic}`);
    });
    parts.push('');
  }

  return parts.join('\n');
}
