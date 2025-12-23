// const BASE_URL = 'https://mock.apifox.cn/m1/123456-0-default';
// const BASE_URL = 'http://localhost:8080'; // 本地环境
// const BASE_URL = 'https://your-aliyun-server.com'; // 阿里云生产环境

// 微信云托管配置
const CLOUD_ENV_ID = 'prod-7gbcggfq2dae4403'; // 替换为你的云托管环境ID
const SERVICE_NAME = 'golang-o5p0-009'; // 替换为你的服务名称

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    // 使用微信云托管调用
    wx.cloud.callContainer({
      config: {
        env: CLOUD_ENV_ID,
      },
      path: url, // 填入业务自定义路径
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

const getSettings = (userId = 1) => {
  return request('/settings', 'GET', { user_id: userId });
};

module.exports = {
  getSettings,
};
