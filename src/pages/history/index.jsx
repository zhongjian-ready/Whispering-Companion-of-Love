import { Button } from '@nutui/nutui-react-taro';
import { Picker, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import './index.css';

const History = () => {
  const [todayDrink, setTodayDrink] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [weekAverage, setWeekAverage] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [goalRate, setGoalRate] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayTotal, setSelectedDayTotal] = useState(0);
  const [selectedDayPercent, setSelectedDayPercent] = useState(0);
  const [selectedDayRecords, setSelectedDayRecords] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);

  const app = Taro.getApp();

  useDidShow(() => {
    initData();
  });

  const initData = () => {
    const today = formatDate(new Date());
    setSelectedDate(today);
    setDailyGoal(app.globalData.dailyGoal);
    loadData(today);
  };

  const loadData = dateStr => {
    loadTodayData();
    loadStatistics();
    loadSelectedDayData(dateStr);
    loadWeeklyData();
  };

  const loadTodayData = () => {
    setTodayDrink(app.globalData.todayDrink);
  };

  const loadStatistics = () => {
    const allHistory = getAllHistory();
    const weekHistory = getWeekHistory();

    const weekTotal = weekHistory.reduce((sum, day) => sum + day.total, 0);
    const avg =
      weekHistory.length > 0 ? Math.round(weekTotal / weekHistory.length) : 0;
    setWeekAverage(avg);

    const days = allHistory.filter(day => day.total > 0).length;
    setTotalDays(days);

    const completedDays = allHistory.filter(
      day => day.total >= app.globalData.dailyGoal
    ).length;
    const rate =
      allHistory.length > 0
        ? Math.round((completedDays / allHistory.length) * 100)
        : 0;
    setGoalRate(rate);
  };

  const loadSelectedDayData = dateStr => {
    const dayData = getDayData(dateStr);
    const total = dayData.total;
    const percent = Math.min(
      Math.round((total / app.globalData.dailyGoal) * 100),
      100
    );

    setSelectedDayTotal(total);
    setSelectedDayPercent(percent);
    setSelectedDayRecords(dayData.records);
  };

  const loadWeeklyData = () => {
    const weekHistory = getWeekHistory();
    const maxAmount = Math.max(
      ...weekHistory.map(day => day.total),
      app.globalData.dailyGoal
    );

    const data = weekHistory.map(day => ({
      date: day.date,
      amount: day.total,
      label: day.date.slice(5), // MM-DD
      percent: maxAmount > 0 ? (day.total / maxAmount) * 100 : 0,
    }));
    setWeeklyData(data);
  };

  const getAllHistory = () => {
    try {
      const res = Taro.getStorageInfoSync();
      const history = [];

      res.keys.forEach(key => {
        if (key.startsWith('water_') && key !== 'waterData') {
          const dateStr = key.replace('water_', '');
          // 简单的日期格式验证 YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const data = Taro.getStorageSync(key);
            if (data) {
              history.push({
                date: dateStr,
                total: data.total || 0,
                records: data.records || [],
              });
            }
          }
        }
      });

      // 加上今天的数据（如果今天还没存入 storage 的话）
      const today = formatDate(new Date());
      const todayInHistory = history.find(h => h.date === today);
      if (!todayInHistory) {
        history.push({
          date: today,
          total: app.globalData.todayDrink,
          records: app.globalData.drinkRecords,
        });
      } else {
        // 如果今天已经在 history 里（比如刚过零点），确保数据是最新的
        todayInHistory.total = app.globalData.todayDrink;
        todayInHistory.records = app.globalData.drinkRecords;
      }

      return history;
    } catch (e) {
      console.error('获取历史记录失败', e);
      return getWeekHistory(); // 降级方案
    }
  };

  const getWeekHistory = () => {
    const history = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date);
      history.push(getDayData(dateStr));
    }
    return history;
  };

  const getDayData = dateStr => {
    const today = formatDate(new Date());
    if (dateStr === today) {
      return {
        date: dateStr,
        total: app.globalData.todayDrink,
        records: app.globalData.drinkRecords,
      };
    }
    const key = `water_${dateStr}`;
    const data = Taro.getStorageSync(key) || { total: 0, records: [] };
    return {
      date: dateStr,
      ...data,
    };
  };

  const formatDate = date => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onDateChange = e => {
    const date = e.detail.value;
    setSelectedDate(date);
    loadSelectedDayData(date);
  };

  return (
    <View className="container">
      {/* 统计卡片 */}
      <View className="card stats-card">
        <View className="title">饮水统计</View>
        <View className="stats-grid">
          <View className="stat-item">
            <View className="stat-value">{todayDrink}ml</View>
            <View className="stat-label">今日饮水</View>
          </View>
          <View className="stat-item">
            <View className="stat-value">{weekAverage}ml</View>
            <View className="stat-label">本周平均</View>
          </View>
          <View className="stat-item">
            <View className="stat-value">{totalDays}</View>
            <View className="stat-label">坚持天数</View>
          </View>
          <View className="stat-item">
            <View className="stat-value">{goalRate}%</View>
            <View className="stat-label">目标达成率</View>
          </View>
        </View>
      </View>

      {/* 日期选择 */}
      <View className="card">
        <View className="flex-between mb-20">
          <View className="title">历史记录</View>
          <Picker mode="date" value={selectedDate} onChange={onDateChange}>
            <Button size="small" type="default">
              {selectedDate}
            </Button>
          </Picker>
        </View>

        {/* 当日统计 */}
        <View className="day-summary">
          <View className="flex-between">
            <View className="day-total">{selectedDayTotal}ml</View>
            <View
              className={`day-status ${
                selectedDayTotal >= dailyGoal ? 'completed' : 'incomplete'
              }`}
            >
              {selectedDayTotal >= dailyGoal ? '已完成' : '未完成'}
            </View>
          </View>
          <View className="day-progress">
            <View className="progress-bar">
              <View
                className="progress-fill"
                style={{ width: `${selectedDayPercent}%` }}
              ></View>
            </View>
            <View className="progress-text">{selectedDayPercent}%</View>
          </View>
        </View>
      </View>

      {/* 当日详细记录 */}
      {selectedDayRecords.length > 0 ? (
        <View className="card">
          <View className="title">{selectedDate} 详细记录</View>
          <View className="record-list">
            {selectedDayRecords.map((item, index) => (
              <View className="record-item flex-between" key={index}>
                <View className="record-info">
                  <View className="record-amount">{item.amount}ml</View>
                  <View className="record-time text-light">{item.time}</View>
                </View>
                {item.note && <View className="record-note">{item.note}</View>}
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="card empty-state">
          <View className="empty-icon">📊</View>
          <View className="empty-text">{selectedDate} 暂无饮水记录</View>
          <View className="empty-desc">开始记录您的饮水习惯吧！</View>
        </View>
      )}

      {/* 7天趋势图 */}
      <View className="card">
        <View className="title">7天饮水趋势</View>
        <View className="chart-container">
          <View className="chart">
            {weeklyData.map(item => (
              <View
                className="chart-bar"
                key={item.date}
                style={{ height: `${item.percent}%` }}
              >
                <View className="bar-value">{item.amount}</View>
              </View>
            ))}
          </View>
          <View className="chart-labels">
            {weeklyData.map(item => (
              <View className="chart-label" key={item.date}>
                {item.label}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default History;
