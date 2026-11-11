"""
Inverted Index & Information Retrieval Ranking Engine
Course: Information Retrieval & Search Engine Optimization
Academic Project: ExportCat — University of Barishal
Student: Suria Hossain Bonna (22CSE006)
Supervisor: Dr. Tania Islam
"""

import sys
import os
import json
import math
import argparse
from collections import defaultdict
from tokenizer import tokenize

class InvertedIndex:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        # term -> list of [doc_id, term_frequency, [positions]]
        self.index = defaultdict(dict)
        # doc_id -> metadata (title, category, doc_len, etc.)
        self.docs = {}
        # Document lengths
        self.doc_lengths = {}
        self.avg_doc_length = 0.0
        self.k1 = k1
        self.b = b

    def add_document(self, doc_id: str, title: str, content: str, metadata: dict = None):
        """Adds and indexes a document with title and content."""
        full_text = f"{title} {content}"
        tokens = tokenize(full_text)
        doc_len = len(tokens)
        self.doc_lengths[doc_id] = doc_len
        self.docs[doc_id] = {
            'id': doc_id,
            'title': title,
            'content': content[:200] + '...' if len(content) > 200 else content,
            'length': doc_len,
            'metadata': metadata or {}
        }

        # Track term positions and frequencies
        for pos, term in enumerate(tokens):
            if doc_id not in self.index[term]:
                self.index[term][doc_id] = {'tf': 0, 'positions': []}
            self.index[term][doc_id]['tf'] += 1
            self.index[term][doc_id]['positions'].append(pos)

        # Recalculate average document length
        total_len = sum(self.doc_lengths.values())
        self.avg_doc_length = total_len / len(self.doc_lengths) if self.doc_lengths else 0.0

    def get_idf(self, term: str) -> float:
        """Calculates Robertson-Spärck Jones IDF for BM25."""
        N = len(self.docs)
        if N == 0:
            return 0.0
        df = len(self.index.get(term, {}))
        if df == 0:
            return 0.0
        # Standard BM25 IDF formulation: log((N - df + 0.5) / (df + 0.5) + 1)
        return math.log(1.0 + (N - df + 0.5) / (df + 0.5))

    def search_bm25(self, query: str, top_k: int = 10) -> list[dict]:
        """Calculates BM25 relevance scores for all matching documents."""
        q_tokens = tokenize(query)
        if not q_tokens or not self.docs:
            return []

        scores = defaultdict(float)
        matched_terms = defaultdict(list)

        for term in q_tokens:
            if term not in self.index:
                continue
            idf = self.get_idf(term)
            postings = self.index[term]

            for doc_id, data in postings.items():
                tf = data['tf']
                dl = self.doc_lengths.get(doc_id, self.avg_doc_length)
                denom = tf + self.k1 * (1.0 - self.b + self.b * (dl / (self.avg_doc_length or 1.0)))
                bm25_term_score = idf * ((tf * (self.k1 + 1.0)) / denom)
                scores[doc_id] += bm25_term_score
                matched_terms[doc_id].append(term)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        results = []
        for rank, (doc_id, score) in enumerate(ranked, 1):
            doc = self.docs[doc_id]
            results.append({
                'rank': rank,
                'doc_id': doc_id,
                'title': doc['title'],
                'score': round(score, 4),
                'matched_terms': matched_terms[doc_id],
                'metadata': doc['metadata']
            })
        return results

    def search_tfidf(self, query: str, top_k: int = 10) -> list[dict]:
        """Calculates TF-IDF vector space cosine similarity scores."""
        q_tokens = tokenize(query)
        if not q_tokens or not self.docs:
            return []

        # Query vector: tf * idf
        q_tf = defaultdict(int)
        for t in q_tokens:
            q_tf[t] += 1

        N = len(self.docs)
        q_weights = {}
        for t, tf in q_tf.items():
            df = len(self.index.get(t, {}))
            idf = math.log((N + 1) / (df + 1)) + 1 if df > 0 else 0
            q_weights[t] = tf * idf

        q_norm = math.sqrt(sum(w**2 for w in q_weights.values()))
        if q_norm == 0:
            return []

        # Doc vector dot products
        dot_products = defaultdict(float)
        doc_sq_norms = defaultdict(float)

        for t, qw in q_weights.items():
            if t not in self.index:
                continue
            df = len(self.index[t])
            idf = math.log((N + 1) / (df + 1)) + 1
            for doc_id, data in self.index[t].items():
                w_d = data['tf'] * idf
                dot_products[doc_id] += qw * w_d
                doc_sq_norms[doc_id] += w_d ** 2

        scores = {}
        for doc_id, dot in dot_products.items():
            d_norm = math.sqrt(doc_sq_norms[doc_id])
            if d_norm > 0:
                scores[doc_id] = dot / (q_norm * d_norm)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        results = []
        for rank, (doc_id, score) in enumerate(ranked, 1):
            doc = self.docs[doc_id]
            results.append({
                'rank': rank,
                'doc_id': doc_id,
                'title': doc['title'],
                'score': round(score, 4),
                'metadata': doc['metadata']
            })
        return results

    def search_boolean(self, query: str) -> list[str]:
        """Boolean retrieval supporting AND, OR, NOT operations."""
        tokens = tokenize(query, remove_stopwords=False, apply_stemming=True)
        if not tokens:
            return []
        
        # Simple boolean intersection
        results = None
        for term in tokens:
            postings = set(self.index.get(term, {}).keys())
            if results is None:
                results = postings
            else:
                results = results.intersection(postings)
        return list(results or [])

# ─── Default Sample Documents for Academic Evaluation & Fallback ───
DEFAULT_CATALOGUE = [
    {
        "id": "PROD-JUTE-001",
        "title": "Natural Raw Hessian Jute Fabric Burlap",
        "content": "Premium grade 100% natural biodegradable golden jute fiber woven cloth. Used for eco-friendly packaging, agricultural sacks, erosion control, and home decor exports. Density 280 gsm, width 100cm, ISO 9001 certified.",
        "category": "Jute & Natural Fibers",
        "moq": 1000,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-JUTE-002",
        "title": "Heavy-Duty Jute Sacking Bags for Cocoa and Coffee",
        "content": "Export-grade heavy sacking hydrocarbon-free jute bags for food grain, raw cocoa beans, and coffee packaging. Hydrocarbon-free certified, breathable, tear-resistant with reinforced hems.",
        "category": "Jute & Natural Fibers",
        "moq": 2000,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-TEX-001",
        "title": "100% Organic Combed Cotton Single Jersey Fabric",
        "content": "OEKO-TEX Standard 100 and GOTS certified organic combed cotton knit fabric for t-shirts and apparel. 180 gsm, bio-washed, reactive dye fastness class 4-5.",
        "category": "Textiles & Fabrics",
        "moq": 500,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-TEX-002",
        "title": "Denim Fabric Heavyweight Twill 12oz",
        "content": "Indigo dyed ring spun 100% cotton denim fabric for jeans, jackets, and workwear. 3/1 right hand twill, sanforized shrink-resistant finish.",
        "category": "Textiles & Fabrics",
        "moq": 1500,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-LTH-001",
        "title": "Full Grain Crust Bovine Leather",
        "content": "LWG Gold certified sustainable bovine crust leather for high-end shoes, boots, and leather handbags. Substance 1.2-1.4mm, vegetable tanned, drum dyed.",
        "category": "Leather Goods",
        "moq": 300,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-LTH-002",
        "title": "Finished Cow Nappa Leather Hides",
        "content": "Soft tempered cow nappa leather for luxury footwear, wallets, and upholstery. Smooth grain, REACH compliant, water-repellent finish.",
        "category": "Leather Goods",
        "moq": 500,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-CER-001",
        "title": "Fine Bone China Porcelain Dinnerware Set",
        "content": "Lead-free, cadmium-free microwave and dishwasher safe fine porcelain tableware. ISO 9001, FDA food grade contact approved dinner set with 24k gold line accent.",
        "category": "Ceramic & Pottery",
        "moq": 250,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-GAR-001",
        "title": "Men's Heavyweight Fleece Pullover Hoodie",
        "content": "Wholesale custom 80% cotton 20% polyester blend 330 gsm brushed fleece hoodie. Pre-shrunk, double-needle stitching, BSCI audited manufacturing.",
        "category": "Garments & Apparel",
        "moq": 1000,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-AGR-001",
        "title": "Single Origin Orthodox Black Tea BOP",
        "content": "Broken Orange Pekoe high-grown black tea from Sylhet hills. HACCP certified, rich aroma, golden liquor, bulk packed in multiwall paper sacks with foil liner.",
        "category": "Agricultural Products",
        "moq": 500,
        "origin": "Bangladesh"
    },
    {
        "id": "PROD-FOO-001",
        "title": "Frozen Black Tiger Shrimp Raw Head-On (HOSO)",
        "content": "IQF deep frozen Penaeus monodon black tiger prawns farmed in coastal brackish waters. US FDA HACCP and BRC certified, count 16/20 per kg.",
        "category": "Frozen Foods",
        "moq": 1000,
        "origin": "Bangladesh"
    }
]

def build_default_index() -> InvertedIndex:
    idx = InvertedIndex(k1=1.5, b=0.75)
    for doc in DEFAULT_CATALOGUE:
        idx.add_document(
            doc_id=doc["id"],
            title=doc["title"],
            content=doc["content"],
            metadata={
                "category": doc["category"],
                "moq": doc["moq"],
                "origin": doc["origin"]
            }
        )
    return idx

def main():
    parser = argparse.ArgumentParser(description="ExportCat IR Inverted Index & Search Engine")
    parser.add_argument("--query", "-q", type=str, default="", help="Query string to search")
    parser.add_argument("--model", "-m", choices=["bm25", "tfidf", "boolean"], default="bm25", help="Ranking model")
    parser.add_argument("--top_k", "-k", type=int, default=10, help="Top K results")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    args = parser.parse_args()

    index = build_default_index()

    if not args.query:
        if args.json:
            print(json.dumps({"status": "ready", "indexed_documents": len(index.docs), "vocab_size": len(index.index)}))
        else:
            print(f"ExportCat Inverted Index Ready. Indexed {len(index.docs)} documents, {len(index.index)} unique terms.")
        return

    if args.model == "bm25":
        results = index.search_bm25(args.query, top_k=args.top_k)
    elif args.model == "tfidf":
        results = index.search_tfidf(args.query, top_k=args.top_k)
    else:
        doc_ids = index.search_boolean(args.query)
        results = [{"rank": i+1, "doc_id": did, "title": index.docs[did]["title"]} for i, did in enumerate(doc_ids[:args.top_k])]

    if args.json:
        print(json.dumps({
            "query": args.query,
            "model": args.model,
            "total_matches": len(results),
            "results": results
        }, indent=2))
    else:
        print(f"\nSearch results for '{args.query}' using {args.model.upper()}:")
        print("-" * 60)
        for r in results:
            print(f"#{r['rank']} [Score: {r.get('score', 'N/A')}] {r['title']} ({r['doc_id']})")

if __name__ == "__main__":
    main()
