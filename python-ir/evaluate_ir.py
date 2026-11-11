"""
Information Retrieval Evaluation Engine
Course: Information Retrieval & Search Engine Optimization
Academic Project: ExportCat — University of Barishal
Student: Suria Hossain Bonna (22CSE006)
Supervisor: Dr. Tania Islam
"""

import os
import sys
import json
import math
import argparse
from inverted_index import build_default_index

def parse_queries(queries_file: str) -> dict[str, str]:
    queries = {}
    if not os.path.exists(queries_file):
        return queries
    with open(queries_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            parts = line.split(maxsplit=1)
            if len(parts) == 2:
                queries[parts[0]] = parts[1]
    return queries

def parse_qrels(qrels_file: str) -> dict[str, dict[str, int]]:
    """Format: query_id iter doc_id rel"""
    qrels = {}
    if not os.path.exists(qrels_file):
        return qrels
    with open(qrels_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 4:
                qid, _, doc_id, rel = parts[0], parts[1], parts[2], int(parts[3])
                if qid not in qrels:
                    qrels[qid] = {}
                qrels[qid][doc_id] = rel
    return qrels

def dcg_at_k(relevance_scores: list[int], k: int) -> float:
    scores = relevance_scores[:k]
    if not scores:
        return 0.0
    dcg = scores[0]
    for i in range(1, len(scores)):
        dcg += scores[i] / math.log2(i + 1)
    return dcg

def ndcg_at_k(ranked_doc_ids: list[str], ground_truth: dict[str, int], k: int) -> float:
    retrieved_rels = [ground_truth.get(did, 0) for did in ranked_doc_ids[:k]]
    actual_dcg = dcg_at_k(retrieved_rels, k)
    ideal_rels = sorted(ground_truth.values(), reverse=True)
    ideal_dcg = dcg_at_k(ideal_rels, k)
    if ideal_dcg == 0:
        return 0.0
    return actual_dcg / ideal_dcg

def evaluate_models():
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    queries_file = os.path.join(data_dir, 'queries.txt')
    qrels_file = os.path.join(data_dir, 'qrels.txt')

    queries = parse_queries(queries_file)
    qrels = parse_qrels(qrels_file)
    index = build_default_index()

    models = ["bm25", "tfidf", "boolean"]
    evaluation_summary = {}

    for model in models:
        total_p5, total_p10 = 0.0, 0.0
        total_r5, total_r10 = 0.0, 0.0
        total_ap = 0.0
        total_rr = 0.0
        total_ndcg5, total_ndcg10 = 0.0, 0.0
        per_query_results = []

        valid_queries = 0
        for qid, qtext in queries.items():
            gt = qrels.get(qid, {})
            relevant_docs = {did for did, rel in gt.items() if rel > 0}
            num_relevant = len(relevant_docs)
            if num_relevant == 0:
                continue

            valid_queries += 1
            if model == "bm25":
                search_res = index.search_bm25(qtext, top_k=10)
                ranked_ids = [r['doc_id'] for r in search_res]
            elif model == "tfidf":
                search_res = index.search_tfidf(qtext, top_k=10)
                ranked_ids = [r['doc_id'] for r in search_res]
            else:
                ranked_ids = index.search_boolean(qtext)[:10]

            # Precision & Recall @ 5
            top5 = ranked_ids[:5]
            rel_in_5 = sum(1 for d in top5 if d in relevant_docs)
            p5 = rel_in_5 / 5.0
            r5 = rel_in_5 / num_relevant if num_relevant else 0.0

            # Precision & Recall @ 10
            top10 = ranked_ids[:10]
            rel_in_10 = sum(1 for d in top10 if d in relevant_docs)
            p10 = rel_in_10 / 10.0
            r10 = rel_in_10 / num_relevant if num_relevant else 0.0

            # Average Precision (AP)
            hits = 0
            sum_prec = 0.0
            for rank, did in enumerate(ranked_ids, 1):
                if did in relevant_docs:
                    hits += 1
                    sum_prec += hits / rank
            ap = sum_prec / num_relevant if num_relevant else 0.0

            # Reciprocal Rank (RR)
            rr = 0.0
            for rank, did in enumerate(ranked_ids, 1):
                if did in relevant_docs:
                    rr = 1.0 / rank
                    break

            # NDCG @ 5 and @ 10
            ndcg5 = ndcg_at_k(ranked_ids, gt, 5)
            ndcg10 = ndcg_at_k(ranked_ids, gt, 10)

            total_p5 += p5
            total_p10 += p10
            total_r5 += r5
            total_r10 += r10
            total_ap += ap
            total_rr += rr
            total_ndcg5 += ndcg5
            total_ndcg10 += ndcg10

            per_query_results.append({
                "qid": qid,
                "query": qtext,
                "retrieved_count": len(ranked_ids),
                "relevant_count": num_relevant,
                "p5": round(p5, 4),
                "p10": round(p10, 4),
                "r10": round(r10, 4),
                "ap": round(ap, 4),
                "rr": round(rr, 4),
                "ndcg10": round(ndcg10, 4)
            })

        n = max(valid_queries, 1)
        evaluation_summary[model] = {
            "model_name": model.upper(),
            "queries_evaluated": valid_queries,
            "mean_p5": round(total_p5 / n, 4),
            "mean_p10": round(total_p10 / n, 4),
            "mean_r10": round(total_r10 / n, 4),
            "map": round(total_ap / n, 4),
            "mrr": round(total_rr / n, 4),
            "mean_ndcg5": round(total_ndcg5 / n, 4),
            "mean_ndcg10": round(total_ndcg10 / n, 4),
            "per_query": per_query_results
        }

    return {
        "status": "success",
        "academic_meta": {
            "course": "Information Retrieval & Search Engine Optimization",
            "student": "Suria Hossain Bonna (22CSE006)",
            "supervisor": "Dr. Tania Islam",
            "department": "CSE, University of Barishal",
            "dataset": "ExportCat Bangladesh B2B Wholesale Benchmark"
        },
        "models": evaluation_summary
    }

def main():
    parser = argparse.ArgumentParser(description="Evaluate IR Models (BM25 vs TF-IDF vs Boolean)")
    parser.add_argument("--json", action="store_true", help="Output JSON results")
    args = parser.parse_args()

    results = evaluate_models()

    if args.json:
        print(json.dumps(results, indent=2))
    else:
        print("=" * 70)
        print("INFORMATION RETRIEVAL & SEO EVALUATION REPORT")
        print("Course: Information Retrieval & Search Engine Optimization")
        print("Student: Suria Hossain Bonna (22CSE006) | University of Barishal")
        print("=" * 70)
        for model, metrics in results["models"].items():
            print(f"\n--- Model: {metrics['model_name']} ---")
            print(f"P@5:      {metrics['mean_p5']:.4f}")
            print(f"P@10:     {metrics['mean_p10']:.4f}")
            print(f"Recall@10:{metrics['mean_r10']:.4f}")
            print(f"MAP:      {metrics['map']:.4f}")
            print(f"MRR:      {metrics['mrr']:.4f}")
            print(f"NDCG@10:  {metrics['mean_ndcg10']:.4f}")

if __name__ == "__main__":
    main()
