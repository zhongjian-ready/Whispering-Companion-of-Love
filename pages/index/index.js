const app = getApp();

Page({
  data: {
    todayDrink: 0,
    dailyGoal: 2000,
    progressPercent: 0,
    quickAmounts: [200, 300, 500, 800],
    customAmount: '',
    drinkRecords: [],
    reminderEnabled: true,
    reminderText: '每60分钟提醒一次',
    encouragementText: '',
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const globalData = app.globalData;
    const progressPercent = Math.min(
      Math.round((globalData.todayDrink / globalData.dailyGoal) * 100),
      100
    );

    this.setData({
      todayDrink: globalData.todayDrink,
      dailyGoal: globalData.dailyGoal,
      progressPercent: progressPercent,
      drinkRecords: globalData.drinkRecords.slice(-5), // 只显示最近5条记录
      reminderEnabled: globalData.reminderSettings.enabled,
      reminderText: this.getReminderText(),
      encouragementText: this.getEncouragementText(progressPercent),
    });
  },

  addWater(e) {
    const amount = parseInt(e.currentTarget.dataset.amount);
    this.addWaterRecord(amount);
  },

  addCustomWater() {
    const amount = parseInt(this.data.customAmount);
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入有效的毫升数',
        icon: 'none',
      });
      return;
    }

    this.addWaterRecord(amount);
    this.setData({
      customAmount: '',
    });
  },

  addWaterRecord(amount) {
    const now = new Date();
    const time = app.formatTime(now);

    const record = {
      amount: amount,
      time: time,
      timestamp: now.getTime(),
    };

    // 更新全局数据
    app.globalData.todayDrink += amount;
    app.globalData.drinkRecords.unshift(record);

    // 保存数据
    app.saveData();

    // 刷新页面数据
    this.loadData();

    // 显示添加成功提示
    wx.showToast({
      title: `已添加 ${amount}ml 💧`,
      icon: 'none',
      duration: 1500,
    });

    // 检查是否完成目标
    this.checkGoalCompletion();
  },

  deleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.drinkRecords[index];

    wx.showModal({
      title: '确认删除',
      content: `确定要删除这条 ${record.amount}ml 的记录吗？`,
      success: res => {
        if (res.confirm) {
          // 从全局数据中找到并删除对应记录
          const globalIndex = app.globalData.drinkRecords.findIndex(
            item => item.timestamp === record.timestamp
          );

          if (globalIndex !== -1) {
            // 减少今日饮水量
            app.globalData.todayDrink -= record.amount;
            // 删除记录
            app.globalData.drinkRecords.splice(globalIndex, 1);

            // 保存数据
            app.saveData();

            // 刷新页面
            this.loadData();

            wx.showToast({
              title: '删除成功',
              icon: 'success',
            });
          }
        }
      },
    });
  },

  onCustomAmountInput(e) {
    this.setData({
      customAmount: e.detail.value,
    });
  },

  toggleReminder(e) {
    const enabled = e.detail.value;
    app.globalData.reminderSettings.enabled = enabled;
    app.saveSettings();

    this.setData({
      reminderEnabled: enabled,
      reminderText: this.getReminderText(),
    });

    wx.showToast({
      title: enabled ? '提醒已开启' : '提醒已关闭',
      icon: 'none',
    });
  },

  getReminderText() {
    if (!app.globalData.reminderSettings.enabled) {
      return '提醒已关闭';
    }

    const { interval, startTime, endTime } = app.globalData.reminderSettings;
    return `每${interval}分钟提醒 (${startTime}-${endTime})`;
  },

  getEncouragementText(progressPercent) {
    if (progressPercent >= 100) {
      return '恭喜！今日饮水目标已完成！';
    } else if (progressPercent >= 80) {
      return '加油！快要完成今日目标了！';
    } else if (progressPercent >= 50) {
      return '不错哦！已经完成一半啦！';
    } else if (progressPercent >= 25) {
      return '继续加油！保持良好的饮水习惯！';
    } else if (progressPercent > 0) {
      return '今天的第一杯水已经喝了，继续努力！';
    }
    return '';
  },

  checkGoalCompletion() {
    const progressPercent = Math.round(
      (app.globalData.todayDrink / app.globalData.dailyGoal) * 100
    );

    if (progressPercent >= 100 && this.data.progressPercent < 100) {
      setTimeout(() => {
        wx.showModal({
          title: '🎉 恭喜！',
          content: '您已完成今日饮水目标！保持良好的饮水习惯有益健康！',
          showCancel: false,
          confirmText: '太棒了',
        });
      }, 500);
    }
  },
});
