"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ImportedBook = {
    title: string;
    author: string;
    myRating?: number;
    shelves?: string;
    goodreadsId?: string;
    readAt?: string;
};

type ParseState =
    | { status: "idle" }
    | { status: "parsing" }
    | { status: "parsed"; books: ImportedBook[] }
    | { status: "error"; message: string };

const LOCAL_STORAGE_KEY = "goodreads_import_books_v1";

function parseCsv(text: string): ImportedBook[] {
    // Basic CSV parser with support for quoted fields and commas inside quotes
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
                    // Escaped quote
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
    const authorIdx = getIndex("author", "author", "primary author");
    const ratingIdx = getIndex("my rating", "rating");
    const shelvesIdx = getIndex("bookshelves", "exclusive shelf");
    const idIdx = getIndex("book id", "id");
    const readAtIdx = getIndex("date read", "read at");

    const books: ImportedBook[] = [];

    for (const row of dataRows) {
        const title = titleIdx >= 0 ? row[titleIdx] ?? "" : "";
        const author = authorIdx >= 0 ? row[authorIdx] ?? "" : "";
        if (!title && !author) continue;

        const ratingRaw = ratingIdx >= 0 ? row[ratingIdx] ?? "" : "";
        const myRating =
            ratingRaw && !Number.isNaN(Number(ratingRaw)) ? Number(ratingRaw) : undefined;

        const shelves = shelvesIdx >= 0 ? row[shelvesIdx] ?? "" : undefined;
        const goodreadsId = idIdx >= 0 ? row[idIdx] ?? "" : undefined;
        const readAt = readAtIdx >= 0 ? row[readAtIdx] ?? "" : undefined;

        books.push({
            title,
            author,
            myRating,
            shelves,
            goodreadsId,
            readAt,
        });
    }

    return books;
}

export default function ImportGoodreadsPage() {
    const [fileName, setFileName] = useState<string | null>(null);
    const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
    const [hasSavedBefore, setHasSavedBefore] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const existing = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        setHasSavedBefore(!!existing);
    }, []);

    useEffect(() => {
        document.title = "Import Goodreads • Book Recommender";
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith(".csv")) {
            setParseState({
                status: "error",
                message: "Please upload a .csv file from Goodreads.",
            });
            setFileName(null);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setParseState({
                status: "error",
                message: "File is too large. Please keep it under 5MB.",
            });
            setFileName(null);
            return;
        }

        setParseState({ status: "parsing" });
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = String(reader.result ?? "");
                const books = parseCsv(text);
                if (books.length === 0) {
                    setParseState({
                        status: "error",
                        message:
                            "We couldn't detect any books in this file. Please confirm it is the Goodreads export.",
                    });
                    return;
                }
                setParseState({ status: "parsed", books });
            } catch (error) {
                console.error(error);
                setParseState({
                    status: "error",
                    message: "Something went wrong while reading the file.",
                });
            }
        };

        reader.onerror = () => {
            setParseState({
                status: "error",
                message: "There was a problem reading the file. Please try again.",
            });
        };

        reader.readAsText(file);
    };

    const handleSaveToBrowser = () => {
        if (parseState.status !== "parsed") return;
        try {
            const payload = {
                importedAt: new Date().toISOString(),
                books: parseState.books,
            };
            if (typeof window !== "undefined") {
                window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
            }
            setHasSavedBefore(true);
        } catch (error) {
            console.error(error);
            setParseState({
                status: "error",
                message: "Unable to save in this browser. Please check your storage settings.",
            });
        }
    };

    const importedCount = parseState.status === "parsed" ? parseState.books.length : 0;
    const shelfSummary =
        parseState.status === "parsed"
            ? parseState.books.reduce(
                (acc, book) => {
                    const shelves = book.shelves?.toLowerCase() ?? "";
                    if (shelves.includes("read")) acc.read++;
                    if (shelves.includes("to-read")) acc.toRead++;
                    if (shelves.includes("currently-reading")) acc.currentlyReading++;
                    return acc;
                },
                { read: 0, toRead: 0, currentlyReading: 0 },
            )
            : { read: 0, toRead: 0, currentlyReading: 0 };

    const previewBooks =
        parseState.status === "parsed" ? parseState.books.slice(0, 20) : [];

    return (
        <main className="min-h-screen bg-stone-950">
            <div className="container mx-auto px-4 py-16 max-w-5xl">
                {/* Back link */}
                <Link
                    href="/"
                    className="inline-flex items-center text-stone-500 hover:text-stone-300 text-sm font-light mb-8 transition-colors"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to recommendations
                </Link>

                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-light tracking-tight text-stone-100 mb-3">
                        Import your Goodreads library
                    </h1>
                    <p className="text-stone-500 text-lg font-light max-w-2xl mx-auto">
                        We never ask for your Goodreads password. Export your data from Goodreads once,
                        then drop the .csv file here.
                    </p>
                </header>

                {/* Main Content Grid */}
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-start">
                    {/* Left column: steps + uploader */}
                    <div className="space-y-6">
                        {/* Steps Card */}
                        <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 md:p-8">
                            <h2 className="text-lg font-medium text-stone-200 mb-5">
                                3 quick steps
                            </h2>
                            <ol className="space-y-5 text-sm text-stone-400">
                                <li className="flex items-start gap-4">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold shrink-0 mt-0.5">
                                        1
                                    </span>
                                    <div>
                                        <p className="font-medium text-stone-300">Open Goodreads export page</p>
                                        <p className="text-stone-500 mt-1 font-light">
                                            While logged in to Goodreads, go to{" "}
                                            <a
                                                href="https://www.goodreads.com/review/import"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-amber-300 hover:underline underline-offset-2"
                                            >
                                                goodreads.com/review/import
                                            </a>
                                            , then scroll to the export section.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold shrink-0 mt-0.5">
                                        2
                                    </span>
                                    <div>
                                        <p className="font-medium text-stone-300">Request your library export</p>
                                        <p className="text-stone-500 mt-1 font-light">
                                            Click <span className="font-medium text-stone-400">Request export</span> and wait for the
                                            download link. Goodreads will generate a <code className="text-amber-300/80">.csv</code> file that
                                            contains your shelves and books.
                                        </p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-4">
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold shrink-0 mt-0.5">
                                        3
                                    </span>
                                    <div>
                                        <p className="font-medium text-stone-300">Drop the .csv file here</p>
                                        <p className="text-stone-500 mt-1 font-light">
                                            Drag and drop the downloaded file or select it from your computer. We will
                                            parse it instantly in your browser.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </div>

                        {/* File Upload Card */}
                        <div className="bg-stone-900/50 rounded-xl border border-dashed border-stone-700 p-6 md:p-8 flex flex-col items-center justify-center text-center">
                            <input
                                id="goodreads-csv"
                                type="file"
                                accept=".csv,text/csv"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="goodreads-csv"
                                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-5 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors mb-3"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span>
                                    {parseState.status === "parsing" ? "Reading file…" : "Choose .csv file"}
                                </span>
                            </label>
                            <p className="text-xs text-stone-600 font-light">
                                {fileName ? (
                                    <>
                                        Selected: <span className="text-stone-400 font-medium">{fileName}</span>
                                    </>
                                ) : (
                                    "Max 5MB. We only read this file locally in your browser."
                                )}
                            </p>

                            {parseState.status === "parsing" && (
                                <div className="mt-4 flex items-center gap-2 text-stone-500">
                                    <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin"></div>
                                    <span className="text-xs font-light">Parsing your books…</span>
                                </div>
                            )}

                            {parseState.status === "error" && (
                                <p className="mt-3 text-xs text-red-400">
                                    {parseState.message}
                                </p>
                            )}
                        </div>

                        {/* Save Action Card */}
                        {parseState.status === "parsed" && (
                            <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <p className="text-sm text-stone-200 font-medium">
                                        Ready to import {importedCount} book{importedCount === 1 ? "" : "s"}.
                                    </p>
                                    <p className="mt-1 text-xs text-stone-500 font-light">
                                        {shelfSummary.read > 0 && (
                                            <span className="mr-3">Read: {shelfSummary.read}</span>
                                        )}
                                        {shelfSummary.currentlyReading > 0 && (
                                            <span className="mr-3">Currently reading: {shelfSummary.currentlyReading}</span>
                                        )}
                                        {shelfSummary.toRead > 0 && (
                                            <span>To read: {shelfSummary.toRead}</span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSaveToBrowser}
                                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 text-stone-950 text-sm font-medium px-5 py-2.5 hover:bg-amber-400 transition-colors"
                                >
                                    {hasSavedBefore ? "Update saved library" : "Save to this browser"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right column: preview */}
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-6 md:p-8 min-h-[300px]">
                        <h2 className="text-sm font-medium text-stone-200 mb-4 flex items-center justify-between">
                            Preview
                            {hasSavedBefore && (
                                <span className="text-[11px] font-normal text-emerald-400">
                                    ✓ Data saved in browser
                                </span>
                            )}
                        </h2>

                        {parseState.status !== "parsed" && (
                            <div className="h-full flex items-center justify-center text-center py-16">
                                <div>
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-800 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                    </div>
                                    <p className="text-stone-400 text-sm font-light mb-1">No file imported yet</p>
                                    <p className="text-stone-600 text-xs font-light">
                                        Once you add your Goodreads export, we'll show a snapshot of your books here.
                                    </p>
                                </div>
                            </div>
                        )}

                        {parseState.status === "parsed" && (
                            <div className="overflow-hidden rounded-lg border border-stone-800">
                                <div className="max-h-80 overflow-auto">
                                    <table className="min-w-full text-left text-xs">
                                        <thead className="bg-stone-800/50 text-stone-400 uppercase tracking-wide sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 font-medium">Title</th>
                                                <th className="px-3 py-2 font-medium">Author</th>
                                                <th className="px-3 py-2 font-medium">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-800/50">
                                            {previewBooks.map((book, index) => (
                                                <tr key={`${book.goodreadsId ?? book.title}-${index}`} className="hover:bg-stone-800/30">
                                                    <td className="px-3 py-2 align-top max-w-[180px]">
                                                        <div className="text-stone-200 truncate font-light" title={book.title}>
                                                            {book.title}
                                                        </div>
                                                        {book.readAt && (
                                                            <div className="mt-0.5 text-[10px] text-stone-600">
                                                                Read: {book.readAt}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2 align-top max-w-[120px]">
                                                        <span className="text-stone-400 truncate block font-light" title={book.author}>
                                                            {book.author}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 align-top">
                                                        <span className="text-amber-300/80">
                                                            {book.myRating ? `${book.myRating}/5` : "—"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importedCount > previewBooks.length && (
                                    <div className="px-3 py-2 text-[11px] text-stone-500 bg-stone-800/30 text-right font-light">
                                        Showing {previewBooks.length} of {importedCount} books
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="text-center mt-16 text-stone-600 text-sm font-light tracking-wide">
                    Powered by AI • Curated for curious minds
                </footer>
            </div>
        </main>
    );
}
