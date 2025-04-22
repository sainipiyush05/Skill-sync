from fastapi import APIRouter, HTTPException
import httpx
from datetime import datetime
import re
from typing import Dict, List, Optional, Any

router = APIRouter(prefix="/leetcode", tags=["leetcode"])

async def validate_username(username: str) -> str:
    """
    Validate and clean LeetCode username.
    """
    # Remove any URL parts if present
    cleaned = re.sub(r'https?://', '', username)
    cleaned = re.sub(r'www\.', '', cleaned)
    cleaned = re.sub(r'leetcode\.com/(u/)?', '', cleaned)
    cleaned = re.sub(r'/$', '', cleaned)
    cleaned = cleaned.strip()

    # Check if username is valid
    if not cleaned or len(cleaned) > 39 or not re.match(r'^[a-zA-Z0-9-_]+$', cleaned):
        raise HTTPException(
            status_code=400, 
            detail="Invalid username format. Username should only contain letters, numbers, underscores, and hyphens."
        )
    
    return cleaned

@router.get("/{username}")
async def get_leetcode_stats(username: str):
    """
    Fetch LeetCode stats for a given username.
    """
    try:
        username = await validate_username(username)
        
        # GraphQL query to get user profile data
        stats_query = {
            "operationName": "userPublicProfile",
            "query": """
                query userPublicProfile($username: String!) {
                    matchedUser(username: $username) {
                        username
                        submitStats: submitStatsGlobal {
                            acSubmissionNum {
                                difficulty
                                count
                                submissions
                            }
                        }
                        profile {
                            ranking
                            reputation
                        }
                        submissionCalendar
                    }
                    allQuestionsCount {
                        difficulty
                        count
                    }
                }
            """,
            "variables": {"username": username}
        }
        
        # Make the request to LeetCode's GraphQL API
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                'https://leetcode.com/graphql',
                json=stats_query,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                }
            )
            
            if response.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"LeetCode API error: {response.text}"
                )
                
            data = response.json()
            user_data = data.get('data', {})
            
            if not user_data.get('matchedUser'):
                raise HTTPException(status_code=404, detail="User not found")
                
            # Calculate total solved problems
            total_solved = sum(
                item['count'] 
                for item in user_data['matchedUser']['submitStats']['acSubmissionNum']
            )
            
            total_problems = sum(
                item['count'] 
                for item in user_data['allQuestionsCount']
            )
            
            # Initialize monthly progress
            monthly_progress = {
                'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0,
                'May': 0, 'Jun': 0, 'Jul': 0, 'Aug': 0,
                'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
            }
            
            # Process submission calendar for monthly progress
            if user_data['matchedUser'].get('submissionCalendar'):
                submission_calendar = user_data['matchedUser']['submissionCalendar']
                if isinstance(submission_calendar, str):
                    import json
                    submission_calendar = json.loads(submission_calendar)
                    
                for timestamp_str, count in submission_calendar.items():
                    timestamp = int(timestamp_str)
                    date = datetime.fromtimestamp(timestamp)
                    month = date.strftime('%b')
                    monthly_progress[month] += int(count)
        
        # Fetch recent submissions
        recent_query = {
            "operationName": "recentSubmissions",
            "query": """
                query recentSubmissions($username: String!) {
                    recentSubmissionList(username: $username, limit: 10) {
                        title
                        timestamp
                        statusDisplay
                    }
                }
            """,
            "variables": {"username": username}
        }
        
        # Make the request to get recent submissions
        async with httpx.AsyncClient(timeout=15.0) as client:
            recent_response = await client.post(
                'https://leetcode.com/graphql',
                json=recent_query,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                }
            )
            
            recent_data = recent_response.json()
            recent_submissions = recent_data.get('data', {}).get('recentSubmissionList', [])
            
            # Format recent submissions
            formatted_submissions = []
            for sub in recent_submissions:
                timestamp = datetime.fromtimestamp(int(sub['timestamp']))
                formatted_submissions.append({
                    'problem': sub['title'],
                    'difficulty': 'Unknown',  # Difficulty info not available in this endpoint
                    'status': sub['statusDisplay'],
                    'timestamp': timestamp.isoformat()
                })
        
        # Return the final stats
        return {
            "platform": "LeetCode",
            "username": username,
            "solved": total_solved,
            "total": total_problems,
            "rank": str(user_data['matchedUser']['profile'].get('ranking', 'N/A')),
            "rating": user_data['matchedUser']['profile'].get('reputation', 0),
            "recentSubmissions": formatted_submissions,
            "monthlyProgress": monthly_progress
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"LeetCode API Error: {str(e)}")
        
        # Return error response based on exception type
        if "429" in str(e):
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please try again later."
            )
        elif "404" in str(e):
            raise HTTPException(
                status_code=404, 
                detail="User not found. Please check the username and try again."
            )
        elif "403" in str(e):
            raise HTTPException(
                status_code=403, 
                detail="Access denied. Please try again later."
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to fetch LeetCode stats: {str(e)}"
            ) 