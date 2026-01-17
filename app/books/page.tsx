"use client"

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function Home() {
    const [contentMap, setContentMap] = useState<Record<string, string>>({});
    const [topic, setTopic] = useState<string>('…loading');
    const [topics, setTopics] = useState<string[]>([]);

    // Track if we are currently loading the SELECTED topic (for the first time)
    // We derive "loading" state from whether contentMap has data for the current topic

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
        document.title = "Books for the 21st century";
    }, []);

    // Logic: Fetch content when topic changes, ONLY if not already cached
    useEffect(() => {
        if (topic === '…loading' || topic.startsWith('Error')) return;

        // Cleanup previous stream if any (essential!)
        if (activeStreamRef.current) {
            activeStreamRef.current.close();
            activeStreamRef.current = null;
        }

        // If we already have content for this topic, do NOTHING. Instant load from cache.
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
            // console.error('SSE error, closing');
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
    // Show loading ONLY if content is empty (meaning not in cache and not streamed yet)
    const isLoading = !currentContent;

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <div className="inline-block relative">
                        {topics.length > 1 ? (
                            <select
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="appearance-none bg-transparent text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4 cursor-pointer focus:outline-none text-center w-full min-w-[300px]"
                                style={{
                                    WebkitTextFillColor: 'transparent',
                                    backgroundImage: 'linear-gradient(to right, #2563eb, #4f46e5)'
                                }}
                            >
                                {topics.map((t, i) => (
                                    <option key={i} value={t} className="text-gray-800 text-lg">
                                        {t}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                                {topic}
                            </h1>
                        )}
                        {topics.length > 1 && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-600">
                                <svg className="fill-current h-8 w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg mt-2">
                        Books for the twenty-first century
                    </p>
                </header>

                {/* Content Card */}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-95">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-pulse text-gray-400">
                                    Give it utmost 30 seconds to fetch the good side of internet...
                                </div>
                            </div>
                        ) : (
                            <div className="markdown-content text-gray-700 dark:text-gray-300">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                >
                                    {currentContent}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}