/*
 * 通用 Cookie 抓取脚本 (按站点分类版)
 * 适用: Egern / Loon / Surge / Quantumult X
 * 类型: http-request (请求头拦截)
 * 匹配: ^https?://  (全匹配, 靠下方 SITES 过滤)
 * MITM: 模块里已配好各站的 API 域名, 开关模块即开关抓取
 *
 * 原理: MITM 解密 App 的 HTTPS 请求后, 脚本在请求发出去之前读到
 * 请求头里的 Cookie, 按站点分别写入 $persistentStore 持久化保存。
 * 抓完把模块关掉, 数据都留着, 在 BoxJs 里按站点查看复制。
 *
 * 只存"已登录"的 Cookie: 每个站点配了 loginKeys (登录态标记字段),
 * Cookie 里没有这些字段说明没登录, 直接跳过不存、不弹窗。
 *
 * 一站只抓一次: 某站点抓到过就不再覆盖, 避免重复抓取。
 * 想重抓 (换号/过期) 时, 去 BoxJs 里把该站点那一栏清空, 再开模块抓一次即可。
 *
 * 加新站点: 下方 SITES 加一项 {id, name, hosts, loginKeys} + 模块 MITM
 * 里加它的 API 域名 + BoxJs 订阅里加对应分类。
 */

const SITES = [
  { id: 'bilibili', name: '哔哩哔哩', hosts: ['bilibili.com'],
    loginKeys: ['SESSDATA', 'DedeUserID', 'bili_jct'] },
  { id: 'douyin',   name: '抖音',     hosts: ['snssdk.com', 'douyin.com'],
    loginKeys: ['sessionid', 'sessionid_ss', 'sid_guard'] },
  { id: 'kuaishou',  name: '快手',     hosts: ['kuaishou.com', 'kuaishouzt.com'],
    loginKeys: ['userId', 'kuaishou.api_st'] }, // 待实机验证: 登录后若抓不到, 换标记
  { id: 'douyu',    name: '斗鱼',     hosts: ['douyu.com'],
    loginKeys: ['acf_uid', 'acf_auth'] },
];

const KEY_PREFIX = 'cookie_catcher_site_'; // 每个站点一条, 如 cookie_catcher_site_bilibili

function read(key) {
  try {
    if (typeof $persistentStore !== 'undefined') return $persistentStore.read(key);
    if (typeof $prefs !== 'undefined') return $prefs.valueForKey(key);
  } catch (e) {}
  return null;
}

function write(key, val) {
  try {
    // 注意参数顺序: 值在前, 键在后 ($persistentStore.write(value, key))
    if (typeof $persistentStore !== 'undefined') return $persistentStore.write(val, key);
    if (typeof $prefs !== 'undefined') return $prefs.setValueForKey(val, key);
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

function findSite(host) {
  for (const s of SITES) {
    for (const h of s.hosts) {
      if (host === h || host.endsWith('.' + h)) return s;
    }
  }
  return null;
}

// 解析 Cookie 字符串里的字段名 (按名精确匹配, 不用子串避免误判)
function cookieNames(cookie) {
  const names = [];
  const pairs = (cookie || '').split(';');
  for (const p of pairs) {
    const idx = p.indexOf('=');
    const n = (idx === -1 ? p : p.slice(0, idx)).trim();
    if (n) names.push(n);
  }
  return names;
}

function isLoggedIn(cookie, site) {
  const names = cookieNames(cookie);
  for (const k of site.loginKeys) {
    if (names.indexOf(k) !== -1) return true;
  }
  return false;
}

const host = getHostname($request.url || '');
const site = host ? findSite(host) : null;
if (!site) { $done({}); return; }

const cookie = getHeader($request.headers || {}, 'cookie');
if (!cookie) { $done({}); return; }

// 没登录的不存: 游客 Cookie 抓了也没用
if (!isLoggedIn(cookie, site)) {
  console.log('[Cookie抓取] ' + site.name + ' 未登录，跳过');
  $done({}); return;
}

const storeKey = KEY_PREFIX + site.id;
if (read(storeKey)) {
  console.log('[Cookie抓取] ' + site.name + ' 已抓过，跳过');
  $done({}); return;
}

// 该站点第一次抓到: 存 + 弹窗
write(storeKey, cookie);
console.log('[Cookie抓取] ' + site.name + ' (' + host + ') 已保存');
notify('🍪 Cookie 已保存', site.name, '已存入 BoxJs 对应分类，抓完记得关掉本模块');

$done({});
