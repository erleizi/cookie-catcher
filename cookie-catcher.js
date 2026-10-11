/*
 * 通用 Cookie 抓取脚本
 * 适用: Egern / Loon / Surge / Quantumult X
 * 类型: http-request (请求头拦截)
 * 匹配: ^https?://  (全匹配, 靠下方 TARGET_HOSTS 过滤)
 * MITM: 模块里已配好四家的 API 域名, 开关模块即开关抓取
 *       想加新站: 模块 MITM 里加它的 API 域名 + 下方 TARGET_HOSTS 加父域名
 *
 * 原理: MITM 解密 App 的 HTTPS 请求后, 脚本在请求发出去之前读到
 * 请求头里的 Cookie, 按域名分别写入 $persistentStore 持久化保存,
 * 并维护一份 JSON 总表。抓完把脚本关掉, 数据都留着。
 *
 * 安装 (Egern):
 *  1. Egern → 脚本 → 添加 → 类型选 http-request(请求头)
 *  2. 匹配 URL 填: ^https?://
 *  3. 把本文件内容粘贴为脚本
 *  4. Egern → MITM → 主机名 → 添加想抓的域名 (如 api.bilibili.com)
 * 使用:
 *  1. 需要抓时启用这条脚本 (确认 MITM 里有目标域名)
 *  2. 打开对应 App / 网站刷一下 (登录状态)
 *  3. 收到「Cookie 已保存」通知后, 禁用脚本即可
 * 查看复制:
 *  - BoxJs (推荐): 浏览器打开 http://boxjs.com (Egern 代理保持开启)
 *    → 应用订阅 → 添加 cookie-catcher.boxjs.json 的链接
 *    → 「全部 Cookie」里按域名找, 或直接复制「B站 SESSDATA」
 *  - 备选: Egern → 脚本 → 日志, 搜索 [Cookie抓取]
 *
 * 加新网站: 下方 TARGET_HOSTS 加一行域名 + Egern MITM 加对应主机名, 完事。
 */

// 改成 true 则对所有 MITM 过的域名都抓 (不推荐, 会存一堆广告/统计域名的 Cookie)
const MATCH_ALL = false;

// 要抓的域名填这里, 自动含所有子域名
// 已按你的常用 App 配好: 打开模块刷 App 就自动抓
const TARGET_HOSTS = [
  'bilibili.com',   // 哔哩哔哩 App / 网页
  'snssdk.com',     // 抖音 App (aweme.snssdk.com)
  'douyin.com',     // 抖音网页版
  'kuaishou.com',   // 快手
  'kuaishouzt.com', // 快手 App
  'douyu.com',      // 斗鱼
];

// 新域名首次抓到时弹窗; 同一域名重复抓到只静默更新 (避免通知轰炸)
const NOTIFY_ON_NEW_HOST_ONLY = true;

const KEY_DUMP = 'cookie_catcher_dump'; // JSON 总表, BoxJs 读这个
const KEY_PREFIX = 'cookie_catcher_';   // 每个域名一条: cookie_catcher_<域名>
const MAX_HOSTS = 50;                   // 总表最多保留多少个域名

function read(key) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
    if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
  } catch (e) {}
  return null;
}

function write(key, val) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.write(key, val);
    if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(key, val);
  } catch (e) {}
  return false;
}

function notify(title, subtitle, body) {
  try {
    if (typeof $notification !== 'undefined') { $notification.post(title, subtitle, body); return; }
    if (typeof $notify !== 'undefined') { $notify(title, subtitle, body); return; }
  } catch (e) {}
}

function getHeader(headers, name) {
  const want = name.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === want) return headers[k];
  }
  return '';
}

function getHostname(url) {
  const m = (url || '').match(/^https?:\/\/([^\/:]+)/i);
  return m ? m[1].toLowerCase() : '';
}

function hostMatch(host) {
  if (MATCH_ALL) return true;
  return TARGET_HOSTS.some(function (t) {
    t = t.toLowerCase();
    return host === t || host.endsWith('.' + t);
  });
}

function nowStr() {
  const d = new Date();
  const p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

const host = getHostname($request.url || '');
if (!host || !hostMatch(host)) { $done({}); }

const cookie = getHeader($request.headers || {}, 'cookie');
if (!cookie) { $done({}); }

const storeKey = KEY_PREFIX + host.replace(/[^a-z0-9]/gi, '_');
if (cookie === read(storeKey)) { $done({}); } // 没变化就不写

write(storeKey, cookie);

let dump = {};
try { dump = JSON.parse(read(KEY_DUMP) || '{}'); } catch (e) { dump = {}; }
const isNew = !dump[host];
dump[host] = { cookie: cookie, updated: nowStr() };
// 超量时删最旧的
const keys = Object.keys(dump);
if (keys.length > MAX_HOSTS) {
  keys.sort(function (a, b) { return dump[a].updated < dump[b].updated ? -1 : 1; });
  for (let i = 0; i < keys.length - MAX_HOSTS; i++) delete dump[keys[i]];
}
write(KEY_DUMP, JSON.stringify(dump, null, 2));

// B站快捷键: SESSDATA 单独存一份, 方便直接复制去配弹幕 API
if (host === 'bilibili.com' || host.endsWith('.bilibili.com')) {
  const m = cookie.match(/(?:^|;\s*)SESSDATA=([^;]*)/);
  if (m && m[1]) write('bili_sessdata', m[1]);
}

console.log('[Cookie抓取] ' + host + ' 已更新 (' + nowStr() + ')');
if (!NOTIFY_ON_NEW_HOST_ONLY || isNew) {
  notify('🍪 Cookie 已保存', host, '已存入 BoxJs, 抓完记得关掉本脚本');
}

$done({});
