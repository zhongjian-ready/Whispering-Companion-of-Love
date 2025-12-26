import { Button } from '@nutui/nutui-react-taro';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { createPaymentOrder, getSubscriptionStatus } from '../../api/payment';
import './index.css';

const VipPage = () => {
  const [isVip, setIsVip] = useState(false);
  const [expireDate, setExpireDate] = useState('');
  const [loading, setLoading] = useState(false);

  useDidShow(() => {
    checkStatus();
  });

  const checkStatus = async () => {
    try {
      const res = await getSubscriptionStatus();
      if (res && res.is_vip) {
        setIsVip(true);
        setExpireDate(res.expire_date);
      }
    } catch (err) {
      console.error('Failed to check subscription:', err);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. 创建订单
      const orderRes = await createPaymentOrder('monthly_plan');

      // 2. 调起支付
      const { timeStamp, nonceStr, package: pkg, signType, paySign } = orderRes;

      await Taro.requestPayment({
        timeStamp,
        nonceStr,
        package: pkg,
        signType,
        paySign,
      });

      // 3. 支付成功
      Taro.showToast({ title: '开通成功', icon: 'success' });
      checkStatus();
    } catch (err) {
      console.error('Payment failed:', err);
      if (err.errMsg && err.errMsg.includes('cancel')) {
        Taro.showToast({ title: '支付已取消', icon: 'none' });
      } else {
        Taro.showToast({ title: '支付失败', icon: 'none' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="vip-container">
      <View className="vip-card">
        <View className="vip-header">
          <Text className="vip-title">VIP 会员</Text>
          <Text className="vip-status">{isVip ? '已开通' : '未开通'}</Text>
        </View>
        <View className="vip-desc">
          {isVip
            ? `您的会员将于 ${expireDate} 到期`
            : '开通会员，解锁更多高级功能'}
        </View>
      </View>

      <View className="plan-section">
        <View className="section-title">订阅方案</View>
        <View className="plan-item active">
          <View className="plan-info">
            <Text className="plan-name">月度会员</Text>
            <View className="plan-price">
              ¥9.9 <Text>/月</Text>
            </View>
          </View>
          <View className="radio-check">✅</View>
        </View>

        <View className="benefits-list">
          <View className="benefit-item">
            <Text className="check-icon">✓</Text> 无限次状态照片上传
          </View>
          <View className="benefit-item">
            <Text className="check-icon">✓</Text> 专属饮水提醒音效
          </View>
          <View className="benefit-item">
            <Text className="check-icon">✓</Text> 更多数据统计图表
          </View>
        </View>

        <Button
          className="pay-btn"
          block
          loading={loading}
          onClick={handleSubscribe}
        >
          {isVip ? '续费会员' : '立即开通'}
        </Button>
      </View>
    </View>
  );
};

export default VipPage;
