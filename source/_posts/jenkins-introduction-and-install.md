---
title: 持續整合工具 Jenkins 介紹與安裝
date: 2016-09-11
categories:
  - 技術
  - DevOps
tag:
  - Jenkins
  - CI/CD
  - Docker
thumbnail: /images/jenkins-introduction-and-install-images/jenkins-logo.png
banner: /images/jenkins-introduction-and-install-images/jenkins-logo.png
toc: true
---
Jenkins 是一個`持續整合 (Continuous Integration, CI)`的`web-based 伺服器`，提供了實行持續整合的基礎設施。因為設計上**擁有極高的擴充性與彈性並且為 Open Source 的專案**，因此擁有為數不少開發者為其貢獻延伸套件，本身提供了許多功能如 Distrubted Builds、Test Reports、Notifications 等強大功能，近年來更廣被使用在各大專案、公司之中，例如：yahoo、facebook、NHN 以及 Sony 等。

<!--more-->

再介紹 Jenkins 之前必須先簡單說明持續整合(Contunuous Integration, CI)是什麼？

## 持續整合
持續整合的概念最初是指在專案中由一個主要的電腦或伺服器來整合所有工程師的工作內容，並且要求每天都需要進行此一整合作業，以減少長時間累積的程式變動所帶來的影響。

簡單來說就是透過**自動化工具將個模組的程式碼從版本控制伺服器上下載下來，若程式碼有所變動便進行程式碼編譯並測試**，如果出問題可以馬上通知工程師進行修正。

而我們需要達到持續整合勢必需要一個工具能將平常手動的操作(像是：從版本控制伺服器下載程式碼、將程式碼編譯最後進行測試等動作)轉為自動，而 Jenkins 即是一個不錯的選擇。

## Jenkins 簡介
Jenkins 是一個非常老牌的持續整合工具且是一個基於`MIT License`的開放原始碼專案，於 2011 年一月由相同為 CI Tool 的 Hudson 專案所分支而來，原本 Hudson 名稱以及商標則為 Oracle 的管理模式，因此受到許多自由社群開發者的歡迎。

因為 Jenkins 擁有眾多使用者，讓它擁有許多 plugin 可以使用；而根據 [jenkins-stats](http://imod.github.io/jenkins-stats/) 統計，至今約有 500 多種 plugin 專來的支援，正式的 Jenkins server 安裝次數也超過 4 萬次，並有超過一百萬個 Build Jobs 運作其上。

## Jeknins 安裝
Jenkins 是一套由`Java`所開發的，它只需要`Java Runtime Environment (JRE)`就可以順利執行，拜 Java 跨平台的特性所賜，各大主流作業系統都能夠輕易安裝 JRE，也因此 Jenkins 能夠支援夠種主流系統。

以下將提供兩種安裝方式：
  1. GUI 安裝方式
  2. CLI 安裝方式

### GUI 安裝方式
Jenkins GUI 安裝方式非常簡單，因為官方提供了非常方便的一鍵安裝檔，可以直接至 [Jenkins 官方網站](https://jenkins.io/) 下載安裝即可。

### CLI 安裝方式
Jenkins 官方雖然提供了非常方便的一鍵安裝，但若遇到無 GUI 介面的作業系統，即會非常的不方便，因此以下將會使用 CLI 說明如何安裝。

#### 安裝環境
環境硬體規格如下：

| ID   | Specs                                      |
| ---- | ------------------------------------------ |
| CPU  | Intel® Core™2 Quad CPU Q9400 @ 2.66GHz × 4 |
| RAM  | 4 GB                                       |
| Disk | 500 GB                                     |

而作業系統部分以下兩種作業系統版本皆測試過皆可安裝：
 * Ubuntu 12.04 64位元
 * Ubuntu 14.04 64位元

因為 Jeknins 是由 Java 所撰寫，因此需要安裝 Java，而 Java 安裝將不贊述。而我測試環境的 Java 版本如下：
```shell
$ java -version
java version "1.7.0_79"
OpenJDK Runtime Environment (IcedTea 2.5.5) (7u79-2.5.5-0ubuntu0.14.04.2)
OpenJDK 64-Bit Server VM (build 24.79-b02, mixed mode)
```

#### 開始安裝
CLI 安裝方式也很簡單，僅需幾個指令即可：
```shell
$ sudo apt-get update && apt-get upgrade
$ wget -q -O - https://jenkins-ci.org/debian/jenkins-ci.org.key | sudo apt-key add -
$ sudo sh -c 'echo deb http://pkg.jenkins-ci.org/debian binary/ > /etc/apt/sources.list.d/jenkins.list'
$ sudo apt-get update
$ sudo apt-get install jenkins
```

安裝完成後，即可打開瀏覽器`http://<host ip address>:8080`即可。

![Jenkins Dashboard](/images/jenkins-introduction-and-install-images/jenkins-homepage.png)

## 參考資料
  1. [Jenkins 官方](https://jenkins.io/)
  2. [CI (Continuous integration) 關鍵技術：使用 Jenkins](http://www.books.com.tw/products/0010596579)
