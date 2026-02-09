"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

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

export default function ProStatsPage() {
    const [books, setBooks] = useState<ImportedBook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Reading Stats • Book Recommender";

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

    // Computed statistics
    const stats = useMemo(() => {
        if (!books.length) return null;

        const readBooks = books.filter(b => b.shelves?.toLowerCase() === "read");
        const toReadBooks = books.filter(b => b.shelves?.toLowerCase() === "to-read");
        const currentlyReading = books.filter(b => b.shelves?.toLowerCase() === "currently-reading");

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

        // Pages by year
        const pagesByYear: Record<string, number> = {};
        readBooks.forEach(b => {
            if (b.readAt && b.pages) {
                const year = b.readAt.split(/[-/]/)[0];
                if (year && year.length === 4) {
                    pagesByYear[year] = (pagesByYear[year] || 0) + b.pages;
                }
            }
        });
        const pagesYearData = Object.entries(pagesByYear)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([year, pages]) => ({ label: year, value: pages }));
        const maxPagesYear = Math.max(...pagesYearData.map(p => p.value), 1);

        // Binding/format distribution
        const bindingDist: Record<string, number> = {};
        readBooks.forEach(b => {
            const binding = b.binding || "Unknown";
            bindingDist[binding] = (bindingDist[binding] || 0) + 1;
        });
        const bindingData = Object.entries(bindingDist)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([binding, count]) => ({ label: binding, value: count }));
        const maxBinding = Math.max(...bindingData.map(b => b.value), 1);

        // Publication decade distribution
        const decadeDist: Record<string, number> = {};
        readBooks.forEach(b => {
            const year = b.originalYear || b.yearPublished;
            if (year) {
                const decade = `${Math.floor(year / 10) * 10}s`;
                decadeDist[decade] = (decadeDist[decade] || 0) + 1;
            }
        });
        const decadeData = Object.entries(decadeDist)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .slice(0, 6)
            .map(([decade, count]) => ({ label: decade, value: count }));
        const maxDecade = Math.max(...decadeData.map(d => d.value), 1);

        // Top authors
        const authorCount: Record<string, number> = {};
        readBooks.forEach(b => {
            if (b.author) {
                authorCount[b.author] = (authorCount[b.author] || 0) + 1;
            }
        });
        const topAuthors = Object.entries(authorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([author, count]) => ({ label: author.split(' ').slice(-1)[0], value: count, fullName: author }));
        const maxAuthor = Math.max(...topAuthors.map(a => a.value), 1);

        // Page count distribution (short/medium/long)
        const shortBooks = readBooks.filter(b => b.pages && b.pages < 200).length;
        const mediumBooks = readBooks.filter(b => b.pages && b.pages >= 200 && b.pages < 400).length;
        const longBooks = readBooks.filter(b => b.pages && b.pages >= 400).length;

        // Longest and shortest books
        const booksWithPages = readBooks.filter(b => b.pages && b.pages > 0);
        const longestBook = booksWithPages.sort((a, b) => (b.pages || 0) - (a.pages || 0))[0];
        const shortestBook = booksWithPages.sort((a, b) => (a.pages || 0) - (b.pages || 0))[0];

        // Highest and lowest rated
        const highestRated = ratedBooks.filter(b => b.myRating === 5);
        const lowestRated = ratedBooks.filter(b => b.myRating && b.myRating <= 2);

        // Average pages per book
        const avgPages = booksWithPages.length > 0
            ? Math.round(booksWithPages.reduce((sum, b) => sum + (b.pages || 0), 0) / booksWithPages.length)
            : 0;

        // Reading streak - books read in consecutive months
        const monthsRead = new Set<string>();
        readBooks.forEach(b => {
            if (b.readAt) {
                const parts = b.readAt.split(/[-/]/);
                if (parts.length >= 2) {
                    monthsRead.add(`${parts[0]}-${parts[1]}`);
                }
            }
        });

        return {
            totalBooks: books.length,
            readCount: readBooks.length,
            toReadCount: toReadBooks.length,
            currentlyReadingCount: currentlyReading.length,
            totalPages,
            avgRating,
            avgPages,
            ratingDist,
            maxRating,
            yearData,
            maxYearCount,
            pagesYearData,
            maxPagesYear,
            bindingData,
            maxBinding,
            decadeData,
            maxDecade,
            topAuthors,
            maxAuthor,
            shortBooks,
            mediumBooks,
            longBooks,
            longestBook,
            shortestBook,
            highestRated,
            lowestRated,
            uniqueAuthors: Object.keys(authorCount).length,
            monthsWithReading: monthsRead.size,
        };
    }, [books]);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
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
                        <p className="text-stone-500 font-light mb-6">Import your Goodreads library to see your reading stats</p>
                        <Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-colors">
                            Import Library
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-950">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/" className="inline-flex items-center text-stone-500 hover:text-stone-300 text-sm font-light transition-colors">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </Link>
                    <h1 className="text-xl font-light text-stone-200">Your Reading Stats</h1>
                    <div className="w-16" /> {/* Spacer */}
                </div>

                {stats && (
                    <>
                        {/* Top Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                            <StatCard
                                title="Unique Authors"
                                value={stats.uniqueAuthors}
                                subtitle="different voices"
                                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                            />
                        </div>

                        {/* Secondary Stats Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard title="To Read" value={stats.toReadCount} subtitle="in your queue" />
                            <StatCard title="Currently Reading" value={stats.currentlyReadingCount} />
                            <StatCard title="Avg Book Length" value={`${stats.avgPages} pg`} />
                            <StatCard title="Months Active" value={stats.monthsWithReading} subtitle="with reading" />
                        </div>

                        {/* Charts Grid */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {/* Rating Distribution */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Rating Distribution</h3>
                                <BarChart data={stats.ratingDist} maxValue={stats.maxRating} label="How you rate books" />
                            </div>

                            {/* Books by Year */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Books by Year</h3>
                                <BarChart data={stats.yearData} maxValue={stats.maxYearCount} label="Reading volume over time" />
                            </div>

                            {/* Pages by Year */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Pages by Year</h3>
                                <BarChart data={stats.pagesYearData} maxValue={stats.maxPagesYear} label="Total pages read each year" />
                            </div>

                            {/* Format Distribution */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Reading Formats</h3>
                                <BarChart data={stats.bindingData} maxValue={stats.maxBinding} label="How you consume books" />
                            </div>

                            {/* Publication Decades */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Publication Era</h3>
                                <BarChart data={stats.decadeData} maxValue={stats.maxDecade} label="When your books were published" />
                            </div>

                            {/* Top Authors */}
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">Most Read Authors</h3>
                                <BarChart data={stats.topAuthors} maxValue={stats.maxAuthor} label="Authors you return to" />
                            </div>
                        </div>

                        {/* Book Length Distribution */}
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 mb-8">
                            <h3 className="text-sm font-medium text-stone-200 mb-4">Book Length Preference</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-stone-800/30 rounded-lg">
                                    <div className="text-2xl font-light text-emerald-400">{stats.shortBooks}</div>
                                    <div className="text-xs text-stone-500 mt-1">Short (&lt;200 pg)</div>
                                </div>
                                <div className="text-center p-4 bg-stone-800/30 rounded-lg">
                                    <div className="text-2xl font-light text-amber-400">{stats.mediumBooks}</div>
                                    <div className="text-xs text-stone-500 mt-1">Medium (200-400 pg)</div>
                                </div>
                                <div className="text-center p-4 bg-stone-800/30 rounded-lg">
                                    <div className="text-2xl font-light text-purple-400">{stats.longBooks}</div>
                                    <div className="text-xs text-stone-500 mt-1">Long (&gt;400 pg)</div>
                                </div>
                            </div>
                        </div>

                        {/* Notable Books */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            {stats.longestBook && (
                                <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                    <h3 className="text-sm font-medium text-stone-200 mb-3">📚 Longest Book Read</h3>
                                    <p className="text-stone-300 font-light">{stats.longestBook.title}</p>
                                    <p className="text-xs text-stone-500 mt-1">{stats.longestBook.author} • {stats.longestBook.pages} pages</p>
                                </div>
                            )}
                            {stats.shortestBook && (
                                <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6">
                                    <h3 className="text-sm font-medium text-stone-200 mb-3">⚡ Shortest Book Read</h3>
                                    <p className="text-stone-300 font-light">{stats.shortestBook.title}</p>
                                    <p className="text-xs text-stone-500 mt-1">{stats.shortestBook.author} • {stats.shortestBook.pages} pages</p>
                                </div>
                            )}
                        </div>

                        {/* 5-Star Books */}
                        {stats.highestRated.length > 0 && (
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 mb-8">
                                <h3 className="text-sm font-medium text-stone-200 mb-4">⭐ Your 5-Star Books ({stats.highestRated.length})</h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {stats.highestRated.slice(0, 9).map((book, i) => (
                                        <div key={i} className="bg-stone-800/30 rounded-lg p-3">
                                            <p className="text-sm text-stone-300 font-light truncate">{book.title}</p>
                                            <p className="text-xs text-stone-500 truncate">{book.author}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fun Facts */}
                        <div className="bg-gradient-to-r from-amber-900/20 to-stone-900/50 rounded-xl border border-amber-800/30 p-6">
                            <h3 className="text-sm font-medium text-amber-300 mb-4">📊 Fun Reading Facts</h3>
                            <div className="grid md:grid-cols-2 gap-4 text-sm text-stone-400 font-light">
                                <p>📖 You've read enough pages to fill <span className="text-amber-300">{Math.round(stats.totalPages / 300)}</span> average novels</p>
                                <p>🏔️ Stacked, your books would be about <span className="text-amber-300">{(stats.readCount * 2.5 / 100).toFixed(1)}m</span> tall</p>
                                <p>⏱️ At 250 words/page, you've read ~<span className="text-amber-300">{(stats.totalPages * 250 / 1000000).toFixed(1)}M</span> words</p>
                                <p>📚 That's roughly <span className="text-amber-300">{Math.round(stats.totalPages * 250 / 200 / 60)}</span> hours of reading</p>
                            </div>
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
