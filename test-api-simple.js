import crypto from 'crypto';
import axios from 'axios';

// 测试 API key
const secretId = 'AKIDN9nFWffV9C7uY3iFcs1znPsBC6pLfP2U';
const secretKey = 'PhnhQwHQOAmBOQJ2Zv44sVv8DAxYw9D5';

console.log('🔍 开始测试腾讯云 OCR API...');
console.log(`SecretId: ${secretId.substring(0, 8)}...`);
console.log(`SecretKey: ${secretKey.substring(0, 8)}...`);

async function testApiKey() {
  try {
    // 创建一个简单的测试图片 base64 (1x1 像素的透明图片)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // 构建请求参数
    const params = {
      ImageBase64: testImageBase64,
      Scene: 'doc',
      LanguageType: 'zh'
    };

    // 生成签名
    const timestamp = Math.floor(Date.now() / 1000);
    const region = 'ap-beijing';
    const service = 'ocr';
    const version = '2018-11-19';
    const action = 'GeneralBasicOCR';

    const payload = JSON.stringify(params);
    const hashedRequestPayload = crypto.createHash('sha256').update(payload).digest('hex');
    
    const canonicalRequest = [
      'POST',
      '/',
      '',
      `content-type:application/json; charset=utf-8`,
      `host:${service}.tencentcloudapi.com`,
      `x-tc-action:${action.toLowerCase()}`,
      '',
      `content-type;host;x-tc-action`,
      hashedRequestPayload
    ].join('\n');

    const date = new Date().toISOString().substr(0, 10);
    const credentialScope = `${date}/${region}/${service}/tc3_request`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    
    const stringToSign = [
      'TC3-HMAC-SHA256',
      timestamp,
      credentialScope,
      hashedCanonicalRequest
    ].join('\n');

    const secretDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
    const secretService = crypto.createHmac('sha256', secretDate).update(service).digest();
    const secretSigning = crypto.createHmac('sha256', secretService).update('tc3_request').digest();
    const signature = crypto.createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

    const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;

    console.log('📤 发送测试请求到腾讯云...');

    // 发送请求到腾讯云
    const response = await axios.post('https://ocr.tencentcloudapi.com/', params, {
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json; charset=utf-8',
        'Host': 'ocr.tencentcloudapi.com',
        'X-TC-Action': action,
        'X-TC-Timestamp': timestamp,
        'X-TC-Version': version,
        'X-TC-Region': region
      }
    });

    console.log('✅ API 请求成功！');
    console.log('📊 响应状态:', response.status);
    console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.Response && response.data.Response.Error) {
      console.log('❌ API 返回错误:', response.data.Response.Error);
      return false;
    } else {
      console.log('🎉 API key 验证成功！');
      return true;
    }

  } catch (error) {
    console.log('❌ API 测试失败:');
    console.log('错误信息:', error.message);
    
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data && error.response.data.Response && error.response.data.Response.Error) {
        const apiError = error.response.data.Response.Error;
        console.log('API 错误代码:', apiError.Code);
        console.log('API 错误信息:', apiError.Message);
        
        if (apiError.Code === 'AuthFailure.SecretIdNotFound') {
          console.log('💡 建议: SecretId 不存在或无效');
        } else if (apiError.Code === 'AuthFailure.SignatureExpire') {
          console.log('💡 建议: 签名过期，请检查系统时间');
        } else if (apiError.Code === 'AuthFailure.SignatureFailure') {
          console.log('💡 建议: SecretKey 可能不正确');
        }
      }
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
