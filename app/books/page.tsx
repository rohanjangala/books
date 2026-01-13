"use client"

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import Link from 'next/link';

export default function BooksPage() {
    const [idea, setIdea] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'error'>('idle');

    // Fetch topic on mount, but don't start stream immediately
    useEffect(() => {
        setStatus('loading');
        fetch('/api/topics')
            .then(res => res.text())
            .then(topicText => {
                const trimmedTopic = topicText.trim();
                setTopic(trimmedTopic);
                setStatus('idle'); // Ready to start
            })
            .catch(err => {
                console.error('Error fetching topic:', err);
                setTopic('Error loading topic');
                setStatus('error');
            });
    }, []);

    // Set document title
    useEffect(() => {
        document.title = "Books for the 21st century - Recommendations";
    }, []);

    const startGeneration = () => {
        if (!topic || topic === 'Error loading topic') return;

        setStatus('streaming');
        setIdea(''); // Clear/Init
        const evt = new EventSource(`/api/books?topic=${encodeURIComponent(topic)}`);
        let buffer = '';

        evt.onmessage = (e) => {
            buffer += e.data;
            setIdea(buffer);
        };
        evt.onerror = () => {
            console.error('SSE error, closing');
            evt.close();
            // If we have some content, we might consider it 'done' or 'error' depending on requirements,
            // but usually SSE closing on error means stream interruption or end.
            // For now, let's keep the content we have.
        };

        // We need to cleanup if the component unmounts, but we can't easily "stop" an EventSource 
        // from inside the start function unless we store the reference. 
        // But for this simple impl, we'll trust the user flow.
        // Actually, let's wrap this in a customized hook or just keep it simple as requested.
        // We'll add a cleanup return to a useEffect if we were triggering by state, 
        // but since we are triggering by function, we need to be careful.

        // Better approach matching the previous style but with a trigger:
        // We can just set a "run" state.
    };

    // Let's refactor to use a "run" flag to reuse the previous useEffect style logic which is robust for cleanup
    const [shouldRun, setShouldRun] = useState(false);

    useEffect(() => {
        if (!shouldRun || !topic || topic === 'Error loading topic') return;

        setStatus('streaming');
        setIdea(''); // Clear/Init
        const evt = new EventSource(`/api/books?topic=${encodeURIComponent(topic)}`);
        let buffer = '';

        evt.onmessage = (e) => {
            buffer += e.data;
            setIdea(buffer);
        };
        evt.onerror = () => {
            console.error('SSE error, closing');
            evt.close();
        };

        return () => { evt.close(); };
    }, [shouldRun, topic]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">

                {/* Back Link */}
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 transition-colors">
                        ← Back to Home
                    </Link>
                </div>

                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        {status === 'loading' ? 'Loading topic...' : topic}
                    </h1>
                    {status === 'error' && <p className="text-red-500">Failed to load topic.</p>}
                </header>

                {/* Control / Content Area */}
                <div className="max-w-3xl mx-auto text-center">

                    {!shouldRun && status !== 'loading' && status !== 'error' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 backdrop-blur-lg bg-opacity-95 mb-8">
                            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
                                Ready to generate book recommendations for <strong>{topic}</strong>?
                            </p>
                            <button
                                onClick={() => setShouldRun(true)}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                Generate Recommendations
                            </button>
                        </div>
                    )}

                    {shouldRun && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-95 text-left">
                            {idea === '' ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-pulse text-gray-400 flex flex-col items-center gap-4">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        Thinking...
                                    </div>
                                </div>
                            ) : (
                                <div className="markdown-content text-gray-700 dark:text-gray-300 prose dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkBreaks]}
                                    >
                                        {idea}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
