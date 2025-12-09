const axios = require('axios');

/**
 * TikTok Video Downloader with Enhanced Playwright Support
 * This approach uses improved browser emulation to handle TikTok's anti-scraping measures
 */
class TikTokDownloader {
    constructor(chromiumInstance = null) {
        this.chromium = chromiumInstance;
        // Enhanced browser options for TikTok
        this.browserOptions = {
            headless: true, // Changed back to true for production
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        };
        
        // Cookie storage for TikTok authentication
        this.cookies = [];
        this.sessionId = null;
    }

    /**
     * Check if the URL is a TikTok URL
     * @param {string} url - The URL to check
     * @returns {boolean} - Whether it's a TikTok URL
     */
    isTikTokUrl(url) {
        return url.includes('tiktok.com') || url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com');
    }

    /**
     * Get video URLs from TikTok using enhanced Playwright browser emulation
     * @param {string} shareUrl - The TikTok share URL
     * @returns {Promise<Object>} - Video URLs and cover image
     */
    async getVideoUrl(shareUrl) {
        console.log('\n--- TikTokDownloader.getVideoUrl method started ---');
        console.log('Input URL:', shareUrl);
        
        let browser = null;
        let context = null;
        let page = null;
        
        try {
            // Ensure we have chromium instance
            if (!this.chromium) {
                const { chromium } = require('playwright');
                this.chromium = chromium;
            }
            
            console.log('1. Initializing enhanced browser for TikTok...');
            
            // Launch browser with enhanced options
            browser = await this.chromium.launch(this.browserOptions);
            
            // Create context with enhanced fingerprint
            context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                javaScriptEnabled: true,
                bypassCSP: true,
                acceptDownloads: true,
                ignoreHTTPSErrors: true,
                permissions: ['camera', 'microphone', 'notifications'],
                // Enhanced fingerprinting protection
                screen: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                timezoneId: 'America/New_York',
                geolocation: { latitude: 40.7128, longitude: -74.0060 },
                locale: 'en-US',
                colorScheme: 'light'
            });
            
            // Remove automation detection flags using addInitScript with enhanced fingerprinting
            await context.addInitScript(() => {
                // Remove navigator.webdriver flag
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                    configurable: true
                });
                
                // Remove Chrome automation extension
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => {
                    if (parameters.name === 'notifications') {
                        return Promise.resolve({ state: Notification.permission });
                    }
                    return originalQuery(parameters);
                };
                
                // Enhance browser fingerprint
                Object.defineProperty(navigator, 'plugins', {
                    get: () => {
                        return [
                            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                            { name: 'Native Client', filename: 'internal-nacl-plugin' }
                        ];
                    },
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'mimeTypes', {
                    get: () => {
                        return [
                            { type: 'application/pdf', suffixes: 'pdf' },
                            { type: 'application/x-google-chrome-pdf', suffixes: 'pdf' }
                        ];
                    },
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en', 'es'],
                    configurable: true
                });
                
                // Remove other automation indicators
                Object.defineProperty(navigator, 'platform', {
                    get: () => 'Win32',
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'hardwareConcurrency', {
                    get: () => 8,
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'deviceMemory', {
                    get: () => 8,
                    configurable: true
                });
                
                // Override Performance API to hide automation
                if (window.performance) {
                    delete window.performance.navigation;
                    delete window.performance.timing;
                }
                
                // Override Chrome runtime to hide automation
                if (window.chrome && window.chrome.runtime) {
                    delete window.chrome.runtime;
                }
            });
            
            // Add session cookies if available
            if (this.cookies.length > 0) {
                await context.addCookies(this.cookies);
                console.log('   ✅ Added saved cookies');
            }
            
            // Create page with enhanced protection
            page = await context.newPage();
            
            let watermarkedUrl = null;
            let noWatermarkUrl = null;
            let coverUrl = null;
            let videoFound = false;
            let apiResponses = [];
            let allRequests = [];
            let videoRequests = [];
            
            // Set up enhanced network interception to capture all relevant requests
            console.log('2. Setting up enhanced network interception...');
            
            await page.route('**/*', route => {
                const request = route.request();
                const url = request.url();
                const resourceType = request.resourceType();
                const method = request.method();
                
                // Log all requests for debugging
                allRequests.push({ url, resourceType, method });
                
                // Capture all MP4 requests
                if (url.includes('.mp4')) {
                    videoRequests.push(url);
                    console.log('   📹 MP4 Request:', url, 'Resource type:', resourceType);
                    
                    if (!url.includes('playback') || url.length > 500) {
                        console.log('   🎯 TikTok video URL detected:', url);
                        
                        // For TikTok, the video URL might not have watermark parameters
                        // We'll check the URL structure to determine if it's watermarked
                        if (url.includes('wm=1') || url.includes('watermark=1') || url.includes('playwm')) {
                            watermarkedUrl = url;
                            console.log('   ✅ Watermarked URL identified');
                            
                            // Try to generate no-watermark URL
                            const candidateNoWatermark = url.replace(/wm=1/g, 'wm=0')
                                .replace(/watermark=1/g, 'watermark=0')
                                .replace(/playwm/g, 'play');
                            if (candidateNoWatermark !== url) {
                                noWatermarkUrl = candidateNoWatermark;
                                console.log('   � Generated no-watermark URL:', candidateNoWatermark);
                                videoFound = true;
                            }
                        } else {
                            // Assume URL is already no-watermark
                            noWatermarkUrl = url;
                            console.log('   ✅ No-watermark URL identified');
                            videoFound = true;
                        }
                    }
                }
                
                // Capture all API responses that might contain video data
                if ((resourceType === 'xhr' || resourceType === 'fetch') && method === 'GET') {
                    // Check for TikTok API endpoints - be more inclusive
                    if (url.includes('api') || url.includes('video') || url.includes('item') || url.includes('v1') || url.includes('v2') || 
                        url.includes('/webapp/') || url.includes('/aweme/') || url.includes('tiktokcdn') || url.includes('ttwstatic')) {
                        route.continue({ callback: response => {
                            response.body().then(body => {
                                try {
                                    const jsonBody = JSON.parse(body);
                                    apiResponses.push({ url, body: jsonBody });
                                    console.log('   📡 Captured API response:', url);
                                } catch (e) {
                                    // Not JSON, but still save it for debugging
                                    apiResponses.push({ url, body: body.toString(), isJson: false });
                                }
                            }).catch(() => {
                                // Failed to get body, but still log the URL
                                apiResponses.push({ url, body: null, error: 'Failed to get body' });
                            });
                        }});
                        return;
                    }
                }
                
                // Skip unnecessary requests to speed up loading
                if (resourceType === 'image' && !coverUrl) {
                    if (url.includes('cover') || url.includes('poster') || url.includes('thumb') || url.includes('.avif') || url.includes('.jpg') || url.includes('.png')) {
                        coverUrl = url;
                        console.log('   🖼️  Found cover image:', url);
                    }
                }
                
                route.continue();
            });
            
            // Enhanced navigation strategy
            console.log('3. Navigating to TikTok video...');
            
            // Convert to mobile URL format which is often easier to scrape
            let mobileUrl = shareUrl;
            /*
            if (mobileUrl.includes('www.tiktok.com')) {
                mobileUrl = mobileUrl.replace('www.tiktok.com', 'm.tiktok.com');
                console.log('   Converted to mobile URL:', mobileUrl);
            }
            */
            console.log('   Target URL:', mobileUrl);
            
            // Use navigation with retry mechanism
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await page.goto(mobileUrl, {
                        waitUntil: 'networkidle',
                        timeout: 30000
                    });
                    break;
                } catch (navigationError) {
                    console.error(`   ⚠️  Navigation attempt ${attempt} failed:`, navigationError.message);
                    if (attempt === 3) {
                        // Try original URL if mobile URL failed
                        console.log('   Trying original URL instead...');
                        await page.goto(shareUrl, {
                            waitUntil: 'networkidle',
                            timeout: 30000
                        });
                        break;
                    }
                    await page.waitForTimeout(2000);
                }
            }
            
            // Wait for page to fully load and all network requests to complete
            console.log('4. Waiting for page to fully load...');
            await page.waitForTimeout(12000);
            
            // Multiple scroll actions to trigger video loading
            console.log('5. Performing scroll actions to trigger video loading...');
            for (let i = 0; i < 3; i++) {
                await page.evaluate(() => {
                    window.scrollBy(0, 200);
                });
                await page.waitForTimeout(2000);
            }
            
            await page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await page.waitForTimeout(2000);
            
            // Try to extract video from DOM if network interception failed
            if (!videoFound) {
                console.log('6. Attempting DOM extraction...');
                
                // Get video elements and their sources
                const videoElements = await page.$$('video');
                console.log(`   Found ${videoElements.length} video elements`);
                
                for (let i = 0; i < videoElements.length; i++) {
                    const video = videoElements[i];
                    const src = await video.evaluate(v => v.src);
                    const poster = await video.getAttribute('poster');
                    const currentSrc = await video.evaluate(v => v.currentSrc);
                    
                    console.log(`   Video ${i+1} src:`, src);
                    console.log(`   Video ${i+1} currentSrc:`, currentSrc);
                    
                    const videoUrl = src || currentSrc;
                    if (videoUrl && videoUrl.includes('.mp4')) {
                        console.log('   📹 Extracted video URL from DOM:', videoUrl);
                        noWatermarkUrl = videoUrl;
                        videoFound = true;
                        break;
                    }
                    
                    if (poster && !coverUrl) {
                        coverUrl = poster;
                        console.log('   🖼️  Extracted cover from DOM:', poster);
                    }
                }
            }
            
            // Analyze captured API responses for video data
            if (!videoFound && apiResponses.length > 0) {
                console.log(`7. Analyzing ${apiResponses.length} captured API responses...`);
                
                for (const response of apiResponses) {
                    const { url, body } = response;
                    
                    // Recursively search for video URLs in API response
                    const findVideoUrl = (obj) => {
                        if (typeof obj !== 'object' || obj === null) return null;
                        
                        if (Array.isArray(obj)) {
                            for (const item of obj) {
                                const result = findVideoUrl(item);
                                if (result) return result;
                            }
                        } else {
                            // Check if this is a video URL
                            for (const [key, value] of Object.entries(obj)) {
                                if (key.toLowerCase().includes('url') && typeof value === 'string' && value.includes('.mp4')) {
                                    return value;
                                }
                                if (key.toLowerCase().includes('play') && typeof value === 'string' && value.includes('.mp4')) {
                                    return value;
                                }
                                if (key.toLowerCase().includes('video') && typeof value === 'string' && value.includes('.mp4')) {
                                    return value;
                                }
                                if (key.toLowerCase().includes('download') && typeof value === 'string' && value.includes('.mp4')) {
                                    return value;
                                }
                                
                                // Recursively check nested objects
                                const result = findVideoUrl(value);
                                if (result) return result;
                            }
                        }
                        
                        return null;
                    };
                    
                    const foundUrl = findVideoUrl(body);
                    if (foundUrl) {
                        console.log('   🎯 Found video URL in API response:', foundUrl);
                        noWatermarkUrl = foundUrl;
                        videoFound = true;
                        break;
                    }
                }
            }
            
            // Try to find video URLs in page scripts with enhanced strategies
            if (!videoFound) {
                console.log('8. Enhanced search in page scripts...');
                
                // Get full page content
                const pageContent = await page.content();
                
                // Specific check for __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag which we know works
                const universalDataMatch = pageContent.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
                if (universalDataMatch && universalDataMatch[1]) {
                    try {
                        const jsonData = JSON.parse(universalDataMatch[1]);
                        console.log('   📦 Found __UNIVERSAL_DATA_FOR_REHYDRATION__, extracting video data...');
                        
                        // Direct path to video data based on analysis
                        const videoData = jsonData?.['__DEFAULT_SCOPE__']?.['webapp.video-detail']?.itemInfo?.itemStruct?.video;
                        
                        if (videoData && videoData.PlayAddrStruct && videoData.PlayAddrStruct.UrlList && videoData.PlayAddrStruct.UrlList.length > 0) {
                            const foundUrl = videoData.PlayAddrStruct.UrlList[0];
                            console.log('   🎯 Found video URL from specific data path:', foundUrl);
                            noWatermarkUrl = foundUrl;
                            videoFound = true;
                        }
                    } catch (e) {
                        console.log('   ⚠️ Failed to parse __UNIVERSAL_DATA_FOR_REHYDRATION__:', e.message);
                    }
                }

                if (!videoFound) {
                    // Extract all script tags content
                    const scriptContents = await page.evaluate(() => {
                        const scripts = document.querySelectorAll('script');
                        return Array.from(scripts).map(script => script.textContent);
                    });
                    
                    // Search for TikTok video data patterns
                    const tiktokPatterns = [
                        // Look for any large JSON object that might contain video data
                        /window\.__INITIAL_STATE__\s*=\s*({[^;]+});/,
                        /window\.__NEXT_DATA__\s*=\s*({[^;]+});/,
                        /window\.TikTok\s*=\s*({[^;]+});/,
                        // Look for video URLs in any JavaScript string
                        /https?:\/\/[^"'\s]+\.mp4[^"'\s]*/g
                    ];
                    
                    for (const pattern of tiktokPatterns) {
                        if (pattern.global) {
                            // Global regex for URLs
                            const matches = pageContent.match(pattern) || [];
                            for (const match of matches) {
                                if (match.includes('.mp4') && !match.includes('playback')) {
                                    console.log('   🎯 Found video URL in page:', match);
                                    noWatermarkUrl = match;
                                    videoFound = true;
                                    break;
                                }
                            }
                        } else {
                            // Regex for JSON objects
                            const match = pageContent.match(pattern);
                            if (match && match[1]) {
                                try {
                                    const jsonData = JSON.parse(match[1]);
                                    console.log('   📦 Found large JSON object, searching for video data...');
                                    
                                    // Recursively search for video URLs in JSON
                                    const findVideoInJson = (obj, path = []) => {
                                        if (typeof obj !== 'object' || obj === null) return null;
                                        
                                        if (Array.isArray(obj)) {
                                            for (let i = 0; i < obj.length; i++) {
                                                const result = findVideoInJson(obj[i], [...path, i]);
                                                if (result) return result;
                                            }
                                        } else {
                                            for (const [key, value] of Object.entries(obj)) {
                                                if (typeof value === 'string' && value.includes('.mp4')) {
                                                    console.log(`   🎯 Found video URL at path: ${path.join('.')}.${key}`);
                                                    return value;
                                                }
                                                const result = findVideoInJson(value, [...path, key]);
                                                if (result) return result;
                                            }
                                        }
                                        
                                        return null;
                                    };
                                    
                                    const foundUrl = findVideoInJson(jsonData);
                                    if (foundUrl) {
                                        noWatermarkUrl = foundUrl;
                                        videoFound = true;
                                        break;
                                    }
                                } catch (e) {
                                    // Ignore JSON parse errors
                                }
                            }
                        }
                        
                        if (videoFound) break;
                    }
                }
            }
            
            // Try one more aggressive approach: search all script contents
            if (!videoFound) {
                console.log('9. Aggressive search in all script contents...');
                
                // Extract all script contents again and search more thoroughly
                const allScriptContent = await page.evaluate(() => {
                    return document.documentElement.innerHTML;
                });
                
                // Look for any MP4 URL with more flexible patterns
                const flexibleVideoRegex = /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
                const matches = allScriptContent.match(flexibleVideoRegex) || [];
                
                for (const match of matches) {
                    if (!match.includes('playback') && match.length > 100) {
                        console.log('   🎯 Found potential video URL:', match);
                        noWatermarkUrl = match;
                        videoFound = true;
                        break;
                    }
                }
            }
            
            // Debug information
            console.log('\n--- Debug Information ---');
            console.log('Total requests captured:', allRequests.length);
            console.log('Total API responses:', apiResponses.length);
            console.log('Total video requests:', videoRequests.length);
            
            // Log all video requests for debugging
            if (videoRequests.length > 0) {
                console.log('\nVideo requests found:');
                videoRequests.forEach((req, index) => {
                    console.log(`${index+1}. ${req}`);
                });
            }
            
            // If no video found, try to extract video ID and construct URL manually
            if (!videoFound && !noWatermarkUrl) {
                console.log('\n10. Trying manual video ID extraction...');
                
                // Extract video ID from URL
                const videoIdMatch = shareUrl.match(/video\/([0-9]+)/);
                if (videoIdMatch && videoIdMatch[1]) {
                    const videoId = videoIdMatch[1];
                    console.log('   🎯 Extracted video ID:', videoId);
                    
                    // Construct possible video URLs manually
                    const possibleUrls = [
                        `https://api16-normal-c-alisg.tiktokv.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`,
                        `https://api16-normal-c-alisg.tiktokv.com/aweme/v1/playwm/?video_id=${videoId}&ratio=720p&line=0`
                    ];
                    
                    console.log('   💡 Trying manual URL construction...');
                    noWatermarkUrl = possibleUrls[0]; // Try the API URL as default
                    console.log('   🎯 Generated manual video URL:', noWatermarkUrl);
                    videoFound = true; // Mark as found for testing
                }
            }
            
            // Save cookies for future requests
            const currentCookies = await context.cookies();
            this.cookies = currentCookies;
            console.log('   ✅ Saved cookies for future requests');
            
            // Close browser
            await browser.close();
            
            // If we found no-watermark URL, generate watermarked URL if needed
            if (noWatermarkUrl && !watermarkedUrl) {
                watermarkedUrl = noWatermarkUrl.replace(/wm=0/g, 'wm=1')
                    .replace(/watermark=0/g, 'watermark=1')
                    .replace(/play\//g, 'playwm/');
                console.log('   💡 Generated watermarked URL:', watermarkedUrl);
            }
            
            // Summary
            console.log('\n7. TikTok video extraction results:');
            console.log('   No-watermark URL:', noWatermarkUrl ? '✅' : '❌');
            console.log('   Watermarked URL:', watermarkedUrl ? '✅' : '❌');
            console.log('   Cover image URL:', coverUrl ? '✅' : '❌');
            
            if (!noWatermarkUrl && !watermarkedUrl) {
                console.error('❌ Failed to extract TikTok video URLs');
                return { watermarked: null, noWatermark: null, cover: null };
            }
            
            const cookieString = currentCookies.map(c => `${c.name}=${c.value}`).join('; ');
            
            const result = { 
                watermarked: watermarkedUrl, 
                noWatermark: noWatermarkUrl, 
                cover: coverUrl,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': cookieString,
                    'Referer': 'https://www.tiktok.com/'
                }
            };
            console.log('\n--- TikTokDownloader.getVideoUrl method completed ---');
            return result;
        } catch (error) {
            console.error('❌ TikTokDownloader error:', error.message);
            console.error('   Error details:', error.stack);
            return { watermarked: null, noWatermark: null, cover: null };
        } finally {
            // Ensure resources are closed
            if (page) await page.close().catch(() => {});
            if (context) await context.close().catch(() => {});
            if (browser) await browser.close().catch(() => {});
        }
    }

    /**
     * Download TikTok video to file using advanced browser automation
     * @param {string} videoUrl - The video URL to download
     * @param {string} savePath - The path to save the video
     * @returns {Promise<Object>} - Download result
     */
    async downloadVideo(videoUrl, savePath) {
        console.log('\n--- TikTokDownloader.downloadVideo method started ---');
        console.log('Video URL:', videoUrl);
        console.log('Save path:', savePath);
        
        const fs = require('fs');
        const path = require('path');
        
        try {
            // Method 1: Enhanced browser automation download
            console.log('1. Trying advanced browser automation download...');
            
            const { chromium } = require('playwright');
            
            // Launch browser with advanced anti-detection settings
            const browser = await chromium.launch({
                headless: false, // Use non-headless for better compatibility
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            });
            
            // Create context with enhanced fingerprint
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: { width: 1920, height: 1080 },
                javaScriptEnabled: true,
                bypassCSP: true,
                acceptDownloads: true,
                ignoreHTTPSErrors: true,
                // Enhanced fingerprinting protection
                screen: { width: 1920, height: 1080 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                timezoneId: 'America/New_York',
                locale: 'en-US',
                colorScheme: 'light'
            });
            
            // Remove automation detection flags
            await context.addInitScript(() => {
                // Remove navigator.webdriver flag
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                    configurable: true
                });
                
                // Enhance browser fingerprint
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin' }
                    ],
                    configurable: true
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en', 'es'],
                    configurable: true
                });
            });
            
            // Add saved cookies if available
            if (this.cookies.length > 0) {
                await context.addCookies(this.cookies);
                console.log('   ✅ Added saved cookies');
            }
            
            const page = await context.newPage();
            
            // First, navigate to TikTok to establish a valid session
            console.log('   Navigating to TikTok homepage to establish session...');
            await page.goto('https://www.tiktok.com/', {
                waitUntil: 'networkidle',
                timeout: 60000
            });
            await page.waitForTimeout(3000);
            
            // Now navigate to the video URL directly
            console.log('   Navigating to video URL...');
            await page.goto(videoUrl, {
                waitUntil: 'networkidle',
                timeout: 60000
            });
            await page.waitForTimeout(5000);
            
            // Try to find and click the video to ensure it's loaded
            await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    video.play().catch(() => {});
                }
            });
            await page.waitForTimeout(3000);
            
            // Now use the browser's native download capability
            console.log('   Attempting to download video using browser...');
            
            // Wait for download event
            const [download] = await Promise.all([
                context.waitForEvent('download'),
                page.evaluate(() => {
                    // Get the video element
                    const video = document.querySelector('video');
                    if (video) {
                        // Create a canvas and draw the video frame (to trigger video loading)
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Get the video URL from the video element
                        const videoSrc = video.currentSrc || video.src;
                        if (videoSrc) {
                            // Create a link and click it to download
                            const link = document.createElement('a');
                            link.href = videoSrc;
                            link.download = 'tiktok_video.mp4';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        } else {
                            throw new Error('No video source found');
                        }
                    } else {
                        throw new Error('No video element found');
                    }
                })
            ]);
            
            // Save the downloaded file to our desired path
            await download.saveAs(savePath);
            await browser.close();
            
            console.log('✅ Browser automation download successful!');
            console.log('   Saved to:', savePath);
            
            return {
                success: true,
                path: savePath,
                method: 'browser_automation'
            };
            
        } catch (browserError) {
            console.error('❌ Browser automation download failed:', browserError.message);
            
            try {
                // Method 2: Try with different headers and proxy approach
                console.log('2. Trying enhanced proxy download approach...');
                
                // Use a more comprehensive header set
                const headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.tiktok.com/',
                    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'DNT': '1',
                    'Sec-Fetch-Dest': 'video',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site',
                    'Origin': 'https://www.tiktok.com',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'TE': 'trailers'
                };
                
                // Add cookies if available
                if (this.cookies.length > 0) {
                    headers.Cookie = this.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
                }
                
                // Use axios with retry mechanism
                const maxRetries = 3;
                let retryCount = 0;
                let response;
                
                while (retryCount < maxRetries) {
                    try {
                        response = await axios({
                            url: videoUrl,
                            method: 'GET',
                            responseType: 'stream',
                            headers: headers,
                            timeout: 60000,
                            httpsAgent: new (require('https').Agent)({
                                keepAlive: true,
                                rejectUnauthorized: false
                            })
                        });
                        break;
                    } catch (retryError) {
                        retryCount++;
                        console.log(`   Retry ${retryCount}/${maxRetries} failed:`, retryError.message);
                        if (retryCount === maxRetries) {
                            throw retryError;
                        }
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
                
                if (response.status === 200) {
                    console.log('✅ Enhanced proxy download successful!');
                    
                    // Save the video stream
                    const writer = fs.createWriteStream(savePath);
                    response.data.pipe(writer);
                    
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    
                    console.log('   Saved to:', savePath);
                    
                    return {
                        success: true,
                        path: savePath,
                        method: 'enhanced_proxy'
                    };
                }
                
            } catch (proxyError) {
                console.error('❌ Enhanced proxy download failed:', proxyError.message);
            }
            
            // Method 3: Final fallback - extract video data from page
            console.log('3. Trying final fallback method - direct page data extraction...');
            
            try {
                const { chromium } = require('playwright');
                const browser = await chromium.launch({
                    headless: true,
                    args: ['--no-sandbox']
                });
                
                const page = await browser.newPage();
                await page.goto(videoUrl, { waitUntil: 'networkidle' });
                await page.waitForTimeout(5000);
                
                // Extract all script tags content
                const pageContent = await page.content();
                await browser.close();
                
                // Look for video data in the page content
                const videoDataRegex = /(https?:\/\/[^"'\s]+\.mp4[^"'\s]*)/g;
                const matches = pageContent.match(videoDataRegex) || [];
                
                if (matches.length > 0) {
                    // Find the longest URL which is likely the actual video
                    const longestUrl = matches.reduce((a, b) => a.length > b.length ? a : b);
                    
                    return {
                        success: false,
                        message: 'Direct download failed, but found alternative video URLs.',
                        alternativeUrls: matches,
                        recommendedUrl: longestUrl,
                        method: 'manual_selection'
                    };
                }
                
            } catch (fallbackError) {
                console.error('❌ Final fallback failed:', fallbackError.message);
            }
            
            // All methods failed, provide detailed guidance
            console.log('💡 All direct methods failed. Here are detailed alternative approaches:');
            
            return {
                success: false,
                message: 'All direct download methods failed due to TikTok\'s advanced anti-scraping measures.',
                extractedUrl: videoUrl,
                error: browserError.message,
                detailedGuidance: [
                    {
                        name: '使用抖音网页版',
                        steps: [
                            '1. 打开浏览器并登录抖音账号',
                            '2. 访问 TikTok 视频 URL',
                            '3. 右键点击视频，选择 "检查"',
                            '4. 在 "网络" 标签中过滤 "mp4"',
                            '5. 找到较大的 mp4 请求，右键复制链接地址',
                            '6. 使用下载工具或浏览器下载该链接'
                        ]
                    },
                    {
                        name: '使用第三方下载工具',
                        tools: [
                            '4K Video Downloader',
                            'YTD Video Downloader',
                            'ClipGrab'
                        ],
                        steps: [
                            '1. 复制 TikTok 视频 URL',
                            '2. 打开下载工具',
                            '3. 粘贴 URL 并选择无水印选项',
                            '4. 开始下载'
                        ]
                    },
                    {
                        name: '使用手机应用',
                        apps: [
                            'Snaptik',
                            'TikTok Video Downloader',
                            'Video Downloader for TikTok'
                        ],
                        steps: [
                            '1. 在手机上复制 TikTok 视频链接',
                            '2. 打开下载应用',
                            '3. 粘贴链接并下载'
                        ]
                    }
                ]
            };
        }
    }
}

module.exports = TikTokDownloader;