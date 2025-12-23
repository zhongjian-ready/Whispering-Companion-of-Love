# Water Reminder (Taro + React + NutUI)

这是一个使用 Taro + React + NutUI 重构的喝水提醒小程序。

## 快速开始

1. **安装依赖**

   在项目根目录下安装依赖：

   ```bash
   npm install
   ```

2. **开发环境运行**

   微信小程序：

   ```bash
   npm run dev:weapp
   ```

   运行后，使用微信开发者工具导入 `dist` 目录即可预览。

## 目录结构

```
├── config/             # Taro 配置
├── src/
│   ├── assets/         # 静态资源（图片等）
│   ├── pages/          # 页面
│   │   ├── index/      # 首页
│   │   ├── history/    # 历史页
│   │   └── settings/   # 设置页
│   ├── utils/          # 工具函数
│   ├── app.js          # 入口文件
│   ├── app.config.js   # 全局配置
│   └── app.css         # 全局样式
└── package.json
```

## 注意事项

1. **图片资源**：请将原项目的 TabBar 图标和其他图片复制到 `src/assets/` 目录下，并确保 `app.config.js` 中的路径正确。
2. **云开发环境**：请在 `src/app.js` 和 `src/utils/api.js` 中确认你的云开发环境 ID (`env`) 是否正确。
3. **NutUI**：本项目使用了 NutUI 组件库，按需加载已配置。

## 技术栈

- **框架**：Taro 3.x
- **UI 库**：NutUI React
- **语言**：JavaScript (React)
- **样式**：CSS
