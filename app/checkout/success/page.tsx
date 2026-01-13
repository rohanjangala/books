"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SuccessPage() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        setShow(true);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div
                className={`max-w-md w-full bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center backdrop-blur-xl transition-all duration-1000 ease-out transform ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                    }`}
            >
                {/* Success Icon */}
                <div className="mb-6 flex justify-center">
                    <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center relative">
                        <div className={`absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-75 duration-1000 ${show ? 'block' : 'hidden'}`}></div>
                        <svg
                            className={`w-10 h-10 text-green-500 transition-all duration-700 delay-300 ${show ? "scale-100 opacity-100" : "scale-0 opacity-0"
                                }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                {/* Text Content */}
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                    Payment Successful!
                </h1>
                <p className="text-neutral-400 mb-8 leading-relaxed">
                    Thank you for your purchase. A confirmation email has been sent to your inbox.
                </p>

                {/* Action Button */}
                <Link
                    href="/"
                    className="group block w-full py-3 px-4 rounded-xl font-medium text-black bg-white hover:bg-neutral-200 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    Return to Dashboard
                </Link>
            </div>
        </div>
    );
}
