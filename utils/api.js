// const BASE_URL = 'https://mock.apifox.cn/m1/123456-0-default';
const BASE_URL = 'http://localhost:8080'; // 本地环境
// const BASE_URL = 'https://your-aliyun-server.com'; // 阿里云生产环境

const request = (url, method = 'GET', data = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
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
