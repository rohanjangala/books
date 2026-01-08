"use client"

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

export default function Home() {
    const [idea, setIdea] = useState<string>('…loading');
    const [topic, setTopic] = useState<string>('…loading');

    // Fetch topic on mount
    useEffect(() => {
        fetch('/api')
            .then(res => res.text())
            .then(topicText => {
                const trimmedTopic = topicText.trim();
                setTopic(trimmedTopic);
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

    // Stream the idea content
    useEffect(() => {
        if (topic === '…loading' || topic === 'Error loading topic') return;

        setIdea(''); // Clear/Init
        const evt = new EventSource(`/api/response?topic=${encodeURIComponent(topic)}`);
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
    }, [topic]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
            <div className="container mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        {topic}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        Books for the twenty-first century
                    </p>
                </header>

                {/* Content Card */}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-lg bg-opacity-95">
                        {idea === '…loading' || idea === '' ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-pulse text-gray-400">
                                    Generating your recommendations...
                                </div>
                            </div>
                        ) : (
                            <div className="markdown-content text-gray-700 dark:text-gray-300">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                >
                                    {idea}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}