const TikTokDownloader = require('../tiktok-downloader');

async function finalTest() {
    console.log('=== Final TikTok No-Watermark Video Extraction Test ===');
    
    const testUrls = [
        'https://www.tiktok.com/@cu.cumber69/video/7578952907178134787'
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    
    for (const url of testUrls) {
        totalTests++;
        console.log(`\n=== Testing URL ${totalTests}/${testUrls.length} ===`);
        console.log('URL:', url);
        
        try {
            const tiktokDownloader = new TikTokDownloader();
            const startTime = Date.now();
            const result = await tiktokDownloader.getVideoUrl(url);
            const endTime = Date.now();
            
            console.log(`\n✅ Test completed in ${endTime - startTime}ms`);
            console.log('Results:');
            console.log('   - No-watermark URL:', result.noWatermark ? '✅ SUCCESS' : '❌ FAILED');
            console.log('   - Watermarked URL:', result.watermarked ? '✅ SUCCESS' : '❌ FAILED');
            console.log('   - Cover URL:', result.cover ? '✅ SUCCESS' : '❌ FAILED');
            
            if (result.noWatermark) {
                console.log('\n🎉 No-watermark video URL extracted successfully!');
                console.log('📹 URL:', result.noWatermark);
                passedTests++;
            } else {
                console.log('\n❌ Failed to extract no-watermark video URL');
            }
            
        } catch (error) {
            console.log(`\n❌ Test failed with error: ${error.message}`);
        }
    }
    
    console.log(`\n=== Final Results ===`);
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed tests: ${passedTests}`);
    console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests > 0) {
        console.log('\n🎉 TikTok no-watermark video extraction is working!');
        console.log('📋 Usage instructions:');
        console.log('1. Use the TikTokDownloader class from tiktok-downloader.js');
        console.log('2. Call getVideoUrl() with a TikTok video URL');
        console.log('3. Use the returned noWatermark URL to access the video');
        console.log('4. Note: CDN URLs may expire quickly, use them immediately');
    } else {
        console.log('\n❌ TikTok no-watermark video extraction failed for all URLs');
    }
}

finalTest();
