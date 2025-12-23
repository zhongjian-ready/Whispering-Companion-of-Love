import Taro from '@tarojs/taro';

// 微信云托管配置
const CLOUD_ENV_ID = 'prod-7gbcggfq2dae4403'; // 替换为你的云托管环境ID
const SERVICE_NAME = 'golang-o5p0'; // 替换为你的服务名称

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
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
  });
};

export const getSettings = (userId = 1) => {
  return request('/settings', 'GET', { user_id: userId });
};

export const updateSettings = settings => {
  return request('/settings', 'POST', settings);
};
