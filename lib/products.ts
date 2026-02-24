export type Product = {
    product_id: string;
    name: string;
    description: string;
    price: number; // in cents
    features: string[];
};

export const AI_RECOMMENDER_PRODUCT: Product = {
    product_id: process.env.AI_RECOMMENDER_PRODUCT_ID || "pdt_0NWYeXRAx3KBxYFAZSUWg",
    name: "AI Recommender for Non-Fiction Books",
    description: "Get personalized AI-powered book recommendations based on your reading history",
    price: 500,
    features: [
        "1-hour access to Pro recommendations",
        "5 curated topics tailored to your library",
        "15 personalized book recommendations",
        "Downloadable PDF report",
    ],
};
