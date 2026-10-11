/*
 * 通用 Cookie 抓取脚本 (Egern 原生 API 版)
 * 配合 cookie-catcher.yaml 原生模块使用
 * 类型: http-request (请求头拦截)
 * 匹配: ^https?://  (全匹配, 靠下方 SITES 过滤)
 * MITM: 模块里已配好各站的 API 域名
 *
 * 开关: 模块设置页里的「抓取」拨动开关 (env_schema 渲染),
 * 默认关闭。打开后刷 App 自动抓取, 抓完关闭开关即可,
 * 不用再整个模块开开关关。
 *
 * 原理: MITM 解密 App 的 HTTPS 请求后, 脚本在请求发出去之前读到
 * 请求头里的 Cookie, 按站点分别写入持久化存储。
 * 数据在 BoxJs 里按站点分类查看复制。
 *
 * 只存"已登录"的 Cookie: 每个站点配了 loginKeys (登录态标记字段),
 * Cookie 里没有这些字段说明没登录, 直接跳过不存、不弹窗。
 *
 * 一站只抓一次: 某站点抓到过就不再覆盖, 避免重复抓取。
 * 想重抓 (换号/过期) 时, 去 BoxJs 里把该站点那一栏清空, 再开开关抓一次即可。
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

function log(ctx, msg) {
  try { if (ctx && typeof ctx.log === 'function') ctx.log(msg); } catch (e) {}
}

function notify(ctx, title, body) {
  try { ctx.notify({ title: title, body: body }); } catch (e) {}
}

// 兼容两种 headers 形态: Headers 对象 (.get) / 普通对象
function getHeader(headers, name) {
  try {
    if (headers && typeof headers.get === 'function') {
      const v = headers.get(name);
      if (v) return v;
    }
  } catch (e) {}
  try {
    const want = String(name).toLowerCase();
    const keys = Object.keys(headers || {});
    for (let i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === want) return headers[keys[i]];
    }
  } catch (e) {}
  return '';
}

function getHostname(url) {
  const m = String(url || '').match(/^https?:\/\/([^/:]+)/i);
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
  const pairs = String(cookie || '').split(';');
  for (const p of pairs) {
    const idx = p.indexOf('=');
    const n = (idx === -1 ? p : p.slice(0, idx)).trim();
    if (n) names.push(n);
  }
  return names;
}

function isLoggedIn(cookie, site) {
  const names = cookieNames(cookie);
  return site.loginKeys.some(k => names.indexOf(k) !== -1);
}

export default async function main(ctx) {
  try {
    // 总开关: 模块设置页里的「抓取」拨动开关, 默认关闭
    const enabled = ctx && ctx.env && ctx.env.ENABLE_CAPTURE;
    if (enabled !== 'true') return;

    const req = (ctx && ctx.request) || {};
    const host = getHostname(req.url || '');
    const site = host ? findSite(host) : null;
    if (!site) return;

    const cookie = String(getHeader(req.headers, 'cookie') || '').trim();
    if (!cookie) return;

    // 没登录的不存: 游客 Cookie 抓了也没用
    if (!isLoggedIn(cookie, site)) {
      log(ctx, '[Cookie抓取] ' + site.name + ' 未登录，跳过');
      return;
    }

    const storeKey = KEY_PREFIX + site.id;
    let existed = null;
    try { existed = ctx.storage.get(storeKey); } catch (e) {}
    if (existed) {
      log(ctx, '[Cookie抓取] ' + site.name + ' 已抓过，跳过');
      return;
    }

    // 该站点第一次抓到: 存 + 弹窗
    try { ctx.storage.set(storeKey, cookie); } catch (e) {}
    let saved = null;
    try { saved = ctx.storage.get(storeKey); } catch (e) {}
    log(ctx, '[Cookie抓取] ' + site.name + ' (' + host + ') 写入' + (saved ? '成功' : '失败'));

    if (!saved) {
      notify(ctx, '🍪 保存失败', site.name + '：写入存储失败，请截图此通知反馈');
    } else {
      notify(ctx, '🍪 Cookie 已保存', site.name + '：已存入 BoxJs 对应分类，抓完记得关闭抓取开关');
    }
  } catch (e) {
    log(ctx, '[Cookie抓取] 脚本异常: ' + ((e && e.message) || e));
    notify(ctx, '🍪 脚本异常', String((e && e.message) || e).slice(0, 200));
  }
}
