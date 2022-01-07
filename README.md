# 谷歌插件开发

内容总结自：https://www.bookstack.cn/read/chrome-plugin-develop/spilt.1.8bdb1aac68bbdc44.md

## 前言

### 开发与调试
- Chrome插件没有严格的项目结构要求，只要保证本目录有一个manifest.json即可
- 从右上角菜单->更多工具->扩展程序可以进入 插件管理页面，也可以直接在地址栏输入chrome://extensions 访问。
- 

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
虽然可以操作 DOM，但 DOM 不能调用它，也就是无法再 DOM 中通过绑定事件的方式调用 content-scripts 中的代码。
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


