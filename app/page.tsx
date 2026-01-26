"use client"

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function Home() {
    const [contentMap, setContentMap] = useState<Record<string, string>>({});
    const [topic, setTopic] = useState<string>('…loading');
    const [topics, setTopics] = useState<string[]>([]);

    const activeStreamRef = useRef<EventSource | null>(null);

    // Fetch topics on mount
    useEffect(() => {
        fetch('/api/topics')
            .then(res => res.text())
            .then(topicText => {
                try {
                    const cleanedText = topicText.replace(/'/g, '"');
                    const parsedTopics = JSON.parse(cleanedText);

                    if (Array.isArray(parsedTopics) && parsedTopics.length > 0) {
                        setTopics(parsedTopics);
                        setTopic(parsedTopics[0]);
                    } else {
                        throw new Error('Invalid format');
                    }
                } catch (e) {
                    console.error('Error parsing topics:', e);
                    const trimmedTopic = topicText.trim();
                    setTopic(trimmedTopic);
                    setTopics([trimmedTopic]);
                }
            })
            .catch(err => {
                console.error('Error fetching topic:', err);
                setTopic('Error loading topic');
            });
    }, []);

    // Set document title
    useEffect(() => {
        document.title = "Book Recommender";
    }, []);

    // Fetch content when topic changes, ONLY if not already cached
    useEffect(() => {
        if (topic === '…loading' || topic.startsWith('Error')) return;

        // Cleanup previous stream if any
        if (activeStreamRef.current) {
            activeStreamRef.current.close();
            activeStreamRef.current = null;
        }

        // If we already have content for this topic, do nothing
        if (contentMap[topic]) {
            return;
        }

        // Start fetching for this specific topic
        const evt = new EventSource(`/api/books?topic=${encodeURIComponent(topic)}`);
        activeStreamRef.current = evt;

        let buffer = '';
        evt.onmessage = (e) => {
            buffer += e.data;
            setContentMap(prev => ({
                ...prev,
                [topic]: buffer
            }));
        };

        evt.onerror = () => {
            evt.close();
            if (activeStreamRef.current === evt) activeStreamRef.current = null;
        };

        return () => {
            if (activeStreamRef.current) {
                activeStreamRef.current.close();
            }
        };
    }, [topic]);

    const currentContent = contentMap[topic] || '';
    const isLoading = !currentContent && topic !== '…loading' && !topic.startsWith('Error');

    return (
        <main className="min-h-screen bg-stone-950">
            <div className="container mx-auto px-4 py-16 max-w-4xl">
                {/* Header */}
                <header className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-stone-100 mb-3">
                        Discover useful Non-Fiction
                    </h1>
                    <p className="text-stone-500 text-lg font-light">
                        AI-powered book recommendations for the twenty-first century
                    </p>

                    {/* Topic Selector */}
                    <div className="mt-10 inline-block relative">
                        {topics.length > 1 ? (
                            <div className="relative">
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="appearance-none bg-stone-900 border border-stone-800 text-amber-200 text-lg font-medium px-6 py-3 pr-12 rounded-lg cursor-pointer focus:outline-none focus:border-stone-600 hover:border-stone-700 transition-colors"
                                >
                                    {topics.map((t, i) => (
                                        <option key={i} value={t} className="bg-stone-900 text-stone-200">
                                            {t}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-stone-900 border border-stone-800 text-amber-200 text-lg font-medium px-6 py-3 rounded-lg">
                                {topic}
                            </div>
                        )}
                    </div>
                </header>

                {/* Content Card */}
                <div className="max-w-2xl mx-auto">
                    <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-8 md:p-10">
                        {topic === '…loading' ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="flex items-center gap-3 text-stone-500">
                                    <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin"></div>
                                    <span className="font-light">Loading topics...</span>
                                </div>
                            </div>
                        ) : isLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="text-center">
                                    <div className="w-6 h-6 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-stone-400 font-light">
                                        Fetching recommendations...
                                    </p>
                                    <p className="text-stone-600 text-sm mt-2 font-light">
                                        This may take up to 30 seconds
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="markdown-content prose prose-invert max-w-none prose-headings:font-normal prose-headings:text-stone-200 prose-p:text-stone-400 prose-p:font-light prose-a:text-amber-300 prose-a:no-underline hover:prose-a:underline prose-strong:text-stone-300 prose-strong:font-medium">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                >
                                    {currentContent}
                                </ReactMarkdown>
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