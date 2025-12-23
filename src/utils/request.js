import Taro from '@tarojs/taro';

// 微信云托管配置
const CLOUD_ENV_ID = 'prod-7gbcggfq2dae4403'; // 替换为你的云托管环境ID
const SERVICE_NAME = 'golang-o5p0'; // 替换为你的服务名称

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    // 判断是否使用云托管 (生产环境)
    const useCloud = process.env.USE_CLOUD_CONTAINER === 'true';
    console.log(
      `[API] Request: ${url}, Method: ${method}, USE_CLOUD_CONTAINER: ${process.env.USE_CLOUD_CONTAINER}`
    );

    if (useCloud) {
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
