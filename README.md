# 🍪 通用 Cookie 抓取（Egern 原生模块）

按需抓取四站登录 Cookie：**哔哩哔哩 / 抖音 / 快手 / 斗鱼**。
模块内自带「抓取」拨动开关，打开抓、抓完关，不用整个模块开开关关。

## 安装

> 如果之前装过旧版（cookie-catcher.sgmodule 或 cookie-catcher-v2.yaml），**先删掉旧模块再装 v3**——Egern 会按 URL 缓存旧脚本，不删干净可能继续跑旧版。

1. Egern → 模块 → 添加 → 从 URL 导入，填：

   ```
   https://raw.githubusercontent.com/erleizi/cookie-catcher/main/cookie-catcher-v3.yaml
   ```

2. BoxJs → 应用订阅 → 添加，填：

   ```
   https://raw.githubusercontent.com/erleizi/cookie-catcher/main/cookie-catcher.boxjs.json
   ```

   （BoxJs 后端：http://boxjs.com）

## 使用

1. 打开 Egern 里这个模块的设置页，把「**抓取**」开关打开（默认关闭）。
2. 打开对应 App（确认已登录），随便刷一刷。
3. 收到「🍪 Cookie 已保存 / 站点名」通知即成功。
4. 去 BoxJs 对应站点分类查看、复制 Cookie。
5. **抓完把「抓取」开关关掉。**

规则：

- 只存**已登录**的 Cookie（带登录态标记字段），游客的不存。
- 每个站点**只抓一次**；想重抓（换号 / Cookie 过期）时，去 BoxJs 把该站点那一栏清空，再开开关抓一次。

## 文件

- `cookie-catcher-v3.yaml` — Egern 原生模块（含开关、MITM、脚本引用；文件名 v3，专治 Egern 按 URL 缓存旧模块）
- `cookie-catcher-v2.js` — 抓取脚本（Egern 原生 API：`export default main(ctx)`；脚本沿用 v2 文件名，v3 只改了 yaml 文件名来破缓存）
- `cookie-catcher.boxjs.json` — BoxJs 订阅（四个站点分类）
- `cookie-icon.png` — 订阅图标

## 加新站点

1. `cookie-catcher-v2.js` 的 `SITES` 加一项 `{id, name, hosts, loginKeys}`；
2. `cookie-catcher-v3.yaml` 的 MITM **和** `match` 里都加它的 API 域名（match 保持窄匹配，只 hook 必要的域名）；
3. `cookie-catcher.boxjs.json` 里加对应分类（key 为 `cookie_catcher_site_<id>`）。
