"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { saveAccessToken } from "@/lib/access-token";

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [show, setShow] = useState(false);

    useEffect(() => {
        const token = searchParams.get("access_token");
        if (token) {
            saveAccessToken(token);
        }
        setShow(true);
        const timer = setTimeout(() => router.push("/pro"), 2500);
        return () => clearTimeout(timer);
    }, [searchParams, router]);

    return (
        <div
            className={`max-w-md w-full bg-stone-900/50 border border-stone-800/50 rounded-2xl p-8 text-center backdrop-blur-xl transition-all duration-700 ease-out transform ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
        >
            <div className="mb-6 flex justify-center">
                <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center relative">
                    <div className={`absolute inset-0 bg-emerald-500/15 rounded-full animate-ping opacity-75 ${show ? "block" : "hidden"}`} />
                    <svg className={`w-10 h-10 text-emerald-400 transition-all duration-700 delay-300 ${show ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            </div>
            <h1 className="text-2xl font-light text-stone-200 mb-2">Payment Successful</h1>
            <p className="text-stone-500 font-light mb-6 text-sm leading-relaxed">
                Thank you for your purchase! Redirecting you to your personalized recommendations...
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-400/70">
                <div className="w-4 h-4 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />
                <span className="text-xs font-light text-stone-500">Preparing your experience</span>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
            <Suspense fallback={<div className="w-8 h-8 border-2 border-stone-700 border-t-amber-400 rounded-full animate-spin" />}>
                <SuccessContent />
            </Suspense>
        </main>
    );
}
