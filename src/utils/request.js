import Taro from '@tarojs/taro';

// 微信云托管配置
const CLOUD_ENV_ID = 'prod-7gbcggfq2dae4403'; // 替换为你的云托管环境ID
const SERVICE_NAME = 'golang-o5p0'; // 替换为你的服务名称

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    // 获取当前小程序环境版本 (develop: 开发版, trial: 体验版, release: 正式版)
    const accountInfo = Taro.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram
      ? accountInfo.miniProgram.envVersion
      : 'develop';

    let useCloud = false;

    if (envVersion === 'trial' || envVersion === 'release') {
      // 策略1：体验版和正式版 -> 强制使用云托管
      useCloud = true;
    } else {
      // 策略2：开发版 (IDE) -> 根据构建命令的配置决定
      // npm run dev:weapp -> USE_CLOUD_CONTAINER="false" -> 使用本地服务
      // npm run build:weapp -> USE_CLOUD_CONTAINER="true" -> 使用云托管 (方便在IDE测试云服务)
      const envVal = process.env.USE_CLOUD_CONTAINER;
      useCloud = envVal === 'true' || envVal === true;
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
      console.log('[API] Calling Taro.request (Local)');
      // 本地开发环境，使用普通 HTTP 请求
      // 注意：需要在微信开发者工具中勾选 "不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"
      const baseUrl = process.env.LOCAL_API_HOST || 'http://127.0.0.1:8080';
      const fullUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;

      console.log(`[Local Request] ${method} ${fullUrl}`, data);

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
