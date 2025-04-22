# Coding Stats API Backend

This Python backend serves as an API for fetching statistics from popular coding platforms like LeetCode, CodeChef, and HackerRank.

## Features

- LeetCode user statistics retrieval
- CodeChef user statistics retrieval
- HackerRank user statistics retrieval
- Clean error handling and data formatting

## Setup

1. Make sure you have Python 3.8+ installed
2. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

## Running the API

```bash
cd backend
python run_coding_stats.py
```

The API will be available at `http://localhost:5001`

## API Endpoints

- `GET /leetcode/{username}` - Get LeetCode user statistics
- `GET /codechef/{username}` - Get CodeChef user statistics
- `GET /hackerrank/{username}` - Get HackerRank user statistics
- `GET /health` - Health check endpoint

## Environment Variables

- `PORT` - API server port (default: 5001)

## Development

To run the server in development mode with auto-reload:

```bash
cd backend
python run_coding_stats.py
```

## Testing API Endpoints

You can test the endpoints using curl:

```bash
# LeetCode
curl http://localhost:5001/leetcode/username

# CodeChef
curl http://localhost:5001/codechef/username

# HackerRank
curl http://localhost:5001/hackerrank/username
```

## Setting Up LinkedIn Integration

To use the LinkedIn profile analyzer functionality, you need to have Chrome/Chromium installed:

### Chrome/Chromium Installation

#### Ubuntu/Debian:
```bash
# Install Chromium browser
sudo apt-get update
sudo apt-get install -y chromium-browser

# Or install Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb
```

#### CentOS/RHEL:
```bash
# Install Chromium
sudo yum install -y chromium
```

#### macOS:
```bash
# Using Homebrew
brew install --cask google-chrome
# Or install Chromium
brew install --cask chromium
```

### Python Dependencies

Install the required Python dependencies:
```bash
pip install -r requirements.txt
```

The application uses `webdriver-manager` which will automatically download and manage the appropriate ChromeDriver version, so you don't need to manually install ChromeDriver.

### Troubleshooting WebDriver Issues

If you encounter WebDriver errors:

1. Make sure Chrome or Chromium is properly installed and can be opened manually
2. Make sure you have correct permissions to executable files
3. Try running with root/admin privileges if normal user doesn't work
4. For additional debugging, check the logs in the console when running the application

The application uses headless mode by default, so you don't need to worry about browser windows popping up.

### Testing LinkedIn Profile Analysis

You can test the LinkedIn profile analysis with curl:

```bash
curl -X POST http://localhost:5001/api/linkedin/scrape \
  -H "Content-Type: application/json" \
  -d '{"profileUrl": "https://www.linkedin.com/in/example-profile"}'
```

### ChromeDriver Version Issues

If you encounter errors related to ChromeDriver version mismatch (such as "This version of ChromeDriver only supports Chrome version X"), the application will automatically try several methods to resolve this:

1. It will attempt to detect your Chrome version and use a compatible ChromeDriver
2. Try multiple ChromeDriver versions known to work with recent Chrome versions
3. Try direct Chrome initialization without specifying a driver version

If you still encounter issues, you can:

1. **Manually install a specific ChromeDriver version:**
   ```bash
   pip uninstall webdriver-manager
   pip install webdriver-manager==3.8.6
   ```

2. **Downgrade Chrome to a more compatible version:**
   - For Ubuntu/Debian:
     ```bash
     sudo apt-get install chromium-browser=114.0.5735.133-0ubuntu0.22.04.1
     ```
   - Or download a specific version from the Chrome release archive

3. **Run with Chromium instead of Chrome:**
   ```bash
   sudo apt-get install chromium-browser
   ```

### Fallback Mechanism

The system will attempt several methods to initialize ChromeDriver with the best compatibility for your system. This ensures that the LinkedIn profile analysis will work across different environments and browser versions.

## Running the Services

1. Install dependencies: `pip install -r requirements.txt`
2. Start both backend services with a single command: `python run_services.py`

This will start:
- Coding Stats API on port 5001
- ML Service API on port 5002 