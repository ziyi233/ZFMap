# 浦东新区低租金青年公寓地图

一个用于查看浦东新区低租金青年公寓位置、房源信息和到办公地点直线距离的地图页面

## 功能

- 高德地图标注所有已抓取的公寓项目
- 输入办公地点后按距离排序
- 办公地点会缓存，刷新后保留
- 标点文字可显示/隐藏，并缓存开关状态
- 房源详情展示实景/外观图、房型/户型图
- 图片支持点击主图放大预览

## 本地运行

```bash
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```env
VITE_AMAP_KEY=your_amap_web_js_api_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
```

如果没有配置环境变量，页面会在首次进入时要求手动输入高德 Key

## Vercel 部署

在 Vercel 项目环境变量里配置：

- `VITE_AMAP_KEY`
- `VITE_AMAP_SECURITY_CODE`

高德控制台需要把正式域名加入 Web端 JS API Key 的域名白名单

## 数据更新

当前数据保存在 `data/projects.detail.json`

重新抓取：

```bash
npm run fetch:data
```
