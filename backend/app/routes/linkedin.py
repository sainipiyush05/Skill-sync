from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Union, Tuple
import re
import logging
import os
import time
import subprocess
import platform
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from selenium.webdriver.common.action_chains import ActionChains

# Import webdriver_manager for automatic ChromeDriver management
from webdriver_manager.chrome import ChromeDriverManager
# Safely import ChromeType
try:
    from webdriver_manager.core.utils import ChromeType
except ImportError:
    try:
        from webdriver_manager.utils import ChromeType
    except ImportError:
        class ChromeType:
            GOOGLE = "GOOGLE"
            CHROMIUM = "CHROMIUM"

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("linkedin_api")

# Create router
router = APIRouter(prefix="/api/linkedin", tags=["linkedin"])

# Models
class ScrapeRequest(BaseModel):
    profileUrl: str
    useProxy: bool = False  # Optional parameter to use proxy

class ProfileResponse(BaseModel):
    profile: Dict[str, Any]
    activity: Dict[str, Any]
    connections: Dict[str, Any]
    engagement: Dict[str, Any]
    analysis: Dict[str, Any]

# List of free rotating proxies - in a production app, you should use a paid proxy service
FREE_PROXIES = [
    # Add your proxies here if needed
    # Format: "http://ip:port"
]

def get_random_proxy():
    """Get a random proxy from the list"""
    if FREE_PROXIES:
        return random.choice(FREE_PROXIES)
    return None

def get_chrome_version() -> Optional[str]:
    """Get the installed Chrome version"""
    try:
        system = platform.system()
        if system == "Linux":
            # Try different commands to find Chrome version
            commands = [
                ["google-chrome", "--version"],
                ["google-chrome-stable", "--version"],
                ["chromium", "--version"],
                ["chromium-browser", "--version"]
            ]
            
            for cmd in commands:
                try:
                    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    stdout, stderr = process.communicate()
                    output = stdout.decode('utf-8')
                    if output:
                        # Extract version number
                        match = re.search(r'(\d+\.\d+\.\d+)', output)
                        if match:
                            return match.group(1)
                except:
                    continue
        
        elif system == "Darwin":  # macOS
            try:
                process = subprocess.Popen(["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "--version"], 
                                          stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                stdout, stderr = process.communicate()
                output = stdout.decode('utf-8')
                match = re.search(r'(\d+\.\d+\.\d+)', output)
                if match:
                    return match.group(1)
            except:
                pass
                
        elif system == "Windows":
            try:
                import winreg
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Google\Chrome\BLBeacon')
                version, _ = winreg.QueryValueEx(key, "version")
                return version
            except:
                pass
    except Exception as e:
        logger.warning(f"Failed to get Chrome version: {e}")
    
    return None

class LinkedInScraper:
    def __init__(self, use_proxy=False):
        """Initialize the LinkedIn scraper with headless browser"""
        try:
            logger.info("Initializing LinkedIn scraper with Chrome WebDriver")
            
            # Set up Chrome options
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            
            # Add user agent to make the request look more like a real browser
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36")
            
            # Add proxy if requested
            if use_proxy and FREE_PROXIES:
                proxy = get_random_proxy()
                if proxy:
                    logger.info(f"Using proxy: {proxy}")
                    chrome_options.add_argument(f'--proxy-server={proxy}')
            
            # Get Chrome version
            chrome_version = get_chrome_version()
            logger.info(f"Detected Chrome version: {chrome_version}")
            
            # Try multiple methods to initialize the browser
            driver_init_methods = [
                self._init_direct,  # First try direct initialization
                self._init_with_specific_version,  # Then try specific versions
                self._init_with_auto_version,  # Then try auto version detection
                self._init_with_latest,  # Finally try latest driver
            ]
            
            success = False
            last_error = None
            
            for method in driver_init_methods:
                try:
                    method(chrome_options)
                    success = True
                    break
                except Exception as e:
                    last_error = e
                    logger.warning(f"Driver initialization method failed: {method.__name__} - {e}")
            
            if not success:
                raise Exception(f"All WebDriver initialization methods failed. Last error: {last_error}")
                
            logger.info("Chrome WebDriver initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Chrome WebDriver: {e}")
            raise Exception(f"WebDriver initialization error: {e}")
    
    def _init_with_auto_version(self, chrome_options):
        """Initialize with auto version detection"""
        logger.info("Trying initialization with auto version detection")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
    
    def _init_with_latest(self, chrome_options):
        """Initialize with latest ChromeDriver"""
        logger.info("Trying initialization with latest ChromeDriver")
        service = Service(ChromeDriverManager(chrome_type=ChromeType.CHROMIUM).install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
    
    def _init_direct(self, chrome_options):
        """Initialize Chrome directly without service"""
        logger.info("Trying direct initialization without service")
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
    
    def _init_with_specific_version(self, chrome_options):
        """Try with specific ChromeDriver versions known to work with newer Chrome"""
        logger.info("Trying initialization with specific ChromeDriver version")
        # List of versions to try that are known to be compatible with newer Chrome
        versions = ["121.0.6167.85", "120.0.6099.109", "119.0.6045.105", "117.0.5938.92", 
                    "116.0.5845.96", "115.0.5790.170", "114.0.5735.90"]
        
        # Try each version
        for version in versions:
            try:
                logger.info(f"Trying ChromeDriver version {version}")
                service = Service(ChromeDriverManager(driver_version=version).install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                self.wait = WebDriverWait(self.driver, 10)
                logger.info(f"Successfully initialized with ChromeDriver version {version}")
                return
            except Exception as e:
                logger.warning(f"Failed with version {version}: {e}")
                continue
        
        raise Exception("All specific ChromeDriver versions failed")
    
    def _safe_find_element(self, by, selector, default=None, max_wait=5, parent_element=None):
        """Safely find an element, with wait and better error handling"""
        try:
            # If parent_element is provided, search within that element
            if parent_element:
                # No need to wait since parent is already loaded
                return parent_element.find_element(by, selector)
            else:
                # Search in the entire page with waiting
                element = WebDriverWait(self.driver, max_wait).until(
                    EC.presence_of_element_located((by, selector))
                )
                return element
        except (TimeoutException, NoSuchElementException):
            return default
    
    def _safe_find_elements(self, by, selector, max_wait=5):
        """Safely find multiple elements, with wait and better error handling"""
        try:
            elements = WebDriverWait(self.driver, max_wait).until(
                EC.presence_of_all_elements_located((by, selector))
            )
            return elements
        except (TimeoutException, NoSuchElementException):
            return []
    
    def _extract_count_from_text(self, text, default=0):
        """Extract a number from text like '500+ connections' or '1,234 followers'"""
        if not text:
            return default
        
        logger.info(f"Extracting count from text: '{text}'")
        
        # Remove commas and other formatting
        text = text.replace(',', '')
        
        # Try to find numbers in the text - more comprehensive pattern
        # Look for "X connections", "X+ connections", and similar variations
        match = re.search(r'(\d+)(?:\+)?\s*(?:connection|follower|contact)', text, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            logger.info(f"Successfully extracted count: {count}")
            return count
            
        # Fallback to a more general pattern just looking for any number
        match = re.search(r'(\d+)', text)
        if match:
            count = int(match.group(1))
            logger.info(f"Extracted count from general pattern: {count}")
            return count
            
        return default
    
    def _scroll_to_section(self, section_id):
        """Scroll to a particular section of the profile to ensure it's loaded"""
        try:
            section = self._safe_find_element(By.ID, section_id)
            if section:
                self.driver.execute_script("arguments[0].scrollIntoView(true);", section)
                time.sleep(1)  # Allow time for content to load
                return True
        except:
            pass
        return False
        
    def extract_profile_data(self, profile_url):
        """Extract accurate data from a LinkedIn profile"""
        logger.info(f"Scraping profile: {profile_url}")
        
        try:
            # Navigate to the profile URL
            self.driver.get(profile_url)
            time.sleep(3)  # Give the page time to load initially
            
            # Extract username from URL
            username = extract_username(profile_url)
            if not username:
                raise ValueError("Could not extract username from URL")
            
            # Initialize empty profile structure with accurate metrics
            profile_data = {
                "profile": {
                    "username": username,
                    "url": profile_url,
                    "name": "",
                    "headline": "",
                    "location": "",
                    "industry": "",
                    "views": 0,
                    "followers": 0
                },
                "activity": {
                    "posts": [],
                    "articles": [],
                    "total_activity_count": 0,
                    "recent_activity": []
                },
                "connections": {
                    "count": 0,
                    "new": 0,
                    "pending": 0
                },
                "engagement": {
                    "score": 0,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0
                },
                "analysis": {
                    "profileStrength": 0,
                    "urlQuality": 0,
                    "profileCompleteness": 0,
                    "engagement": 0,
                    "networkStrength": 0,
                    "improvements": []
                }
            }
            
            # Take a screenshot for debugging (if needed)
            # self.driver.save_screenshot("/tmp/linkedin_debug.png")
            
            # Scroll through the profile to ensure all content is loaded
            self.driver.execute_script("window.scrollTo(0, 0)")  # Start at the top
            
            # ---------------- Extract Profile Header Information ----------------
            # Try multiple selectors for name to handle different profile layouts
            name_selectors = [
                "//h1[contains(@class, 'text-heading-xlarge')]",
                "//h1[contains(@class, 'inline')]",
                "//h1",  # Fallback to any h1 tag
                "//div[contains(@class, 'pv-text-details__left-panel')]/div"  # Another common location
            ]
            
            # Try each selector until we find something
            for selector in name_selectors:
                name_element = self._safe_find_element(By.XPATH, selector)
                if name_element and name_element.text.strip():
                    profile_data["profile"]["name"] = name_element.text.strip()
                    break
                    
            # If name is still empty and we have a username, use that as a fallback
            if not profile_data["profile"]["name"] and username:
                profile_data["profile"]["name"] = username.replace("-", " ").title()
                logger.info(f"Using username as name fallback: {profile_data['profile']['name']}")
            
            # Try multiple headline selectors
            headline_selectors = [
                "//div[contains(@class, 'text-body-medium')]",
                "//div[contains(@class, 'pv-text-details__left-panel')]/div[2]",
                "//div[contains(@class, 'text-body-small') and contains(@class, 'break-words')]"
            ]
            
            for selector in headline_selectors:
                headline_element = self._safe_find_element(By.XPATH, selector)
                if headline_element and headline_element.text.strip():
                    profile_data["profile"]["headline"] = headline_element.text.strip()
                    break
            
            # Try multiple location selectors
            location_selectors = [
                "//span[contains(@class, 'text-body-small') and contains(@class, 'inline')]",
                "//div[contains(@class, 'pv-text-details__left-panel')]/span",
                "//span[contains(@class, 'text-body-small') and contains(@class, 'break-words')]"
            ]
            
            for selector in location_selectors:
                location_element = self._safe_find_element(By.XPATH, selector)
                if location_element and location_element.text.strip():
                    profile_data["profile"]["location"] = location_element.text.strip()
                    break
            
            # Try multiple connection selectors with fallbacks
            connection_selectors = [
                "//span[contains(text(), 'connection')]",
                "//ul[contains(@class, 'pv-top-card--list')]/li[1]",
                "//span[contains(text(), 'follower') or contains(text(), 'followers')]",
                "//li[contains(@class, 'text-body-small') and contains(text(), 'connection')]",
                "//div[contains(@class, 'ph5') and contains(@class, 'pb5')]//span[contains(text(), 'connection')]",
                "//div[contains(@class, 'pvs-header__subtitle')]//span[contains(text(), 'connection')]"
            ]
            
            connection_found = False
            for selector in connection_selectors:
                try:
                    connection_element = self._safe_find_element(By.XPATH, selector, max_wait=2)
                    if connection_element and connection_element.text.strip():
                        connection_text = connection_element.text.strip()
                        logger.info(f"Found connection text: '{connection_text}'")
                        count = self._extract_count_from_text(connection_text)
                        if count > 0:
                            profile_data["connections"]["count"] = count
                            logger.info(f"Found connection count: {count}")
                            connection_found = True
                            break
                except Exception as e:
                    logger.info(f"Error with connection selector {selector}: {e}")
                    continue
            
            # If we still don't have connections, try a broader search approach
            if not connection_found:
                logger.info("Trying broader connection search approach")
                try:
                    # Get all text elements on the page that might contain connection info
                    all_spans = self.driver.find_elements(By.XPATH, "//span")
                    all_divs = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'text-body-small')]")
                    
                    # Combine elements and check for connection text
                    all_elements = all_spans + all_divs
                    for element in all_elements:
                        try:
                            text = element.text.strip()
                            if 'connection' in text.lower():
                                logger.info(f"Found connection text in broader search: '{text}'")
                                count = self._extract_count_from_text(text)
                                if count > 0:
                                    profile_data["connections"]["count"] = count
                                    logger.info(f"Found connection count in broader search: {count}")
                                    connection_found = True
                                    break
                        except:
                            continue
                except Exception as e:
                    logger.info(f"Error in broader connection search: {e}")
            
            # Try looking for connection count in page source if still not found
            if not connection_found:
                logger.info("Trying page source search for connections")
                try:
                    page_source = self.driver.page_source
                    # Look for patterns like "304 connections" in the page source
                    connection_patterns = [
                        r'(\d+)\s*connections',
                        r'(\d+)\+\s*connections'
                    ]
                    
                    for pattern in connection_patterns:
                        match = re.search(pattern, page_source, re.IGNORECASE)
                        if match:
                            count = int(match.group(1))
                            profile_data["connections"]["count"] = count
                            logger.info(f"Found connection count in page source: {count}")
                            connection_found = True
                            break
                except Exception as e:
                    logger.info(f"Error in page source connection search: {e}")
            
            # Note: The following sections might not be visible for profiles you aren't connected to
            # or for profiles with limited visibility. We need to handle this gracefully.
            
            # ---------------- Extract Experience Section ----------------
            # Find and scroll to the experience section
            self.driver.execute_script("window.scrollBy(0, 500)")
            time.sleep(1)
            
            # Try multiple experience section selectors
            experience_section_selectors = [
                "//section[.//div[contains(text(), 'Experience')]]",
                "//section[contains(@id, 'experience-section')]",
                "//div[contains(@id, 'experience')]",
                "//h2[contains(text(), 'Experience')]/parent::*"
            ]
            
            experience_elements = []
            for selector in experience_section_selectors:
                section = self._safe_find_element(By.XPATH, selector)
                if section:
                    # Try to find experience items within this section
                    items = section.find_elements(By.XPATH, ".//li") or section.find_elements(By.XPATH, ".//div[contains(@class, 'experience-item')]")
                    if items:
                        experience_elements = items
                        break
            
            experience_count = len(experience_elements)
            logger.info(f"Found {experience_count} experience items")
            
            # Process experience data with more detailed extraction
            experiences = []
            for i, exp in enumerate(experience_elements[:5]):  # Limit to first 5
                try:
                    exp_data = {}
                    
                    # Try multiple selectors for job title
                    title_selectors = [
                        ".//span[contains(@class, 'mr1 t-bold')]",
                        ".//span[contains(@class, 'text-heading-small')]",
                        ".//h3",
                        ".//div[contains(@class, 't-bold')]"
                    ]
                    
                    for selector in title_selectors:
                        title_elem = self._safe_find_element(By.XPATH, selector, parent_element=exp)
                        if title_elem and title_elem.text.strip():
                            exp_data["title"] = title_elem.text.strip()
                            break
                    
                    # Try multiple selectors for company name
                    company_selectors = [
                        ".//span[contains(@class, 't-14 t-normal')]",
                        ".//span[contains(@class, 'text-body-medium')]",
                        ".//p[contains(@class, 'pv-entity__secondary-title')]",
                        ".//div[contains(@class, 't-normal')]"
                    ]
                    
                    for selector in company_selectors:
                        company_elem = self._safe_find_element(By.XPATH, selector, parent_element=exp)
                        if company_elem and company_elem.text.strip():
                            exp_data["company"] = company_elem.text.strip()
                            break
                    
                    # Only add experience if we found either title or company
                    if exp_data.get("title") or exp_data.get("company"):
                        experiences.append(exp_data)
                        
                        # Create post entry from experience
                        profile_data["activity"]["posts"].append({
                            "id": i,
                            "title": f"Experience at {exp_data.get('company', 'Company')}: {exp_data.get('title', 'Role')}"
                        })
                
                except Exception as e:
                    logger.info(f"Error extracting experience item: {e}")
                    continue
            
            # ---------------- Extract Education Section ----------------
            # Find and scroll to the education section
            self.driver.execute_script("window.scrollBy(0, 300)")
            time.sleep(1)
            
            # Try multiple education section selectors
            education_section_selectors = [
                "//section[.//div[contains(text(), 'Education')]]",
                "//section[contains(@id, 'education-section')]",
                "//div[contains(@id, 'education')]",
                "//h2[contains(text(), 'Education')]/parent::*"
            ]
            
            education_elements = []
            for selector in education_section_selectors:
                section = self._safe_find_element(By.XPATH, selector)
                if section:
                    # Try to find education items within this section
                    items = section.find_elements(By.XPATH, ".//li") or section.find_elements(By.XPATH, ".//div[contains(@class, 'education-item')]")
                    if items:
                        education_elements = items
                        break
            
            education_count = len(education_elements)
            logger.info(f"Found {education_count} education items")
            
            # Process education data
            educations = []
            for i, edu in enumerate(education_elements[:3]):  # Limit to first 3
                try:
                    edu_data = {}
                    
                    # Try multiple selectors for institution
                    institution_selectors = [
                        ".//h3", 
                        ".//div[contains(@class, 't-bold')]",
                        ".//span[contains(@class, 'text-heading-small')]"
                    ]
                    
                    for selector in institution_selectors:
                        institution_elem = self._safe_find_element(By.XPATH, selector, parent_element=edu)
                        if institution_elem and institution_elem.text.strip():
                            edu_data["institution"] = institution_elem.text.strip()
                            break
                    
                    # Only add education if we found an institution
                    if edu_data.get("institution"):
                        educations.append(edu_data)
                        
                        # Create article entry from education
                        profile_data["activity"]["articles"].append({
                            "id": i,
                            "title": f"Education at {edu_data.get('institution', 'University')}"
                        })
                
                except Exception as e:
                    logger.info(f"Error extracting education item: {e}")
                    continue
            
            # ---------------- Extract Skills Section ----------------
            # Scroll down to load more content
            self.driver.execute_script("window.scrollBy(0, 300)")
            time.sleep(1)
            
            # Try multiple skills section selectors
            skills_section_selectors = [
                "//section[.//div[contains(text(), 'Skills')]]",
                "//section[contains(@id, 'skills-section')]",
                "//div[contains(@id, 'skills')]",
                "//h2[contains(text(), 'Skills')]/parent::*"
            ]
            
            skills_elements = []
            for selector in skills_section_selectors:
                section = self._safe_find_element(By.XPATH, selector)
                if section:
                    # Try to find skills items within this section
                    items = section.find_elements(By.XPATH, ".//li") or section.find_elements(By.XPATH, ".//div[contains(@class, 'skill-entity')]")
                    if items:
                        skills_elements = items
                        break
            
            skills_count = len(skills_elements)
            logger.info(f"Found {skills_count} skills")
            
            # Extract skills
            skills = []
            for skill_elem in skills_elements[:10]:  # Limit to first 10 skills
                try:
                    skill_selectors = [
                        ".//span[contains(@class, 'text-body-small')]",
                        ".//span[contains(@class, 'pv-skill-category-entity__name-text')]",
                        ".//div[contains(@class, 't-bold')]",
                        ".//span"
                    ]
                    
                    for selector in skill_selectors:
                        skill_span = self._safe_find_element(By.XPATH, selector, parent_element=skill_elem)
                        if skill_span and skill_span.text.strip():
                            skills.append(skill_span.text.strip())
                            break
                except:
                    pass
            
            # ---------------- Calculate Profile Metrics ----------------
            # Calculate profile completeness based on section presence and content
            completeness_score = 0
            
            # Name and headline (30%)
            if profile_data["profile"]["name"]:
                completeness_score += 15
                logger.info("Adding 15 points for name")
            if profile_data["profile"]["headline"]:
                completeness_score += 15
                logger.info("Adding 15 points for headline")
            
            # Experience (30%)
            if experience_count > 0:
                # 6% per experience, up to 5 experiences
                experience_points = min(experience_count * 6, 30)
                completeness_score += experience_points
                logger.info(f"Adding {experience_points} points for {experience_count} experiences")
            
            # Education (20%)
            if education_count > 0:
                # 10% per education, up to 2 educations
                education_points = min(education_count * 10, 20)
                completeness_score += education_points
                logger.info(f"Adding {education_points} points for {education_count} educations")
            
            # Skills (20%)
            if skills_count > 0:
                # 2% per skill, up to 10 skills
                skills_points = min(skills_count * 2, 20)
                completeness_score += skills_points
                logger.info(f"Adding {skills_points} points for {skills_count} skills")
            
            # Ensure completeness score is at least 1% if we found anything at all
            if profile_data["profile"]["name"] and completeness_score == 0:
                completeness_score = 1
            
            profile_data["analysis"]["profileCompleteness"] = completeness_score
            logger.info(f"Final profile completeness score: {completeness_score}%")
            
            # Calculate URL quality
            url_quality = calculate_url_quality(username)
            profile_data["analysis"]["urlQuality"] = url_quality
            logger.info(f"URL quality score: {url_quality}%")
            
            # Calculate engagement score based on profile data
            connections = profile_data["connections"]["count"]
            content_count = len(profile_data["activity"]["posts"]) + len(profile_data["activity"]["articles"])
            
            # Use a weighted formula that considers both network size and content
            engagement_score = 0
            if connections > 0:
                # Network size component (0-60 points)
                network_component = min(60, connections / 10)
                
                # Content component (0-40 points)
                content_component = min(40, content_count * 8)
                
                engagement_score = int(network_component + content_component)
                logger.info(f"Engagement score components: network={network_component}, content={content_component}")
            else:
                # Default low score if no connections data
                engagement_score = min(content_count * 4, 20)
                logger.info(f"Using fallback engagement score: {engagement_score}")
            
            profile_data["analysis"]["engagement"] = engagement_score
            
            # Calculate network strength based on connections
            # LinkedIn generally considers 500+ connections as a good network
            network_strength = 0
            if connections > 0:
                if connections >= 500:
                    network_strength = 100  # Maximum score for 500+ connections
                else:
                    network_strength = int((connections / 500) * 100)
                logger.info(f"Network strength score: {network_strength}% from {connections} connections")
            
            profile_data["analysis"]["networkStrength"] = network_strength
            
            # Set engagement metrics based on activity and connections
            profile_data["engagement"]["score"] = engagement_score
            
            # Calculate estimated engagement metrics based on network size and content
            # These are reasonable estimates based on typical LinkedIn engagement rates
            if connections > 0 and content_count > 0:
                avg_connections = connections
                avg_content = content_count
                
                # Average LinkedIn post gets views from ~10% of connections
                view_rate = 0.1
                
                # About 2-3% of views result in likes
                like_rate = 0.025
                
                # About 0.5-1% of views result in comments
                comment_rate = 0.008
                
                # About 0.2-0.4% of views result in shares
                share_rate = 0.003
                
                total_views = avg_connections * view_rate * avg_content
                profile_data["engagement"]["likes"] = int(total_views * like_rate)
                profile_data["engagement"]["comments"] = int(total_views * comment_rate)
                profile_data["engagement"]["shares"] = int(total_views * share_rate)
            elif connections > 0:
                # If we have connections but no content, still give minimal engagement metrics
                profile_data["engagement"]["likes"] = int(connections * 0.01)  # 1% of connections
                profile_data["engagement"]["comments"] = int(connections * 0.003)  # 0.3% of connections
                profile_data["engagement"]["shares"] = int(connections * 0.001)  # 0.1% of connections
                
                # Also adjust engagement score to reflect connection count even without content
                engagement_score = min(30, int(connections / 10))
                profile_data["analysis"]["engagement"] = engagement_score
                profile_data["engagement"]["score"] = engagement_score
                logger.info(f"Adjusted engagement score based on connections only: {engagement_score}")
            else:
                # Set to 0 if we don't have enough data
                profile_data["engagement"]["likes"] = 0
                profile_data["engagement"]["comments"] = 0
                profile_data["engagement"]["shares"] = 0
            
            # Calculate overall profile strength as weighted average
            profile_strength = int(
                (profile_data["analysis"]["urlQuality"] * 0.1) +
                (profile_data["analysis"]["profileCompleteness"] * 0.4) +
                (profile_data["analysis"]["engagement"] * 0.25) +
                (profile_data["analysis"]["networkStrength"] * 0.25)
            )
            
            # Ensure profile strength is at least 7% if we found the profile (URL quality contributes)
            if profile_data["profile"]["name"] and profile_strength < 7:
                profile_strength = 7
                
            # If we have substantial connections (like 300+), ensure profile strength is at least 25%
            if connections >= 300 and profile_strength < 25:
                profile_strength = 25
                logger.info(f"Boosting profile strength to minimum 25% due to strong connection count ({connections})")
                
            profile_data["analysis"]["profileStrength"] = profile_strength
            logger.info(f"Final profile strength score: {profile_strength}%")
            
            # Set reasonable values for profile views and followers based on connections
            if connections > 0:
                # Typically ~20-30% of your connections view your profile over time
                profile_data["profile"]["views"] = int(connections * 0.25)
                
                # Typically ~80-100% of your connections follow your activity
                profile_data["profile"]["followers"] = int(connections * 0.9)
            else:
                # Minimal values for profiles with no connection data
                profile_data["profile"]["views"] = 0
                profile_data["profile"]["followers"] = 0
            
            # Generate improvement suggestions based on profile data
            profile_data["analysis"]["improvements"] = generate_improvements(
                profile_data["profile"]["name"],
                username, 
                profile_data["connections"]["count"],
                experience_count,
                education_count,
                skills_count,
                profile_data["analysis"]["profileCompleteness"]
            )
            
            # Add total activity count
            profile_data["activity"]["total_activity_count"] = content_count
            
            return profile_data
            
        except Exception as e:
            logger.error(f"Error extracting profile data: {e}")
            raise
    
    def close(self):
        """Close the browser"""
        try:
            self.driver.quit()
        except Exception as e:
            logger.error(f"Error closing WebDriver: {e}")

@router.post("/scrape", response_model=ProfileResponse)
async def analyze_profile(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Analyze a LinkedIn profile based on URL"""
    if not request.profileUrl:
        raise HTTPException(status_code=400, detail="Missing LinkedIn profile URL")
    
    # Extract username from URL
    username = extract_username(request.profileUrl)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid LinkedIn profile URL format")
    
    logger.info(f"Analyzing LinkedIn profile for username: {username}")
    
    # Use Selenium to scrape the profile
    scraper = None
    try:
        # Initialize scraper with proxy if requested
        scraper = LinkedInScraper(use_proxy=request.useProxy)
        
        # Extract profile data - first try minimal data
        minimal_profile = generate_profile_data(username)
        minimal_profile["profile"]["url"] = request.profileUrl
        
        # Calculate URL quality score
        url_quality = calculate_url_quality(username)
        minimal_profile["analysis"]["urlQuality"] = url_quality
        logger.info(f"URL quality score: {url_quality}%")
        
        deep_scrape_success = False
        profile_data = minimal_profile
        connections = 0
        
        try:
            logger.info(f"Starting deep scrape for {username}")
            profile_data = scraper.extract_profile_data(request.profileUrl)
            deep_scrape_success = True
            
            # Extract connection count for use in both deep and minimal profiles
            connections = profile_data["connections"]["count"]
            logger.info(f"Extracted connection count: {connections}")
            
            # Calculate profile completeness
            name = profile_data["profile"]["name"] != ""
            headline = profile_data["profile"]["headline"] != ""
            location = profile_data["profile"]["location"] != ""
            experience_count = len(profile_data.get("experience", {}).get("items", []))
            education_count = len(profile_data.get("education", {}).get("items", []))
            skills_count = len(profile_data.get("skills", {}).get("items", []))
            
            completeness_score = 0
            # Name (15%), headline (10%), location (5%), photo (10%)
            base_score = (15 if name else 0) + (10 if headline else 0) + (5 if location else 0)
            # Experience (20%), Education (15%), Skills (15%)
            experience_score = min(20, experience_count * 7)  # Max 20%
            education_score = min(15, education_count * 7)    # Max 15%
            skills_score = min(15, skills_count * 3)          # Max 15%
            # Add all components with a max of 90% - photo worth 10% but we can't detect it
            completeness_score = min(90, base_score + experience_score + education_score + skills_score)
            
            # Set profile completeness score
            profile_data["analysis"]["profileCompleteness"] = completeness_score
            
            # Generate improvement suggestions based on actual profile data
            improvements = generate_improvements(
                profile_data["profile"]["name"],
                username,
                connections,
                experience_count,
                education_count,
                skills_count,
                completeness_score
            )
            profile_data["analysis"]["improvements"] = improvements
            
            # Calculate network strength (max 100% for 500+ connections)
            if connections >= 500:
                network_strength = 100
            else:
                network_strength = int((connections / 500) * 100)
            profile_data["analysis"]["networkStrength"] = network_strength
            
            # Calculate engagement score based on activity
            activity_count = profile_data["activity"]["total_activity_count"]
            engagement_score = 0
            
            # Calculate engagement based on both activity and connections
            if activity_count > 0:
                # Base engagement calculation 
                engagement_score = min(100, int(activity_count * 5))
                
                # Estimate engagement metrics based on typical LinkedIn engagement rates
                profile_data["engagement"]["likes"] = int(activity_count * (connections * 0.03))
                profile_data["engagement"]["comments"] = int(activity_count * (connections * 0.01))
                profile_data["engagement"]["shares"] = int(activity_count * (connections * 0.005))
            elif connections > 0:
                # If no activity but has connections, still give partial engagement score
                engagement_score = min(30, int(connections / 10))
                
                # Add minimal engagement metrics
                profile_data["engagement"]["likes"] = int(connections * 0.01)
                profile_data["engagement"]["comments"] = int(connections * 0.003)
                profile_data["engagement"]["shares"] = int(connections * 0.001)
            
            profile_data["engagement"]["score"] = engagement_score
            profile_data["analysis"]["engagement"] = engagement_score
            
            # Set views and followers based on connections
            profile_data["profile"]["views"] = max(profile_data["profile"]["views"], int(connections * 0.25))
            profile_data["profile"]["followers"] = max(profile_data["profile"]["followers"], int(connections * 0.9))
            
            # Calculate overall profile strength as weighted average
            profile_strength = int(
                (profile_data["analysis"]["urlQuality"] * 0.1) +
                (profile_data["analysis"]["profileCompleteness"] * 0.4) +
                (profile_data["analysis"]["engagement"] * 0.25) +
                (profile_data["analysis"]["networkStrength"] * 0.25)
            )
            
            # Ensure profile strength is at least 7% if we found the profile 
            if profile_data["profile"]["name"] and profile_strength < 7:
                profile_strength = 7
            
            # If we have substantial connections (like 300+), ensure profile strength is at least 25%
            if connections >= 300 and profile_strength < 25:
                profile_strength = 25
                logger.info(f"Boosting profile strength to minimum 25% due to strong connection count ({connections})")
            
            profile_data["analysis"]["profileStrength"] = profile_strength
            logger.info(f"Deep scrape successful. Final profile strength score: {profile_strength}%")
            
        except Exception as extraction_error:
            logger.error(f"Error during deep profile extraction: {extraction_error}")
            logger.info(f"Falling back to minimal profile for {username}")
            deep_scrape_success = False
            
            # Clean up browser if needed
            if scraper:
                try:
                    scraper.close()
                except:
                    pass
            
            # Calculate overall profile strength as weighted average for minimal profile
            minimal_profile_strength = int(
                (minimal_profile["analysis"]["urlQuality"] * 0.1) +
                (minimal_profile["analysis"]["profileCompleteness"] * 0.4) +
                (minimal_profile["analysis"]["engagement"] * 0.25) +
                (minimal_profile["analysis"]["networkStrength"] * 0.25)
            )
            
            # Ensure profile strength is at least 7% if we found the profile (URL quality contributes)
            if minimal_profile["profile"]["name"] and minimal_profile_strength < 7:
                minimal_profile_strength = 7
                
            # If we have substantial connections (like 300+), ensure profile strength is at least 25%
            if connections >= 300 and minimal_profile_strength < 25:
                minimal_profile_strength = 25
                logger.info(f"Boosting minimal profile strength to minimum 25% due to strong connection count ({connections})")
                
            minimal_profile["analysis"]["profileStrength"] = minimal_profile_strength
            logger.info(f"Final profile strength score for minimal profile: {minimal_profile_strength}%")
            
            # Adjust network strength for minimal profile if we know the connection count
            if connections > 0:
                if connections >= 500:
                    network_strength = 100
                else:
                    network_strength = int((connections / 500) * 100)
                minimal_profile["analysis"]["networkStrength"] = network_strength
                logger.info(f"Setting network strength for minimal profile: {network_strength}%")
                
                # Also adjust engagement and followers/views
                minimal_profile["profile"]["views"] = int(connections * 0.25)
                minimal_profile["profile"]["followers"] = int(connections * 0.9)
                
                # Add at least some engagement based on connections
                engagement_score = min(30, int(connections / 10))
                minimal_profile["analysis"]["engagement"] = engagement_score
                minimal_profile["engagement"]["score"] = engagement_score
                
                # Add minimal like/comment/share counts
                minimal_profile["engagement"]["likes"] = int(connections * 0.01)
                minimal_profile["engagement"]["comments"] = int(connections * 0.003)
                minimal_profile["engagement"]["shares"] = int(connections * 0.001)
            
            # Generate return data - use minimal profile if deep scraping fails
            return_data = profile_data if deep_scrape_success else minimal_profile
            
            # Clean up browser in the background
            if scraper:
                background_tasks.add_task(scraper.close)
            
            return return_data
            
    except Exception as e:
        logger.error(f"Profile analysis failed: {e}")
        
        if scraper:
            try:
                scraper.close()
            except:
                pass
        
        return generate_profile_data(username)

def extract_username(url: str) -> Optional[str]:
    """Extract LinkedIn username from profile URL"""
    pattern = r'linkedin\.com/in/([a-zA-Z0-9_-]+)'
    match = re.search(pattern, url)
    
    if match:
        return match.group(1)
    return None

def generate_profile_data(username: str) -> Dict[str, Any]:
    """Generate a minimal valid profile with useful improvement suggestions"""
    # Create a minimal valid profile with useful improvement suggestions
    minimal_profile = {
        "profile": {
            "username": username,
            "url": f"https://linkedin.com/in/{username}",
            "name": username.replace("-", " ").title(),
            "headline": "",
            "location": "",
            "industry": "",
            "views": 0,
            "followers": 0
        },
        "activity": {
            "posts": [],
            "articles": [],
            "total_activity_count": 0,
            "recent_activity": []
        },
        "connections": {
            "count": 0,
            "new": 0,
            "pending": 0
        },
        "engagement": {
            "score": 0,
            "likes": 0,
            "comments": 0,
            "shares": 0
        },
        "analysis": {
            "profileStrength": 7,  # Minimal score based on having a URL
            "urlQuality": calculate_url_quality(username),
            "profileCompleteness": 0,
            "engagement": 0,
            "networkStrength": 0,
            "improvements": [
                {
                    "type": "critical",
                    "message": "Add your full name",
                    "action": "Update your profile with your professional name for better discoverability"
                },
                {
                    "type": "critical",
                    "message": "Start building your network",
                    "action": "Connect with colleagues, classmates, and industry professionals"
                },
                {
                    "type": "critical",
                    "message": "Add your work experience",
                    "action": "Include your current and past positions with descriptions of your responsibilities"
                },
                {
                    "type": "high",
                    "message": "Add your education background",
                    "action": "Include your degrees, certifications, and relevant coursework"
                },
                {
                    "type": "high",
                    "message": "Add your key skills",
                    "action": "List at least 5 relevant skills that showcase your expertise"
                },
                {
                    "type": "critical",
                    "message": "Complete your basic profile information",
                    "action": "Add the essential elements: photo, headline, current position, and education"
                }
            ]
        }
    }
    
    return minimal_profile

def calculate_url_quality(username: str) -> int:
    """Calculate LinkedIn profile URL quality based on real best practices"""
    score = 0
    
    # Professional URL format (contains name with hyphens)
    if '-' in username:
        score += 25
    
    # Appropriate length (not too short, not too long)
    if 5 <= len(username) <= 30:
        score += 25
    
    # Clean format (no special characters except hyphen)
    if re.match(r'^[a-zA-Z0-9-]+$', username):
        score += 25
    
    # No numbers at the end (usually indicates duplicate/auto-generated)
    if not re.search(r'\d+$', username):
        score += 25
    
    return score

def generate_improvements(name: str, username: str, connections: int, 
                          experience_count: int, education_count: int, 
                          skills_count: int, completeness: int) -> List[Dict[str, str]]:
    """Generate realistic LinkedIn profile improvement suggestions based on actual profile data"""
    improvements = []
    
    # For profiles with very low completeness, prioritize the most critical improvements
    # to avoid overwhelming the user with too many suggestions
    is_minimal_profile = completeness < 15
    
    # Name-based improvement (highest priority)
    if not name or name == "" or name == username.replace("-", " ").title():
        improvements.append({
            "type": "critical",
            "message": "Add your full name",
            "action": "Update your profile with your professional name for better discoverability"
        })
    
    # Connection-based improvements
    if connections == 0:
        improvements.append({
            "type": "critical",
            "message": "Start building your network",
            "action": "Connect with colleagues, classmates, and industry professionals"
        })
    elif connections < 100 and not is_minimal_profile:
        improvements.append({
            "type": "high",
            "message": "Grow your professional network",
            "action": "Aim for at least 100 connections to improve your reach and visibility"
        })
    
    # Experience-based improvements (high priority)
    if experience_count == 0:
        improvements.append({
            "type": "critical",
            "message": "Add your work experience",
            "action": "Include your current and past positions with descriptions of your responsibilities"
        })
    elif experience_count < 2 and not is_minimal_profile:
        improvements.append({
            "type": "high",
            "message": "Add more work experiences",
            "action": "Include previous roles to show your career progression and versatility"
        })
    
    # Education-based improvements (high priority)
    if education_count == 0:
        improvements.append({
            "type": "high",
            "message": "Add your education background",
            "action": "Include your degrees, certifications, and relevant coursework"
        })
    
    # Skills-based improvements (medium priority)
    if skills_count == 0:
        improvements.append({
            "type": "high",
            "message": "Add your key skills",
            "action": "List at least 5 relevant skills that showcase your expertise"
        })
    elif skills_count < 5 and not is_minimal_profile:
        improvements.append({
            "type": "medium",
            "message": "Add more skills",
            "action": "LinkedIn profiles with 5+ skills get significantly more views"
        })
    
    # URL-based improvements (lower priority for minimal profiles)
    if not is_minimal_profile and ("user" in username or re.search(r'\d+$', username)):
        improvements.append({
            "type": "medium",
            "message": "Customize your profile URL",
            "action": "Use your professional name in your profile URL for better personal branding"
        })
    
    # Overall profile completeness improvements
    if completeness < 40:
        improvements.append({
            "type": "critical",
            "message": "Complete your basic profile information",
            "action": "Add the essential elements: photo, headline, current position, and education"
        })
    elif completeness < 70 and not is_minimal_profile:
        improvements.append({
            "type": "medium",
            "message": "Add more details to your profile",
            "action": "Include certifications, projects, and a summary section to tell your professional story"
        })
    
    # Limit the number of suggestions for minimal profiles to avoid overwhelming the user
    if is_minimal_profile and len(improvements) > 5:
        return improvements[:5]
    
    return improvements 