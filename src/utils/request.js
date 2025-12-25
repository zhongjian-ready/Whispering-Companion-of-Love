import Taro from '@tarojs/taro';

// ============================================================================
// 接口请求配置
// ============================================================================

// 1. 后端模式选择
// 'cloud': 使用微信云托管 (WeChat Cloud Container)
// 'http':  使用普通 HTTP/HTTPS 服务器
const BACKEND_MODE = 'cloud'; // <--- 已切换为 'cloud' 模式

// 2. 普通 HTTP 服务器配置 (当 BACKEND_MODE === 'http' 时生效)
// 开发环境 (IDE / npm run dev:weapp)
const DEV_HOST = process.env.LOCAL_API_HOST || 'http://127.0.0.1:8080';
// 生产环境 (体验版 / 正式版)
// 注意：正式上线必须是 HTTPS 且在微信后台配置了合法域名
// 如果是真机调试本地服务，填局域网IP (如 http://192.168.x.x:8080) 并打开手机"调试模式"
const PROD_HOST = 'https://your-production-domain.com';

// 3. 微信云托管配置 (当 BACKEND_MODE === 'cloud' 时生效)
const CLOUD_ENV_ID = 'prod-7gbcggfq2dae4403'; // 替换为你的云托管环境ID
const SERVICE_NAME = 'golang-o5p0'; // 替换为你的服务名称

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    // 获取当前小程序环境版本 (develop: 开发版, trial: 体验版, release: 正式版)
    const accountInfo = Taro.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram
      ? accountInfo.miniProgram.envVersion
      : 'develop';

    let useCloud = BACKEND_MODE === 'cloud';

    // 兼容之前的环境变量逻辑
    if (process.env.USE_CLOUD_CONTAINER === 'true') {
      useCloud = true;
    }

    console.log(`[API] ${url} | Env:${envVersion} | Cloud:${useCloud}`);

    if (useCloud) {
      if (!Taro.cloud) {
        console.error('[API] Taro.cloud is not available');
        reject(new Error('Taro.cloud is not available'));
        return;
      }
      console.log('[API] Calling Taro.cloud.callContainer');
      // 使用微信云托管调用
      Taro.cloud.callContainer({
        config: {
          env: CLOUD_ENV_ID,
        },
        path: url.startsWith('/') ? url : `/${url}`, // 填入业务自定义路径
        header: {
          'X-WX-SERVICE': SERVICE_NAME,
          'content-type': 'application/json',
        },
        method: method,
        data: data,
        success(res) {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail(err) {
          reject(err);
        },
      });
    } else {
      console.log('[API] Calling Taro.request (HTTP)');

      let baseUrl = DEV_HOST;
      if (envVersion === 'trial' || envVersion === 'release') {
        baseUrl = PROD_HOST;
      }

      const fullUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;

      console.log(`[HTTP Request] ${method} ${fullUrl}`, data);

      Taro.request({
        url: fullUrl,
        method: method,
        data: data,
        header: {
          'content-type': 'application/json',
        },
        success(res) {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(res);
          }
        },
        fail(err) {
          console.error('[Local Request Fail]', err);
          reject(err);
        },
      });
    }
  });
};

export default request;
