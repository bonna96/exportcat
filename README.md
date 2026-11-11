# 🐱 ExportCat — B2B Export Product Catalogue

> High-performance B2B Export Product Catalogue powered by an **Express/Prisma/PostgreSQL** architecture, **OpenSearch** faceted search, **Python Information Retrieval (IR) Engine**, and an automated **SEO & Canonicalization Engine**.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Setup Database & Seed Data](#4-setup-database--seed-data)
  - [5. Run Development Server](#5-run-development-server)
- [Python IR Engine Subsystem](#-python-ir-engine-subsystem)
- [Demo User Accounts](#-demo-user-accounts)
- [Available Scripts](#-available-scripts)
- [Testing](#-testing)
- [License](#-license)

---

## 🌟 Overview

**ExportCat** is an enterprise-grade B2B e-commerce and export catalogue platform designed specifically for global trade and large-scale industrial product lines. It solves critical challenges in multi-tier category hierarchies, faceted search performance, search relevance scoring, SEO crawler indexing control, and quote enquiry workflows.

---

## 🚀 Key Features

### 🛍️ B2B Catalogue & Multi-Tier Hierarchy
- **Hierarchical Categories**: Self-referential tree structure for multi-level category navigation.
- **Product & Variant Management**: Full support for SKU codes, HS Codes, certifications (ISO, CE, FDA, etc.), Minimum Order Quantity (MOQ), and incoterms (FOB, CIF, EXW).
- **Product Comparison**: Side-by-side spec comparison table for multi-product evaluation.
- **Quote Enquiry Pipeline**: Interactive RFQ (Request for Quote) system connected to transactional email dispatch.

### 🔍 Search & Faceted Filtering (OpenSearch)
- **High-Performance Faceted Search**: Multi-attribute filtering (category, material, country of origin, certification, price/MOQ ranges).
- **Real-Time Autocomplete & Synonyms**: Search-as-you-type autocomplete with synonym expansion.
- **Unit & Currency Converters**: Client-side dynamic currency and metric/imperial conversion.

### 🧠 Python Information Retrieval (IR) Engine
- **Inverted Index & Tokenizer**: Custom Porter stemmer, stopword filtering, and n-gram tokenizer.
- **PageRank & Link Analysis**: Internal graph crawler computing PageRank scores for product and category nodes.
- **IR Metrics Evaluation**: Benchmarks Mean Average Precision (MAP), Mean Reciprocal Rank (MRR), and NDCG@K using standard test collections (`qrels.txt` & `queries.txt`).
- **Node-to-Python Bridge**: Asynchronous IPC bridge enabling Node.js to trigger Python evaluation and ingest ranked scoring.

### 🌐 SEO & Indexing Architecture
- **Strict Facet SEO Policy**: Prevents faceted search URL duplicate content indexing using canonical tags, `noindex,follow` rules, and crawl-budget protection.
- **Automated XML Sitemaps**: Dynamic multi-locale sitemaps with priority weighting and change frequencies.
- **URL Normalizer & 301 Redirects**: Automated hyphenation, lowercase conversion, trailing-slash enforcement, and redirect management.

### 🔐 Authentication & RBAC
- Role-based authorization: **Admin**, **Catalogue Manager**, **Search Analyst**, and **Buyer**.
- Supabase Auth integration with secure JWT verification and session handling.

### 🖼️ High-Performance Asset Pipeline
- Image upload and processing via **Sharp** (automatic WebP generation, thumbnail creation, and responsive sizing).

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime & Backend** | [Node.js](https://nodejs.org/) (v18+), [Express.js](https://expressjs.com/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/) |
| **Search Engine** | [OpenSearch 2.x](https://opensearch.org/) |
| **IR & ML Engine** | [Python 3.9+](https://www.python.org/) (Custom Tokenizer, Inverted Index, PageRank) |
| **Auth & Security** | [Supabase](https://supabase.com/), [Helmet](https://helmetjs.github.io/), [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) |
| **Frontend & UI** | [EJS](https://ejs.co/) (Server-Side Rendering), [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Email Service** | [Nodemailer](https://nodemailer.com/) |
| **Testing** | [Jest](https://jestjs.io/), [Supertest](https://github.com/ladjs/supertest) |

---

## 📁 Project Structure

```text
exportcat/
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema definitions & relations
│   └── seed.js                  # Database seed data (users, categories, products)
├── public/
│   ├── css/styles.css           # Compiled Tailwind CSS
│   ├── js/                      # Frontend client scripts (AJAX filters, autocomplete)
│   └── robots.txt               # Crawler directives
├── python-ir/                   # Python Information Retrieval subsystem
│   ├── crawler_pagerank.py      # Graph crawler & PageRank algorithm
│   ├── inverted_index.py        # Custom Inverted Index & BM25 scoring
│   ├── tokenizer.py             # Linguistic tokenizer & stemmer
│   ├── evaluate_ir.py           # Evaluation framework (MAP, MRR, NDCG)
│   ├── data/                    # Queries, qrels & synonyms test collections
│   └── requirements.txt         # Python dependencies
├── src/
│   ├── server.js                # Server entry point
│   ├── app.js                   # Express application setup & middleware stack
│   ├── config/                  # DB, OpenSearch & Supabase configurations
│   ├── controllers/             # Request handlers (admin, catalog, search, enquiry)
│   ├── middleware/              # Auth guard, facet policy, rate limiter, validators
│   ├── routes/                  # API, SEO & SSR view routes
│   ├── services/                # Search, image pipeline, SEO, email, python bridge
│   └── views/                   # EJS templates, pages and layouts
├── tests/
│   ├── search-latency.test.js   # OpenSearch response time & latency tests
│   └── seo-regression.test.js   # Canonical URLs & meta tag regression suite
├── .env.example                 # Example environment variables template
├── .gitignore                   # Git ignore patterns
└── package.json                 # Node.js project manifest & scripts
```

---

## 📋 Prerequisites

Before running the project, make sure you have installed:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14` or higher
- **OpenSearch**: `v2.x` (or Docker image)
- **Python**: `v3.9` or higher

---

## ⚡ Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/bonna96/exportcat.git
cd exportcat
```

### 2. Install Dependencies

Install Node.js dependencies:
```bash
npm install
```

Install Python IR engine dependencies:
```bash
cd python-ir
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment Variables

Copy the example `.env.example` file to create your `.env`:

```bash
cp .env.example .env
```

Update your `.env` with your actual database and service connection parameters:

```ini
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# PostgreSQL (Prisma)
DATABASE_URL="postgresql://postgres:password@localhost:5432/exportcat?schema=public"

# Supabase Auth
SUPABASE_URL=https://my-project.supabase.co
SUPABASE_ANON_KEY=my-anon-key
SUPABASE_SERVICE_ROLE_KEY=my-service-role-key
JWT_SECRET=my-jwt-secret-at-least-32-characters

# OpenSearch
OPENSEARCH_NODE=https://localhost:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=admin
OPENSEARCH_INDEX_PREFIX=exportcat

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=my-email@gmail.com
SMTP_PASS=my-app-password
SMTP_FROM="ExportCat <noreply@exportcat.com>"
```

### 4. Setup Database & Seed Data

Generate the Prisma client, push database schema, and seed initial demo data:

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to your PostgreSQL database
npm run db:push

# Populate database with initial categories, products, and users
npm run db:seed
```

### 5. Run Development Server

Start the application in development mode with live-reload:

```bash
npm run dev
```

Visit **`http://localhost:3000`** in browser.

---

## 🐍 Python IR Engine Subsystem

ExportCat includes a standalone Python Information Retrieval toolkit located in `python-ir/`:

```bash
cd python-ir

# Run Inverted Index creation
python inverted_index.py

# Compute PageRank scores on internal link graphs
python crawler_pagerank.py

# Run IR evaluation benchmarks (MAP, MRR, NDCG)
python evaluate_ir.py --json
```

---

## 👤 Demo User Accounts

The seed script creates the following demo user accounts with predefined roles:

| Role | Email | Description |
|---|---|---|
| **Site Administrator** | `admin@exportcat.com` | Complete system access, audit logs, and settings |
| **Catalogue Manager** | `manager@exportcat.com` | Manages products, categories, specs, and media |
| **Search & SEO Analyst**| `analyst@exportcat.com` | Analyzes search logs, query relevance, and IR metrics |
| **Buyer** | `buyer@exportcat.com` | Browses catalogue, compares products, submits RFQs |

---

## 📜 Available Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `nodemon src/server.js` | Starts the Express server in development mode |
| `npm start` | `node src/server.js` | Starts the production server |
| `npm run db:generate` | `prisma generate` | Generates the Prisma Client |
| `npm run db:push` | `prisma db push` | Pushes the schema to PostgreSQL without migrations |
| `npm run db:seed` | `node prisma/seed.js` | Seeds sample products, categories, and accounts |
| `npm run db:studio` | `prisma studio` | Opens the Prisma visual data browser |
| `npm run db:reset` | `prisma db push --force-reset` | Resets the database and reseeds from scratch |
| `npm run css:build` | `tailwindcss --minify` | Compiles and minifies Tailwind CSS for production |
| `npm run css:watch` | `tailwindcss --watch` | Watches and recompiles CSS on template changes |
| `npm test` | `jest --detectOpenHandles` | Executes automated test suites |
| `npm run lint` | `eslint src/` | Runs ESLint code quality checks |

---

## 🧪 Testing

Run automated tests including SEO regression and search performance suites:

```bash
npm test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
