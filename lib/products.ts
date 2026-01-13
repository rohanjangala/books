export type Product = {
    product_id: string;
    name: string;
    description: string;
    price: number;
    features: string[];
};

export const products: Product[] = [
    {
        product_id: "pdt_0NW6hKoj54tNPS3nrhusm",
        name: "AI Recommender for Non-Fiction",
        description: "Get access to instant recommendations and support",
        price: 500, // in cents
        features: [
            "1 premium refresh",
            "5 topics + 25 books",
            "Access to email support",
        ],
    },
];
