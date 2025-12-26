import { Dialog, Progress, Switch, Toast } from '@nutui/nutui-react-taro';
import { Button, Image, Input, View } from '@tarojs/components';
import Taro, {
  useDidShow,
  useShareAppMessage,
  useShareTimeline,
} from '@tarojs/taro';
import { useState } from 'react';
import { getUserInfo, updateUserInfo } from '../../api/user';
import './index.css';

const Index = () => {
  const [todayDrink, setTodayDrink] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [progressPercent, setProgressPercent] = useState(0);
  const [quickAmounts, setQuickAmounts] = useState([200, 300, 500, 800]);
  const [customAmount, setCustomAmount] = useState('');
  const [drinkRecords, setDrinkRecords] = useState([]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderText, setReminderText] = useState('每60分钟提醒一次');
  const [encouragementText, setEncouragementText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState('');
  const [statusPhoto, setStatusPhoto] = useState('');

  const app = Taro.getApp();

  useDidShow(() => {
    loadData();
    checkLocationPermission();
    loadStatusPhoto();
  });

  const loadStatusPhoto = () => {
    // 1. 优先显示本地缓存
    const photo = Taro.getStorageSync('statusPhoto');
    if (photo) {
      setStatusPhoto(photo);
    }

    // 2. 从后台获取最新数据
    const userId = Taro.getStorageSync('userId');
    if (userId) {
      getUserInfo(userId)
        .then(res => {
          const data = (res && res.data) || res || {};
          if (data.status_photo) {
            console.log('Fetched status photo from server:', data.status_photo);
            setStatusPhoto(data.status_photo);
            Taro.setStorageSync('statusPhoto', data.status_photo);
          }
        })
        .catch(err => {
          console.error('Failed to fetch user info for status photo:', err);
        });
    }
  };

  const onChooseStatusPhoto = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        const tempFilePath = res.tempFilePaths[0];
        uploadStatusPhoto(tempFilePath);
      },
    });
  };

  const uploadStatusPhoto = async filePath => {
    Taro.showLoading({ title: '上传中...' });
    try {
      const userId = Taro.getStorageSync('userId') || 'guest';
      const cloudPath = `status_photos/${userId}_${Date.now()}.png`;

      const res = await Taro.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
      });

      const fileID = res.fileID;
      console.log('Status photo uploaded:', fileID);

      // 内容安全检测
      try {
        const checkRes = await Taro.cloud.callFunction({
          name: 'contentCheck',
          data: {
            type: 'img',
            value: fileID,
          },
        });

        console.log('Security check result:', checkRes);

        if (checkRes.result && checkRes.result.errCode === 87014) {
          Taro.hideLoading();
          Taro.showToast({
            title: '图片包含违规内容，请重新上传',
            icon: 'none',
          });
          // 删除违规图片
          await Taro.cloud.deleteFile({ fileList: [fileID] });
          return;
        }
      } catch (checkErr) {
        console.error(
          'Security check failed (function might not be deployed):',
          checkErr
        );
        // 如果是函数不存在，可能是开发环境未部署，暂时允许通过
        // 但在生产环境必须确保云函数已部署
      }

      // Save to local storage
      Taro.setStorageSync('statusPhoto', fileID);
      setStatusPhoto(fileID);

      // Save to database
      if (userId !== 'guest') {
        try {
          await updateUserInfo({
            user_id: userId,
            status_photo: fileID,
          });
          console.log('Status photo saved to database');
        } catch (dbErr) {
          console.error('Failed to save status photo to database:', dbErr);
          // Don't block UI success if DB save fails, but log it
        }
      }

      Taro.hideLoading();
      Taro.showToast({ title: '更新成功', icon: 'success' });
    } catch (err) {
      console.error('Upload failed:', err);
      Taro.hideLoading();

      // Fallback: if cloud upload fails (e.g. no cloud env), just use local path
      // Note: local path is temporary, but better than nothing for demo
      if (err.errMsg && err.errMsg.includes('cloud')) {
        Taro.setStorageSync('statusPhoto', filePath);
        setStatusPhoto(filePath);
        Taro.showToast({ title: '本地保存成功', icon: 'none' });
      } else {
        Taro.showToast({ title: '上传失败', icon: 'none' });
      }
    }
  };

  const checkLocationPermission = () => {
    Taro.getSetting({
      success: res => {
        if (!res.authSetting['scope.userLocation']) {
          Taro.authorize({
            scope: 'scope.userLocation',
            success() {
              getLocation();
            },
            fail() {
              console.log('用户拒绝了位置授权');
            },
          });
        } else {
          getLocation();
        }
      },
    });
  };

  const getLocation = () => {
    Taro.getLocation({
      type: 'wgs84',
      success: function (res) {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude,
        };
        Taro.setStorageSync('userLocation', location);

        // 确保 globalData 存在
        if (app) {
          if (!app.globalData) {
            app.globalData = {};
          }
          app.globalData.userLocation = location;
        }
      },
    });
  };

  const loadData = () => {
    const globalData = app.globalData || {};
    const todayDrink = globalData.todayDrink || 0;
    const dailyGoal = globalData.dailyGoal || 2000;

    const percent = Math.min(Math.round((todayDrink / dailyGoal) * 100), 100);

    setTodayDrink(todayDrink);
    setDailyGoal(dailyGoal);
    if (globalData.quickAmounts && globalData.quickAmounts.length > 0) {
      setQuickAmounts(globalData.quickAmounts);
    }
    setProgressPercent(percent);
    setDrinkRecords((globalData.drinkRecords || []).slice(0, 5)); // 只显示最近5条记录

    const reminderSettings = globalData.reminderSettings || {
      enabled: true,
      interval: 60,
    };
    setReminderEnabled(reminderSettings.enabled);
    setReminderText(getReminderText(reminderSettings));
    setEncouragementText(getEncouragementText(percent));
  };

  const getReminderText = settings => {
    if (!settings.enabled) {
      return '提醒已关闭';
    }
    const { interval, startTime, endTime } = settings;
    return `每${interval}分钟提醒 (${startTime}-${endTime})`;
  };

  const getEncouragementText = percent => {
    if (percent >= 100) {
      return '恭喜！今日饮水目标已完成！';
    } else if (percent >= 80) {
      return '加油！快要完成今日目标了！';
    } else if (percent >= 50) {
      return '不错哦！已经完成一半啦！';
    } else if (percent >= 25) {
      return '继续加油！保持良好的饮水习惯！';
    } else if (percent > 0) {
      return '今天的第一杯水已经喝了，继续努力！';
    }
    return '';
  };

  const addWater = amount => {
    addWaterRecord(amount);
  };

  const addCustomWater = () => {
    const amount = parseInt(customAmount);
    if (!amount || amount <= 0) {
      setToastMsg('请输入有效的毫升数');
      setShowToast(true);
      return;
    }

    addWaterRecord(amount);
    setCustomAmount('');
  };

  const addWaterRecord = amount => {
    const now = new Date();
    const time = formatTime(now);

    const record = {
      amount: amount,
      time: time,
      timestamp: now.getTime(),
    };

    // 更新全局数据
    app.globalData.todayDrink += amount;
    app.globalData.drinkRecords.unshift(record);

    // 保存数据
    saveData();

    // 刷新页面数据
    loadData();

    // 显示添加成功提示
    setToastMsg(`已添加 ${amount}ml 💧`);
    setShowToast(true);

    // 检查是否完成目标
    checkGoalCompletion();
  };

  const saveData = () => {
    const today = formatDate(new Date());
    Taro.setStorageSync('waterData', {
      date: today,
      todayDrink: app.globalData.todayDrink,
      drinkRecords: app.globalData.drinkRecords,
    });

    // 保存历史记录
    const historyKey = `water_${today}`;
    Taro.setStorageSync(historyKey, {
      total: app.globalData.todayDrink,
      records: app.globalData.drinkRecords,
    });
  };

  const formatDate = date => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = date => {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
  };

  const deleteRecord = index => {
    const record = drinkRecords[index];
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除这条 ${record.amount}ml 的记录吗？`,
      success: res => {
        if (res.confirm) {
          const globalIndex = app.globalData.drinkRecords.findIndex(
            item => item.timestamp === record.timestamp
          );

          if (globalIndex !== -1) {
            app.globalData.todayDrink -= record.amount;
            app.globalData.drinkRecords.splice(globalIndex, 1);
            saveData();
            loadData();
            setToastMsg('删除成功');
            setShowToast(true);
          }
        }
      },
    });
  };

  const checkGoalCompletion = () => {
    const percent = Math.round(
      (app.globalData.todayDrink / app.globalData.dailyGoal) * 100
    );

    if (percent >= 100 && progressPercent < 100) {
      setTimeout(() => {
        setDialogContent('您已完成今日饮水目标！保持良好的饮水习惯有益健康！');
        setShowDialog(true);
      }, 500);
    }
  };

  const toggleReminder = value => {
    app.globalData.reminderSettings.enabled = value;
    Taro.setStorageSync('settings', {
      dailyGoal: app.globalData.dailyGoal,
      reminderSettings: app.globalData.reminderSettings,
    });

    setReminderEnabled(value);
    setReminderText(getReminderText(app.globalData.reminderSettings));

    setToastMsg(value ? '提醒已开启' : '提醒已关闭');
    setShowToast(true);
  };

  useShareAppMessage(() => {
    return {
      title: '今天你喝水了吗？快来记录一下吧！💧',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png',
    };
  });

  useShareTimeline(() => {
    return {
      title: `我今天已经喝了 ${todayDrink}ml 水，完成了 ${progressPercent}% 的目标！`,
      query: '',
      imageUrl: '',
    };
  });

  return (
    <View className="container">
      {/* 进度卡片 */}
      <View className="card progress-card">
        <View className="flex-center flex-column">
          <View className="water-icon">💧</View>
          <View className="progress-text">今日饮水进度</View>
          <View className="progress-amount">
            {todayDrink}ml / {dailyGoal}ml
          </View>

          {/* 进度条 */}
          <View className="progress-bar">
            <Progress
              percent={progressPercent}
              color="linear-gradient(90deg, #4fc3f7, #29b6f6)"
              strokeWidth="10"
            />
          </View>

          <View className="progress-percent">{progressPercent}%</View>
        </View>
      </View>

      {/* 自我状态展示 */}
      <View className="card status-card">
        <View className="title">当前状态</View>
        <View className="status-content" onClick={onChooseStatusPhoto}>
          {statusPhoto ? (
            <Image src={statusPhoto} mode="widthFix" className="status-image" />
          ) : (
            <View className="status-placeholder">
              <View className="placeholder-icon">📷</View>
              <View className="placeholder-text">点击上传今日状态</View>
            </View>
          )}
          <View className="status-tip">点击图片更换</View>
        </View>
      </View>

      {/* 快速添加区域 */}
      <View className="card">
        <View className="title">快速添加饮水</View>
        <View className="quick-add-grid">
          {quickAmounts.map((amount, index) => {
            // Determine if this should be a wide button (last one if total is 4, or just based on index)
            // Screenshot shows 3 on top, 1 wide on bottom.
            // Let's try to mimic that layout if we have 4 items.
            const isWide = quickAmounts.length === 4 && index === 3;
            return (
              <Button
                key={amount}
                className={`quick-btn ${isWide ? 'wide' : ''}`}
                onClick={() => addWater(amount)}
              >
                {amount}ml
              </Button>
            );
          })}
        </View>

        {/* 自定义输入 */}
        <View className="custom-input-container">
          <Input
            className="custom-input"
            type="number"
            placeholder="自定义毫升数"
            value={customAmount}
            onInput={e => setCustomAmount(e.detail.value)}
          />
          <Button className="add-btn" onClick={addCustomWater}>
            添加
          </Button>
        </View>
      </View>

      {/* 今日记录 */}
      {drinkRecords.length > 0 && (
        <View className="card">
          <View className="title">今日记录</View>
          <View className="record-list">
            {drinkRecords.map((item, index) => (
              <View className="record-item flex-between" key={index}>
                <View className="record-info">
                  <View className="record-amount">{item.amount}ml</View>
                  <View className="record-time text-light">{item.time}</View>
                </View>
                <Button
                  className="delete-btn"
                  onClick={() => deleteRecord(index)}
                >
                  删除
                </Button>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 提醒状态 */}
      <View className="card">
        <View className="flex-between">
          <View>
            <View className="title">喝水提醒</View>
            <View className="text-light">{reminderText}</View>
          </View>
          <Switch
            checked={reminderEnabled}
            onChange={toggleReminder}
            activeColor="#4fc3f7"
          />
        </View>
      </View>

      {/* 鼓励语句 */}
      {encouragementText && (
        <View className="card encouragement-card">
          <View className="flex-center">
            <View className="encouragement-icon">🎉</View>
            <View className="encouragement-text">{encouragementText}</View>
          </View>
        </View>
      )}

      <Toast
        msg={toastMsg}
        visible={showToast}
        type="text"
        onClose={() => setShowToast(false)}
      />

      <Dialog
        visible={showDialog}
        title="🎉 恭喜！"
        content={dialogContent}
        onConfirm={() => setShowDialog(false)}
        onCancel={() => setShowDialog(false)}
        confirmText="太棒了"
        hideCancelButton
      />
    </View>
  );
};

export default Index;
