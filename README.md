# PatternUp 🚀

PatternUp is a modern Data Structures & Algorithms (DSA) preparation platform designed to help developers master coding interview patterns through structured learning, spaced repetition, and real-time progress tracking.

---

## ✨ Features

- **Pattern-Based Curriculum**: Organized by algorithmic patterns (Two Pointers, Sliding Window, Fast & Slow Pointers, Tree Traversals, Graphs, Dynamic Programming, and more).
- **Spaced Repetition Review**: Smart revision intervals designed to cement problem-solving intuitions for long-term retention.
- **Problem Filtering & Progress**: Track your solved problems, bookmark key questions, and manage custom collections.
- **Integrated Coding Workflow**: Clean interfaces for problem statements, approaches, code solutions, hints, and direct links to LeetCode/GFG platforms.
- **Authentication & Personalization**: Powered by Clerk authentication and user preference management.
- **Modern Tech Stack**: Built with Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, and Prisma ORM.

---

## 🛠️ Project Structure

```text
PatternUp/
├── data/                       # Extracted PDF inventories & LeetCode cache data
├── dsa-app/                    # Next.js web application
│   ├── prisma/                 # Prisma schemas, migrations & seed scripts
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── app/                # Next.js App Router (pages and API routes)
│   │   ├── components/         # Reusable React UI components
│   │   ├── lib/                # Database clients, utilities & helpers
│   │   └── types/              # TypeScript interfaces and schemas
│   ├── tests/                  # Unit and integration test suites
│   └── package.json            # Web app dependencies & scripts
├── scripts/                    # Automation scripts for data enrichment & indexing
├── package.json                # Root package configuration
└── README.md
```

---

## 🚦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or higher)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anupdevs/PatternUp.git
   cd PatternUp
   ```

2. Install dependencies:
   ```bash
   # In the root or inside dsa-app
   npm --prefix dsa-app install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` in `dsa-app`:
   ```bash
   cp dsa-app/.env.example dsa-app/.env
   ```
   Provide your Clerk API keys and database connection URL.

4. Run database migrations / seed (optional):
   ```bash
   npm --prefix dsa-app run seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run test suites:
```bash
npm test
```

---

## 📄 License

This project is licensed under the MIT License.
