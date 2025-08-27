from typing import Any, Dict

import httpx
from bs4 import BeautifulSoup
from markdownify import markdownify as md
import cloudscraper


def visit_page(url: str):
    try:
        scraper = cloudscraper.create_scraper(
            browser={"browser": "chrome", "platform": "windows", "mobile": False}
        )
        response = scraper.get(url, timeout=30)
        response.raise_for_status()
        return response
    except Exception as e:
        raise e


async def beautiful_soup_navigation(url: str) -> Dict[str, Any]:
    """
    Visit a webpage and extract its content using httpx for better error handling.
    """
    try:
        response = visit_page(url)
        soup = BeautifulSoup(response.text, "html.parser")
        content = md(str(soup))

        return {
            "success": True,
            "url": url,
            "content": content,
            "status_code": response.status_code,
        }

    except httpx.TimeoutException:
        return {
            "success": False,
            "url": url,
            "content": "Request timed out",
            "status_code": 408,
        }
    except httpx.ConnectError:
        return {
            "success": False,
            "url": url,
            "content": "Failed to connect to the website",
            "status_code": 503,
        }
    except Exception:
        return {
            "success": False,
            "url": url,
            "content": "The webpage cannot be read",
            "status_code": 500,
        }
