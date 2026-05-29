"""
utils.py
--------
Filename sanitization helpers and general-purpose utility functions.
"""

import re
import unicodedata
import os
import sys
import socket
from datetime import datetime


# -------------------------
# FILENAME SANITIZATION
# -------------------------

def transliterate_to_english(text: str) -> str:
    """
    Convert non-English characters (Kannada, Hindi, Chinese, Arabic, etc.)
    to ASCII equivalents by NFKD normalization and stripping non-ASCII bytes.
    """
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ASCII', 'ignore').decode('ASCII')
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s]+', '_', text)
    text = re.sub(r'_+', '_', text)
    text = text.strip('_')
    if not text:
        text = "location"
    return text


def sanitize_filename(filename: str) -> str:
    """Sanitize a full filename (with extension) to ASCII-only characters."""
    if '.' in filename:
        name, ext = filename.rsplit('.', 1)
        ext = '.' + ext
    else:
        name, ext = filename, ''

    name = transliterate_to_english(name)
    if not name or name == "location":
        name = datetime.now().strftime("%Y%m%d_%H%M%S")
    if len(name) > 200:
        name = name[:200]
    return name + ext


def sanitize_place_name(place_name: str) -> str:
    """Sanitize a place name for safe use in filenames."""
    if not place_name:
        return "unknown_location"
    sanitized = transliterate_to_english(place_name)
    if not sanitized or sanitized == "location":
        sanitized = f"location_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    return sanitized


# -------------------------
# MISC HELPERS
# -------------------------

def sizeof_fmt(num, suffix='B') -> str:
    """Human-readable file size string."""
    if num is None:
        return '0 B'
    for unit in ['', 'Ki', 'Mi', 'Gi', 'Ti', 'Pi', 'Ei', 'Zi']:
        if abs(num) < 1024.0:
            return f"{num:.1f} {unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f} Yi{suffix}"


def check_internet() -> bool:
    """Check whether we have outbound internet access."""
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        socket.create_connection(("oauth2.googleapis.com", 443), timeout=3)
        return True
    except OSError:
        return False


def normalize_value(value, min_val: float, max_val: float) -> float:
    """Clamp *value* into [0, 1] relative to [min_val, max_val]."""
    if value is None:
        return 0.5
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))


def count_files_in_dir(path: str) -> int:
    """Recursively count files under *path*."""
    count = 0
    if os.path.exists(path):
        for entry in os.scandir(path):
            if entry.is_file():
                count += 1
            elif entry.is_dir():
                count += count_files_in_dir(entry.path)
    return count


def get_dir_size(path: str) -> int:
    """Recursively compute total byte size of all files under *path*."""
    total = 0
    if os.path.exists(path):
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_dir_size(entry.path)
    return total
