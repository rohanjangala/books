"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { isAccessTokenValid, clearAccessToken } from "@/lib/access-token";

type ImportedBook = {
    title: string;
    author: string;
    myRating?: number;
    avgRating?: number;
    shelves?: string;
    goodreadsId?: string;
    readAt?: string;
    dateAdded?: string;
    pages?: number;
    yearPublished?: number;
    originalYear?: number;
    binding?: string;
    publisher?: string;
};

type TopicRecommendation = {
    topic: string;
    content: string;
};

const LOCAL_STORAGE_KEY = "goodreads_import_books_v1";

// Simple bar chart component
function BarChart({ data, maxValue, label }: { data: { label: string; value: number; color?: string }[]; maxValue: number; label: string }) {
    return (
        <div className="space-y-2">
            <div className="text-xs text-stone-500 font-light mb-3">{label}</div>
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-16 text-xs text-stone-400 truncate text-right">{item.label}</div>
                    <div className="flex-1 h-6 bg-stone-800/50 rounded overflow-hidden">
                        <div
                            className={`h-full ${item.color || 'bg-amber-500/70'} rounded transition-all duration-500`}
                            style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
                        />
                    </div>
                    <div className="w-8 text-xs text-stone-400 text-right">{item.value}</div>
                </div>
            ))}
        </div>
    );
}

// Stat card component
function StatCard({ title, value, subtitle, icon }: { title: string; value: string | number; subtitle?: string; icon?: React.ReactNode }) {
    return (
        <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-stone-500 font-light uppercase tracking-wide">{title}</p>
                    <p className="text-2xl font-light text-stone-100 mt-1">{value}</p>
                    {subtitle && <p className="text-xs text-stone-500 mt-1 font-light">{subtitle}</p>}
                </div>
                {icon && <div className="text-amber-500/50">{icon}</div>}
            </div>
        </div>
    );
}

export default function ProPage() {
    const [books, setBooks] = useState<ImportedBook[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessGranted, setAccessGranted] = useState(false);
    const router = useRouter();

    // AI Topics & Recommendations state
    const [topicsData, setTopicsData] = useState<{ topic: string; content: string | null; error: boolean }[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

    // Loading states
    const [isDiscoveringTopics, setIsDiscoveringTopics] = useState(false);
    const [isFetchingBooks, setIsFetchingBooks] = useState(false);

    // PDF Restrictions
    const [pdfNotice, setPdfNotice] = useState<string | null>(null);

    useEffect(() => {
        document.title = "Pro • Book Recommender";

        // Check access token validity
        if (!isAccessTokenValid()) {
            setLoading(false);
            setAccessGranted(false);
            return;
        }
        setAccessGranted(true);

        if (typeof window === "undefined") return;

        try {
            const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setBooks(parsed.books || []);
            }
        } catch (e) {
            console.error("Failed to load books:", e);
        }
        setLoading(false);
    }, []);

    // Dismiss PDF notice after 3 seconds
    useEffect(() => {
        if (pdfNotice) {
            const timer = setTimeout(() => setPdfNotice(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [pdfNotice]);

    const handleDownloadPdf = () => {
        if (topicsData.length === 0) {
            setPdfNotice("Please click 'Discover Topics for You' first.");
            return;
        }
        if (isFetchingBooks || isDiscoveringTopics) {
            setPdfNotice("Please wait for all recommendations to finish loading before downloading the PDF.");
            return;
        }
        // If ready, trigger native print
        window.print();
    };

    // Helper for artificial delay
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Fetch personalized AI topics and their books sequentially
    const fetchAllRecommendations = async () => {
        if (books.length === 0) return;

        setIsDiscoveringTopics(true);
        setTopicsData([]);
        setSelectedTopic(null);

        try {
            const bookSummary = books
                .filter(b => b.shelves?.toLowerCase() === "read")
                .map(b => ({ title: b.title, author: b.author }));

            // 1. Fetch Topics
            const topicsRes = await fetch("/api/pro/topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ books: bookSummary }),
            });
            const topicsText = await topicsRes.text();

            let parsedTopics: string[] = [];
            try {
                const cleaned = topicsText.replace(/^["']|["']$/g, "");
                const match = cleaned.match(/\[([^\]]+)\]/);
                if (match) {
                    parsedTopics = match[1]
                        .split(",")
                        .map((t: string) => t.trim().replace(/^['"]|['"]$/g, ""));
                }
            } catch {
                console.error("Failed to parse topics:", topicsText);
                setIsDiscoveringTopics(false);
                return;
            }

            if (parsedTopics.length === 0) {
                setIsDiscoveringTopics(false);
                return;
            }

            // Initialize the UI with the discovered topics
            const initialData = parsedTopics.map(t => ({ topic: t, content: null, error: false }));
            setTopicsData(initialData);
            setSelectedTopic(parsedTopics[0]); // Select first automatically
            setIsDiscoveringTopics(false);

            // 2. Fetch Books for all topics at once
            setIsFetchingBooks(true);

            try {
                const res = await fetch(`/api/pro/books`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ books: bookSummary, topics: parsedTopics })
                });
                if (!res.ok) throw new Error("Failed to fetch books");
                const content = await res.text();

                try {
                    const recommendations = JSON.parse(content);

                    setTopicsData(prev => {
                        return prev.map(t => {
                            if (recommendations[t.topic]) {
                                return { ...t, content: recommendations[t.topic], error: false };
                            }
                            return t;
                        });
                    });
                } catch (parseError) {
                    console.error("Failed to parse JSON recommendations", parseError, content);
                    setTopicsData(prev => prev.map(t => ({ ...t, content: "Could not parse recommendations from the server.", error: true })));
                }
            } catch (e) {
                console.error("Failed fetching books for topics", e);
                setTopicsData(prev => prev.map(t => ({ ...t, content: "Could not load recommendations. (API Rate Limit or Error encountered)", error: true })));
            }
        } catch (e) {
            console.error("Failed to fetch full recommendations:", e);
        } finally {
            setIsDiscoveringTopics(false);
            setIsFetchingBooks(false);
        }
    };

    // Computed statistics (kept minimal: rating dist + books by year)
    const stats = useMemo(() => {
        if (!books.length) return null;

        const readBooks = books.filter(b => b.shelves?.toLowerCase() === "read");

        // Total pages read
        const totalPages = readBooks.reduce((sum, b) => sum + (b.pages || 0), 0);

        // Rating distribution
        const ratingDist = [5, 4, 3, 2, 1].map(r => ({
            label: `${r} ★`,
            value: readBooks.filter(b => b.myRating === r).length,
            color: r >= 4 ? 'bg-amber-500/70' : r === 3 ? 'bg-stone-500/70' : 'bg-red-500/50'
        }));
        const maxRating = Math.max(...ratingDist.map(r => r.value), 1);

        // Average rating
        const ratedBooks = readBooks.filter(b => b.myRating && b.myRating > 0);
        const avgRating = ratedBooks.length > 0
            ? (ratedBooks.reduce((sum, b) => sum + (b.myRating || 0), 0) / ratedBooks.length).toFixed(1)
            : "—";

        // Books by year read
        const booksByYear: Record<string, number> = {};
        readBooks.forEach(b => {
            if (b.readAt) {
                const year = b.readAt.split(/[-/]/)[0];
                if (year && year.length === 4) {
                    booksByYear[year] = (booksByYear[year] || 0) + 1;
                }
            }
        });
        const yearData = Object.entries(booksByYear)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([year, count]) => ({ label: year, value: count }));
        const maxYearCount = Math.max(...yearData.map(y => y.value), 1);

        return {
            totalBooks: books.length,
            readCount: readBooks.length,
            totalPages,
            avgRating,
            ratingDist,
            maxRating,
            yearData,
            maxYearCount,
        };
    }, [books]);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
            </main>
        );
    }

    if (!accessGranted) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-light text-stone-200 mb-2">Pro Access Required</h1>
                    <p className="text-stone-500 font-light text-sm mb-6">Purchase access from the homepage to unlock personalized AI recommendations and detailed reading statistics.</p>
                    <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
                        Go to Homepage
                    </Link>
                </div>
            </main>
        );
    }

    if (!books.length) {
        return (
            <main className="min-h-screen bg-stone-950">
                <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
                    <Link href="/" className="inline-flex items-center text-stone-500 hover:text-stone-300 text-sm font-light mb-8 transition-colors">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <div className="py-20">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-light text-stone-300 mb-3">No library imported yet</h1>
                        <p className="text-stone-500 font-light mb-6">Import your Goodreads library to unlock personalized recommendations</p>
                        <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
                            Import Library
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const activeTopicData = topicsData.find(t => t.topic === selectedTopic);

    return (
        <main className="min-h-screen bg-stone-950 relative">
            {/* PDF Restriction Toast */}
            {pdfNotice && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-amber-500/10 border border-amber-500/40 text-amber-200 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg backdrop-blur-md">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium">{pdfNotice}</span>
                    </div>
                </div>
            )}

            {/* Header controls (outside of PDF content) */}
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center text-stone-500 hover:text-stone-300 text-sm font-light transition-colors print:hidden">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>

                    <button
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800/80 border border-stone-700/50 text-stone-300 text-sm font-medium hover:bg-stone-800 transition-colors print:hidden"
                    >
                        {isFetchingBooks ? (
                            <div className="w-4 h-4 border-2 border-amber-500 border-t-amber-200 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        Download PDF
                    </button>
                </div>
            </div>

            {/* Content to be included in PDF */}
            <div id="pro-page-content" className="container mx-auto px-4 pb-16 max-w-6xl bg-stone-950">
                <h1 className="text-xl font-light text-stone-200 text-center mb-8">Pro Recommendations</h1>

                {stats && (
                    <>
                        {/* Compact Stats Row */}
                        <div className="grid grid-cols-3 gap-4 mb-8" data-html2canvas-ignore="false">
                            <StatCard
                                title="Books Read"
                                value={stats.readCount}
                                subtitle={`of ${stats.totalBooks} total`}
                                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                            />
                            <StatCard
                                title="Pages Read"
                                value={stats.totalPages.toLocaleString()}
                                subtitle={`~${Math.round(stats.totalPages / 250)} avg novels`}
                                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            />
                            <StatCard
                                title="Avg Rating"
                                value={`${stats.avgRating} ★`}
                                subtitle="your ratings"
                                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                            />
                        </div>

                        {/* Two Charts */}
                        <div className="grid md:grid-cols-2 gap-6 mb-10" style={{ pageBreakInside: 'avoid' }}>
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Rating Distribution</h3>
                                <BarChart data={stats.ratingDist} maxValue={stats.maxRating} label="How you rate books" />
                            </div>
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Books by Year</h3>
                                <BarChart data={stats.yearData} maxValue={stats.maxYearCount} label="Reading volume over time" />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-stone-800/50 mb-10" />

                        {/* AI Recommendations Section */}
                        <div className="mb-8">
                            <div className="text-center mb-6">
                                <h2 className="text-lg text-stone-200 font-light mb-2">
                                    Personalized Recommendations
                                </h2>
                                <p className="text-stone-500 text-sm font-light mb-5">
                                    Get AI-curated topics and book picks based on your reading history
                                </p>

                                {topicsData.length === 0 && !isDiscoveringTopics && (
                                    <button
                                        onClick={fetchAllRecommendations}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-all duration-200 cursor-pointer print:hidden"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        Discover Topics for You
                                    </button>
                                )}

                                {/* Initial Topic Generator Loading */}
                                {isDiscoveringTopics && (
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 print:hidden">
                                        <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin mb-4" />
                                        <span className="text-amber-300 font-medium text-lg">Curating your reading list...</span>
                                        <span className="text-stone-500 font-light text-sm max-w-sm">
                                            Analyzing your history to find 5 unique topics.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Topics List as Pills */}
                            {topicsData.length > 0 && (
                                <div className="flex flex-wrap gap-3 justify-center mb-8 print:hidden">
                                    {topicsData.map((t, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedTopic(t.topic)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${selectedTopic === t.topic
                                                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                                : "bg-stone-900/50 border-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                                                } border`}
                                        >
                                            {t.topic}
                                            {t.content === null && isFetchingBooks && (
                                                <span className="ml-2 inline-block w-3 h-3 border-2 border-stone-600 border-t-amber-400 rounded-full animate-spin align-middle" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Books Loading State / Content Display */}
                            {selectedTopic && activeTopicData && (
                                <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 md:p-8" style={{ pageBreakInside: 'avoid' }}>
                                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-800/50">
                                        <h3 className="text-xl text-amber-300 font-medium">
                                            {activeTopicData.topic}
                                            {/* Hide for PDF since PDF only triggers once all are loaded anyways */}
                                            {activeTopicData.content === null && <span className="text-sm font-light text-stone-500 ml-3 print:hidden">(Writing recommendations...)</span>}
                                        </h3>
                                    </div>

                                    {activeTopicData.content === null ? (
                                        <div className="py-10 flex flex-col items-center justify-center print:hidden">
                                            <div className="w-6 h-6 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin mb-3" />
                                            <p className="text-stone-500 font-light text-sm">Consulting AI librarian sequentially...</p>
                                        </div>
                                    ) : (
                                        <div className="markdown-content prose prose-invert max-w-none prose-headings:font-normal prose-headings:text-stone-200 prose-p:text-stone-400 prose-p:font-light prose-a:text-amber-300 prose-a:no-underline hover:prose-a:underline prose-strong:text-stone-300 prose-strong:font-medium prose-li:text-stone-400">
                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                                {activeTopicData.content}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* In the PDF export itself, we want to stack all the responses so the entire output gets saved. */}
                            {topicsData.length > 0 && !isFetchingBooks && (
                                <div className="hidden print:block space-y-8 mt-8">
                                    {topicsData.filter(t => t.topic !== selectedTopic && t.content !== null).map((t, idx) => (
                                        <div key={idx} className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6" style={{ pageBreakInside: 'avoid' }}>
                                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-stone-800/50">
                                                <h3 className="text-xl text-amber-300 font-medium">{t.topic}</h3>
                                            </div>
                                            <div className="markdown-content prose prose-invert max-w-none prose-headings:font-normal prose-headings:text-stone-200 prose-p:text-stone-400 prose-p:font-light prose-a:text-amber-300 prose-a:no-underline prose-strong:text-stone-300 prose-strong:font-medium prose-li:text-stone-400">
                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                                    {t.content || ""}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Footer */}
                <footer className="text-center mt-12 text-stone-600 text-sm font-light tracking-wide">
                    Powered by AI • Curated for curious minds
                </footer>
            </div>
        </main>
    );
}
