"""
HTML utilities for generating error pages and other HTML content.
"""

from typing import Optional


def should_return_html(accept_header: Optional[str]) -> bool:
    """
    Check if the request should return HTML based on the Accept header.

    Args:
        accept_header: The Accept header from the request

    Returns:
        bool: True if HTML should be returned, False otherwise
    """
    if not accept_header:
        return False

    return "text/html" in accept_header.lower()
