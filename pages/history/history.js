const app = getApp();

Page({
  data: {
    todayDrink: 0,
    dailyGoal: 1400,
    weekAverage: 0,
    totalDays: 0,
    goalRate: 0,
    selectedDate: '',
    selectedDayTotal: 0,
    selectedDayPercent: 0,
    selectedDayRecords: [],
    weeklyData: [],
    achievements: [],
  },

  onLoad() {
    this.initData();
  },

  onShow() {
    this.loadData();
  },

  initData() {
    const today = app.formatDate(new Date());
    this.setData({
      selectedDate: today,
      dailyGoal: app.globalData.dailyGoal,
    });
    this.loadData();
  },

  loadData() {
    this.loadTodayData();
    this.loadStatistics();
    this.loadSelectedDayData();
    this.loadWeeklyData();
    this.loadAchievements();
  },

  loadTodayData() {
    this.setData({
      todayDrink: app.globalData.todayDrink,
    });
  },

  loadStatistics() {
    const allHistory = this.getAllHistory();
    const weekHistory = this.getWeekHistory();

    // 计算本周平均
    const weekTotal = weekHistory.reduce((sum, day) => sum + day.total, 0);
    const weekAverage =
      weekHistory.length > 0 ? Math.round(weekTotal / weekHistory.length) : 0;

    // 计算坚持天数（有饮水记录的天数）
    const totalDays = allHistory.filter(day => day.total > 0).length;

    // 计算目标达成率
    const completedDays = allHistory.filter(
      day => day.total >= this.data.dailyGoal
    ).length;
    const goalRate =
      allHistory.length > 0
        ? Math.round((completedDays / allHistory.length) * 100)
        : 0;

    this.setData({
      weekAverage,
      totalDays,
      goalRate,
    });
  },

  loadSelectedDayData() {
    const selectedDate = this.data.selectedDate;
    const dayData = this.getDayData(selectedDate);

    const selectedDayTotal = dayData.total;
    const selectedDayPercent = Math.min(
      Math.round((selectedDayTotal / this.data.dailyGoal) * 100),
      100
    );

    this.setData({
      selectedDayTotal,
      selectedDayPercent,
      selectedDayRecords: dayData.records,
    });
  },

  loadWeeklyData() {
    const weekHistory = this.getWeekHistory();
    const maxAmount = Math.max(
      ...weekHistory.map(day => day.total),
      this.data.dailyGoal
    );

    const weeklyData = weekHistory.map(day => {
      const date = new Date(day.date);
      const label = this.formatDayLabel(date);
      const percent = maxAmount > 0 ? (day.total / maxAmount) * 100 : 0;

      return {
        date: day.date,
        label,
        amount: day.total,
        percent: Math.max(percent, 5), // 最小高度5%
      };
    });

    this.setData({
      weeklyData,
    });
  },

  loadAchievements() {
    const allHistory = this.getAllHistory();
    const achievements = [];

    // 检查各种成就
    const totalDays = allHistory.filter(day => day.total > 0).length;
    const consecutiveDays = this.getConsecutiveDays();
    const completedDays = allHistory.filter(
      day => day.total >= this.data.dailyGoal
    ).length;

    if (totalDays >= 1) {
      achievements.push({
        id: 'first_day',
        icon: '🎯',
        name: '初来乍到',
        description: '记录第一天的饮水量',
      });
    }

    if (totalDays >= 7) {
      achievements.push({
        id: 'week_warrior',
        icon: '📅',
        name: '一周达人',
        description: '坚持记录一周',
      });
    }

    if (consecutiveDays >= 3) {
      achievements.push({
        id: 'consistent',
        icon: '🔥',
        name: '坚持不懈',
        description: '连续3天记录饮水',
      });
    }

    if (completedDays >= 5) {
      achievements.push({
        id: 'goal_master',
        icon: '🏆',
        name: '目标达人',
        description: '完成5天饮水目标',
      });
    }

    this.setData({
      achievements,
    });
  },

  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value,
    });
    this.loadSelectedDayData();
  },

  getAllHistory() {
    // 模拟历史数据，实际应用中应该从本地存储读取
    const history = wx.getStorageSync('waterHistory') || [];
    return history;
  },

  getWeekHistory() {
    const today = new Date();
    const weekHistory = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = app.formatDate(date);
      const dayData = this.getDayData(dateStr);

      weekHistory.push({
        date: dateStr,
        total: dayData.total,
        records: dayData.records,
      });
    }

    return weekHistory;
  },

  getDayData(dateStr) {
    if (dateStr === app.formatDate(new Date())) {
      // 今天的数据从全局获取
      return {
        total: app.globalData.todayDrink,
        records: app.globalData.drinkRecords,
      };
    }

    // 其他日期从本地存储获取
    const historyKey = `water_${dateStr}`;
    const data = wx.getStorageSync(historyKey);

    if (data) {
      return {
        total: data.todayDrink || 0,
        records: data.drinkRecords || [],
      };
    }

    return {
      total: 0,
      records: [],
    };
  },

  getConsecutiveDays() {
    const today = new Date();
    let consecutiveDays = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = app.formatDate(date);
      const dayData = this.getDayData(dateStr);

      if (dayData.total >= this.data.dailyGoal) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    return consecutiveDays;
  },

  formatDayLabel(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return '今天';
    } else if (this.isSameDay(date, yesterday)) {
      return '昨天';
    } else {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      return `周${weekdays[date.getDay()]}`;
    }
  },

  isSameDay(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  },
});
