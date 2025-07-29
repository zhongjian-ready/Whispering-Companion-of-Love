const app = getApp();

Page({
  data: {
    dailyGoal: 2000,
    reminderEnabled: true,
    reminderInterval: 60,
    startTime: '08:00',
    endTime: '22:00',
    intervalOptions: [
      { value: 30, label: '30分钟' },
      { value: 45, label: '45分钟' },
      { value: 60, label: '1小时' },
      { value: 90, label: '1.5小时' },
      { value: 120, label: '2小时' },
    ],
    intervalIndex: 2,
    quickAmountOptions: [
      { value: 100, active: false },
      { value: 200, active: true },
      { value: 250, active: false },
      { value: 300, active: true },
      { value: 400, active: false },
      { value: 500, active: true },
      { value: 600, active: false },
      { value: 800, active: true },
    ],
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const globalData = app.globalData;
    const { reminderSettings } = globalData;

    // 找到当前间隔对应的索引
    const intervalIndex = this.data.intervalOptions.findIndex(
      option => option.value === reminderSettings.interval
    );

    // 加载快速添加金额的活跃状态
    const quickAmounts = app.globalData.quickAmounts || [200, 300, 500, 800];
    const quickAmountOptions = this.data.quickAmountOptions.map(option => ({
      ...option,
      active: quickAmounts.includes(option.value),
    }));

    this.setData({
      dailyGoal: globalData.dailyGoal,
      reminderEnabled: reminderSettings.enabled,
      reminderInterval: reminderSettings.interval,
      startTime: reminderSettings.startTime,
      endTime: reminderSettings.endTime,
      intervalIndex: intervalIndex >= 0 ? intervalIndex : 2,
      quickAmountOptions,
    });
  },

  adjustGoal(e) {
    const delta = parseInt(e.currentTarget.dataset.delta);
    const newGoal = Math.max(500, Math.min(5000, this.data.dailyGoal + delta));

    this.setData({
      dailyGoal: newGoal,
    });

    // 更新全局数据
    app.globalData.dailyGoal = newGoal;
    app.saveSettings();

    wx.showToast({
      title: `目标已设为 ${newGoal}ml`,
      icon: 'none',
      duration: 1500,
    });
  },

  toggleReminder(e) {
    const enabled = e.detail.value;

    this.setData({
      reminderEnabled: enabled,
    });

    // 更新全局数据
    app.globalData.reminderSettings.enabled = enabled;
    app.saveSettings();

    wx.showToast({
      title: enabled ? '提醒已开启' : '提醒已关闭',
      icon: 'none',
    });
  },

  onIntervalChange(e) {
    const index = parseInt(e.detail.value);
    const interval = this.data.intervalOptions[index].value;

    this.setData({
      intervalIndex: index,
      reminderInterval: interval,
    });

    // 更新全局数据
    app.globalData.reminderSettings.interval = interval;
    app.saveSettings();

    wx.showToast({
      title: `提醒间隔已设为 ${this.data.intervalOptions[index].label}`,
      icon: 'none',
    });
  },

  onStartTimeChange(e) {
    const startTime = e.detail.value;

    this.setData({
      startTime,
    });

    // 更新全局数据
    app.globalData.reminderSettings.startTime = startTime;
    app.saveSettings();
  },

  onEndTimeChange(e) {
    const endTime = e.detail.value;

    this.setData({
      endTime,
    });

    // 更新全局数据
    app.globalData.reminderSettings.endTime = endTime;
    app.saveSettings();
  },

  toggleQuickAmount(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    const quickAmountOptions = this.data.quickAmountOptions.map(option => {
      if (option.value === value) {
        return { ...option, active: !option.active };
      }
      return option;
    });

    this.setData({
      quickAmountOptions,
    });

    // 更新全局快速添加金额
    const activeAmounts = quickAmountOptions
      .filter(option => option.active)
      .map(option => option.value);

    app.globalData.quickAmounts = activeAmounts;
    app.saveSettings();

    wx.showToast({
      title: quickAmountOptions.find(o => o.value === value).active
        ? `已添加 ${value}ml`
        : `已移除 ${value}ml`,
      icon: 'none',
    });
  },

  exportData() {
    wx.showLoading({
      title: '导出中...',
    });

    setTimeout(() => {
      wx.hideLoading();

      // 获取所有数据
      const data = {
        dailyGoal: app.globalData.dailyGoal,
        todayDrink: app.globalData.todayDrink,
        drinkRecords: app.globalData.drinkRecords,
        reminderSettings: app.globalData.reminderSettings,
        exportDate: new Date().toISOString(),
      };

      // 模拟导出功能
      wx.showModal({
        title: '导出成功',
        content: '数据已导出，您可以将数据保存到相册或分享给朋友。',
        showCancel: false,
        confirmText: '知道了',
      });
    }, 1000);
  },

  clearData() {
    wx.showModal({
      title: '确认清空',
      content: '此操作将删除所有饮水记录，且无法恢复。确定要继续吗？',
      confirmColor: '#f44336',
      success: res => {
        if (res.confirm) {
          // 清空数据
          app.globalData.todayDrink = 0;
          app.globalData.drinkRecords = [];

          // 清空本地存储
          wx.removeStorageSync('waterData');
          wx.removeStorageSync('waterHistory');

          wx.showToast({
            title: '数据已清空',
            icon: 'success',
          });
        }
      },
    });
  },

  contactUs() {
    wx.showModal({
      title: '联系我们',
      content:
        '如果您有任何建议或问题，欢迎通过以下方式联系我们：\n\n邮箱：feedback@waterreminder.com\n微信：WaterHelper2024',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
