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
 * 加新站点: 下方 SITES 加一项 {id, name, hosts} + 模块 MITM 里加它的 API 域名。
 */

const SITES = [
  { id: 'bilibili', name: '哔哩哔哩', hosts: ['bilibili.com'] },
  { id: 'douyin',   name: '抖音',     hosts: ['snssdk.com', 'douyin.com'] },
  { id: 'kuaishou',  name: '快手',     hosts: ['kuaishou.com', 'kuaishouzt.com'] },
  { id: 'douyu',    name: '斗鱼',     hosts: ['douyu.com'] },
];

// 新站点首次抓到时弹窗; 同一站点重复抓到只静默更新 (避免通知轰炸)
const NOTIFY_ON_NEW_SITE_ONLY = true;

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

function findSite(host) {
  for (const s of SITES) {
    for (const h of s.hosts) {
      if (host === h || host.endsWith('.' + h)) return s;
    }
  }
  return null;
}

const host = getHostname($request.url || '');
const site = host ? findSite(host) : null;
if (!site) { $done({}); }

const cookie = getHeader($request.headers || {}, 'cookie');
if (!cookie) { $done({}); }

const storeKey = KEY_PREFIX + site.id;
const old = read(storeKey);
const isNew = !old;
if (cookie === old) { $done({}); } // 没变化就不写

write(storeKey, cookie);
console.log('[Cookie抓取] ' + site.name + ' (' + host + ') 已更新');
if (!NOTIFY_ON_NEW_SITE_ONLY || isNew) {
  notify('🍪 Cookie 已保存', site.name, '已存入 BoxJs 对应分类，抓完记得关掉本模块');
}

$done({});
