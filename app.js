App({
  globalData: {
    dailyGoal: 1400, // 每日饮水目标(毫升)
    todayDrink: 0, // 今日已喝水量
    drinkRecords: [], // 喝水记录
    reminderSettings: {
      enabled: true,
      interval: 60, // 提醒间隔(分钟)
      startTime: '08:00',
      endTime: '22:00',
    },
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        // env: 'my-env-id',
        traceUser: true,
      });
    }

    // 初始化数据
    this.initData();
    // 设置提醒
    this.setReminder();

    // 检查版本兼容性
    const systemInfo = wx.getSystemInfoSync();
    console.log('系统信息:', systemInfo);
  },

  initData() {
    try {
      const today = this.formatDate(new Date());
      const storedData = wx.getStorageSync('waterData') || {};

      // 如果是新的一天，重置今日数据
      if (storedData.date !== today) {
        this.globalData.todayDrink = 0;
        this.globalData.drinkRecords = [];
      } else {
        this.globalData.todayDrink = storedData.todayDrink || 0;
        this.globalData.drinkRecords = storedData.drinkRecords || [];
      }

      // 加载设置
      const settings = wx.getStorageSync('settings');
      if (settings) {
        this.globalData.dailyGoal = settings.dailyGoal || 1400;
        this.globalData.reminderSettings =
          settings.reminderSettings || this.globalData.reminderSettings;
      }
    } catch (error) {
      console.error('初始化数据失败:', error);
      // 使用默认值
      this.globalData.todayDrink = 0;
      this.globalData.drinkRecords = [];
      this.globalData.dailyGoal = 1400;
    }
  },

  setReminder() {
    if (!this.globalData.reminderSettings.enabled) return;

    // 设置定时提醒
    const interval = this.globalData.reminderSettings.interval * 60 * 1000;
    setInterval(() => {
      const now = new Date();
      const currentTime = this.formatTime(now);
      const { startTime, endTime } = this.globalData.reminderSettings;

      if (currentTime >= startTime && currentTime <= endTime) {
        wx.showToast({
          title: '该喝水啦！💧',
          icon: 'none',
          duration: 3000,
        });
      }
    }, interval);
  },

  saveData() {
    const today = this.formatDate(new Date());
    const data = {
      date: today,
      todayDrink: this.globalData.todayDrink,
      drinkRecords: this.globalData.drinkRecords,
    };
    wx.setStorageSync('waterData', data);
  },

  saveSettings() {
    const settings = {
      dailyGoal: this.globalData.dailyGoal,
      reminderSettings: this.globalData.reminderSettings,
    };
    wx.setStorageSync('settings', settings);
  },

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },
});
