const TikTokDownloader = require('./tiktok-downloader');
const fs = require('fs');
const path = require('path');

async function testNewUrl() {
    console.log('=== TikTok New URL Test ===');
    
    // New test URL provided by user
    const testUrl = 'https://www.tiktok.com/@mxgchx0ng/video/7539927946769747220?is_from_webapp=1&sender_device=pc';
    const outputPath = path.join(__dirname, `tiktok_new_url_test_${Date.now()}.mp4`);
    
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
        console.log('✅ Got watermarked video URL:', videoInfo.watermarked);
        
        // Step 2: Test download with enhanced proxy method
        console.log('\n2. Testing enhanced proxy download...');
        const downloadResult = await tiktokDownloader.downloadVideo(videoInfo.noWatermark, outputPath);
        
        if (downloadResult.success) {
            console.log('✅ Enhanced proxy download successful!');
            
            // Verify file exists and has content
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('\n📁 File details:');
                console.log('   Path:', outputPath);
                console.log('   Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
                console.log('   Created:', stats.birthtime);
                
                if (stats.size > 0) {
                    console.log('\n🎉 New URL test passed!');
                    console.log('✅ Video downloaded successfully from the new URL');
                } else {
                    console.error('❌ Downloaded file is empty');
                    fs.unlinkSync(outputPath); // Clean up empty file
                }
            } else {
                console.error('❌ Downloaded file not found');
            }
        } else {
            console.log('❌ Download failed, but URL extraction was successful!');
            console.log('📋 Extracted URLs:');
            console.log('   No-watermark:', videoInfo.noWatermark);
            console.log('   Watermarked:', videoInfo.watermarked);
            
            // Provide alternative download options
            console.log('\n💡 Alternative download methods:');
            console.log('1. Copy the extracted URL to your browser:');
            console.log(`   ${videoInfo.noWatermark}`);
            console.log('2. Use curl with proper headers:');
            console.log(`   curl -o "${outputPath}" -H "Referer: https://www.tiktok.com/" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "${videoInfo.noWatermark}"`);
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

testNewUrl();