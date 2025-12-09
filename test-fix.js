const SanTik = require('./index');
const fs = require('fs');
const path = require('path');

async function testFix() {
    console.log('=== Testing Fix for TikTok Download ===');
    const testUrl = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    console.log('Target URL:', testUrl);

    const sanTik = new SanTik();
    
    try {
        console.log('1. Getting Video URL...');
        const result = await sanTik.getVideoUrl(testUrl);
        
        console.log('Video URL Result:', {
            watermarked: result.watermarked ? 'Found' : 'Not Found',
            noWatermark: result.noWatermark ? 'Found' : 'Not Found',
            headers: result.headers ? 'Found' : 'Not Found'
        });

        if (result.headers) {
            console.log('Headers Preview:', {
                'User-Agent': result.headers['User-Agent'] ? 'Present' : 'Missing',
                'Cookie': result.headers['Cookie'] ? 'Present (' + result.headers['Cookie'].length + ' chars)' : 'Missing',
                'Referer': result.headers['Referer']
            });
        }

        if (result.noWatermark) {
            console.log('2. Attempting Download with Headers...');
            const savePath = path.join(__dirname, 'test-fix-download.mp4');
            
            await sanTik.downloadVideo(result.noWatermark, savePath, result.headers);
            
            if (fs.existsSync(savePath)) {
                const stats = fs.statSync(savePath);
                console.log(`✅ Download Successful! File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            } else {
                console.log('❌ Download Failed: File not found');
            }
        } else {
            console.log('❌ Failed to get video URL');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        // SanTik instance doesn't have a close method exposed directly if used like this, 
        // but getVideoUrl closes the browser internally.
        // If we want to be safe we can check if browser is open, but usually getVideoUrl handles it.
    }
}

testFix();
