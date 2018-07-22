---
title: 使用 Jenkins 搭建 iOS 持續整合環境
date: 2016-04-13
categories:
  - 技術
  - DevOps
tag:
  - Jenkins
  - iOS
  - XCTest
  - Gitlab
  - CI
thumbnail: /images/jenkins-intergation-xctest-images/jenkins-xctest-logo.png
banner: /images/jenkins-intergation-xctest-images/jenkins-xctest-logo.png
toc: true
---
在 iOS 應用程式的開發中必定使用的 XCode 進行開發，且 XCode 內建的測試框架 XCTest 提供了單元測試與 UI 測試的功能。讓開發者能快速且簡易的撰寫單元測試與 UI 測試，以保障程式開發上的品質。而本文希望藉由 Jenkins 持續整合伺服器與 Gitlab 來達到自動化測試的功能，並顯示測試結果至 Jenkins 儀表板中。

<!--more-->

而`Apple`在 XCode 7 中將 UI 測試加入至 XCTest 之中，為了解決開發者以前為了撰寫 UI 測試難以維護的巨大成本。而 XCTest 的 UI 測試比以往的測試工具更來得簡單方便，特別是在撰寫測試時可以使用**錄製**功能，大大的 UI 測試的門檻。

## 持續整合架構
![Continuous Integration architecture](/images/jenkins-intergation-xctest-images/jenkins-gitlab-xcode-architecture.png)

如上圖所示，為整個系統的流程與架構。當開發者或維運人員開發完成後，將程式碼 commit/push 至 Gitlab 之中，接著 Gitlab 會觸發 Jenkins 的 Job 並開始建構本次測試，當測試完成則會顯示測試結果至 Jenkins 儀表板上。

而這邊 Jenkins 採用 Master 與 Slave 架構。Jenkins Master 為任一作業系統的機器且僅執行測試任務的分配，這是因為在公司上可能會有許多測試項目，若不採用此方法大家的測試項目可能會資源的搶佔的情形，使得測試延遲無法及時回饋給開發或維運人員，且在未來擴增測試機器也極為方便。而這邊是與 iOS 進行整合測試，所以 Jenkins Slave 使用 Mac OSX 相關設備。

## 事前準備
1. 準備一台可以執行 XCode 的設備；
2. 架設一台 Gitlab 亦可以用其他 Git 取代，但可能操作上有些許不同；
3. 安裝 Jenkins 再任一台機器上。Jenkins 安裝可以參考 {% post_link jenkins-introduction-and-install %}。

## 持續整合設定與步驟
以下會一步一步進行教學，使每個人都能輕鬆的來體驗自動化測試的魅力。

### Jenkins 插件安裝
為了要讓開發或維運人員 commit/push 專案至版本控制伺服器時，能將版本伺服器的專案 clone 至 Jenkins Slave 上，讓專案能進行測試。因此，需要安裝`Jenkins gitlab plugin`。
  1. 點擊 Jenkins 儀表板右方的 **【管理 Jenkins】**；
  2. 接著點擊 **【管理外掛程式】**，並將標籤切換至 **【可用的】** 並搜尋 **【gitlab plugin】**；
  3. 選擇後開始進行安裝，安裝完成重新啟動 Jenkins。

![Gitlab plugin install](/images/jenkins-intergation-xctest-images/install-gitlab-plgun.png)

### 新增 Jenkins Slave 節點
讓 Jenkins 使用 Master 與 Slave 架構，將測試環境與 Jenkins CI Server 分開，好處是在於說：
  * Jenkins CI Server 負擔不會這麼重，因為 Jenkins Build Job 都是使用記憶體，當測試一多可能會造成 Memory 不足，造成系統損毀；
  * 同時間測試項目太多在執行，大家的測試項目會搶佔資源，可能會使得測試項目延遲，無法及時回饋給開發或維運人員；
  * 若未來要增加測試機器，可以很方便的增加機器，若出現問題只需要針對出現問題的機器進行處理，不用整個環境重用。

透過以下步驟新增 Jenkins Slave 節點：
  1. 點擊 Jenkins 儀表板右方的 **【管理 Jenkins】**；
  2. 接著點擊  **【管理節點】** 並選擇 **【新增節點】**；
  3. 設定該 **【節點名稱】**，並選擇 **【陽春 Slave】**。

![Add Jenkins node](/images/jenkins-intergation-xctest-images/add-new-node.png)

以上設定完成後，開始設定該節點的一些詳細資訊，而以下三個項目為 **必要** 的設定，其他項目依照狀況進行設定：
* **遠端檔案系統根目錄**：此目錄為 Jenkins 遠端至 Slave 節點後，每次建構 Job 所產生的檔案都會放在此目錄之中，之後建構 Job 後產生的`JUnit報表`也會產生在此資料目錄底下；
* **標籤**：設定標籤為日後建構 Job 時，指定要給該標籤的 Slave 節點建構 Job；
* **啟動模式**：Jenkins 已經整合了幾種很方便的啟動模式，一般來講都會使用 SSH 的方式來啟動 Slave 節點，但因為 XCTest 使用 SSH 無法獲得測試結果，因此這邊選擇使用 **【透過 Java Web Start 啟動 Slave 代理程式】**。該方法需要在 Slave 節點上啟動一個由 Java 所撰寫而成的`Jenkins slave agent`。

若設定完成後 按下 **【儲存】** 即可。

![Set Jenkins node](/images/jenkins-intergation-xctest-images/set-new-node.png)

### 啟動 Slave 代理程式
當新增 Jenkins Slave 節點設定完成後，會在 Jenkins 儀表板中看到節點狀態為離線(Offline)，這是因為在 Slave 節點上尚未啟動`Jenkins slave agent`。

![Jenkins slave offline](/images/jenkins-intergation-xctest-images/slave-offline.png)

此時，可以點進 Slave 節點中可以看到如何啟動`Jenkins slave agent`，只要依照儀表板上的方法即可啟動。

![Start slave instruction](/images/jenkins-intergation-xctest-images/start-slave-instruction.png)

在 Slave 節點上`Jenkins slave agent`若啟動後會跳出 connect 小視窗，這個小視窗請勿關閉，若關閉 Master 與 Slave 連線就中斷了。

![Start slave agent](/images/jenkins-intergation-xctest-images/start-slave-agent.png)

### 安裝 ocunit2junit
因為 Jenkins 看不懂 XCodebuild 後的結果，因此我們要需要透過 OCUnit2JUnit 將 Objective-C (OCUnit) test case 轉換為 Jenkins 能讀取的 JUnit 格式。

因此，在每台要執行 XCTest 的 Slave 節點上安裝 ocunit2junit。而這邊透過`gem`來安裝 ocunit2junit：
```shell
$ sudo gem install ocunit2junit
```

{% colorquote info %}
* XCode 7 的 UI Test 亦可用 ocunit2junit 將結果轉換為 Jenkins 能讀取的 JUnit 格式；
* 若想了解更多 OCUnit2JUnit 請參考 [這裡](https://github.com/ciryon/OCUnit2JUnit)。
{% endcolorquote %}

### 設定 Jenkins Job
以上都完成後，開始設定 Jenkins Job。
  1. 點擊 Jenkins 儀表板右方的 **【新增作業】**；
  2. 設定 **【作業名稱】**，並選擇 **【建置 Free-Style 軟體專案】**。

![Add Jenkins Job](/images/jenkins-intergation-xctest-images/add-new-job.png)

以上設定完成後，開始設定該 Job 的詳細資訊，而以下項目為 **必要** 的設定，其他項目依照狀況進行設定：

#### 限制專案執行節點
設定這次工作要在哪台 Slave 節點上執行，這裡輸入設定節點時的**標籤**。

![Set node label with Jenkins Job](/images/jenkins-intergation-xctest-images/job-node-label.png)

#### 設定 Gitlab Repository
由於事先安裝好了`gitlab plugin`，因此在設定 Jenkins Job 時在 **【原始碼管理】** 中才有 git 的選項。所以當本次 Jenkins Job 執行時會依照設定將專案 clone 下來。設定步驟如下：
  1. 設定 **【Repository URL】** 為自己的 Gitlab URL；
  2. 設定 **【Credentials】**。這邊提供了多種方法，最簡單的方式就是使用 **【Username with password】**，輸入自己的 Gitlab 帳號密碼即可。

{% colorquote info %}
這邊可以在 Branches to build 切換本次建置的 Branch。
{% endcolorquote %}

![Set Gitlab with Jenkins Job](/images/jenkins-intergation-xctest-images/job-gitlab.png)

#### 設定建置步驟
建置步驟提供了四種方式，也可以設定多個建置步驟，這邊選擇使用`shell`來啟動 Slave 節點上的`xcodebuild`。
```bash
# !/bin/sh
# Test a xcode project using xcodebuild command:
# xcodebuild test -project <projct_name>.xcodeproj -scheme <scheme> -destination "id=<devices_id>" | ocunit2junit
xcodebuild test -project DevOps_Demo.xcodeproj -scheme DevOps_Demo -destination "id=CBE06FF7-14FD-432E-A6FD-1935E71A5DA8" | ocunit2junit
```

這邊可能要注意指令中的`scheme`，若專案沒有`scheme`則無法進行測試。透過以下步驟列出專案中的`scheme`：
```shell
$ xcodebuild -list -project <projct_name>.xcodeproj
```

若專案沒有`scheme`則必須於 XCode 中開啟`scheme shared`，開啟如下：
![Enable Scheme](/images/jenkins-intergation-xctest-images/scheme-share.png)

{% colorquote info %}
查詢 Devices ID 請參考 [What's your destination?](http://nsbogan.com/xcode/2015/02/18/whats-your-destination)
{% endcolorquote %}

#### 設定建置後動作
根據剛剛在建置步驟設定的 shell script，當測試完成後會自動產生 JUnit 報表。因此，在建置後動作要來讀取此 JUnit 報表。而 ocunit2junit 會將報表產生在`<Workspace>/test-reports`中。

{% colorquote info %}
Workspace 即為新增節點時設定的**遠端檔案系統根目錄**。
{% endcolorquote %}

讀取 Junit 報表步驟如下：
  1. 點選 **【發佈 JUnit 測試結果報告】**；
  2. 設定 **【測試報告 XML】** 為`test-reports/*.xml`。

![Set Job after action](/images/jenkins-intergation-xctest-images/job-after-action.png)

### 設定 Web Hooks
設定 Web Hooks 為了要讓開發或維運人員 commit/push 專案時能自動觸發 Jenkins Job 來執行本次的測試，立即測試本次的版本是否有問題出現。

首先，先取得 Jenkins Job **【馬上建置】** 的網址。

![Get Job Build URL](/images/jenkins-intergation-xctest-images/get-build-url.png)

接下來到 Gitlab 設定 Web Hooks，步驟如下：
  1. 選擇本次要建構自動測試的專案；
  2. 點擊 **【Settings】** 並點擊 **【Web Hooks】**；
  3. 接著將剛剛複製的 **【馬上建置】** 的網址貼上，並儲存即可。

之後若觸發了`Trigger 條件`就會執行設定的 URL，即會開始執行 Jenkins Job。

![Gitlab Web Hooks](/images/jenkins-intergation-xctest-images/setting-web-hooks.png)

## 開始測試！
當以上設定都完成後，就可以開始體驗自動化測試得好處。以後只要 commit/push 就會開始測試，當測試跑完，就可以在 Jenkins 儀表板上看到測試結果。

![Jenkins Job Reports](/images/jenkins-intergation-xctest-images/job-report.png)

![Jenkins Job Reports Detail](/images/jenkins-intergation-xctest-images/job-report-detail.png)
