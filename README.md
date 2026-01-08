# Books for the 21st Century

This is a curated book recommendation application powered by AI. This web app generates unique topics relevant to the 21st century and provides top-tier book recommendations for each. This uses next.js, fastapi & python (backend), github models (gpt-4.1-nano, grok-3).

You can have a look at the site: [Books](https://books-henna-theta.vercel.app/)!

## Prerequisites

Before running this project locally, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Project was built with v20+)
- [Python 3.9+](https://www.python.org/)
- [pip](https://pip.pypa.io/en/stable/installation/) (Optional if you deploy to preview/production) 
- [GitHub API Key](https://github.com/settings/personal-access-tokens) (Provide access to Models while creating the key)

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
It is recommended to use a virtual environment.

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (or `.env.local` for Next.js) and add your GitHub API Key. This is required for the Azure/OpenAI inference.

```bash
GITHUB_API_KEY=your_github_api_key_here
```

### 4. Run the Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The Next.js development server will automatically handle the Python API backend (located in `api/index.py`).

## Deploy on Vercel

The easiest way to deploy this app is using the [Vercel Platform](https://vercel.com/new).

1.  Push your code to a Git repository (GitHub, GitLab, BitBucket).
2.  Import the project into Vercel.
3.  **Environment Variables**: In the Vercel project settings, add the `GITHUB_API_KEY` to the Environment Variables section.
4.  **Build Settings**: Next.js presets should work automatically. Vercel will detect `api/` and deploy it as Serverless Functions.
5.  Deploy!

Check out [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
