import request from '../utils/request';

// 用户登录（发送code到后端换取openid和session_key）
export const login = code => {
  return request('/user/login', 'POST', { code });
};

// 更新用户信息（昵称、头像、手机号code）
export const updateUserInfo = userInfo => {
  // userInfo 包含: user_id, nickname, avatar_url, phone_code (可选)
  return request('/user/info', 'POST', userInfo);
};

// 获取用户信息
export const getUserInfo = userId => {
  return request('/user/info', 'GET', { user_id: userId });
};
