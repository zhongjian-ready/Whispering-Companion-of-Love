export default defineAppConfig({
  pages: ['pages/index/index', 'pages/history/index', 'pages/settings/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '喝水助手',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#1976d2',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        // iconPath: 'assets/home.png',
        // selectedIconPath: 'assets/home-active.png',
      },
      {
        pagePath: 'pages/history/index',
        text: '历史',
        // iconPath: 'assets/history.png',
        // selectedIconPath: 'assets/history-active.png',
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        // iconPath: 'assets/settings.png',
        // selectedIconPath: 'assets/settings-active.png',
      },
    ],
  },
});
