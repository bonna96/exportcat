"""
Graph-based PageRank Crawler and Internal Link Auditor
Course: Information Retrieval & Search Engine Optimization
Academic Project: ExportCat — University of Barishal
Student: Suria Hossain Bonna (22CSE006)
Supervisor: Dr. Tania Islam
"""

import sys
import os
import json
import argparse
import urllib.request
import urllib.parse
from html.parser import HTMLParser
from collections import defaultdict, deque

class LinkExtractor(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__()
        self.base_url = base_url
        self.links = set()

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for attr, val in attrs:
                if attr == 'href' and val:
                    # Ignore anchors and javascript
                    if val.startswith('#') or val.startswith('javascript:'):
                        continue
                    full_url = urllib.parse.urljoin(self.base_url, val)
                    # Normalize removing fragment
                    defrag, _ = urllib.parse.urldefrag(full_url)
                    self.links.add(defrag)

def compute_pagerank(nodes: list[str], adjacency: dict[str, set[str]], d: float = 0.85, max_iter: int = 100, tol: float = 1e-6) -> dict[str, float]:
    """
    Computes PageRank vector using Power Iteration.
    PR(u) = (1-d)/N + d * sum(PR(v) / OutDegree(v)) for all in-links v -> u
    """
    N = len(nodes)
    if N == 0:
        return {}

    # Initialize uniform probability
    pr = {node: 1.0 / N for node in nodes}
    out_degree = {node: len(adjacency.get(node, set())) for node in nodes}

    # Reverse adjacency: node -> set of nodes pointing to it
    in_links = defaultdict(set)
    for src, targets in adjacency.items():
        for tgt in targets:
            if tgt in pr:
                in_links[tgt].add(src)

    for iteration in range(max_iter):
        next_pr = {}
        # Dangling node weight distribution
        dangling_sum = sum(pr[node] for node in nodes if out_degree[node] == 0)
        dangling_contrib = (d * dangling_sum) / N

        max_diff = 0.0
        for node in nodes:
            incoming_sum = sum(pr[src] / out_degree[src] for src in in_links[node])
            new_val = ((1.0 - d) / N) + dangling_contrib + (d * incoming_sum)
            max_diff = max(max_diff, abs(new_val - pr[node]))
            next_pr[node] = new_val

        pr = next_pr
        if max_diff < tol:
            break

    # Normalize so sum = 1
    total = sum(pr.values()) or 1.0
    return {node: round(val / total, 6) for node, val in pr.items()}

def simulate_catalogue_graph(base_url: str):
    """
    Constructs accurate simulated site graph based on ExportCat information architecture
    when live server is offline.
    """
    base = base_url.rstrip('/')
    home = f"{base}/en-gb"
    categories = [
        f"{base}/en-gb/categories/jute-natural-fibers",
        f"{base}/en-gb/categories/textiles-fabrics",
        f"{base}/en-gb/categories/leather-goods",
        f"{base}/en-gb/categories/ceramic-pottery",
        f"{base}/en-gb/categories/agricultural-products",
        f"{base}/en-gb/categories/garments-apparel",
        f"{base}/en-gb/categories/frozen-foods"
    ]
    products = [
        f"{base}/en-gb/products/natural-raw-hessian-jute-fabric-burlap",
        f"{base}/en-gb/products/heavy-duty-jute-sacking-bags",
        f"{base}/en-gb/products/organic-combed-cotton-single-jersey",
        f"{base}/en-gb/products/denim-fabric-heavyweight-twill",
        f"{base}/en-gb/products/full-grain-crust-bovine-leather",
        f"{base}/en-gb/products/fine-bone-china-porcelain-dinnerware",
        f"{base}/en-gb/products/single-origin-orthodox-black-tea-bop",
        f"{base}/en-gb/products/frozen-black-tiger-shrimp-raw-head-on"
    ]
    misc = [
        f"{base}/en-gb/search",
        f"{base}/en-gb/compare",
        f"{base}/login"
    ]

    all_nodes = [home] + categories + products + misc
    adj = defaultdict(set)

    # Home points to all categories, top products, search, compare, login
    for c in categories:
        adj[home].add(c)
        adj[c].add(home) # Breadcrumb
    for p in products[:4]:
        adj[home].add(p)
    for m in misc:
        adj[home].add(m)

    # Category pages link to their respective products
    adj[categories[0]].update([products[0], products[1]])
    adj[categories[1]].update([products[2], products[3]])
    adj[categories[2]].update([products[4]])
    adj[categories[3]].update([products[5]])
    adj[categories[4]].update([products[6]])
    adj[categories[6]].update([products[7]])

    # Products link back to category, related products, and home
    for i, p in enumerate(products):
        adj[p].add(home)
        cat_idx = min(i // 2, len(categories) - 1)
        adj[p].add(categories[cat_idx])
        # Cross-sell links
        next_p = products[(i + 1) % len(products)]
        adj[p].add(next_p)

    return all_nodes, adj

def crawl_site(start_url: str, max_pages: int = 40):
    parsed_start = urllib.parse.urlparse(start_url)
    allowed_netloc = parsed_start.netloc

    queue = deque([(start_url, 0)])
    visited = set()
    adjacency = defaultdict(set)
    status_codes = {}
    depth_map = {}

    while queue and len(visited) < max_pages:
        url, depth = queue.popleft()
        if url in visited:
            continue
        visited.add(url)
        depth_map[url] = depth

        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'ExportCat-IR-Crawler/1.0 (+http://exportcat.local/bot)'}
            )
            with urllib.request.urlopen(req, timeout=3) as resp:
                status_codes[url] = resp.status
                content_type = resp.headers.get('Content-Type', '')
                if 'text/html' not in content_type:
                    continue
                html = resp.read().decode('utf-8', errors='ignore')
                parser = LinkExtractor(url)
                parser.feed(html)

                for link in parser.links:
                    link_parsed = urllib.parse.urlparse(link)
                    if link_parsed.netloc == allowed_netloc:
                        adjacency[url].add(link)
                        if link not in visited and depth < 3:
                            queue.append((link, depth + 1))
        except Exception as e:
            status_codes[url] = 500

    nodes = list(visited)
    return nodes, adjacency, status_codes, depth_map

def main():
    parser = argparse.ArgumentParser(description="ExportCat PageRank & SEO Crawler")
    parser.add_argument("base_url", nargs="?", default="http://localhost:3000", help="Base URL to crawl")
    parser.add_argument("--json", action="store_true", help="Output JSON results")
    parser.add_argument("--max_pages", type=int, default=30, help="Maximum pages to crawl")
    args = parser.parse_args()

    # Attempt live crawl, fall back to simulated architecture graph if offline
    try:
        nodes, adjacency, status_codes, depths = crawl_site(args.base_url, max_pages=args.max_pages)
        if len(nodes) < 2:
            raise ConnectionError("Server not running or too few nodes crawled")
        is_simulated = False
    except Exception:
        nodes, adjacency = simulate_catalogue_graph(args.base_url)
        status_codes = {n: 200 for n in nodes}
        depths = {n: (0 if '/en-gb' == n.split('/')[-1] else 1 if 'categories' in n else 2) for n in nodes}
        is_simulated = True

    pagerank_scores = compute_pagerank(nodes, adjacency)

    # Sort pages by PageRank
    ranked_pages = []
    for rank, (url, score) in enumerate(sorted(pagerank_scores.items(), key=lambda x: x[1], reverse=True), 1):
        in_deg = sum(1 for src, targets in adjacency.items() if url in targets)
        out_deg = len(adjacency.get(url, set()))
        ranked_pages.append({
            "rank": rank,
            "url": url,
            "pagerank": score,
            "in_degree": in_deg,
            "out_degree": out_deg,
            "crawl_depth": depths.get(url, 1),
            "status": status_codes.get(url, 200)
        })

    report = {
        "status": "success",
        "is_simulated": is_simulated,
        "academic_meta": {
            "algorithm": "PageRank Power Iteration (Brin & Page, 1998)",
            "damping_factor": 0.85,
            "tolerance": 1e-6,
            "course": "Information Retrieval & Search Engine Optimization",
            "student": "Suria Hossain Bonna (22CSE006)",
            "supervisor": "Dr. Tania Islam"
        },
        "summary": {
            "total_pages_crawled": len(nodes),
            "internal_edges": sum(len(tgts) for tgts in adjacency.values()),
            "max_pagerank_url": ranked_pages[0]["url"] if ranked_pages else "",
            "max_pagerank_score": ranked_pages[0]["pagerank"] if ranked_pages else 0.0,
            "broken_links_count": sum(1 for code in status_codes.values() if code >= 400)
        },
        "pages": ranked_pages
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("=" * 70)
        print("PAGERANK & SEO CRAWL AUDIT REPORT")
        print(f"Total Pages Analyzed: {len(nodes)} (Simulated: {is_simulated})")
        print("=" * 70)
        for p in ranked_pages[:10]:
            print(f"#{p['rank']} [PR: {p['pagerank']:.5f} | In: {p['in_degree']} | Out: {p['out_degree']}] {p['url']}")

if __name__ == "__main__":
    main()
