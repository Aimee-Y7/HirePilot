# HirePilot AI

AI 招聘网站原型，面向求职者与招聘方提供一体化招聘工作台。

## 功能

- 求职者端：简历上传、简历亮点编辑、岗位搜索、城市/部门/技能筛选、岗位匹配分、投递目标岗位。
- 招聘方端：岗位发布、核心技能录入、按岗位筛选简历、最低匹配分筛选、候选人搜索、收藏候选人。
- AI 匹配：基于岗位技能、简历内容、候选人技能标签计算本地匹配分，并高亮命中技能。
- 体验设计：简洁工作台布局，响应式适配桌面与移动端。

## 技术栈

- Vite
- React
- TypeScript
- lucide-react

## 预览

![桌面端工作台](screenshots/hirepilot-desktop.png)

![移动端工作台](screenshots/hirepilot-mobile-viewport.png)

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## GitHub 推送

当前项目可以直接初始化并推送到 GitHub：

```bash
git init
git add .
git commit -m "Build AI recruitment website"
git branch -M main
git remote add origin https://github.com/<your-account>/hirepilot-ai.git
git push -u origin main
```
