export type Product = {
    product_id: string;
    name: string;
    description: string;
    price: number;
    features: string[];
};

export const products: Product[] = [
    {
        product_id: "pdt_0NWYeXRAx3KBxYFAZSUWg",
        name: "AI Recommender for Non-Fiction Books",
        description: "Get access to recommendations upto 1 hour",
        price: 500, // in cents
        features: [
            "Access to 1hr validity",
            "5 topics + 5x3 books per refresh",
            "Unlimited refreshes",
        ],
    },
];
