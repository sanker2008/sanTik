const TikTokDownloader = require('./tiktok-downloader');
const fs = require('fs');
const path = require('path');

async function testBrowserDownload() {
    console.log('=== TikTok Browser Automation Download Test ===');
    
    // Test URL from previous successful run
    const testUrl = 'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787';
    const outputPath = path.join(__dirname, `tiktok_browser_test_${Date.now()}.mp4`);
    
    try {
        // Initialize downloader
        const tiktokDownloader = new TikTokDownloader();
        
        // Step 1: Get video URL
        console.log('\n1. Getting video URL...');
        const videoInfo = await tiktokDownloader.getVideoUrl(testUrl);
        
        if (!videoInfo.noWatermark) {
            console.error('❌ Failed to get no-watermark video URL');
            return;
        }
        
        console.log('✅ Got no-watermark video URL:', videoInfo.noWatermark);
        
        // Step 2: Test browser automation download
        console.log('\n2. Testing browser automation download...');
        
        // Use the direct video URL for download testing
        const directVideoUrl = testUrl; // Using the original URL for browser navigation
        
        const downloadResult = await tiktokDownloader.downloadVideo(directVideoUrl, outputPath);
        
        if (downloadResult.success) {
            console.log('✅ Browser automation download successful!');
            console.log('   Result:', downloadResult);
            
            // Verify file exists and has content
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('\n📁 File details:');
                console.log('   Path:', outputPath);
                console.log('   Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('   Created:', stats.birthtime);
                
                if (stats.size > 0) {
                    console.log('\n🎉 Browser automation download test passed!');
                    console.log('✅ Video downloaded successfully using browser automation');
                } else {
                    console.error('❌ Downloaded file is empty');
                    fs.unlinkSync(outputPath); // Clean up empty file
                }
            } else {
                console.error('❌ Downloaded file not found');
            }
        } else {
            console.log('❌ Browser download failed, but here are alternatives:');
            if (downloadResult.detailedGuidance) {
                downloadResult.detailedGuidance.forEach((guide, index) => {
                    console.log(`\n${index + 1}. ${guide.name}`);
                    if (guide.tools) {
                        console.log(`   Tools: ${guide.tools.join(', ')}`);
                    }
                    console.log('   Steps:');
                    guide.steps.forEach(step => {
                        console.log(`      ${step}`);
                    });
                });
            } else {
                console.log(downloadResult.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Error details:', error.stack);
        
        // Clean up if file was created
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    }
}

testBrowserDownload();