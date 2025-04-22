import httpx
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException
from bs4 import BeautifulSoup

logger = logging.getLogger("coding_stats_api.fetch_utils")

DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Cache-Control': 'no-cache',
}

async def fetch_url(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 30) -> str:
    """Fetch content from a URL with error handling."""
    try:
        merged_headers = {**DEFAULT_HEADERS, **(headers or {})}
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, headers=merged_headers, follow_redirects=True)
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Resource not found")
            
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
            
            if response.status_code == 403:
                raise HTTPException(status_code=403, detail="Access denied.")
                
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Request failed with status code {response.status_code}"
                )
                
            return response.text
    except httpx.TimeoutException:
        logger.error(f"Timeout error fetching {url}")
        raise HTTPException(status_code=504, detail="Request timed out")
    except httpx.RequestError as e:
        logger.error(f"Request error fetching {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def fetch_and_parse(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 30) -> BeautifulSoup:
    """Fetch content from a URL and parse it with BeautifulSoup."""
    html_content = await fetch_url(url, headers, timeout)
    return BeautifulSoup(html_content, 'lxml')

async def post_graphql(url: str, query: Dict[str, Any], headers: Optional[Dict[str, str]] = None, timeout: int = 30) -> Dict[str, Any]:
    """Make a GraphQL POST request."""
    try:
        merged_headers = {
            **DEFAULT_HEADERS,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            **(headers or {})
        }
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url, json=query, headers=merged_headers)
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="Resource not found")
            
            if response.status_code == 429:
                raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Request failed with status code {response.status_code}"
                )
                
            return response.json()
    except httpx.TimeoutException:
        logger.error(f"Timeout error posting to {url}")
        raise HTTPException(status_code=504, detail="Request timed out")
    except httpx.RequestError as e:
        logger.error(f"Request error posting to {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Request error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error posting to {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 