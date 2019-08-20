---
title: Hexo 新增 Color Quote
date: 2018-06-13
categories:
  - 技術
  - Hexo
tag:
  - Hexo
thumbnail: /images/hexo-color-quote-images/hexo-logo.png
banner: /images/hexo-color-quote-images/hexo-logo.png
toc: true
---
最近看到 [hexo-theme-minos](https://github.com/ppoffice/hexo-theme-minos) 提供了一個非常漂亮的 Color Quote 功能，如下面所示。因此，想把它加入到自己的部落格之中。而開始從它的 Github 中搜尋它的原始碼，發現原來它是利用 Hexo 提供的 extend tag 功能，而它的使用方法很簡單，使用者只要註冊了一個 extend tag，之後再文章中就可以使用此 extend tag，但是 extend tag 僅限於使用 Hexo 的語法；而不是原本 Markdown 的語法。

<!--more-->

![Minos Color Quote](/images/hexo-color-quote-images/color-quote.png)

因為`hexo-theme-minos`的 Color Quote 中的內容無法使用 Markdown 語法。因此，本文參考`hexo-them-minos`並進行一些修改，讓 Color Quote 中的內容可以使用 Markdown 的語法。接下來將一步步介紹如何在 Hexo 部落格加入 Color Quote。

## 註冊一個 Extend Tag
我們要先註冊一個名為`colorquote`的 extend tag，這樣之後在撰寫文章時就可以使用這個 tag。

{% colorquote danger %}
這邊要注意的一點是因為使用 Hexo 提供的 extend tag 功能，所以在撰寫文章的時候必須使用 Hexo 使用 tag 的寫法，而不是 Markdown 的語法。
{% endcolorquote %}

首先，在`themes/<your theme>/scripts`底下建立一個名為 colorquote 的 JS 檔並輸入以下內容：
```js
/**
* Color Quote Block Tag
* @description Color Quote Block
* @example
*     <% colorquote [type] %>
*     content
*     <% endcolorquote %>
*/
hexo.extend.tag.register('colorquote', function (args, content) {
    var type =  args[0];
    var mdContent = hexo.render.renderSync({text: content, engine: 'markdown'});
    return '<blockquote class="colorquote ' + type + '">' + mdContent + '</blockquote>';
}, {ends: true});

```

這邊可以看到，我們註冊了一個 extend tag 名為`colorquote`，所以當在撰寫文章時，使用到此 extend tag 時，會將此 tag 中的 content 經過 Markdown 的渲染後，在將經過渲染後的 content 包在`blockquote`這個 Hexo 原有的元件之中。但此時，會為這個`blockquote`新增一個 class 名稱。接下來，我們只要在`blockquote`的 CSS 中增加樣式就可以看到效果了。

## 設定 Color Quote CSS
當我們已經註冊好了`colorquote`這個 extend tag。接下來，找到自己部落格中`blockquote`的 css 並加入類似於以下的內容，**每個人部落格的 CSS 可能都有些差異，麻煩請依照自己的需求進行調整**：

```stylus
blockquote
  position: static
  font-family: font-serif
  font-size: 1.1em
  padding: 10px 20px 10px 54px
  background: rgba(0,0,0,0.03)
  border-left: 5px solid #ee6e73
  &:before
    top: 20px
    left: -40px
    content: "\f10d"
    color: #e2e2e2
    font-size: 32px;
    font-family: FontAwesome
    text-align: center
    position: relative
  footer
    font-size: font-size
    margin: line-height 0
    font-family: font-sans
    cite
      &:before
        content: "—"
        padding: 0 0.5em
.colorquote
  position: relative;
  padding: 0.1em 1.5em;
  color: #4a4a4a;
  margin-bottom: 1em;
  &:before
    content: " ";
    position: absolute;

    top: 50%;
    left: -14.5px;
    margin-top: -12px;
    width: 24px;
    height: 24px;

    border-radius: 50%;
    text-align: center;

    color: white;
    background-size: 16px 16px;
    background-position: 4px 4px;
    background-repeat: no-repeat;
  &.info
    border-color: hsl(204, 86%, 53%);
    background-color: hsl(204, 86%, 93%);
    &:before
      background-color: hsl(204, 86%, 53%);
      background-image: url("../images/info.svg");
  &.success
    border-color: hsl(141, 71%, 48%);
    background-color: hsl(141, 70%, 88%);
    &:before
      background-color: hsl(141, 71%, 48%);
      background-image: url("../images/check.svg");
  &.warning
    border-color: hsl(48, 100%, 67%);
    background-color: hsl(48, 100%, 91%);
    &:before
      background-color: hsl(48, 100%, 67%);
      background-image: url("../images/question.svg");
  &.danger
    border-color: hsl(348, 100%, 61%);
    background-color: hsl(348, 100%, 85%);
    &:before
      background-color: hsl(348, 100%, 61%);
      background-image: url("../images/exclamation.svg");
```

再來`colorquote`前面的圖片是一張圖片。因此，我們在`themes/<your theme>/source/`底下建立一個`images`資料夾，並將圖片丟進去，而圖片可以到從我的 [source code](https://github.com/ellis-wu/my-static-blog) 中下載：
```shell
$ ls themes/icarus/source/images
check.svg       exclamation.svg info.svg        question.svg
```

這時候，我們可以是在文章中使用看看`colorquote`這個 extend tag 是否能用：
```markdown
{% colorquote info %}
Example: info
{% endcolorquote %}

{% colorquote success %}
Example: success
{% endcolorquote %}

{% colorquote warning %}
Example: warning
{% endcolorquote %}

{% colorquote danger %}
Example: danger
{% endcolorquote %}
```

{% colorquote info %}
Example: info
{% endcolorquote %}

{% colorquote success %}
Example: success
{% endcolorquote %}

{% colorquote warning %}
Example: warning
{% endcolorquote %}

{% colorquote danger %}
Example: danger
{% endcolorquote %}

## 修改 Code Block 問題
但此刻，會發現若在`colorquote`中的內容使用到 Markdown code block 的語法會無法正常渲染。所以為了修正此錯誤，我們在`themes/<your theme>/scripts`底下建立一個名為 tags 的 JS 檔並輸入以下內容：
```js
/**
* Tags Filter
* @description Fix the code block using ```<code>``` will render undefined in Nunjucks
*              https://github.com/hexojs/hexo/issues/2400
*/

const rEscapeContent = /<escape(?:[^>]*)>([\s\S]*?)<\/escape>/g;
const placeholder = '\uFFFD';
const rPlaceholder = /(?:<|&lt;)\!--\uFFFD(\d+)--(?:>|&gt;)/g;
const cache = [];
function escapeContent(str) {
  return '<!--' + placeholder + (cache.push(str) - 1) + '-->';
}
hexo.extend.filter.register('before_post_render', function(data) {
  data.content = data.content.replace(rEscapeContent, function(match, content) {
    return escapeContent(content);
  });
  return data;
});
hexo.extend.filter.register('after_post_render', function(data) {
  data.content = data.content.replace(rPlaceholder, function() {
    return cache[arguments[1]];
  });
  return data;
});
```

## 驗證 Color Quote
基本上以上步驟都完成，就可以在文章中使用 Color Quote 且內容可以使用原本 Markdown 語法：
{% colorquote info %}
Example: info
```shell
$ echo "This is a Color Quote Example"
```
{% endcolorquote %}

{% colorquote success %}
Example: success
```shell
$ echo "This is a Color Quote Example"
```
{% endcolorquote %}

{% colorquote warning %}
Example: warning
```shell
$ echo "This is a Color Quote Example"
```
{% endcolorquote %}

{% colorquote danger %}
Example: danger
```shell
$ echo "This is a Color Quote Example"
```
{% endcolorquote %}

## 參考資料
  1. [hexo-theme-minos](https://github.com/ppoffice/hexo-theme-minos)
  2. [Hexo Tag](https://hexo.io/api/tag.html)
  3. [hexo issues #2400](https://github.com/hexojs/hexo/issues/2400)
