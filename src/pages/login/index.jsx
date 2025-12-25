import { Button, Input } from '@nutui/nutui-react-taro';
import { Image, Button as TaroButton, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { login, updateUserInfo } from '../../api/user';
import './index.css';

const Login = () => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // 选择头像
  const onChooseAvatar = e => {
    const { avatarUrl } = e.detail;
    setAvatarUrl(avatarUrl);
  };

  // 输入昵称
  const onNicknameInput = val => {
    // NutUI 的 Input 组件 onInput 回调参数直接是值，不是 event 对象
    setNickname(val);
  };

  // 昵称输入框失去焦点时触发（兼容微信昵称填写能力）
  const onNicknameBlur = e => {
    if (e.detail && e.detail.value) {
      setNickname(e.detail.value);
    }
  };

  // 登录
  const handleLogin = async () => {
    if (!nickname.trim()) {
      Taro.showToast({
        title: '请输入昵称',
        icon: 'none',
      });
      return;
    }

    if (!avatarUrl) {
      Taro.showToast({
        title: '请选择头像',
        icon: 'none',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. 调用 wx.login 获取 code
      const { code } = await Taro.login();

      // 2. 发送 code 到后端，获取 openid 和 session_key
      const loginRes = await login(code);
      console.log('登录成功:', loginRes);

      // 保存用户登录信息
      const userId = loginRes.user_id || loginRes.userId;
      const openid = loginRes.openid;

      Taro.setStorageSync('userId', userId);
      Taro.setStorageSync('openid', openid);

      // 3. 上传头像到云存储
      let finalAvatarUrl = avatarUrl;
      // 如果是临时文件路径（通常以 http://tmp/ 或 wxfile:// 开头），则需要上传
      if (
        avatarUrl.startsWith('http://tmp/') ||
        avatarUrl.startsWith('wxfile://')
      ) {
        try {
          const uploadRes = await Taro.cloud.uploadFile({
            cloudPath: `avatars/${userId}_${Date.now()}.png`, // 云端路径
            filePath: avatarUrl, // 临时文件路径
          });
          finalAvatarUrl = uploadRes.fileID; // 获取 cloudID
          console.log('头像上传成功:', finalAvatarUrl);
        } catch (uploadErr) {
          console.error('头像上传失败:', uploadErr);
          // 如果上传失败，可以选择提示用户或继续使用临时路径（但不推荐，因为临时路径会失效）
          Taro.showToast({
            title: '头像上传失败',
            icon: 'none',
          });
          setLoading(false);
          return;
        }
      }

      // 4. 上传用户信息（昵称、头像）
      await updateUserInfo({
        user_id: userId,
        nickname: nickname.trim(),
        avatar_url: finalAvatarUrl,
      });

      Taro.showToast({
        title: '登录成功',
        icon: 'success',
      });

      // 4. 跳转到首页
      setTimeout(() => {
        Taro.reLaunch({
          url: '/pages/index/index',
        });
      }, 1500);
    } catch (error) {
      console.error('登录失败:', error);
      Taro.showToast({
        title: '登录失败，请重试',
        icon: 'none',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="login-container">
      <View className="login-card">
        <View className="logo-section">
          <View className="app-name">爱的助手</View>
          <View className="app-desc">记录美好生活</View>
        </View>

        <View className="avatar-section">
          <View className="section-title">选择头像</View>
          <TaroButton
            className="avatar-button"
            openType="chooseAvatar"
            onChooseAvatar={onChooseAvatar}
          >
            {avatarUrl ? (
              <Image
                className="avatar-image"
                src={avatarUrl}
                mode="aspectFill"
              />
            ) : (
              <View className="avatar-placeholder">点击选择头像</View>
            )}
          </TaroButton>
        </View>

        <View className="nickname-section">
          <View className="section-title">输入昵称</View>
          <Input
            className="nickname-input"
            type="nickname"
            placeholder="请输入昵称"
            value={nickname}
            onChange={onNicknameInput}
            onBlur={onNicknameBlur}
            maxLength={20}
          />
        </View>

        <Button
          className="login-button"
          type="primary"
          loading={loading}
          onClick={handleLogin}
        >
          开始使用
        </Button>
      </View>
    </View>
  );
};

export default Login;
