from fastapi import APIRouter, HTTPException
import httpx
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Any, Optional

router = APIRouter(prefix="/hackerrank", tags=["hackerrank"])

def validate_username(username: str) -> str:
    """Validate and clean HackerRank username."""
    # Remove any URL parts if present
    cleaned = re.sub(r'https?://', '', username)
    cleaned = re.sub(r'www\.', '', cleaned)
    cleaned = re.sub(r'hackerrank\.com/profile/', '', cleaned)
    cleaned = re.sub(r'hackerrank\.com/', '', cleaned)
    cleaned = re.sub(r'/$', '', cleaned)
    cleaned = cleaned.strip()
    
    # Basic validation
    if not cleaned or not re.match(r'^[a-zA-Z0-9_-]+$', cleaned):
        raise HTTPException(
            status_code=400,
            detail="Invalid HackerRank username format"
        )
    
    return cleaned

@router.get("/{username}")
async def get_hackerrank_stats(username: str):
    """Fetch HackerRank stats for a given username."""
    try:
        username = validate_username(username)
        print(f"Fetching HackerRank stats for: {username}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://www.hackerrank.com/profile/{username}",
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                follow_redirects=True
            )
            
            if response.status_code != 200:
                if response.status_code == 404:
                    raise HTTPException(status_code=404, detail="User not found")
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"HackerRank API error: {response.text}"
                    )
                
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Extract badges
            badges = []
            badge_elements = soup.select('.hacker-badge, .badge-container')
            
            for elem in badge_elements:
                name_elem = elem.select_one('.badge-title, .title')
                stars_elements = elem.select('.badge-star, .star-filled')
                solved_elem = elem.select_one('.badge-solved, .solved-count')
                
                if name_elem:
                    name = name_elem.text.strip()
                    stars = len(stars_elements)
                    solved = 0
                    
                    if solved_elem:
                        solved_text = solved_elem.text.strip()
                        match = re.search(r'\d+', solved_text)
                        if match:
                            solved = int(match.group())
                    
                    badges.append({
                        'name': name,
                        'stars': stars,
                        'solved': solved
                    })
            
            # Sort badges by solved count for better visualization
            badges.sort(key=lambda x: x['solved'], reverse=True)
            
            # Calculate total solved problems
            total_solved = sum(badge.get('solved', 0) for badge in badges)
            
            # Initialize monthly progress (approximation)
            monthly_progress = {
                'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
                'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
                'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
            }
            
            # Attempt to get user activity for monthly progress
            # This would require additional API calls or heuristics
            # For now, we provide the structure without actual data
            
            return {
                "platform": "HackerRank",
                "username": username,
                "solved": total_solved,
                "badges": badges,
                "monthlyProgress": monthly_progress
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"HackerRank API Error: {str(e)}")
        
        # Return a valid stats object even on error
        return {
            "platform": "HackerRank",
            "username": username or '',
            "solved": 0,
            "badges": [],
            "monthlyProgress": {
                'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
                'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
                'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
            }
        } 