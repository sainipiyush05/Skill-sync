from fastapi import APIRouter, HTTPException
import httpx
from bs4 import BeautifulSoup
import re
from datetime import datetime
from typing import Dict, List, Optional, Any

router = APIRouter(prefix="/codechef", tags=["codechef"])

def validate_username(username: str) -> str:
    """Validate and clean CodeChef username."""
    # Remove any URL parts if present
    cleaned = re.sub(r'https?://', '', username)
    cleaned = re.sub(r'www\.', '', cleaned)
    cleaned = re.sub(r'codechef\.com/users/', '', cleaned)
    cleaned = re.sub(r'/$', '', cleaned)
    cleaned = cleaned.strip()
    
    # Basic validation (CodeChef usernames are usually alphanumeric with underscores)
    if not cleaned or not re.match(r'^[a-zA-Z0-9_]+$', cleaned):
        raise HTTPException(
            status_code=400,
            detail="Invalid CodeChef username format"
        )
    
    return cleaned

@router.get("/{username}")
async def get_codechef_stats(username: str):
    """Fetch CodeChef stats for a given username."""
    try:
        username = validate_username(username)
        print(f"Fetching CodeChef stats for: {username}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"https://www.codechef.com/users/{username}",
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                follow_redirects=True
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"CodeChef API error: {response.text}"
                )
                
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Check if user exists
            error_message = soup.select('.error-message')
            if error_message or 'Invalid username' in response.text:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Extract rating and rank
            rating = soup.select_one('.rating-header .rating')
            if not rating:
                rating = soup.select_one('.rating-number')
                
            rating_text = rating.text.strip() if rating else "0"
            
            rank = soup.select_one('.rating-header .rank')
            if not rank:
                rank = soup.select_one('.rating-ranks strong')
                
            rank_text = rank.text.strip() if rank else "N/A"
            
            print(f"Basic stats: {{'rating': {rating_text}, 'rank': {rank_text}}}")
            
            # Count solved problems
            total_solved = 0
            problems_section = soup.select('.problems-solved')
            
            if problems_section:
                for section in problems_section:
                    problem_headers = section.select('h5')
                    for header in problem_headers:
                        header_text = header.text.strip()
                        if 'Fully Solved' in header_text or 'Partially Solved' in header_text:
                            content = header.find_next(class_='content')
                            if content:
                                content_text = content.text.strip()
                                match = re.search(r'\d+', content_text)
                                if match:
                                    total_solved += int(match.group())
            else:
                # Alternative approach
                solved_text = soup.select_one('.content h5:contains("Problems Solved")')
                if solved_text:
                    content = solved_text.find_next(class_='content')
                    if content:
                        match = re.search(r'\d+', content.text.strip())
                        if match:
                            total_solved = int(match.group())
            
            print(f"Total solved: {total_solved}")
            
            # Extract badges
            badges = []
            badge_elements = soup.select('.badge-card, .rating-data-section')
            
            for elem in badge_elements:
                name_elem = elem.select_one('.badge-title, h4')
                level_elem = elem.select_one('.badge-level, .rating-star')
                progress_elem = elem.select_one('.badge-progress, .problems-solved')
                
                if name_elem:
                    name = name_elem.text.strip()
                    level = level_elem.text.strip() if level_elem else 'Beginner'
                    
                    solved = 0
                    needed = 0
                    
                    if progress_elem:
                        progress_text = progress_elem.text.strip()
                        solved_match = re.search(r'(\d+)', progress_text)
                        needed_match = re.search(r'(\d+)\s*\/\s*(\d+)', progress_text)
                        
                        if solved_match:
                            solved = int(solved_match.group(1))
                        
                        if needed_match and len(needed_match.groups()) >= 2:
                            needed = int(needed_match.group(2))
                    
                    badges.append({
                        'name': name,
                        'current_level': level,
                        'problems_solved': solved,
                        'problems_needed_next': needed
                    })
            
            print(f"Badges: {badges}")
            
            # Extract recent submissions
            recent_submissions = []
            submission_rows = soup.select('.submissions-table tbody tr, .dataTable tbody tr')
            
            for i, row in enumerate(submission_rows):
                if i >= 10:  # Limit to 10 submissions
                    break
                    
                cells = row.select('td')
                if len(cells) >= 3:
                    timestamp = cells[0].text.strip()
                    problem_elem = cells[1].select_one('a')
                    problem = problem_elem.text.strip() if problem_elem else ''
                    status = cells[2].text.strip() if len(cells) > 2 else ''
                    
                    difficulty_elem = cells[3] if len(cells) > 3 else None
                    if not difficulty_elem:
                        difficulty_elem = cells[1].select_one('.difficulty')
                        
                    difficulty = difficulty_elem.text.strip() if difficulty_elem else 'Unknown'
                    
                    if timestamp and problem:
                        try:
                            date = datetime.strptime(timestamp, "%d/%m/%y, %H:%M:%S")
                            recent_submissions.append({
                                'problem': problem,
                                'difficulty': difficulty,
                                'status': status or 'Unknown',
                                'timestamp': date.isoformat()
                            })
                        except ValueError:
                            # Try another date format
                            try:
                                date = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S")
                                recent_submissions.append({
                                    'problem': problem,
                                    'difficulty': difficulty,
                                    'status': status or 'Unknown',
                                    'timestamp': date.isoformat()
                                })
                            except ValueError:
                                print(f"Failed to parse submission date: {timestamp}")
            
            print(f"Recent submissions: {recent_submissions}")
            
            # Calculate monthly progress (based on recent submissions)
            monthly_progress = {
                'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
                'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
                'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
            }
            
            for submission in recent_submissions:
                if 'timestamp' in submission and 'status' in submission:
                    if 'accepted' in submission['status'].lower():
                        try:
                            date = datetime.fromisoformat(submission['timestamp'])
                            month = date.strftime('%b')
                            monthly_progress[month] += 1
                        except (ValueError, KeyError):
                            pass
            
            # Return the final stats
            return {
                "platform": "CodeChef",
                "username": username,
                "solved": total_solved,
                "total": 5000,  # Approximation of total CodeChef problems
                "rank": rank_text,
                "rating": int(rating_text) if rating_text.isdigit() else 0,
                "badges": badges,
                "monthlyProgress": monthly_progress,
                "recentSubmissions": recent_submissions
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"CodeChef API Error: {str(e)}")
        
        # Return a valid stats object even on error
        return {
            "platform": "CodeChef",
            "username": username or '',
            "solved": 0,
            "total": 5000,
            "rank": 'N/A',
            "rating": 0,
            "badges": [],
            "monthlyProgress": {
                'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
                'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
                'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
            },
            "recentSubmissions": []
        } 