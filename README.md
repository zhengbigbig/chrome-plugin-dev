# 谷歌插件开发

内容总结自：https://www.bookstack.cn/read/chrome-plugin-develop/spilt.1.8bdb1aac68bbdc44.md

## 前言

### 开发与调试 
可参照：https://www.bookstack.cn/read/chrome-plugin-develop/spilt.6.8bdb1aac68bbdc44.md
- Chrome插件没有严格的项目结构要求，只要保证本目录有一个manifest.json即可
- 从右上角菜单->更多工具->扩展程序可以进入 插件管理页面，也可以直接在地址栏输入chrome://extensions 访问。
- 开发过程使用：yarn dev 可启动对popup页面开发，页面打开
- 调试过程使用：yarn build 可热更新自动打包，dist丢到chrome://extensions即可，必须开启开发者模式
- 修改了devtools页面的代码时，需要先在 chrome://extensions 页面按下Ctrl+R重新加载插件，然后关闭再打开开发者工具即可，无需刷新页面（而且只刷新页面不刷新开发者工具的话是不会生效的）。

## 1. manifest.json 配置

```json
{
  // 清单文件的版本，这个必须写，而且必须是2
  "manifest_version": 2,
  // 插件的名称
  "name": "demo",
  // 插件的版本
  "version": "1.0.0",
  // 插件描述
  "description": "简单的Chrome扩展demo",
  // 图标，一般偷懒全部用一个尺寸的也没问题
  "icons": {
    "16": "img/icon.png",
    "48": "img/icon.png",
    "128": "img/icon.png"
  },
  // 会一直常驻的后台JS或后台页面
  "background": {
    // 2种指定方式，如果指定JS，那么会自动生成一个背景页
    "page": "background.html"
    //"scripts": ["js/background.js"]
  },
  // 浏览器右上角图标设置，browser_action、page_action、app必须三选一
  "browser_action": {
    "default_icon": "img/icon.png",
    // 图标悬停时的标题，可选
    "default_title": "这是一个示例Chrome插件",
    "default_popup": "popup.html"
  },
  // 当某些特定页面打开才显示的图标
  /*"page_action":
 {
 "default_icon": "img/icon.png",
 "default_title": "我是pageAction",
 "default_popup": "popup.html"
 },*/
  // 需要直接注入页面的JS
  "content_scripts": [
    {
      //"matches": ["http://*/*", "https://*/*"],
      // "<all_urls>" 表示匹配所有地址
      "matches": ["<all_urls>"],
      // 多个JS按顺序注入
      "js": ["js/jquery-1.8.3.js", "js/content-script.js"],
      // JS的注入可以随便一点，但是CSS的注意就要千万小心了，因为一不小心就可能影响全局样式
      "css": ["css/custom.css"],
      // 代码注入的时间，可选值： "document_start", "document_end", or "document_idle"，最后一个表示页面空闲时，默认document_idle
      "run_at": "document_start"
    },
    // 这里仅仅是为了演示content-script可以配置多个规则
    {
      "matches": ["*://*/*.png", "*://*/*.jpg", "*://*/*.gif", "*://*/*.bmp"],
      "js": ["js/show-image-content-size.js"]
    }
  ],
  // 权限申请
  "permissions": [
    "contextMenus", // 右键菜单
    "tabs", // 标签
    "notifications", // 通知
    "webRequest", // web请求
    "webRequestBlocking",
    "storage", // 插件本地存储
    "http://*/*", // 可以通过executeScript或者insertCSS访问的网站
    "https://*/*" // 可以通过executeScript或者insertCSS访问的网站
  ],
  // 普通页面能够直接访问的插件资源列表，如果不设置是无法直接访问的
  "web_accessible_resources": ["js/inject.js"],
  // 插件主页，这个很重要，不要浪费了这个免费广告位
  "homepage_url": "https://www.baidu.com",
  // 覆盖浏览器默认页面
  "chrome_url_overrides": {
    // 覆盖浏览器默认的新标签页
    "newtab": "newtab.html"
  },
  // Chrome40以前的插件配置页写法
  "options_page": "options.html",
  // Chrome40以后的插件配置页写法，如果2个都写，新版Chrome只认后面这一个
  "options_ui": {
    "page": "options.html",
    // 添加一些默认的样式，推荐使用
    "chrome_style": true
  },
  // 向地址栏注册一个关键字以提供搜索建议，只能设置一个关键字
  "omnibox": { "keyword": "go" },
  // 默认语言
  "default_locale": "zh_CN",
  // devtools页面入口，注意只能指向一个HTML文件，不能是JS文件
  "devtools_page": "devtools.html"
}
```

## 2. content-scripts

和原始页面共享 DOM，但是不共享 JS。
虽然可以操作 DOM，但 DOM 不能调用它，也就是无法在 DOM 中通过绑定事件的方式调用 content-scripts 中的代码。
如要访问页面 JS（例如某个 JS 变量），只能通过 injected js 来实现。content-scripts 不能访问绝大部分 chrome.xxx.api，除了下面这 4 种：

- chrome.extension(getURL , inIncognitoContext , lastError , onRequest , sendRequest)
- chrome.i18n
- chrome.runtime(connect , getManifest , getURL , id , onConnect , onMessage , sendMessage)
- chrome.storage

如果要调用其他 api，还可以通过通信来实现让 background 来帮你调用

### injected-scripts

例子：通过 DOM 方式向页面注入 injected-scripts

```js
// 向页面注入JS
function injectCustomJs(jsPath) {
  jsPath = jsPath || 'js/inject.js'
  var temp = document.createElement('script')
  temp.setAttribute('type', 'text/javascript')
  // 获得的地址类似：chrome-extension://ihcokhadfjfchaeagdoclpnjdiokfakg/js/inject.js
  temp.src = chrome.extension.getURL(jsPath)
  temp.onload = function () {
    // 放在页面不好看，执行完后移除掉
    this.parentNode.removeChild(this)
  }
  document.head.appendChild(temp)
}
```

然后显示声明资源，不然报错：

```json
{
  // 普通页面能够直接访问的插件资源列表，如果不设置是无法直接访问的
  "web_accessible_resources": ["js/injected.js"]
}
```

至于 inject-script 如何调用 content-script 中的代码，后面使用消息通信

## 3. background

- 声明周期是插件中所有类型页面中最长的，浏览器打开则打开，浏览器关闭则关闭。
- 通常把需要一直运行、启动就要运行、全局的代码放在这
- 权限最高，几乎可以调用所有的 Chrome 扩展 API，除了 devtools，而且可以无限制跨域，也可访问任何网站而无需对方设置 CORS

```json
{
  // 会一直常驻的后台JS或后台页面
  "background": {
    // 2种指定方式，如果指定JS，那么会自动生成一个背景页
    "page": "background.html"
    //"scripts": ["js/background.js"]
  }
}
```

### event-pages

鉴于 background 生命周期太长，长时间挂载后台可能会影响性能，所以 Google 又弄一个 event-pages，在配置文件上，它与 background 的唯一区别就是多了一个 persistent 参数：

```json
{
  "background": {
    "scripts": ["event-page.js"],
    "persistent": false
  }
}
```

生命周期是：在被需要时加载，在空闲时被关闭，什么叫被需要时呢？比如第一次安装、插件更新、有 content-script 向它发送消息，等等。

## 4. popup

popup 是点击 browser_action 或者 page_action 图标时打开的一个小窗口网页，焦点离开网页就立即关闭，一般用来做一些临时性的交互。

- 通过指定 default_popup 字段来指定页面，HTML 内容会自适应大小
- 通过调用 setPopup()方法

权限上，与 background 类似，最大不同，popup 中可以直接通过 chrome.extension.getBackgroundPage()获取 background 的 window 对象。

## 5. Chrome Plugin 8 种展示形式

### 5.1 browserAction(浏览器右上角)

通过配置 browser_action 可以在浏览器的右上角增加一个图标，一个 browser_action 可以拥有一个图标，一个 tooltip，一个 badge 和一个 popup。

```json
  "browser_action": {
    "default_icon": "assets/icon.png",
    "default_title": "demo",
    "default_popup": "popup.html"
  },
```

- 可以通过 manifest 中 default_icon 来设置，推荐 19px png 图片
- 也可以通过调用 setIcon()方法
- tooltip 是鼠标悬浮插件展示内容，通过 default_title 设置或调用 setTitle()
- badge 就是图标上显示一些文本，badge 空间有限，只支持 4 个以下字符(英文 4 个，中文 2 个)
- 必须通过代码实现，设置 badge 文字和颜色可以分别使用 setBadgeText()和 setBadgeBackgroundColor()

```js
chrome.browserAction.setBadgeText({ text: 'new' })
chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] })
```

### 5.2 pageAction(地址栏右侧)

- pageAction 只有当特定页面打开才显示的图标，谷歌新将该图标从地址栏移动到了右侧，调整后 pageAction 可以看作置灰的 browserAction

```js
chrome.pageAction.show(tabId) 显示图标；
chrome.pageAction.hide(tabId) 隐藏图标；
```

示例：只有打开百度才显示图标

```json
// manifest.json
{
 "page_action":
 {
 "default_icon": "img/icon.png",
 "default_title": "我是pageAction",
 "default_popup": "popup.html"
 },
 "permissions": ["declarativeContent"]
}
```
```js
// background.js
chrome.runtime.onInstalled.addListener(function(){
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function(){
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          // 只有打开百度才显示pageAction
          new chrome.declarativeContent.PageStateMatcher({pageUrl: {urlContains: 'baidu.com'}})
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});
```

### 5.3 右键菜单

- 通过开发Chrome插件可以自定义浏览器的右键菜单
- 主要通过chrome.contextMenus API实现

demo1: 最简单的右键菜单
```json
// manifest.json
{"permissions": ["contextMenus"]}
```
```js
// background.js
chrome.contextMenus.create({
 title: "测试右键菜单",
 onclick: function(){alert('您点击了右键菜单！');}
});
```

demo2: 添加右键百度搜索

```json
// manifest.json
{"permissions": ["contextMenus"， "tabs"]}
```
```js
// background.js
chrome.contextMenus.create({
 title: '使用度娘搜索：%s', // %s表示选中的文字
 contexts: ['selection'], // 只有当选中文字时才会出现此右键菜单
 onclick: function(params){
  // 注意不能使用location.href，因为location是属于background的window对象
  chrome.tabs.create({url: 'https://www.baidu.com/s?ie=utf-8&wd=' + encodeURI(params.selectionText)});
 }
});
```

语法说明：
完整API见：https://developer.chrome.com/extensions/contextMenus

```js
chrome.contextMenus.create({
 type: 'normal'， // 类型，可选：["normal", "checkbox", "radio", "separator"]，默认 normal
 title: '菜单的名字', // 显示的文字，除非为“separator”类型否则此参数必需，如果类型为“selection”，可以使用%s显示选定的文本
 contexts: ['page'], // 上下文环境，可选：["all", "page", "frame", "selection", "link", "editable", "image", "video", "audio"]，默认page
 onclick: function(){}, // 单击时触发的方法
 parentId: 1, // 右键菜单项的父菜单项ID。指定父菜单项将会使此菜单项成为父菜单项的子菜单
 documentUrlPatterns: 'https://*.baidu.com/*' // 只在某些页面显示此右键菜单
});
// 删除某一个菜单项
chrome.contextMenus.remove(menuItemId)；
// 删除所有自定义右键菜单
chrome.contextMenus.removeAll();
// 更新某一个菜单项
chrome.contextMenus.update(menuItemId, updateProperties);
```

### 5.4 override(覆盖特定页面)

- 使用override页可以将Chrome默认的一些特定页面替换掉，改为使用扩展提供的页面。
- 扩展可以替代如下页面：
  - 历史记录：从工具菜单上点击历史记录时访问的页面，或者从地址栏直接输入chrome://history
  - 新标签页：当创建新标签的时候访问的页面，或者从地址栏直接输入chrome://newtab
  - 书签：浏览器的书签，或者直接输入chrome://bookmarks
- 一个扩展只能替换一个页面；不能替代隐身窗口的新标签页；网页必须设置title，否则用户可能会看到网页的URL

```json
"chrome_url_overrides":
  {
  "newtab": "newtab.html",
  "history": "history.html",
  "bookmarks": "bookmarks.html"
  }
```

### 5.5 devtools(开发者工具)

- 自定义一个和多个和Elements、Console、Sources等同级别的面板；
- 自定义侧边栏(sidebar)，目前只能自定义Elements面板的侧边栏；

每打开一个开发者工具窗口，都会创建devtools页面的实例，F12窗口关闭，页面也随着关闭，所以devtools页面的生命周期和devtools窗口是一致的。devtools页面可以访问一组特有的DevTools API以及有限的扩展API，这组特有的DevTools API只有devtools页面才可以访问，background都无权访问，这些API包括：
- chrome.devtools.panels：面板相关；
- chrome.devtools.inspectedWindow：获取被审查窗口的有关信息；
- chrome.devtools.network：获取有关网络请求的信息；

大部分扩展API都无法直接被DevTools页面调用，但它可以像content-script一样直接调用chrome.extension和chrome.runtimeAPI，同时它也可以像content-script一样使用Message交互的方式与background页面进行通信。

示例1：创建一个devtools扩展 / 侧边栏

```json
{
 // 只能指向一个HTML文件，不能是JS文件
 "devtools_page": "devtools.html"
}
```
```html
<!DOCTYPE html>
<html>
<head></head>
<body>
 <script type="text/javascript" src="js/devtools.js"></script>
</body>
</html>
```
```js
// 创建自定义面板，同一个插件可以创建多个自定义面板
// 几个参数依次为：panel标题、图标（其实设置了也没地方显示）、要加载的页面、加载成功后的回调
chrome.devtools.panels.create('MyPanel', 'img/icon.png', 'mypanel.html', function(panel){
 console.log('自定义面板创建成功！'); // 注意这个log一般看不到
});
// 创建自定义侧边栏
chrome.devtools.panels.elements.createSidebarPane("Images", function(sidebar){
 // sidebar.setPage('../sidebar.html'); // 指定加载某个页面
 sidebar.setExpression('document.querySelectorAll("img")', 'All Images'); // 通过表达式来指定
 //sidebar.setObject({aaa: 111, bbb: 'Hello World!'}); // 直接设置显示某个对象
});
```

示例2：检测当前页面有无jQuery
```js
// 检测jQuery
document.getElementById('check_jquery').addEventListener('click', function(){
 // 访问被检查的页面DOM需要使用inspectedWindow
 // 简单例子：检测被检查页面是否使用了jQuery
 chrome.devtools.inspectedWindow.eval("jQuery.fn.jquery", function(result, isException){
  var html = '';
  if (isException) html = '当前页面没有使用jQuery。';
  else html = '当前页面使用了jQuery，版本为：'+result;
  alert(html);
  });
});
// 打开某个资源
document.getElementById('open_resource').addEventListener('click', function(){
 chrome.devtools.inspectedWindow.eval("window.location.href", function(result, isException){
  chrome.devtools.panels.openResource(result, 20, function(){
  console.log('资源打开成功！');
  });
 });
});
// 审查元素
document.getElementById('test_inspect').addEventListener('click', function(){
 chrome.devtools.inspectedWindow.eval("inspect(document.images[0])", function(result, isException){});
});
// 获取所有资源
document.getElementById('get_all_resources').addEventListener('click', function(){
 chrome.devtools.inspectedWindow.getResources(function(resources){
  alert(JSON.stringify(resources));
 });
});
```

### 5.6 option(选项页)

- 所谓options页，就是插件的设置页面，有2个入口，一个是右键图标有一个“选项”菜单，还有一个在插件管理页面：
- 点击选项后就是打开一个网页

老版配置
```json
{
 // Chrome40以前的插件配置页写法
 "options_page": "options.html",
}
```

新版配置
```json
{
 "options_ui":
 {
 "page": "options.html",
 // 添加一些默认的样式，推荐使用
 "chrome_style": true
 },
}
```

- 为了兼容，建议2种都写，如果都写了，Chrome40以后会默认读取新版的方式；
- 新版options中不能使用alert；
- 数据存储建议用chrome.storage，因为会随用户自动同步；

### 5.7 omnibox

- omnibox是向用户提供搜索建议的一种方式
- 注册某个关键字以触发插件
  
```json
{
 // 向地址栏注册一个关键字以提供搜索建议，只能设置一个关键字
 "omnibox": { "keyword" : "go" },
}
```

```js
// background.js
// omnibox 演示
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
 console.log('inputChanged: ' + text);
 if(!text) return;
 if(text == '美女') {
  suggest([
    {content: '中国' + text, description: '你要找“中国美女”吗？'},
    {content: '日本' + text, description: '你要找“日本美女”吗？'},
    {content: '泰国' + text, description: '你要找“泰国美女或人妖”吗？'},
    {content: '韩国' + text, description: '你要找“韩国美女”吗？'}
  ]);
 } else if(text == '微博') {
  suggest([
    {content: '新浪' + text, description: '新浪' + text},
    {content: '腾讯' + text, description: '腾讯' + text},
    {content: '搜狐' + text, description: '搜索' + text},
  ]);
 } else {
  suggest([
    {content: '百度搜索 ' + text, description: '百度搜索 ' + text},
    {content: '谷歌搜索 ' + text, description: '谷歌搜索 ' + text},
  ]);
 }
});
// 当用户接收关键字建议时触发
chrome.omnibox.onInputEntered.addListener((text) => {
 console.log('inputEntered: ' + text);
 if(!text) return;
 var href = '';
 if(text.endsWith('美女')) href = 'http://image.baidu.com/search/index?tn=baiduimage&ie=utf-8&word=' + text;
 else if(text.startsWith('百度搜索')) href = 'https://www.baidu.com/s?ie=UTF-8&wd=' + text.replace('百度搜索 ', '');
 else if(text.startsWith('谷歌搜索')) href = 'https://www.google.com.tw/search?q=' + text.replace('谷歌搜索 ', '');
 else href = 'https://www.baidu.com/s?ie=UTF-8&wd=' + text;
 openUrlCurrentTab(href);
});
// 获取当前选项卡ID
function getCurrentTabId(callback){
 chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
  if(callback) callback(tabs.length ? tabs[0].id: null);
 });
}
// 当前标签打开某个链接
function openUrlCurrentTab(url){
 getCurrentTabId(tabId => {
  chrome.tabs.update(tabId, {url: url});
 })
}
```

### 5.8 桌面通知

- Chrome提供了一个chrome.notificationsAPI以便插件推送桌面通知，暂未找到chrome.notifications和HTML5自带的Notification的显著区别及优势。
- 在后台JS中，无论是使用chrome.notifications还是Notification都不需要申请权限（HTML5方式需要申请权限），直接使用即可

```js
chrome.notifications.create(null, {
 type: 'basic',
 iconUrl: 'img/icon.png',
 title: '这是标题',
 message: '您刚才点击了自定义右键菜单！'
});
```

## 总结：

### 权限对比

| JS种类          | 可访问的API                                    | DOM访问情况  | JS访问情况 | 直接跨域 |
|-----------------|------------------------------------------------|--------------|------------|----------|
| injected script | 和普通JS无任何差别，不能访问任何扩展API        | 可以访问     | 可以访问   | 不可以   |
| content script  | 只能访问 extension、runtime等部分API           | 可以访问     | 不可以     | 不可以   |
| popup js        | 可访问绝大部分API，除了devtools系列            | 不可直接访问 | 不可以     | 可以     |
| background js   | 可访问绝大部分API，除了devtools系列            | 不可直接访问 | 不可以     | 可以     |
| devtools js     | 只能访问 devtools、extension、runtime等部分API | 可以         | 可以       | 不可以   |

### 调试方式对比
| JS类型          | 调试方式                 | JS访问情况 | 直接跨域 |
|-----------------|--------------------------|------------|----------|
| injected script | 直接普通的F12即可        | 可以访问   | 不可以   |
| content-script  | 打开Console,如图切换     | 不可以     | 不可以   |
| popup-js        | popup页面右键审查元素    | 不可以     | 可以     |
| background      | 插件管理页点击背景页即可 | 不可以     | 可以     |
| devtools-js     | 暂未找到有效方法         | 可以       | 不可以   |

## 6 消息通信

前面概述了插件中存在的5种JS，background / content-scripts / injected-script / popup / devtools
这里来介绍它们之间的互相通信，popup和background权限一样，可以视为一类
### 6.1 互相通信概览

注：-表示不存在或者无意义，或者待验证。

|                 | injected-script                       | content-script                              | popup-js                                          | background-js                                     |
|-----------------|---------------------------------------|---------------------------------------------|---------------------------------------------------|---------------------------------------------------|
| injected-script | -                                     | window.postMessage                          | -                                                 | -                                                 |
| content-script  | window.postMessage                    | -                                           | chrome.runtime.sendMessage chrome.runtime.connect | chrome.runtime.sendMessage chrome.runtime.connect |
| popup-js        | -                                     | chrome.tabs.sendMessage chrome.tabs.connect | -                                                 | chrome.extension. getBackgroundPage()             |
| background-js   | -                                     | chrome.tabs.sendMessage chrome.tabs.connect | chrome.extension.getViews                         | -                                                 |
| devtools-js     | chrome.devtools. inspectedWindow.eval | -                                           | chrome.runtime.sendMessage                        | chrome.runtime.sendMessage                        |

### 6.2 通信详细介绍

#### 6.2.1 popup 与 background 通信

- popup可以直接调用background中JS方法，也可以直接访问background的DOM
- background访问popup,需要popup处于打开状态
- 如果background中JS报错，则无法访问

示例1：popup -> background
```js
// background.js
function test(){
 alert('我是background！');
}
// popup.js
var bg = chrome.extension.getBackgroundPage();
bg.test(); // 访问bg的函数
alert(bg.document.body.innerHTML); // 访问bg的DOM
```
示例2：background -> popup
```js
var views = chrome.extension.getViews({type:'popup'});
if(views.length > 0) {
 console.log(views[0].location.href);
}
```

#### 6.2.2 popup或者bg 与 content-scripts 通信

- 双方通信直接发送的都是JSON对象，不是JSON字符串，所以无需解析，很方便（当然也可以直接发送字符串)
- 有些老项目使用的chrome.extension.onMessage，现在建议统一使用chrome.runtime.onMessage

示例1：popup/bg -> content-scripts
```js
// popup/bg发送消息
function sendMessageToContentScript(message, callback){
 chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
  chrome.tabs.sendMessage(tabs[0].id, message, function(response){
      if(callback) callback(response);
  });
 });
}
sendMessageToContentScript({cmd:'test', value:'你好，我是popup！'}, function(response) { 
  console.log('来自content的回复：'+response); 
});
// content接收消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
 // console.log(sender.tab ?"from a content script:" + sender.tab.url :"from the extension");
 if(request.cmd == 'test') alert(request.value);
 sendResponse('我收到了你的消息！');
});
```
示例2：content-scripts -> popup/bg
```js
// content-scripts发送消息
chrome.runtime.sendMessage({greeting: '你好，我是content-script呀，我主动发消息给后台！'}, function(response) {
 console.log('收到来自后台的回复：' + response);
});
// popup/bg接收消息
// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
 console.log('收到来自content-script的消息：');
 console.log(request, sender, sendResponse);
 sendResponse('我是后台，我已收到你的消息：' + JSON.stringify(request));
});
```

注意：
- content_scripts向popup主动发消息的前提是popup必须打开！否则需要利用background作中转；
- 如果background和popup同时监听，那么它们都可以同时收到消息，但是只有一个可以sendResponse，一个先发送了，那么另外一个再发送就无效；

#### 6.2.3 injected 与 content_scripts通信

content-script和页面内的脚本（injected-script自然也属于页面内的脚本）之间唯一共享的东西就是页面的DOM元素，有2种方法可以实现二者通讯：
  1. 可以通过window.postMessage和window.addEventListener来实现二者消息通讯；（推荐）
    ```js
      // injected.js
      window.postMessage({"test": '你好！'}, '*');
      // content_scripts
      window.addEventListener("message", function(e){
        console.log(e.data);
      }, false);
    ```
  2. 通过自定义DOM事件来实现；
    ```js
      // injected.js
      var customEvent = document.createEvent('Event');
      customEvent.initEvent('myCustomEvent', true, true);
      function fireCustomEvent(data) {
       hiddenDiv = document.getElementById('myCustomEventDiv');
       hiddenDiv.innerText = data
       hiddenDiv.dispatchEvent(customEvent);
      }
      fireCustomEvent('你好，我是普通JS！');

      // content-script
      var hiddenDiv = document.getElementById('myCustomEventDiv');
      if(!hiddenDiv) {
        hiddenDiv = document.createElement('div');
        hiddenDiv.style.display = 'none';
        document.body.appendChild(hiddenDiv);
      }
      hiddenDiv.addEventListener('myCustomEvent', function() {
      var eventData = document.getElementById('myCustomEventDiv').innerText;
      console.log('收到自定义事件消息：' + eventData);
      });
    ```

#### 6.2.4 injected 与 popup 通信

injected无法直接与popup通信,必须借助content-scripts作为中间


### 6.3 长连接和短连接

Chrome插件有2种通信方式：
- 短连接
  - chrome.tabs.sendMessage / chrome.runtime.sendMessage
- 长连接
  - chrome.tabs.connect / chrome.runtime.connect

示例：长连接代码

```js
// popup.js
getCurrentTabId((tabId) => {
  var port = chrome.tabs.connect(tabId, {name: 'test-connect'});
  port.postMessage({question: '你是谁啊？'});
  port.onMessage.addListener(function(msg) {
    alert('收到消息：'+msg.answer);
    if(msg.answer && msg.answer.startsWith('我是')) {
      port.postMessage({question: '哦，原来是你啊！'});
    }
  });
});
// content-scripts
// 监听长连接
chrome.runtime.onConnect.addListener(function(port) {
 console.log(port);
 if(port.name == 'test-connect') {
  port.onMessage.addListener(function(msg) {
    console.log('收到长连接消息：', msg);
    if(msg.question == '你是谁啊？') port.postMessage({answer: '我是你爸！'});
  });
 }
});
```

## 7. 补充

- 动态注入或执行JS
- 动态注入CSS
- 获取当前窗口ID
- 获取当前标签页ID
- 本地存储
- webRequest
- 国际化

### 7.1 动态注入或执行JS

虽然在background和popup中无法直接访问页面DOM，但是可以通过chrome.tabs.executeScript来执行脚本，从而实现访问web页面的DOM（注意，这种方式也不能直接访问页面JS）。

```json
{
 "name": "动态JS注入演示",
 ...
 "permissions": [
 "tabs", "http://*/*", "https://*/*"
 ],
 ...
}
```
```js
// 动态执行JS代码
chrome.tabs.executeScript(tabId, {code: 'document.body.style.backgroundColor="red"'});
// 动态执行JS文件
chrome.tabs.executeScript(tabId, {file: 'some-script.js'});
```

### 7.2 动态注入CSS

```json
{
 "name": "动态CSS注入演示",
 ...
 "permissions": [
 "tabs", "http://*/*", "https://*/*"
 ],
 ...
}
```
```js
// 动态执行CSS代码，TODO，这里有待验证
chrome.tabs.insertCSS(tabId, {code: 'xxx'});
// 动态执行CSS文件
chrome.tabs.insertCSS(tabId, {file: 'some-style.css'});
```

### 7.3 获取当前窗口ID

```js
chrome.windows.getCurrent(function(currentWindow){
 console.log('当前窗口ID：' + currentWindow.id);
});
```

### 7.4 获取当前标签页ID

```js
// 获取当前选项卡ID
function getCurrentTabId(callback){
 chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
  if(callback) callback(tabs.length ? tabs[0].id: null);
 });
}
// 另一种，只有少部分时候不一样，例如当窗口最小化时
// 获取当前选项卡ID
function getCurrentTabId2(){
 chrome.windows.getCurrent(function(currentWindow){
  chrome.tabs.query({active: true, windowId: currentWindow.id}, function(tabs){
    if(callback) callback(tabs.length ? tabs[0].id: null);
  });
 });
}
```

### 7.4 本地存储

本地存储建议用chrome.storage而不是普通的localStorage，区别有好几点，个人认为最重要的2点区别是：
- chrome.storage是针对插件全局的，即使你在background中保存的数据，在content-script也能获取到；
- chrome.storage.sync可以跟随当前登录用户自动同步，这台电脑修改的设置会自动同步到其它电脑，很方便，如果没有登录或者未联网则先保存到本地，等登录了再同步至网络；

需要声明storage权限，有chrome.storage.sync和chrome.storage.local2种方式可供选择，使用示例如下：

```js
// 读取数据，第一个参数是指定要读取的key以及设置默认值
chrome.storage.sync.get({color: 'red', age: 18}, function(items) {
 console.log(items.color, items.age);
});
// 保存数据
chrome.storage.sync.set({color: 'blue'}, function() {
 console.log('保存成功！');
});

```

### 7.5 webRequest

通过webRequest系列API可以对HTTP请求进行任性地修改、定制，下面是webRequest的几个生命周期：

![这是图片](https://static.sitestack.cn/projects/chrome-plugin-develop/b6541888b74153440e9f0a4847f7b261.png "webRequest")

#### 7.5.1 beforeRequest demo
```json
//manifest.json
{
 // 权限申请
 "permissions":
 [
 "webRequest", // web请求
 "webRequestBlocking", // 阻塞式web请求
 "storage", // 插件本地存储
 "http://*/*", // 可以通过executeScript或者insertCSS访问的网站
 "https://*/*" // 可以通过executeScript或者insertCSS访问的网站
 ],
}
```
```js
// background.js
// 是否显示图片
var showImage;
chrome.storage.sync.get({showImage: true}, function(items) {
 showImage = items.showImage;
});
// web请求监听，最后一个参数表示阻塞式，需单独声明权限：webRequestBlocking
chrome.webRequest.onBeforeRequest.addListener(details => {
 // cancel 表示取消本次请求
 if(!showImage && details.type == 'image') return {cancel: true};
 // 简单的音视频检测
 // 大部分网站视频的type并不是media，且视频做了防下载处理，所以这里仅仅是为了演示效果，无实际意义
 if(details.type == 'media') {
  chrome.notifications.create(null, {
  type: 'basic',
  iconUrl: 'img/icon.png',
  title: '检测到音视频',
  message: '音视频地址：' + details.url,
  });
 }
}, {urls: ["<all_urls>"]}, ["blocking"]);
```

#### 7.5.2 常用事件使用示例

```js
// 每次请求前触发，可以拿到 requestBody 数据，同时可以对本次请求作出干预修改
chrome.webRequest.onBeforeRequest.addListener(details => {
 console.log('onBeforeRequest', details);
}, {urls: ['<all_urls>']}, ['blocking', 'extraHeaders', 'requestBody']);
// 发送header之前触发，可以拿到请求headers，也可以添加、修改、删除headers
// 但使用有一定限制，一些特殊头部可能拿不到或者存在特殊情况，详见官网文档
chrome.webRequest.onBeforeSendHeaders.addListener(details => {
 console.log('onBeforeSendHeaders', details);
}, {urls: ['<all_urls>']}, ['blocking', 'extraHeaders', 'requestHeaders']);
// 开始响应触发，可以拿到服务端返回的headers
chrome.webRequest.onResponseStarted.addListener(details => {
 console.log('onResponseStarted', details);
}, {urls: ['<all_urls>']}, ['extraHeaders', 'responseHeaders']);
// 请求完成触发，能拿到的数据和onResponseStarted一样，注意无法拿到responseBody
chrome.webRequest.onCompleted.addListener(details => {
 console.log('onCompleted', details);
}, {urls: ['<all_urls>']}, ['extraHeaders', 'responseHeaders']);
```
上面示例中提到，使用webRequestAPI是无法拿到responseBody的，想要拿到的话只能采取一些变通方法，例如：

 1. 重写XmlHttpRequest和fetch，增加自定义拦截事件，缺点是实现方式可能有点脏，重写不好的话可能影响正常页面；
 2. devtools的chrome.devtools.network.onRequestFinishedAPI可以拿到返回的body，缺点是必须打开开发者面板；
 3. 使用chrome.debugger.sendCommand发送Network.getResponseBody命令来获取body内容，缺点也很明显，会有一个恼人的提示

上述几种方法的实现方式这个链接基本上都有，可以参考下：https://stackoverflow.com/questions/18534771/chrome-extension-how-to-get-http-response-body

### 7.6 国际化

插件根目录新建一个名为_locales的文件夹，再在下面新建一些语言的文件夹，如en、zh_CN、zh_TW，然后再在每个文件夹放入一个messages.json，同时必须在清单文件中设置default_locale。

```json
_locales\en\messages.json内容：
{
 "pluginDesc": {"message": "A simple chrome extension demo"},
 "helloWorld": {"message": "Hello World!"}
}
_locales\zh_CN\messages.json内容：

{
 "pluginDesc": {"message": "一个简单的Chrome插件demo"},
 "helloWorld": {"message": "你好啊，世界！"}
}
在manifest.json和CSS文件中通过__MSG_messagename__引入，如：

{
 "description": "__MSG_pluginDesc__",
 // 默认语言
 "default_locale": "zh_CN",
}
```
JS中则直接chrome.i18n.getMessage("helloWorld")。

测试时，通过给chrome建立一个不同的快捷方式chrome.exe --lang=en来切换语言

## 8. 常用API总结

比较常用API

- chrome.cookies
- chrome.runtime
- chrome.tabs
- chrome.webRequest
- chrome.window
- chrome.storage
- chrome.contextMenus
- chrome.devtools
- chrome.extension

### 8.1 chrome.cookies

```js
// 获取某个网站的所有cookie：
const url = 'https://www.baidu.com';
chrome.cookies.getAll({url}, cookies => {
 console.log(cookies);
});
// 清除某个网站的某个cookie：
const url = 'https://www.baidu.com';
const cookieName = 'userName';
chrome.cookies.remove({url, name: cookieName}, details => {});
```
### 8.2 chrome.runtime
```js
chrome.runtime.id // 获取插件id
chrome.runtime.getURL('xxx.html') //获取xxx.html在插件中的地址
```
  



