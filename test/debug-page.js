const { chromium } = require('playwright');
const fs = require('fs');

async function debugPage() {
    console.log('Launching browser...');
    const browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    const url = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    console.log('Navigating to:', url);
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        console.log('Page loaded.');
        
        const content = await page.content();
        fs.writeFileSync('debug-page.html', content);
        console.log('Saved page content to debug-page.html');
        
        const cookies = await context.cookies();
        console.log('Cookies count:', cookies.length);
        console.log('Cookies:', cookies.map(c => c.name).join(', '));
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugPage();
