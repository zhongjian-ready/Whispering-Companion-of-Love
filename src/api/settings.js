import request from '../utils/request';

export const getSettings = userId => {
  return request('/settings', 'GET', { user_id: userId });
};

export const updateSettings = settings => {
  return request('/settings', 'POST', settings);
};
