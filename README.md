# HirePilot AI

AI 招聘网站原型，面向求职方、招聘方、后台管理方提供一体化招聘工作台。当前版本已经从纯前端演示升级为带 Express API 与本地 JSON 数据持久化的全栈原型。

## 功能

- 账号体系：求职方、招聘方、后台管理方登录、注册、角色权限隔离；未登录时只展示登录/注册入口。
- 求职者端：简历上传、PDF/DOCX/TXT 解析、自动更新姓名/求职方向/城市/经验/技能、简历亮点编辑、岗位搜索、城市/部门/技能筛选、AI 匹配分、投递记录。
- 招聘方端：岗位发布、岗位编辑、暂停/开启、删除、按岗位筛选简历、最低匹配分筛选、候选人搜索。
- 后台管理：用户管理、账号启停、角色调整、岗位监管、投递监管、平台数据总览。
- 候选人管理：候选人详情、技能命中、招聘备注、候选人状态、投递状态流转。
- 数据持久化：后端首次启动会生成 `server/data/db.json`，运行时数据保存在本地 JSON 文件中。
- AI 匹配：基于岗位技能、简历内容、候选人技能标签计算本地匹配分，并高亮命中技能。
- 体验设计：简洁工作台布局，响应式适配桌面与移动端。

## 演示账号

| 角色 | 邮箱 | 密码 |
| --- | --- | --- |
| 求职者 | candidate@demo.com | demo123 |
| 招聘方 | recruiter@demo.com | demo123 |
| 后台管理 | admin@demo.com | demo123 |

## 技术栈

- Vite
- React
- TypeScript
- Express
- multer
- mammoth
- pdf-parse
- lucide-react

## 预览

![桌面端工作台](screenshots/hirepilot-desktop.png)

![移动端工作台](screenshots/hirepilot-mobile-viewport.png)

## 本地运行

安装依赖：

```bash
npm install
```

同时启动前端和后端：

```bash
npm run dev:full
```

也可以分开启动：

```bash
npm run dev:api
npm run dev
```

默认地址：

- 前端：http://127.0.0.1:5174/
- API：http://127.0.0.1:4174/

## 构建与检查

```bash
npm run build
npm run lint
```

## 数据说明

- 初始演示数据包含 7 个用户、10 个岗位、12 个候选人、9 条投递记录。
- `server/data/db.json` 是运行时数据库，已加入 `.gitignore`。
- `server/uploads/` 是上传暂存目录，上传完成后文件会被清理。
- 如需恢复初始演示数据，删除 `server/data/db.json` 后重启 API。

## GitHub 推送

本地仓库已可直接推送到 GitHub。创建远程仓库后执行：

```bash
git remote add origin https://github.com/<your-account>/hirepilot-ai.git
git push -u origin main
```
