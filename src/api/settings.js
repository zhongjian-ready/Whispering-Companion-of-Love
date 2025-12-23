import request from '../utils/request';

export const getSettings = (userId = 1) => {
  return request('/settings', 'GET', { user_id: userId });
};

export const updateSettings = settings => {
  return request('/settings', 'POST', settings);
};
