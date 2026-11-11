"""
Tokenizer module for Information Retrieval & SEO Evaluation
Course: Information Retrieval & Search Engine Optimization
Academic Project: ExportCat — University of Barishal
Student: Suria Hossain Bonna (22CSE006)
Supervisor: Dr. Tania Islam
"""

import re
import math

# Standard English stopwords for IR processing
STOPWORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
    'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have',
    'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into',
    'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
    'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
    'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
    'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t',
    'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s',
    'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t',
    'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself',
    'yourselves'
}

class SimplePorterStemmer:
    """
    Lightweight rule-based stemmer based on the Porter Stemming Algorithm
    for B2B product catalogue terms.
    """
    def stem(self, word: str) -> str:
        word = word.lower().strip()
        if len(word) <= 2:
            return word

        # Step 1a: plurals and 3rd person singular present
        if word.endswith('sses'):
            word = word[:-2]
        elif word.endswith('ies'):
            word = word[:-2]
        elif word.endswith('ss'):
            pass
        elif word.endswith('s'):
            word = word[:-1]

        # Step 1b: past tense and participles
        if word.endswith('eed'):
            if len(word) > 4:
                word = word[:-1]
        elif word.endswith('ed') and len(word) > 4:
            word = word[:-2]
            if word.endswith(('at', 'bl', 'iz')):
                word += 'e'
        elif word.endswith('ing') and len(word) > 5:
            word = word[:-3]
            if word.endswith(('at', 'bl', 'iz')):
                word += 'e'

        # Step 2: common derivational suffixes
        suffix_map = {
            'ational': 'ate',
            'tional': 'tion',
            'enci': 'ence',
            'anci': 'ance',
            'izer': 'ize',
            'abli': 'able',
            'alli': 'al',
            'entli': 'ent',
            'eli': 'e',
            'ousli': 'ous',
            'ization': 'ize',
            'ation': 'ate',
            'ator': 'ate',
            'alism': 'al',
            'iveness': 'ive',
            'fulness': 'ful',
            'ousness': 'ous',
            'aliti': 'al',
            'iviti': 'ive',
            'biliti': 'ble'
        }
        for suffix, replacement in suffix_map.items():
            if word.endswith(suffix) and len(word) - len(suffix) >= 3:
                word = word[:-len(suffix)] + replacement
                break

        # Step 3: -ful, -ness, -ment, etc.
        step3_suffixes = ['ful', 'ness', 'ment', 'able', 'ible', 'ant', 'ent']
        for s in step3_suffixes:
            if word.endswith(s) and len(word) - len(s) >= 3:
                word = word[:-len(s)]
                break

        return word


stemmer = SimplePorterStemmer()

def tokenize(text: str, remove_stopwords: bool = True, apply_stemming: bool = True) -> list[str]:
    """
    Tokenizes text into cleaned, normalized tokens.
    """
    if not text:
        return []
    
    # Lowercase & split by non-alphanumeric characters (hyphens inside words preserved as single word)
    text = text.lower()
    # Replace non-alphanumeric with spaces, keeping dashes for product codes/models
    words = re.findall(r'[a-z0-9]+(?:-[a-z0-9]+)*', text)
    
    tokens = []
    for w in words:
        w_clean = w.strip('-')
        if not w_clean:
            continue
        if remove_stopwords and w_clean in STOPWORDS:
            continue
        if apply_stemming and not re.match(r'^\d+$', w_clean):
            w_stemmed = stemmer.stem(w_clean)
        else:
            w_stemmed = w_clean
        tokens.append(w_stemmed)
        
    return tokens

def generate_ngrams(tokens: list[str], n: int = 2) -> list[str]:
    """Generates n-grams from a list of tokens."""
    if len(tokens) < n:
        return []
    return [' '.join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]
