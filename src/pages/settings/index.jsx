import { Button, Switch, Toast } from '@nutui/nutui-react-taro';
import {
  Image,
  Input,
  Picker,
  Button as TaroButton,
  View,
} from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { getSettings, updateSettings } from '../../api/settings';
import { getUserInfo, login, updateUserInfo } from '../../api/user';
import './index.css';

const Settings = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderInterval, setReminderInterval] = useState(60);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('22:00');
  const [intervalIndex, setIntervalIndex] = useState(2);
  const [quickAmountOptions, setQuickAmountOptions] = useState([
    { value: 100, active: false },
    { value: 200, active: true },
    { value: 250, active: false },
    { value: 300, active: true },
    { value: 400, active: false },
    { value: 500, active: true },
    { value: 600, active: false },
    { value: 800, active: true },
  ]);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // 登录相关状态
  const [loginAvatar, setLoginAvatar] = useState('');
  const [loginNickname, setLoginNickname] = useState('');

  const intervalOptions = [
    { value: 30, label: '30分钟' },
    { value: 45, label: '45分钟' },
    { value: 60, label: '1小时' },
    { value: 90, label: '1.5小时' },
    { value: 120, label: '2小时' },
  ];

  const app = Taro.getApp();

  useDidShow(() => {
    console.log('Settings Page: useDidShow triggered');
    checkLoginStatus();
  });

  const checkLoginStatus = () => {
    const userId = Taro.getStorageSync('userId');
    if (userId) {
      setIsLoggedIn(true);
      fetchUserInfo();
      fetchSettings();
      fetchLocation();
    } else {
      setIsLoggedIn(false);
    }
  };

  const fetchLocation = () => {
    const loc = Taro.getStorageSync('userLocation');
    if (loc) {
      setUserLocation(loc);
    } else {
      // 尝试从 globalData 获取
      if (app.globalData.userLocation) {
        setUserLocation(app.globalData.userLocation);
      }
    }
  };

  const handleUpdateLocation = () => {
    Taro.chooseLocation({
      success: res => {
        console.log('Choose location:', res);
        const location = {
          latitude: res.latitude,
          longitude: res.longitude,
          address: res.address,
          name: res.name,
        };
        setUserLocation(location);
        Taro.setStorageSync('userLocation', location);
        if (app.globalData) {
          app.globalData.userLocation = location;
        }
      },
      fail: err => {
        console.error('Choose location failed:', err);
      },
    });
  };

  const fetchUserInfo = () => {
    const userId = Taro.getStorageSync('userId');
    if (userId) {
      getUserInfo(userId)
        .then(res => {
          console.log('Fetched user info:', res);
          const data = (res && res.data) || res || {};
          setUserInfo(data);
        })
        .catch(err => {
          console.error('获取用户信息失败:', err);
        });
    }
  };

  // 选择头像
  const onChooseAvatar = e => {
    console.log('onChooseAvatar triggered', e);
    const { avatarUrl } = e.detail;
    setLoginAvatar(avatarUrl);
  };

  // 输入昵称
  const onNicknameBlur = e => {
    if (e.detail && e.detail.value) {
      setLoginNickname(e.detail.value);
    }
  };

  // 获取手机号并登录
  const onGetPhoneNumber = async e => {
    if (!loginAvatar) {
      Taro.showToast({ title: '请先选择头像', icon: 'none' });
      return;
    }
    if (!loginNickname) {
      Taro.showToast({ title: '请填写昵称', icon: 'none' });
      return;
    }

    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const phoneCode = e.detail.code;
      console.log('获取手机号 code:', phoneCode);
      await handleLogin(phoneCode);
    } else {
      console.error('获取手机号失败:', e.detail.errMsg);

      // 区分是用户拒绝还是不支持
      const errMsg = e.detail.errMsg || '';
      let content = '获取手机号失败，是否跳过手机号继续登录？';

      // 个人账号通常报错: getPhoneNumber:fail no permission
      if (errMsg.includes('no permission')) {
        content =
          '当前小程序账号类型（个人账号）不支持获取手机号。是否跳过手机号继续登录？';
      } else if (errMsg.includes('user deny')) {
        content = '您拒绝了手机号授权。是否跳过手机号继续登录？';
      }

      Taro.showModal({
        title: '提示',
        content: content,
        confirmText: '继续登录',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            handleLogin(null); // 允许不带手机号登录
          }
        },
      });
    }
  };

  const handleLogin = async phoneCode => {
    Taro.showLoading({ title: '登录中...' });
    try {
      // 1. 获取登录 code
      const { code } = await Taro.login();

      // 2. 后端登录
      // 注意：如果后端支持同时处理 phoneCode，可以一起传过去
      const loginRes = await login(code);
      console.log('登录成功:', loginRes);

      const userId = loginRes.user_id || loginRes.userId;
      const openid = loginRes.openid;

      Taro.setStorageSync('userId', userId);
      Taro.setStorageSync('openid', openid);

      // 3. 上传头像
      let finalAvatarUrl = loginAvatar;
      if (
        loginAvatar.startsWith('http://tmp/') ||
        loginAvatar.startsWith('wxfile://')
      ) {
        try {
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath: `avatars/${userId}_${Date.now()}.png`,
            filePath: loginAvatar,
          });
          finalAvatarUrl = uploadRes.fileID;
        } catch (err) {
          console.error('头像上传失败', err);
        }
      }

      // 4. 更新用户信息 (包含手机号code，如果后端支持)
      const updateData = {
        user_id: userId,
        nickname: loginNickname,
        avatar_url: finalAvatarUrl,
      };

      // 只有当 phoneCode 存在时才添加，避免传 undefined
      if (phoneCode) {
        updateData.phone_code = phoneCode;
      }

      await updateUserInfo(updateData);

      Taro.hideLoading();
      Taro.showToast({ title: '登录成功', icon: 'success' });

      // 立即更新本地显示，无需等待接口刷新
      setUserInfo(prev => ({
        ...prev,
        user_id: userId,
        nickname: updateData.nickname,
        avatar_url: updateData.avatar_url,
        // 注意：手机号需要后端解密后才能显示，这里暂时无法立即更新手机号
      }));

      // 刷新状态
      checkLoginStatus();

      // 刷新全局数据
      app.globalData.userId = userId;
      app.globalData.openid = openid;
    } catch (err) {
      console.error('登录流程失败', err);
      Taro.hideLoading();
      Taro.showToast({ title: '登录失败', icon: 'none' });
    }
  };

  const fetchSettings = () => {
    console.log('Settings Page: fetchSettings called');
    const userId = Taro.getStorageSync('userId');
    if (!userId) {
      console.log('No userId found, skipping fetchSettings');
      return;
    }

    Taro.showLoading({ title: '加载中...' });

    getSettings(userId)
      .then(res => {
        console.log('Fetched settings:', res);

        // 兼容处理：如果返回的数据被包裹在 data 字段中
        // 使用安全的方式获取 data，防止 res 为 null 时报错
        const data = (res && res.data) || res || {};

        const {
          daily_goal,
          reminder_enabled,
          reminder_interval,
          reminder_start_time,
          reminder_end_time,
          quick_add_presets,
        } = data;

        const idx = intervalOptions.findIndex(
          option => option.value === reminder_interval
        );

        const safeQuickAddPresets = Array.isArray(quick_add_presets)
          ? quick_add_presets
          : [200, 300, 500, 800];

        const newQuickAmountOptions = quickAmountOptions.map(option => ({
          ...option,
          active: safeQuickAddPresets.includes(option.value),
        }));

        // 确保数值有效
        const safeDailyGoal = daily_goal || 2000;

        setDailyGoal(safeDailyGoal);
        setReminderEnabled(!!reminder_enabled);
        setReminderInterval(reminder_interval || 60);
        setStartTime(reminder_start_time || '08:00');
        setEndTime(reminder_end_time || '22:00');
        setIntervalIndex(idx >= 0 ? idx : 2);
        setQuickAmountOptions(newQuickAmountOptions);

        // 同步到全局
        if (app && app.globalData) {
          app.globalData.dailyGoal = safeDailyGoal;
          app.globalData.reminderSettings = {
            enabled: !!reminder_enabled,
            interval: reminder_interval || 60,
            startTime: reminder_start_time || '08:00',
            endTime: reminder_end_time || '22:00',
          };
          app.globalData.quickAmounts = safeQuickAddPresets;
        }

        Taro.hideLoading();
      })
      .catch(err => {
        console.error('获取设置失败:', err);
        Taro.hideLoading();

        // 只有在确实失败时才显示错误，避免误报
        const isCloudError = err.errMsg && err.errMsg.includes('cloud');

        // 如果是网络错误或明确的错误，才显示 Toast
        if (!isCloudError && err.message) {
          setToastMsg(`加载失败: ${err.message}`);
          setShowToast(true);
        }

        console.log('Falling back to local settings');
        loadLocalSettings();
      });
  };

  const loadLocalSettings = () => {
    const globalData = app.globalData;
    const { reminderSettings } = globalData;

    const idx = intervalOptions.findIndex(
      option => option.value === reminderSettings.interval
    );

    setDailyGoal(globalData.dailyGoal);
    setReminderEnabled(reminderSettings.enabled);
    setReminderInterval(reminderSettings.interval);
    setStartTime(reminderSettings.startTime);
    setEndTime(reminderSettings.endTime);
    setIntervalIndex(idx >= 0 ? idx : 2);
  };

  const adjustGoal = delta => {
    const newGoal = dailyGoal + delta;
    if (newGoal < 500 || newGoal > 5000) {
      setToastMsg('目标范围需在 500-5000ml 之间');
      setShowToast(true);
      return;
    }
    setDailyGoal(newGoal);
    saveSettings({ dailyGoal: newGoal });
  };

  const updateReminderStatus = status => {
    setReminderEnabled(status);

    if (!app.globalData) app.globalData = {};
    const currentSettings = app.globalData.reminderSettings || {
      enabled: true,
      interval: 60,
      startTime: '08:00',
      endTime: '22:00',
    };

    saveSettings({
      reminderSettings: {
        ...currentSettings,
        enabled: status,
      },
    });
  };

  const toggleReminder = (value, event) => {
    console.log('Toggle reminder:', value);

    // 1. 如果是关闭提醒，直接执行
    if (!value) {
      updateReminderStatus(false);
      return;
    }

    // 2. 如果是开启提醒，请求订阅消息权限
    const TEMPLATE_ID = 'sVMOe5foqgzI9BjHcDxgemaPI6Qd-kalfZAfrkHrdqg';

    Taro.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: res => {
        console.log('Subscribe result:', res);
        if (res[TEMPLATE_ID] === 'accept') {
          Taro.showToast({ title: '订阅成功', icon: 'success' });
        } else if (res[TEMPLATE_ID] === 'reject') {
          Taro.showToast({ title: '您取消了订阅', icon: 'none' });
        }
        // 无论同意还是拒绝，都开启应用内开关
        updateReminderStatus(true);
      },
      fail: err => {
        console.error('订阅请求失败:', err);
        // 即使失败（如开发工具不支持），也允许开启开关
        updateReminderStatus(true);
      },
    });
  };

  const onIntervalChange = e => {
    const idx = e.detail.value;
    const interval = intervalOptions[idx].value;
    setIntervalIndex(idx);
    setReminderInterval(interval);

    if (!app.globalData) app.globalData = {};
    const currentSettings = app.globalData.reminderSettings || {
      enabled: true,
      interval: 60,
      startTime: '08:00',
      endTime: '22:00',
    };

    saveSettings({
      reminderSettings: {
        ...currentSettings,
        interval: interval,
      },
    });
  };

  const onStartTimeChange = e => {
    const time = e.detail.value;
    setStartTime(time);

    if (!app.globalData) app.globalData = {};
    const currentSettings = app.globalData.reminderSettings || {
      enabled: true,
      interval: 60,
      startTime: '08:00',
      endTime: '22:00',
    };

    saveSettings({
      reminderSettings: {
        ...currentSettings,
        startTime: time,
      },
    });
  };

  const onEndTimeChange = e => {
    const time = e.detail.value;
    setEndTime(time);

    if (!app.globalData) app.globalData = {};
    const currentSettings = app.globalData.reminderSettings || {
      enabled: true,
      interval: 60,
      startTime: '08:00',
      endTime: '22:00',
    };

    saveSettings({
      reminderSettings: {
        ...currentSettings,
        endTime: time,
      },
    });
  };

  const saveSettings = newSettings => {
    // 确保 globalData 及其子属性存在
    if (!app.globalData) app.globalData = {};
    if (!app.globalData.reminderSettings) {
      app.globalData.reminderSettings = {
        enabled: true,
        interval: 60,
        startTime: '08:00',
        endTime: '22:00',
      };
    }

    // 更新全局数据
    if (newSettings.dailyGoal) {
      app.globalData.dailyGoal = newSettings.dailyGoal;
    }
    if (newSettings.reminderSettings) {
      app.globalData.reminderSettings = {
        ...app.globalData.reminderSettings,
        ...newSettings.reminderSettings,
      };
    }
    if (newSettings.quickAmounts) {
      app.globalData.quickAmounts = newSettings.quickAmounts;
    }

    // 保存到本地
    Taro.setStorageSync('settings', {
      dailyGoal: app.globalData.dailyGoal,
      reminderSettings: app.globalData.reminderSettings,
      quickAmounts: app.globalData.quickAmounts,
    });

    // 同步到云端
    const userId = Taro.getStorageSync('userId');
    if (userId) {
      const cloudSettings = {
        user_id: userId,
        daily_goal: app.globalData.dailyGoal,
        reminder_enabled: app.globalData.reminderSettings.enabled,
        reminder_interval: app.globalData.reminderSettings.interval,
        reminder_start_time: app.globalData.reminderSettings.startTime,
        reminder_end_time: app.globalData.reminderSettings.endTime,
        quick_add_presets: app.globalData.quickAmounts,
      };

      console.log('正在保存设置到云端:', cloudSettings);
      updateSettings(cloudSettings)
        .then(() => {
          console.log('设置保存成功');
        })
        .catch(err => {
          console.error('同步设置失败:', err);
          Taro.showToast({ title: '设置保存失败', icon: 'none' });
        });
    }
  };

  return (
    <View className="container">
      {/* 用户信息卡片 */}
      {isLoggedIn ? (
        <View className="card user-card">
          <Image
            className="user-avatar"
            src={
              userInfo.avatar_url ||
              'https://img12.360buyimg.com/imagetools/jfs/t1/196430/38/8105/14329/60c806a4Ed506298a/e6de9fb7b8490f38.png'
            }
            mode="aspectFill"
          />
          <View className="user-info">
            <View className="user-nickname">
              {userInfo.nickname || '未登录'}
            </View>
            {userInfo.phone && (
              <View className="user-phone">手机: {userInfo.phone}</View>
            )}
            {userLocation && (
              <View
                className="user-location"
                onClick={handleUpdateLocation}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                位置:{' '}
                {userLocation.address ||
                  `${userLocation.latitude.toFixed(
                    2
                  )}, ${userLocation.longitude.toFixed(2)}`}
                <View
                  className="location-tip"
                  style={{ fontSize: '12px', color: '#999', marginLeft: '5px' }}
                >
                  (点击更新)
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View className="card login-card">
          <View className="login-title">登录以同步数据</View>
          <View className="login-form">
            <TaroButton
              className="avatar-wrapper"
              openType="chooseAvatar"
              onChooseAvatar={onChooseAvatar}
              style={{
                width: '80px',
                height: '80px',
                padding: 0,
                borderRadius: '50%',
                marginBottom: '20px',
                background: 'none',
                border: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                className="avatar-img"
                src={
                  loginAvatar ||
                  'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
                }
                mode="aspectFill"
                style={{ width: '100%', height: '100%', borderRadius: '50%' }}
              />
            </TaroButton>
            <Input
              className="nickname-input"
              type="nickname"
              placeholder="请输入昵称"
              onBlur={onNicknameBlur}
              onInput={e => setLoginNickname(e.detail.value)}
              style={{
                marginBottom: '20px',
                borderBottom: '1px solid #eee',
                height: '40px',
                width: '100%',
                textAlign: 'center',
              }}
            />
            <Button
              type="primary"
              className="login-btn"
              openType="getPhoneNumber"
              onGetPhoneNumber={onGetPhoneNumber}
            >
              一键登录
            </Button>
          </View>
        </View>
      )}

      {/* 每日目标设置 */}
      <View className="card">
        <View className="title">每日饮水目标</View>
        <View className="goal-setting">
          <View className="goal-display">
            <View className="goal-amount">{dailyGoal}ml</View>
            <View className="goal-desc">建议成人每日饮水量 1500-2500ml</View>
          </View>
          <View className="goal-controls">
            <Button size="small" onClick={() => adjustGoal(-100)}>
              -100
            </Button>
            <Button size="small" onClick={() => adjustGoal(-50)}>
              -50
            </Button>
            <Button size="small" type="primary" onClick={() => adjustGoal(50)}>
              +50
            </Button>
            <Button size="small" type="primary" onClick={() => adjustGoal(100)}>
              +100
            </Button>
          </View>
        </View>
      </View>

      <View className="card">
        <View className="title">提醒设置</View>

        {/* 开启提醒 */}
        <View className="setting-item">
          <View className="setting-label">
            <View className="label-text">开启提醒</View>
            <View className="label-desc">定时提醒您喝水</View>
          </View>
          <Switch
            checked={reminderEnabled}
            onChange={toggleReminder}
            activeColor="#4fc3f7"
          />
        </View>

        {/* 提醒间隔 */}
        {reminderEnabled && (
          <View className="setting-item">
            <View className="setting-label">
              <View className="label-text">提醒间隔</View>
              <View className="label-desc">
                每{reminderInterval}分钟提醒一次
              </View>
            </View>
            <Picker
              mode="selector"
              range={intervalOptions}
              rangeKey="label"
              value={intervalIndex}
              onChange={onIntervalChange}
            >
              <Button size="small" type="default">
                {intervalOptions[intervalIndex].label}
              </Button>
            </Picker>
          </View>
        )}

        {/* 提醒时间段 */}
        {reminderEnabled && (
          <View className="time-range">
            <View className="time-item">
              <View className="time-label">开始时间</View>
              <Picker
                mode="time"
                value={startTime}
                onChange={onStartTimeChange}
              >
                <Button size="small" type="default">
                  {startTime}
                </Button>
              </Picker>
            </View>
            <View className="time-item">
              <View className="time-label">结束时间</View>
              <Picker mode="time" value={endTime} onChange={onEndTimeChange}>
                <Button size="small" type="default">
                  {endTime}
                </Button>
              </Picker>
            </View>
          </View>
        )}
      </View>

      {/* 快速添加设置 */}
      <View className="card">
        <View className="title">快速添加设置</View>
        <View className="quick-amounts-setting">
          <View className="amounts-grid">
            {quickAmountOptions.map((item, index) => (
              <View
                key={item.value}
                className={`amount-item ${item.active ? 'active' : ''}`}
                onClick={() => {
                  const newOptions = [...quickAmountOptions];
                  newOptions[index].active = !newOptions[index].active;
                  setQuickAmountOptions(newOptions);

                  const activeAmounts = newOptions
                    .filter(opt => opt.active)
                    .map(opt => opt.value);
                  saveSettings({ quickAmounts: activeAmounts });
                }}
              >
                {item.value}ml
              </View>
            ))}
          </View>
          <View className="section-desc">选择常用的饮水量，方便快速添加</View>
        </View>
      </View>

      {/* 数据管理 */}
      <View className="card">
        <View className="title">数据管理</View>
        <View className="setting-item">
          <View className="setting-label">
            <View className="label-text">导出数据</View>
            <View className="label-desc">导出饮水记录数据</View>
          </View>
          <Button
            size="small"
            type="primary"
            fill="outline"
            onClick={() => {
              Taro.showToast({ title: '导出成功', icon: 'success' });
            }}
          >
            导出
          </Button>
        </View>
        <View className="setting-item">
          <View className="setting-label">
            <View className="label-text">清空数据</View>
            <View className="label-desc">清空所有饮水记录</View>
          </View>
          <Button
            size="small"
            type="danger"
            fill="outline"
            onClick={() => {
              Taro.showModal({
                title: '确认清空',
                content: '此操作将删除所有饮水记录，且无法恢复。确定要继续吗？',
                success: res => {
                  if (res.confirm) {
                    if (!app.globalData) app.globalData = {};
                    app.globalData.todayDrink = 0;
                    app.globalData.drinkRecords = [];
                    Taro.removeStorageSync('waterData');
                    Taro.removeStorageSync('waterHistory');
                    Taro.showToast({ title: '数据已清空', icon: 'success' });
                    setDailyGoal(2000);
                  }
                },
              });
            }}
          >
            清空
          </Button>
        </View>
      </View>

      {/* 关于 */}
      <View className="card">
        <View className="title">关于</View>
        <View className="setting-item">
          <View className="label-text">版本</View>
          <View className="label-desc">1.0.0</View>
        </View>
        <View className="setting-item">
          <View className="label-text">开发者</View>
          <View className="label-desc">喝水小助手团队</View>
        </View>
        <View className="setting-item">
          <View className="label-text">联系我们</View>
          <Button size="small" type="default" fill="outline">
            反馈建议
          </Button>
        </View>
      </View>

      {/* 健康小贴士 */}
      <View className="card tips-card">
        <View className="tips-title">💡 健康小贴士</View>
        <View className="tips-content">
          <View className="tip-item">• 晨起一杯温水，唤醒身体活力</View>
          <View className="tip-item">• 餐前半小时饮水，有助消化</View>
          <View className="tip-item">• 运动后及时补水，维持体液平衡</View>
          <View className="tip-item">• 睡前2小时减少饮水，保证睡眠质量</View>
        </View>
      </View>

      <Toast
        msg={toastMsg}
        visible={showToast}
        type="text"
        onClose={() => setShowToast(false)}
      />
    </View>
  );
};

export default Settings;
