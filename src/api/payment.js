import request from '../utils/request';

// 创建支付订单
export const createPaymentOrder = planId => {
  return request('/payment/create', 'POST', { plan_id: planId });
};

// 查询订阅状态
export const getSubscriptionStatus = () => {
  return request('/payment/subscription', 'GET');
};
