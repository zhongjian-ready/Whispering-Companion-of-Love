import Taro from '@tarojs/taro';
import { Component } from 'react';
import { getUserInfo } from './api/user';
import './app.css';

class App extends Component {
  // 初始化全局数据
  globalData = {
    userInfo: null,
    userId: null,
    openid: null,
    todayDrink: 0,
    dailyGoal: 2000,
    drinkRecords: [],
    reminderSettings: {
      enabled: true,
      interval: 60,
      startTime: '08:00',
      endTime: '22:00',
    },
    quickAmounts: [200, 300, 500, 800],
    userLocation: null,
  };

  componentDidMount() {
    if (process.env.TARO_ENV === 'weapp') {
      if (!Taro.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      } else {
        Taro.cloud.init({
          env: 'prod-7gbcggfq2dae4403', // 你的环境ID
          traceUser: true,
        });
      }
    }
    this.checkLogin();
    this.initData();
  }

  componentDidShow() {}

  componentDidHide() {}

  async checkLogin() {
    try {
      const userId = Taro.getStorageSync('userId');
      const openid = Taro.getStorageSync('openid');

      // 如果有登录信息，验证是否有效
      if (userId && openid) {
        try {
          // 尝试获取用户信息，验证 userId 是否在数据库中存在
          await getUserInfo(userId);

          // 验证成功，保存到全局数据
          this.globalData.userId = userId;
          this.globalData.openid = openid;
        } catch (err) {
          console.error('用户验证失败，可能已被删除:', err);
          // 验证失败（如用户不存在），清除本地缓存
          Taro.removeStorageSync('userId');
          Taro.removeStorageSync('openid');
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
    }
  }

  initData() {
    try {
      const today = this.formatDate(new Date());
      const storedData = Taro.getStorageSync('waterData') || {};

      // 如果是新的一天，重置今日数据
      if (storedData.date !== today) {
        this.globalData.todayDrink = 0;
        this.globalData.drinkRecords = [];
      } else {
        this.globalData.todayDrink = storedData.todayDrink || 0;
        this.globalData.drinkRecords = storedData.drinkRecords || [];
      }

      // 加载设置
      const settings = Taro.getStorageSync('settings');
      if (settings) {
        this.globalData.dailyGoal = settings.dailyGoal || 2000;
        this.globalData.reminderSettings =
          settings.reminderSettings || this.globalData.reminderSettings;
        // 加载快速添加设置
        if (settings.quickAmounts) {
          this.globalData.quickAmounts = settings.quickAmounts;
        }
      }
    } catch (error) {
      console.error('初始化数据失败:', error);
      // 使用默认值
      this.globalData.todayDrink = 0;
      this.globalData.drinkRecords = [];
    }
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  render() {
    return this.props.children;
  }
}

export default App;
