# Books for the 21st Century

This is a curated book recommendation application powered by AI. This web app generates unique topics relevant to the 21st century and provides top-tier book recommendations for each. This uses next.js, fastapi & python (backend), github models (gpt-4.1-nano, grok-3).

You can have a look at first production site: [Books](https://books-henna-theta.vercel.app/)!

This repo is an updated version with a payment gateway.

## Prerequisites

Before running this project locally, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Project was built with v20+)
- [Python 3.9+](https://www.python.org/)
- [pip](https://pip.pypa.io/en/stable/installation/) (Optional if you deploy to preview/production)
- [GitHub API Key](https://github.com/settings/personal-access-tokens) (Provide access to Models while creating the key)

npm run dev

uvicorn api.index:app --port 8000

kill -9 $(lsof -t -i:8000) ; source .venv/bin/activate && set -a && source .env.local && set +a && uvicorn api.index:app --reload --port 8000

## Local Development Setup

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd books
```

### 2. Install Dependencies

**Frontend Dependencies:**

```bash
# This downloads all libraries and creates the node_modules folder
npm install
# or
yarn install
```

**Backend Dependencies:**
It is recommended to use only vercel deployment as the production builds are easy.

**Important Note:** Do not try to run `npm run build` locally as it often yields errors. The project is optimized for deployment on Vercel.

### 3. Deploy on Vercel

The easiest and recommended way to run this application is by deploying it to [Vercel](https://vercel.com/).

1. **Install Vercel CLI (Optional but recommended):**

   ```bash
   npm i -g vercel
   ```
2. **Link your project:**
   Run the following command in your terminal and follow the prompts to link your local project to a Vercel project:

   ```bash
   vercel
   ```
3. **Configure Environment Variables:**

   - Go to your project settings on the Vercel dashboard.
   - Navigate to **Settings > Environment Variables**.
   - Add a new variable named `GITHUB_API_KEY` with your actual API key as the value.
4. **Deploy:**
   You can deploy directly from the CLI:

   ```bash
   vercel --prod
   ```

   Or, if you have linked your GitHub repository, simply push your changes to the main branch, and Vercel will automatically build and deploy your application.

Vercel will automatically detect the Next.js frontend and the Python backend (in `api/index.py`) and set everything up for you.
