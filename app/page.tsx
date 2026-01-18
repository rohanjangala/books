"use client";

import { useState } from "react";
import { products } from "@/lib/products";
import type { Product } from "@/lib/products";

export default function Home() {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleProductSelect = (product: Product) => {
        setSelectedProduct(product);
        setError("");
    };

    const handleBack = () => {
        setSelectedProduct(null);
        setFormData({ name: "", email: "" });
        setError("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    product_cart: [
                        {
                            product_id: selectedProduct.product_id,
                            quantity: 1,
                        },
                    ],
                    customer: {
                        name: formData.name,
                        email: formData.email,
                    },
                }),
            });

            const data = await response.json();

            if (response.ok && data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                setError(data.message || "Something went wrong");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Product selection view
    if (!selectedProduct) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] relative">
                {/* Subtle grid pattern */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23ffffff' fill-opacity='1'%3e%3cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
                    }}
                />

                <div className="relative z-10">
                    {/* Header */}
                    <header className="border-b border-[#1a1a1a] px-6 py-4">
                        <div className="max-w-6xl mx-auto flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <span className="text-[#666] text-xs">Secured by</span>
                                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                                    <div className="w-3 h-3 bg-black rounded-[2px]"></div>
                                </div>
                                <span className="text-white font-medium text-sm tracking-wide">
                                    DodoPayments
                                </span>
                            </div>
                            <div className="text-[#666] text-xs font-mono">BETA</div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <div className="flex-1 w-full py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
                        <div className="max-w-4xl mx-auto">
                            {/* Hero Section */}
                            <div className="text-center mb-8 sm:mb-12">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 tracking-tight whitespace-nowrap">
                                    Non-Fiction for the curious mind.
                                </h1>
                                <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
                                    Simple pricing.
                                </p>
                            </div>

                            {/* Two Column Layout: Video + Product Card */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
                                {/* Demo Video */}
                                <div className="w-full flex flex-col">
                                    <p className="text-xs sm:text-sm text-neutral-500 mb-3 text-center lg:text-left">See how it works</p>
                                    <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-black shadow-2xl shadow-black/50 flex-1 flex items-center">
                                        <video
                                            className="w-full h-auto"
                                            controls
                                            playsInline
                                            autoPlay
                                            loop
                                            muted
                                        >
                                            <source src="/demo.mp4" type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                </div>

                                {/* Product Card */}
                                {products.map((product) => {
                                    const priceString = (product.price / 100).toFixed(2);

                                    return (
                                        <div
                                            key={product.product_id}
                                            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-neutral-900 to-black border border-neutral-800 hover:border-neutral-600 transition-all duration-300 shadow-xl"
                                        >
                                            <div className="p-5 sm:p-6 lg:p-8 flex flex-col h-full">
                                                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                                                    {product.name}
                                                </h3>

                                                <p className="text-neutral-400 text-sm mb-4 sm:mb-6 leading-relaxed">
                                                    {product.description}
                                                </p>

                                                <div className="mb-4 sm:mb-6">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                                                            ${priceString}
                                                        </span>
                                                        <span className="text-neutral-500 text-sm font-medium">
                                                            /hour
                                                        </span>
                                                    </div>
                                                </div>

                                                <ul className="mb-4 sm:mb-6 space-y-2 sm:space-y-3 grow">
                                                    {product.features.map((feature, index) => (
                                                        <li
                                                            key={index}
                                                            className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-300"
                                                        >
                                                            <svg
                                                                className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                            <span>{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>

                                                <button
                                                    onClick={() => handleProductSelect(product)}
                                                    className="w-full py-2.5 sm:py-3 px-4 rounded-lg font-medium text-black bg-white hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base"
                                                >
                                                    <span>Get Recommended Books</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Checkout form view
    return (
        <div className="min-h-screen bg-[#0d0d0d] relative">
            {/* Subtle grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.02]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='none' fill-rule='evenodd'%3e%3cg fill='%23ffffff' fill-opacity='1'%3e%3cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e")`,
                }}
            />

            <div className="relative z-10">
                {/* Header */}
                <header className="border-b border-[#1a1a1a] px-6 py-4">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                                <div className="w-3 h-3 bg-black rounded-[2px]"></div>
                            </div>
                            <span className="text-white font-medium text-sm tracking-wide">
                                DodoPayments
                            </span>
                        </div>
                        <div className="text-[#666] text-xs font-mono">BETA</div>
                    </div>
                </header>

                {/* Main */}
                <main className="flex-1 flex items-center justify-center px-8 py-16">
                    <div className="w-full max-w-[420px]">
                        {/* Back button */}
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-[#888] hover:text-white transition-colors mb-8 text-sm"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            Back to products
                        </button>

                        <div className="mb-12">
                            <h1 className="text-[28px] font-medium text-white mb-3 tracking-[-0.01em] leading-tight">
                                Complete your purchase
                            </h1>
                            <p className="text-[#888] text-[15px] leading-relaxed mb-4">
                                Just a few details and you're all set
                            </p>

                            {/* Selected product summary */}
                            <div className="bg-[#161616] border border-[#2a2a2a] rounded-[6px] p-4 mt-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-white font-medium text-sm mb-1">
                                            {selectedProduct.name}
                                        </p>
                                        <p className="text-[#666] text-xs">
                                            {selectedProduct.description}
                                        </p>
                                    </div>
                                    <p className="text-white font-bold text-sm">
                                        ${(selectedProduct.price / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[#ccc] text-[13px] font-medium mb-2">
                                        Full name
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        className="w-full h-11 px-4 bg-[#161616] border border-[#2a2a2a] rounded-[6px] text-white text-[15px] placeholder-[#666] focus:outline-none focus:border-[#555] focus:bg-[#1a1a1a] transition-all duration-200"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-[#ccc] text-[13px] font-medium mb-2">
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="w-full h-11 px-4 bg-[#161616] border border-[#2a2a2a] rounded-[6px] text-white text-[15px] placeholder-[#666] focus:outline-none focus:border-[#555] focus:bg-[#1a1a1a] transition-all duration-200"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-400/5 border border-red-400/20 rounded-[6px] px-4 py-3">
                                    <p className="text-red-400 text-[13px] font-medium">
                                        {error}
                                    </p>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={
                                        isLoading || !formData.name.trim() || !formData.email.trim()
                                    }
                                    className="w-full h-11 bg-white text-black text-[15px] font-medium rounded-[6px] hover:bg-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-white/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2"></div>
                                            Processing
                                        </div>
                                    ) : (
                                        "Continue to payment"
                                    )}
                                </button>
                            </div>

                            <div className="text-center pt-4">
                                <p className="text-[#666] text-[12px]">
                                    Powered by <span className="text-[#888]">DodoPayments</span>
                                </p>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}