const TikTokDownloader = require('../tiktok-downloader');
const fs = require('fs');
const path = require('path');

async function testEnhancedDownload() {
    console.log('=== Enhanced TikTok Video Download Test ===');
    
    const testUrl = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    const outputPath = path.join(__dirname, `tiktok_enhanced_test_${Date.now()}.mp4`);
    
    try {
        const tiktokDownloader = new TikTokDownloader();
        
        console.log('\n1. Getting video URL...');
        const videoInfo = await tiktokDownloader.getVideoUrl(testUrl);
        
        if (!videoInfo.noWatermark) {
            console.error('❌ Failed to get no-watermark video URL');
            return;
        }
        
        console.log('✅ Got no-watermark video URL:', videoInfo.noWatermark);
        
        console.log('\n2. Testing enhanced download...');
        const downloadResult = await tiktokDownloader.downloadVideo(videoInfo.noWatermark, outputPath);
        
        if (downloadResult.success) {
            console.log('✅ Download successful!');
            console.log('   Result:', downloadResult);
            
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('\n📁 File details:');
                console.log('   Path:', outputPath);
                console.log('   Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('   Created:', stats.birthtime);
                
                if (stats.size > 0) {
                    console.log('\n🎉 Enhanced download test passed!');
                    console.log('✅ Video downloaded successfully with enhanced anti-blocking measures');
                } else {
                    console.error('❌ Downloaded file is empty');
                    fs.unlinkSync(outputPath);
                }
            } else {
                console.error('❌ Downloaded file not found');
            }
        } else {
            console.error('❌ Download failed:', downloadResult.message);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error.stack);
        
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    }
}

testEnhancedDownload();
