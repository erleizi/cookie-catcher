# 通用 Cookie 抓取插件

给白日梦写的自用插件：按需抓取**任意网站**的 Cookie，按域名分别持久化保存，
配合 BoxJs 查看复制。B站只是默认已配好的第一个目标（`SESSDATA` 单独存一份，
方便喂给 `danmu-api` 的 `BILIBILI_COOKIE`）。

## 文件

- `cookie-catcher.js` — 抓取脚本（http-request 类型，通用）
- `cookie-catcher.boxjs.json` — BoxJs 应用订阅文件

## 原理

1. **MITM** 解密目标 App/站点的 HTTPS，才能看到请求头。
2. **http-request 脚本** 全匹配（`^https?://`），在 JS 里用 `SITES`
   名单过滤域名——MITM 里加了哪个域名、名单里有哪个，才抓哪个。
3. **只存已登录的 Cookie**：每站配了 `loginKeys` 登录标记
   （B站 `SESSDATA`、抖音 `sessionid`、斗鱼 `acf_uid`、快手待验证），
   没登录的游客请求直接跳过，不存也不弹窗。
4. 抓到的 Cookie 按站点分类存：`cookie_catcher_site_<站点id>`
   （哔哩哔哩 / 抖音 / 快手 / 斗鱼），BoxJs 里每站一块，互不干扰。
   B站存的是完整 Cookie（里面含 SESSDATA，通用）。
5. **一站只抓一次**：某站点抓到过就不再覆盖；`$notification.post` 只在
   首次抓到时弹窗。想重抓（换号/Cookie 过期）时，去 BoxJs 里把该站点
   那一栏清空，再开模块抓一次即可。
6. 模块的启用/禁用就是开关，抓完关掉，数据保留。

## 加新网站

1. `cookie-catcher.js` 顶部 `SITES` 加一项 `{ id, name, hosts }`
  （hosts 填父域名，子域名自动覆盖），同时在 `cookie-catcher.boxjs.json`
   的 `keys` 和 `settings` 里加对应的一条；
2. 模块 `cookie-catcher.sgmodule` 的 MITM 里追加它的 API 域名；
3. Egern 里更新模块 → 启用 → 打开对应 App 刷一下 → 收到通知 → 禁用。

## 安装（Egern，一键）

模块链接（粘贴到 Egern → 模块 → 添加）：
`https://raw.githubusercontent.com/erleizi/cookie-catcher/main/cookie-catcher.sgmodule`

装好后模块列表里有个开关：需要抓时打开，不需要时关闭。
（文件托管在你 GitHub 的公开小仓库：https://github.com/erleizi/cookie-catcher）

## 安装（手动备选）

1. Egern → 脚本 → 添加 → 类型选 **http-request**（请求头拦截）；
2. 匹配 URL：`^https?://`；
3. 脚本内容粘贴 `cookie-catcher.js`；
4. Egern → MITM → 主机名 → 添加想抓的域名（如 `api.bilibili.com`、`app.bilibili.com`）。

## 查看复制

- **BoxJs（推荐）**：Safari 打开 `http://boxjs.com`（Egern 代理保持开启）
  → 应用订阅 → 添加订阅链接：
  `https://raw.githubusercontent.com/erleizi/cookie-catcher/main/cookie-catcher.boxjs.json`
  → 「全部 Cookie」里按域名找，或直接复制「B站 SESSDATA」；
- 备选：Egern → 脚本 → 日志，搜 `[Cookie抓取]`。

## 下一步（B站）

拿到 `SESSDATA` 后走安全流程发给小二，写入 Cloudflare `danmu-api` 的
`BILIBILI_COOKIE`。注意：已查源码，之前 412 的那条 B站 `ep_id` 直连请求
代码里没带 Cookie，单配 SESSDATA 未必能修好，抓到后需实测，必要时给 fork
打补丁。
