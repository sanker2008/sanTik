const axios = require('axios');
const fs = require('fs');
const path = require('path');
const TikTokDownloader = require('../tiktok-downloader');

async function testDownload() {
    console.log('=== TikTok Video Download Test ===');
    
    const testUrl = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    
    try {
        const tiktokDownloader = new TikTokDownloader();
        const videoInfo = await tiktokDownloader.getVideoUrl(testUrl);
        
        if (!videoInfo.noWatermark) {
            console.error('❌ Failed to get no-watermark video URL');
            return;
        }
        
        console.log('✅ Got no-watermark video URL:', videoInfo.noWatermark);
        
        console.log('\n=== Testing Video Download ===');
        const outputPath = path.join(__dirname, `tiktok_test_${Date.now()}.mp4`);
        
        const response = await axios({
            url: videoInfo.noWatermark,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.tiktok.com/'
            },
            timeout: 60000
        });
        
        if (response.status === 200) {
            console.log('✅ Download request successful');
            console.log('Content-Type:', response.headers['content-type']);
            console.log('Content-Length:', response.headers['content-length'] ? `${(parseInt(response.headers['content-length']) / 1024 / 1024).toFixed(2)} MB` : 'Unknown');
            
            const writer = fs.createWriteStream(outputPath);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`✅ Video downloaded successfully: ${outputPath}`);
                    resolve();
                });
                writer.on('error', reject);
            });
            
            const stats = fs.statSync(outputPath);
            if (stats.size > 0) {
                console.log(`✅ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                console.log('\n🎉 Video download test passed!');
            } else {
                console.error('❌ Downloaded file is empty');
            }
        } else {
            console.error(`❌ Download failed with status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error.stack);
    }
}

testDownload();
