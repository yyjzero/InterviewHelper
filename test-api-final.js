import pkg from 'tencentcloud-sdk-nodejs';
const { Credential, OcrClient } = pkg;

// 测试 API key
const secretId = 'AKIDN9nFWffV9C7uY3iFcs1znPsBC6pLfP2U';
const secretKey = 'PhnhQwHQOAmBOQJ2Zv44sVv8DAxYw9D5';

console.log('🔍 开始测试腾讯云 OCR API...');
console.log(`SecretId: ${secretId.substring(0, 8)}...`);
console.log(`SecretKey: ${secretKey.substring(0, 8)}...`);

async function testApiKey() {
  try {
    // 使用腾讯云官方 SDK
    const cred = new Credential(secretId, secretKey);
    const client = new OcrClient(cred, 'ap-beijing');

    // 创建一个简单的测试图片 base64 (1x1 像素的透明图片)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const params = {
      ImageBase64: testImageBase64,
      Scene: 'doc',
      LanguageType: 'zh'
    };

    console.log('📤 发送测试请求到腾讯云...');
    const response = await client.GeneralBasicOCR(params);

    console.log('✅ API 请求成功！');
    console.log('📋 响应数据:', JSON.stringify(response, null, 2));

    if (response.TextDetections && response.TextDetections.length > 0) {
      console.log('🎉 API key 验证成功！识别到文字:', response.TextDetections.length, '个');
      return true;
    } else {
      console.log('✅ API key 验证成功！但测试图片没有文字内容');
      return true;
    }

  } catch (error) {
    console.log('❌ API 测试失败:');
    console.log('错误代码:', error.code);
    console.log('错误信息:', error.message);
    
    if (error.code === 'AuthFailure.SecretIdNotFound') {
      console.log('💡 建议: SecretId 不存在或无效');
    } else if (error.code === 'AuthFailure.SignatureFailure') {
      console.log('💡 建议: SecretKey 不正确');
    } else if (error.code === 'AuthFailure.SignatureExpire') {
      console.log('💡 建议: 签名过期，请检查系统时间');
    }
    
    return false;
  }
}

// 运行测试
testApiKey()
  .then(success => {
    if (success) {
      console.log('\n🎉 测试完成: API key 配置正确！');
    } else {
      console.log('\n❌ 测试完成: API key 配置有问题，请检查密钥');
    }
  })
  .catch(error => {
    console.log('\n💥 测试过程中发生错误:', error.message);
  });
