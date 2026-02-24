"use client"

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { isAccessTokenValid } from '@/lib/access-token';

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

function parseCsv(text: string): ImportedBook[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const rows: string[][] = [];
    for (const line of lines) {
        const row: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                const nextChar = line[i + 1];
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === "," && !inQuotes) {
                row.push(current);
                current = "";
            } else {
                current += char;
            }
        }
        row.push(current);
        rows.push(row.map((cell) => cell.trim()));
    }

    const header = rows[0].map((h) => h.toLowerCase());
    const dataRows = rows.slice(1);

    const getIndex = (...candidates: string[]) => {
        for (const candidate of candidates) {
            const idx = header.findIndex((h) => h === candidate.toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };

    const titleIdx = getIndex("title", "book title");
    const authorIdx = getIndex("author", "primary author");
    const ratingIdx = getIndex("my rating", "rating");
    const avgRatingIdx = getIndex("average rating");
    const shelvesIdx = getIndex("exclusive shelf", "bookshelves");
    const idIdx = getIndex("book id", "id");
    const readAtIdx = getIndex("date read", "read at");
    const dateAddedIdx = getIndex("date added");
    const pagesIdx = getIndex("number of pages");
    const yearPubIdx = getIndex("year published");
    const origYearIdx = getIndex("original publication year");
    const bindingIdx = getIndex("binding");
    const publisherIdx = getIndex("publisher");

    const books: ImportedBook[] = [];

    for (const row of dataRows) {
        const title = titleIdx >= 0 ? row[titleIdx] ?? "" : "";
        const author = authorIdx >= 0 ? row[authorIdx] ?? "" : "";
        if (!title && !author) continue;

        const ratingRaw = ratingIdx >= 0 ? row[ratingIdx] ?? "" : "";
        const myRating = ratingRaw && !Number.isNaN(Number(ratingRaw)) ? Number(ratingRaw) : undefined;

        const avgRatingRaw = avgRatingIdx >= 0 ? row[avgRatingIdx] ?? "" : "";
        const avgRating = avgRatingRaw && !Number.isNaN(Number(avgRatingRaw)) ? Number(avgRatingRaw) : undefined;

        const shelves = shelvesIdx >= 0 ? row[shelvesIdx] ?? "" : undefined;
        const goodreadsId = idIdx >= 0 ? row[idIdx] ?? "" : undefined;
        const readAt = readAtIdx >= 0 ? row[readAtIdx] ?? "" : undefined;
        const dateAdded = dateAddedIdx >= 0 ? row[dateAddedIdx] ?? "" : undefined;

        const pagesRaw = pagesIdx >= 0 ? row[pagesIdx] ?? "" : "";
        const pages = pagesRaw && !Number.isNaN(Number(pagesRaw)) ? Number(pagesRaw) : undefined;

        const yearPubRaw = yearPubIdx >= 0 ? row[yearPubIdx] ?? "" : "";
        const yearPublished = yearPubRaw && !Number.isNaN(Number(yearPubRaw)) ? Number(yearPubRaw) : undefined;

        const origYearRaw = origYearIdx >= 0 ? row[origYearIdx] ?? "" : "";
        const originalYear = origYearRaw && !Number.isNaN(Number(origYearRaw)) ? Number(origYearRaw) : undefined;

        const binding = bindingIdx >= 0 ? row[bindingIdx] ?? "" : undefined;
        const publisher = publisherIdx >= 0 ? row[publisherIdx] ?? "" : undefined;

        books.push({
            title, author, myRating, avgRating, shelves, goodreadsId, readAt,
            dateAdded, pages, yearPublished, originalYear, binding, publisher
        });
    }

    return books;
}

export default function Home() {
    const [contentMap, setContentMap] = useState<Record<string, string>>({});
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [topics, setTopics] = useState<string[]>([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);

    // Import state
    const [importedBooks, setImportedBooks] = useState<ImportedBook[]>([]);
    const [isImportExpanded, setIsImportExpanded] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    // Checkout modal state
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutName, setCheckoutName] = useState('');
    const [checkoutEmail, setCheckoutEmail] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [hasAccess, setHasAccess] = useState(false);
    const checkoutRouter = useRouter();

    const activeStreamRef = useRef<EventSource | null>(null);

    // Load saved books on mount and check access
    useEffect(() => {
        if (typeof window === "undefined") return;
        setHasAccess(isAccessTokenValid());
        const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.books && Array.isArray(parsed.books)) {
                    setImportedBooks(parsed.books);
                }
            } catch (e) {
                console.error("Failed to parse saved books", e);
            }
        }
    }, []);

    // Checkout handler
    const handleCheckout = async () => {
        if (hasAccess) {
            checkoutRouter.push('/pro');
            return;
        }
        if (!checkoutName.trim() || !checkoutEmail.trim()) {
            setCheckoutError('Please fill in both fields.');
            return;
        }
        setCheckoutLoading(true);
        setCheckoutError(null);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer: { name: checkoutName.trim(), email: checkoutEmail.trim() } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Checkout failed');
            if (data.checkout_url) window.location.href = data.checkout_url;
        } catch (err: unknown) {
            setCheckoutError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setCheckoutLoading(false);
        }
    };

    // Fetch random topics
    const fetchTopics = useCallback(() => {
        setIsLoadingTopics(true);
        fetch('/api/topics')
            .then(res => res.json())
            .then((parsedTopics: string[]) => {
                if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
                    setTopics(parsedTopics);
                }
                setIsLoadingTopics(false);
            })
            .catch(err => {
                console.error('Error fetching topics:', err);
                setIsLoadingTopics(false);
            });
    }, []);

    useEffect(() => {
        fetchTopics();
    }, [fetchTopics]);

    useEffect(() => {
        document.title = "Book Recommender";
    }, []);

    useEffect(() => {
        if (!selectedTopic) return;

        if (activeStreamRef.current) {
            activeStreamRef.current.close();
            activeStreamRef.current = null;
        }

        if (contentMap[selectedTopic]) return;

        const evt = new EventSource(`/api/books?topic=${encodeURIComponent(selectedTopic)}`);
        activeStreamRef.current = evt;

        let buffer = '';
        evt.onmessage = (e) => {
            buffer += e.data;
            setContentMap(prev => ({ ...prev, [selectedTopic]: buffer }));
        };

        evt.onerror = () => {
            evt.close();
            if (activeStreamRef.current === evt) activeStreamRef.current = null;
        };

        return () => {
            if (activeStreamRef.current) activeStreamRef.current.close();
        };
    }, [selectedTopic]);

    const handleTopicClick = (topic: string) => setSelectedTopic(topic);
    const handleShuffle = () => { setSelectedTopic(null); fetchTopics(); };
    const handleBack = () => setSelectedTopic(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setParseError("Please upload a .csv file from Goodreads.");
            return;
        }

        setIsParsing(true);
        setParseError(null);

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result ?? "");
                const books = parseCsv(text);
                if (books.length === 0) {
                    setParseError("Couldn't detect any books in this file.");
                    setIsParsing(false);
                    return;
                }
                setImportedBooks(books);
                // Save to localStorage
                const payload = { importedAt: new Date().toISOString(), books };
                window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
                setIsImportExpanded(false);
                setIsParsing(false);
            } catch (e) {
                console.error(e);
                setParseError("Something went wrong while reading the file.");
                setIsParsing(false);
            }
        };
        reader.onerror = () => {
            setParseError("There was a problem reading the file.");
            setIsParsing(false);
        };
        reader.readAsText(file);
    };

    const handleClearLibrary = () => {
        setImportedBooks([]);
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    // Calculate stats
    const stats = {
        total: importedBooks.length,
        read: importedBooks.filter(b => b.shelves?.toLowerCase() === "read").length,
        toRead: importedBooks.filter(b => b.shelves?.toLowerCase() === "to-read").length,
        currentlyReading: importedBooks.filter(b => b.shelves?.toLowerCase() === "currently-reading").length,
        avgRating: importedBooks.filter(b => b.myRating && b.myRating > 0).length > 0
            ? (importedBooks.filter(b => b.myRating && b.myRating > 0).reduce((sum, b) => sum + (b.myRating || 0), 0) / importedBooks.filter(b => b.myRating && b.myRating > 0).length).toFixed(1)
            : null,
    };

    // Get recent reads (books with readAt date, sorted by most recent)
    const recentReads = importedBooks
        .filter(b => b.readAt && b.readAt.trim() !== "" && b.shelves?.toLowerCase() === "read")
        .sort((a, b) => {
            const dateA = new Date(a.readAt!.replace(/\//g, '-'));
            const dateB = new Date(b.readAt!.replace(/\//g, '-'));
            return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 4);

    // Format date helper
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr.replace(/\//g, '-'));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    // Render star rating
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <svg key={i} className={`w-2.5 h-2.5 ${i < rating ? 'text-amber-400' : 'text-stone-700'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ));
    };

    const currentContent = selectedTopic ? (contentMap[selectedTopic] || '') : '';
    const isLoadingContent = selectedTopic && !contentMap[selectedTopic];
    const hasImportedBooks = importedBooks.length > 0;

    return (
        <main className="min-h-screen bg-stone-950">
            <div className="container mx-auto px-4 py-16 max-w-6xl">
                {/* Header */}
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-stone-100 mb-3">
                        Discover useful books
                    </h1>
                    <p className="text-stone-500 text-lg font-light">
                        Book recommendations for the 21st century
                    </p>
                </header>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Content Card - 3/4 width */}
                    <div className="lg:col-span-3">
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-8 md:p-10 h-full">
                            {!selectedTopic ? (
                                <div className="py-8">
                                    <div className="text-center mb-8">
                                        <h2 className="text-xl text-stone-300 font-light mb-2">
                                            Pick a topic to explore (Free)
                                        </h2>
                                        <p className="text-stone-500 text-sm font-light">
                                            Click any topic below to get curated book recommendations
                                        </p>
                                    </div>

                                    {isLoadingTopics ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="flex items-center gap-3 text-stone-500">
                                                <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin"></div>
                                                <span className="font-light">Loading topics...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap justify-center gap-3 mb-8">
                                                {topics.map((topic, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleTopicClick(topic)}
                                                        className="px-5 py-2.5 rounded-full bg-stone-800/80 border border-stone-700/50 text-stone-200 text-sm font-medium hover:bg-amber-500/20 hover:border-amber-500/50 hover:text-amber-200 transition-all duration-200 cursor-pointer"
                                                    >
                                                        {topic}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-center">
                                                <button
                                                    onClick={handleShuffle}
                                                    className="inline-flex items-center gap-2 px-4 py-2 text-stone-500 hover:text-stone-300 text-sm font-light transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    Show different topics
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : isLoadingContent ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="text-center">
                                        <div className="w-6 h-6 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-stone-400 font-light">
                                            Fetching recommendations for <span className="text-amber-300">{selectedTopic}</span>...
                                        </p>
                                        <p className="text-stone-600 text-sm mt-2 font-light">
                                            This may take up to 30 seconds
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-4 mb-6 pb-6 border-b border-stone-800/50">
                                        <button
                                            onClick={handleBack}
                                            className="inline-flex items-center text-stone-500 hover:text-stone-300 text-sm font-light transition-colors"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                            Back
                                        </button>
                                        <span className="text-amber-300 font-medium">{selectedTopic}</span>
                                    </div>
                                    <div className="markdown-content prose prose-invert max-w-none prose-headings:font-normal prose-headings:text-stone-200 prose-p:text-stone-400 prose-p:font-light prose-a:text-amber-300 prose-a:no-underline hover:prose-a:underline prose-strong:text-stone-300 prose-strong:font-medium">
                                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                            {currentContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - 1/4 width */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Import Card */}
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 overflow-hidden">
                            <button
                                onClick={() => setIsImportExpanded(!isImportExpanded)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-stone-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                        </svg>
                                    </div>
                                    <span className="text-stone-200 text-sm font-medium">
                                        {hasImportedBooks ? "Update Library" : "Import Goodreads (Paid)"}
                                    </span>
                                </div>
                                <svg className={`w-4 h-4 text-stone-500 transition-transform ${isImportExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isImportExpanded && (
                                <div className="px-4 pb-4 border-t border-stone-800/50">
                                    <div className="pt-4 space-y-3">
                                        <p className="text-stone-500 text-xs font-light">
                                            Export your library from{" "}
                                            <a href="https://www.goodreads.com/review/import" target="_blank" rel="noreferrer" className="text-amber-300 hover:underline">
                                                goodreads.com/review/import
                                            </a>
                                            , then upload the .csv file here.
                                        </p>
                                        <input
                                            id="csv-upload"
                                            type="file"
                                            accept=".csv,text/csv"
                                            className="hidden"
                                            onChange={handleFileChange}
                                        />
                                        <label
                                            htmlFor="csv-upload"
                                            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 cursor-pointer transition-colors"
                                        >
                                            {isParsing ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin"></div>
                                                    Parsing...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    Choose .csv file
                                                </>
                                            )}
                                        </label>
                                        {parseError && (
                                            <p className="text-red-400 text-xs">{parseError}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stats Card - only show if books imported */}
                        {hasImportedBooks && (
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-stone-300 text-sm font-medium">Your Library</h3>
                                    <button
                                        onClick={handleClearLibrary}
                                        className="text-stone-600 hover:text-stone-400 text-xs transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 text-xs">Total Books</span>
                                        <span className="text-stone-200 text-sm font-medium">{stats.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 text-xs">Read</span>
                                        <span className="text-emerald-400 text-sm font-medium">{stats.read}</span>
                                    </div>
                                    {stats.currentlyReading > 0 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-stone-500 text-xs">Reading Now</span>
                                            <span className="text-amber-300 text-sm font-medium">{stats.currentlyReading}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-500 text-xs">To Read</span>
                                        <span className="text-blue-400 text-sm font-medium">{stats.toRead}</span>
                                    </div>
                                    {stats.avgRating && (
                                        <div className="flex justify-between items-center pt-2 border-t border-stone-800/50">
                                            <span className="text-stone-500 text-xs">Avg Rating</span>
                                            <span className="text-amber-300 text-sm font-medium flex items-center gap-1">
                                                {stats.avgRating}
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Recent Reads Preview - only show if there are recent reads */}
                        {recentReads.length > 0 && (
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-4">
                                <h3 className="text-stone-300 text-sm font-medium mb-3">Recent Reads</h3>
                                <div className="space-y-3">
                                    {recentReads.map((book, i) => (
                                        <div key={i} className="border-b border-stone-800/30 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-stone-200 text-xs font-medium truncate" title={book.title}>
                                                        {book.title}
                                                    </p>
                                                    <p className="text-stone-500 text-xs truncate" title={book.author}>
                                                        {book.author}
                                                    </p>
                                                </div>
                                                <span className="text-stone-600 text-xs whitespace-nowrap">
                                                    {formatDate(book.readAt!)}
                                                </span>
                                            </div>
                                            {book.myRating && book.myRating > 0 && (
                                                <div className="flex gap-0.5 mt-1">
                                                    {renderStars(book.myRating)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => hasAccess ? checkoutRouter.push('/pro') : setShowCheckout(true)}
                                    className="mt-3 pt-3 border-t border-stone-800/50 flex items-center justify-center gap-1 text-stone-500 hover:text-amber-300 text-xs transition-colors cursor-pointer w-full"
                                >
                                    {hasAccess ? 'View full stats' : 'Unlock Pro Stats — $5'}
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center mt-16 text-stone-600 text-sm font-light tracking-wide">
                    Curated for curious minds
                </footer>
            </div>

            {/* Checkout Modal */}
            {showCheckout && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCheckout(false)}>
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg text-stone-200 font-medium mb-1">Unlock Pro Recommendations</h3>
                        <p className="text-stone-500 text-xs mb-5">One-time payment of $5.00 for 1-hour access to personalized AI book recommendations.</p>
                        <div className="space-y-3 mb-4">
                            <input
                                type="text" placeholder="Your name" value={checkoutName}
                                onChange={e => setCheckoutName(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-stone-800/80 border border-stone-700/50 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                            />
                            <input
                                type="email" placeholder="Email address" value={checkoutEmail}
                                onChange={e => setCheckoutEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-stone-800/80 border border-stone-700/50 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                        {checkoutError && <p className="text-red-400 text-xs mb-3">{checkoutError}</p>}
                        <button
                            onClick={handleCheckout} disabled={checkoutLoading}
                            className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {checkoutLoading ? 'Redirecting to checkout...' : 'Continue to Payment'}
                        </button>
                        <button onClick={() => setShowCheckout(false)} className="w-full mt-2 py-2 text-stone-600 text-xs hover:text-stone-400 transition-colors cursor-pointer">Cancel</button>
                    </div>
                </div>
            )}
        </main>
    );
}