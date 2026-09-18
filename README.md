<div align="center">

# 🧍 人类有多渺小 · How Tiny Are We

**以人类身高为基准的「尺寸」科普百科**

滚轮缩放，从普朗克长度到可观测宇宙——每一个物体都有它的尺度和说明。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Data: Wikidata CC0](https://img.shields.io/badge/data-Wikidata%20CC0-9cf.svg)](https://www.wikidata.org)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Built with Vite](https://img.shields.io/badge/Vite-6-646cff.svg)](https://vitejs.dev)
[![Deploy](https://github.com/Syotick/how-tiny-are-we/actions/workflows/deploy.yml/badge.svg)](https://github.com/Syotick/how-tiny-are-we/actions/workflows/deploy.yml)

</div>

---

> 🌐 **在线体验**：<https://syotick.github.io/how-tiny-are-we/>

## 这是什么

一个把「大小」讲清楚的百科全书：

- 以 **人类平均身高 1.7 米** 为基准锚点，向下滚轮缩小到原子、粒子，向上滚轮放大到行星、恒星、星系、可观测宇宙；
- 收录从 **普朗克长度（1.6×10⁻³⁵ 米）** 到 **可观测宇宙（8.8×10²⁶ 米）** 的知名物体；
- 每个物体都有 **名称、大小（米 + 可读单位）、与人类的直观对比、科普说明**；
- 支持 **分类筛选、全文搜索、快捷跳转、点击查看详情**，移动端手势友好。

它继承了 [Scale of the Universe](https://www.htwins.net/scale2/)（htwins）这类经典交互的玩法，
但数据基于**开源结构化知识库 Wikidata** 自动扩充，且每个物体都配上了**中文科普文案**。

## ✨ 特性

- 🔍 **对数尺度缩放**：滚轮 / 方向键 / 拖拽 / 双指捏合，平滑浏览 62 个数量级
- 🧍 **人类基准**：标尺上永远有一个"你"，所有大小都以你为参照
- 🗂️ **12 大分类**：微观粒子 → 原子分子 → 细胞微生物 → 生物 → 人造物 → 地球 → 太阳系 → 恒星与黑洞 → 星系与宇宙结构
- 🔎 **搜索 + 分类筛选**：一键找到"蓝鲸"、"银河系"、"质子"
- 📖 **科普文案**：每个精选物体都有可读、可核验的中文说明与数据来源
- 🌍 **GitHub Pages 部署**：零后端、纯静态、一次部署永久在线

## 🚀 快速开始

**Windows 一键启动**：双击仓库根目录的 [`启动.bat`](启动.bat) 即可——
自动检查 Node.js、自动安装依赖、自动启动本地服务器并打开浏览器。

手动方式：

```bash
# 1. 克隆
git clone https://github.com/Syotick/how-tiny-are-we.git
cd how-tiny-are-we

# 2. 安装依赖
npm install

# 3. 本地开发
npm run dev          # http://localhost:5173

# 4. 生产构建
npm run build
npm run preview
```

## 🗄️ 数据从哪来（不闭门造车）

数据采用**混合方案**，分两层：

### ① 人工精选层（`data/curated.json`）

**153 个知名物体**，由人工挑选并核验尺寸、逐条撰写中文科普文案。
覆盖粒子 → 原子 → 细胞 → 生物 → 建筑 → 地球 → 行星 → 恒星 → 黑洞 → 星系 → 宇宙。
这是产品的"口碑层"，也是最需要社区贡献的部分。

### ② 自动扩充层（Wikidata，CC0 公共领域）

`scripts/fetch-wikidata.mjs` 通过 SPARQL 从 Wikidata 批量抓取物体尺寸：

- 属性：**P2386 直径 / P2048 高度 / P2049 长度 / P2047 宽度**；
- 类别白名单：建筑、山脉、河流、湖泊、行星、恒星、星系、小行星……；
- **「知名」过滤器**：只收录拥有中文维基词条的物体（fame 代理指标）；
- 单位换算：运行时按标签反查单位 QID → 统一换算成**米**；
- 数据清洗：按"类别 × 属性"中位数过滤离群值、自动去重。

> 💡 本机若无法访问 `query.wikidata.org`（如国内网络），可指定镜像端点：
> ```bash
> WDQS_ENDPOINT=https://qlever.dev/api/wikidata node scripts/fetch-wikidata.mjs
> ```
> GitHub Actions 每周一自动跑一次（官方端点），并把结果提交进仓库，站点**永远离线可用**。

### 数据构建

```bash
npm run data   # 抓取 Wikidata + 合并生成 public/data/objects.json
```

## 📁 目录结构

```
how-tiny-are-we/
├─ index.html
├─ data/
│  ├─ categories.json        # 分类元数据（中文名/emoji/颜色）
│  └─ curated.json           # 人工精选 153 个物体（尺寸核验 + 中文科普文案）
├─ scripts/
│  ├─ fetch-wikidata.mjs     # Wikidata SPARQL 批量抓取（自动扩充层）
│  └─ build-data.mjs         # 合并两层数据 → public/data/objects.json
├─ src/
│  ├─ App.tsx                # 主应用（状态、搜索、筛选、键盘导航）
│  ├─ components/
│  │  ├─ ScaleViewer.tsx     # Canvas 对数尺度缩放可视化
│  │  ├─ Ruler.tsx           # 左侧对数标尺（点击跳转）
│  │  ├─ InfoPanel.tsx       # 右侧物体详情
│  │  ├─ TopBar.tsx          # 标题/搜索/分类筛选
│  │  └─ JumpBar.tsx         # 快捷跳转按钮
│  ├─ lib/format.ts          # 尺寸格式化、单位换算、与人类对比
│  └─ styles.css
├─ public/data/objects.json  # 构建产物（已提交，站点加载此文件）
└─ .github/workflows/
   ├─ data.yml               # 每周自动更新 Wikidata 数据
   └─ deploy.yml             # 构建并部署 GitHub Pages
```

## 📜 许可与数据来源

| 部分 | 许可 |
|---|---|
| 代码 | [MIT](LICENSE) |
| 人工精选的中文科普文案与数据 | CC BY-SA 4.0 |
| Wikidata 自动收录数据（`auto: true` 条目） | [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.zh)（公共领域） |
| 中文维基摘要/描述 | CC BY-SA 4.0（已在条目来源中署名） |

- 自动收录条目的数据来源于 [Wikidata](https://www.wikidata.org)，点击详情面板中的"数据来源"可查看对应条目。
- 项目交互设计受 [Scale of the Universe](https://www.htwins.net/scale2/) 启发（其官方开源重建版见 [matttt/scale_of_the_universe](https://github.com/matttt/scale_of_the_universe)，无开源许可，故本项目**不复制其数据**）。

## 🤝 贡献指南

欢迎任何形式的贡献！最简单的方式是**补充精选条目**：

1. 编辑 `data/curated.json`，新增一个物体：
   ```json
   {
     "id": "your-object-id",
     "name": "中文名",
     "nameEn": "English Name",
     "category": "life",
     "size": 30,
     "sizeNote": "体长约 30 m",
     "description": "一段通俗准确的科普说明……",
     "emoji": "🐳"
   }
   ```
2. `npm run data && npm run build` 本地验证；
3. 提交 PR（说明尺寸来源）。

其他可做的事：

- 修正数据错误（尺寸、单位、描述）——我们非常需要你！
- 补充缺失的知名物体；
- 改进可视化（3D、粒子效果、插图）；
- 增加英文/日文等多语言；
- 自动化拉取中文维基摘要作为自动条目的简介。

## 🗺️ 路线图

- [x] 核心：对数尺度缩放 + 人类基准 + 详情面板
- [x] 数据流水线：Wikidata SPARQL 自动抓取 + 单位换算 + 清洗
- [x] 搜索 / 分类筛选 / 快捷跳转 / 移动端手势
- [ ] 自动条目补充中文维基简介
- [ ] 天文目录二期（Gaia 恒星 / SDSS 星系 / JPL 小行星真实数据）
- [ ] 每个物体的插图 / 3D 缩放效果
- [ ] 中英双语界面

## 🙏 致谢

- [Wikidata](https://www.wikidata.org) & [QLever](https://qlever.dev) —— 开源结构化知识库与镜像查询服务
- [Wiki-Measurements 数据集](https://doi.org/10.5281/zenodo.14858280)（于利希研究中心）—— 提供了数量提取的宝贵参考
- [Scale of the Universe](https://www.htwins.net/scale2/)（Cary Huang）—— 交互范式的最初灵感
- [chrisjz/universe](https://github.com/chrisjz/universe) —— 现代开源实现的优秀范本

---

**人类有多渺小？** 往下滚轮，你比原子大千万亿倍；往上滚轮，宇宙比你大千万亿倍。
但——能同时想象这两端的存在，恐怕只有人类。
