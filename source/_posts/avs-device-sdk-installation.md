---
title: 在 Raspberry Pi 上使用 AVS Device SDK 實現智慧音箱
date: 2019-07-15
category:
  - 技術
  - AWS
tags:
  - Amazon
  - Alexa
  - Raspberry Pi
thumbnail: /images/avs-device-sdk-installation-images/avs-device-sdk-logo.png
banner: /images/avs-device-sdk-installation-images/avs-device-sdk-logo.png
toc: true
---
Amazon 提供了 Alexa Voice Service(AVS) 的服務，希望能讓開發者可以整合 Alexa 至他們的產品之中，並且讓任何連接的設備帶來語音的便利性。Amazon 提供了 AVS Device SDK 讓開發人員可以快速且簡單的建立自己的 ** Alexa 產品**，而 AVS Device SDK 是一個基於 `C++` 的 Library，其中包含了語音的捕捉、聲音的處理與通訊等功能，而每個元件都提供 API 給開發者使用與客製化整合至自己的產品中。

<!--more-->

## AVS Device SDK 架構
如下圖所示，說明 AVS Device SDK 各個元件之間的資料流。

![AVS Device SDK Architectrue](/images/avs-device-sdk-installation-images/avs-device-sdk-architecture.png)

##### Audio Signal Processor (ASP)
它是一個第三方軟體，主要為處理聲音訊號輸入與輸出使其獲得一個乾淨的聲音訊號，其中可能包含[回音消除 (Acoustic Echo Cancellation, AEC)](https://zh.wikipedia.org/wiki/%E5%9B%9E%E9%9F%B3%E6%B6%88%E9%99%A4)、固定或者自適應的[波束成型 (Beamforming)](https://zh.wikipedia.org/wiki/%E6%B3%A2%E6%9D%9F%E8%B5%8B%E5%BD%A2)、[語音活性檢測 (Voice activity detection, VAD)](https://zh.wikipedia.org/wiki/%E8%AF%AD%E9%9F%B3%E6%B4%BB%E6%80%A7%E6%A3%80%E6%B5%8B) 以及[動態範圍壓縮 (Dynamic Range Compression, DRC)](https://zh.wikipedia.org/wiki/%E5%8A%A8%E6%80%81%E8%8C%83%E5%9B%B4%E5%8E%8B%E7%BC%A9)。若使用麥克風陣列，則 ASP 建構並輸出陣列的單個音頻流。

##### Shared Data Stream (SDS)
它是一個單一的 producer 或 multi-consumer buffer，其允許在一個寫入者 (writer) 或多個讀取者 (reader) 之間傳送任何類型的資料。而 SDS 有兩個主要的功能：
  1. 發送到 AVS 之前，在音頻前端 (or Audio Signal Processor)、Wake Word Engine (WWE) 以及 Alexa Communications Library (ACL) 之間傳遞音訊資料。
  2. 透過 Alaexa Communications Library (ACL) 將由 AVS 發送的資料附件傳遞給特定的 Capbility Agents。

SDS 在 product-specific 記憶體分段 (or user-specif) 上的環形[緩衝區 (ring buffer)](https://zh.wikipedia.org/wiki/%E7%92%B0%E5%BD%A2%E7%B7%A9%E8%A1%9D%E5%8D%80) 所實現的，這允許將其用於行程或行程間通訊 (interprocess communication)。請注意，寫入者 (writer) 和讀取者 (reader) 可能是不同的執行緒或行程。

##### Wake Word Engine (WWE)
它是一個在輸入串流中發現識別詞的軟體，由兩個 binary interfaces 組成。第一個處理喚醒詞識別 (或檢測)；第二個處理特定的喚醒詞模型 (在官方 AVS Device SDK 中的範例是 Alexa)。而這取決於你如何實現，WWE 可以在 SOC 或專用的晶片上執行，像是數位信號處理器 (Digital Singal Processor, DSP)。

##### Audio Input Processor (AIP)
處理透過 Alexa Communications Library (ACL) 發送到 AVS 的音頻輸入，這些包括設備上的麥克風、遠程麥克風和其他音訊輸入源。而 Audio Input Processor (AIP) 還包括了再不同音頻輸入源之間切換的邏輯，在給定的時間內只能將一個音頻輸入源發送到 AVS。

##### Alexa Communications Library (ACL)
是客戶端與 AVS 之間的溝通的主要橋樑。並執行兩個關鍵功能：
  1. 與 AVS 建立並維護長時間的持久連線。ACL 遵守訊息規範的詳細說明，請參考 [Manage HTTP/2 Request to AVS](https://developer.amazon.com/docs/alexa-voice-service/manage-http2-connection.html)。
  2. 提供訊息的傳送與接收的能力，其中包括支援 JSON 格式與二進制音頻內容。請參考 [Structuring an HTTP/2 Request to AVS](https://developer.amazon.com/public/solutions/alexa/alexa-voice-service/docs/avs-http2-requests)。

##### Alexa Directive Sequencer Library (ADSL)
管理從 AVS 來的指令順序與命令，請參考 [AVS Interaction Model](https://developer.amazon.com/docs/alexa-voice-service/interaction-model.html#channels)。該元件管理每個指令的生命週期並通知 Directive Handler (可能是也可能不是 Capability Agents) 來處理訊息。

##### Activity Focus Manager Library (AFML)
為設備提供 audiovisual focus 的集中式管理，Focus 是基於 channels 的，如 [AVS Interaction Model](https://developer.amazon.com/public/solutions/alexa/alexa-voice-service/reference/interaction-model#channels) 中所描述，用於管理 audiovisual focus 輸入與輸出的優先順序。

Channels 可以在前景或背景，而在同一個時間，只有一個 channel 可以在前景並且擁有 focus。如果多個 channels 處於 active 狀態，則需要遵循以下優先順序：Dialog > Alert > Content。當在前景的 channel 變為 inactive 狀態，則優先順序中的下一個 active channel 將移至前景。 

Focus 管理並不限定 Capability Agents 或 Directive Handlers，也可以由非 Alexa 相關 agents 使用。它允許所有使用 Activity Focus Manager Library (AFML) 的所有 agent 在設備上具有一致的 Focus。

##### Capability Agents
處理 Alexa-driven 的交互；特別是指令和事件。每個 capability agent 對應於 AVS API 公開的特定 interfaces，這些 interfaces 包括：
 * [Alerts](https://developer.amazon.com/docs/alexa-voice-service/alerts.html)：設定、停止和刪除計時器與警報的 interface。
 * [AudioPlayer](https://developer.amazon.com/docs/alexa-voice-service/audioplayer.html)：管理與控制 audio playback 的 interface。
 * [Bluetooth](https://developer.amazon.com/docs/alexa-voice-service/bluetooth.html)：管理裝置與 Alexa-enabled product 之間藍芽連線的 interface。
 * [DoNotDisturb](https://developer.amazon.com/docs/alexa-voice-service//donotdisturb.html)：啟用勿擾功能的 interface。
 * [EqualizerController](https://developer.amazon.com/docs/alexa-voice-service/equalizercontroller.html)：調整等化器設定的 interface；例如：分貝等級和模式。
 * [InteractionModel](https://developer.amazon.com/docs/alexa-voice-service/interactionmodel-interface.html)：此 interface 允許客戶端支援 Alexa 發起的複雜交互；例如：Alexa Routines。
 * [Notifications](https://developer.amazon.com/docs/alexa-voice-service/notifications.html)：顯示通知指示器的 interface。
 * [PlaybackController](https://developer.amazon.com/docs/alexa-voice-service/playbackcontroller.html)：透過 GUI 或按鈕導向至播放佇列的 interface。
 * [Speaker](https://developer.amazon.com/docs/alexa-voice-service/speaker.html)：音量控制且包含靜音與取消靜音的 interface。
 * [SpeechRecognizer](https://developer.amazon.com/docs/alexa-voice-service/speechrecognizer.html)：語音捕獲的 interface。
 * [SpeechSynthesizer](https://developer.amazon.com/docs/alexa-voice-service/speechsynthesizer.html)：Alexa 語音輸出的 interface。
 * [System](https://developer.amazon.com/docs/alexa-voice-service/system.html)：將產品狀態與狀況傳送給 AVS 的 interface。
 * [TemplateRuntime](https://developer.amazon.com/docs/alexa-voice-service/templateruntime.html)：呈現可視化 metadata 的 interface。

## 安裝 AVS Device SDK
AVS Device SDK 提供一些腳本來快速安裝與與建構並且啟用了喚醒詞。喚醒詞部分目前有兩個較知名的開源版 ([Sensory](https://github.com/Sensory/alexa-rpi) 與 [Snowboy](https://github.com/Kitt-AI/snowboy))，而 AVS Device SDK 官方提供的的快速安裝教學中的 Wake Word Engine (WWE) 預設是使用`Sensory`，但`Snowboy`亦是個不錯的選擇，它提供了額外幾種訓練好的喚醒詞；像是`Computer`與`Jarvis`等等。

### 事前準備
本文教學是在 Raspberry Pi 上安裝 AVS Device SDK。所以執行 AVS 前需要準備一些東西：
  * **麥克風**，需要將 Raspberry Pi 上的 Audio 輸出設定此麥克風。
  * **喇叭**，可以用外接喇叭或者用耳機接至 Raspberry Pi 上的 3.5 mm 音源孔。
  * Rasberry Pi 必須擁有**網路**連線能力。
  * Raspbian **Stretch** With Desktop。

{% colorquote danger %}
* 本篇嘗試使用 AVS 時，Raspbian 已經釋出 Buster 版本，但 Buster 版本在安裝過程中會有些套件版本上有問題。若裝 Jessie 版本則有些套件需要自己 build，可以參考這篇[安裝說明](https://downloads.raspberrypi.org/raspbian/images/)。
* 若要下載 Raspbian Stretch 版本或各個版本，可以從[這裡](https://downloads.raspberrypi.org/raspbian/images/)尋找。
{% endcolorquote %}

### 準備安裝腳本
當以上東西都準備完成後，需要先下載幾個安裝腳本：
```shell
$ sudo apt-get update

$ wget https://raw.githubusercontent.com/alexa/avs-device-sdk/master/tools/Install/setup.sh \
  wget https://raw.githubusercontent.com/alexa/avs-device-sdk/master/tools/Install/genConfig.sh \
  wget https://raw.githubusercontent.com/alexa/avs-device-sdk/master/tools/Install/pi.sh
```

### 授權 (Authorization)
在使用 AVS Device SDK 所提供的 SampleApp 之前，需要到 Alexa Cloud 上設定一些相關資訊，讓 Raspberry Pi 能進行授權使其能使用 Alexa 的功能。

#### 註冊產品與建立 Security Profile
當註冊 Amazon developer account 後，皆要建立一個新的 Alexa 產品與 Security profile。步驟如下：
  1. 登入 Amazon Developer Portal。
  2. 上方導航列選擇 **[Alexa]** 後，下拉式選單中選擇 **[Alexa Voice Service]**。
  3. 點擊 **[Create Product]**。

![Create Alexa Product](/images/avs-device-sdk-installation-images/create-alexa-product.png)

接下來，開始創建一個 Alexa Product，所以要提供並填入一些資訊：
  1. **Product Name**：這是會呈現給使用者看的；當使用者註冊該產品時會顯示的名稱。
  2. **Product ID**：該產品的 identifier。
    ![Alexa Product Information](/images/avs-device-sdk-installation-images/alexa-product-information.png)
  3. **Product Type** 選擇 **[Device with Alexa built-in]**。
  4. 選擇後，會詢問是否將會使用 companion app，這邊選擇 **[No]**。
    ![Alexa Product Type and APP](/images/avs-device-sdk-installation-images/alexa-proudct-type-and-app.png)
  5. **Product Category** 選擇 **[Other]** 並且輸入 **[Sample build on Raspberry Pi]**。
    (若是商業產品，請依照自己的情況選擇。)
  6. 輸入 **Brief product description**。
    ![Alexa Product Category](/images/avs-device-sdk-installation-images/alexa-product-category.png)
  7. 使用者如何與產品交互，請依照自己的情況選擇。範例如下：
    ![Alexa Product Interact](/images/avs-device-sdk-installation-images/alexa-product-interact.png)
  8. **(Options)** 目前可以跳過上傳圖片的步驟。而該圖片是產品的圖示，在 [amazon.com](https://www.amazon.com/) 上可以搜尋到該產品且顯示該圖片。
    ![Alexa Product Image](/images/avs-device-sdk-installation-images/alexa-product-image.png)
  9. 是否將會發行該產品，這邊選擇 **[No]**。
    (若是商業產品，請選擇 **[Yes]**。)
  10. 是否有使用到 [Alexa Business](https://aws.amazon.com/alexaforbusiness/) 與 AWS IOT Core，這請依照自己的情況選擇。
  11. 這是否是兒童產品或針對 13 歲以下孩童的產品，請選擇 **[No]**。
    ![Alexa Product Questions](/images/avs-device-sdk-installation-images/alexa-product-questions.png)

以上資訊都填寫完成後，可以按下 **[NEXT]** 按鈕。若都沒有問題，會轉跳至 Login in With (LWA) Security Profile 的頁面。這是將使用者資料和安全憑證 (security credentials) 與產品關聯的動作。因此，這邊建立一個新的 Security Profile：
  1. 選擇 **[Create New Profile]**。
    ![Create New Security Profile](/images/avs-device-sdk-installation-images/create-new-security-profile.png)
  2. 輸入 Security Profile 的名稱與描述，輸入完成後點擊 **[Next]**。
    ![New Security Profile Fields](/images/avs-device-sdk-installation-images/new-security-profile-fields.png)
  3. 再來會產生出`Client ID`等資訊。這邊我們在 **Platform information** 的導航列上選擇 **[Other devices and platforms]**，並且輸入 **[Client ID]** 後，按下 **[Generate ID]** 按鈕。
    ![Security Profile Generate ID](/images/avs-device-sdk-installation-images/security-profile-generate-id.png)
  4. 接著會看到 **[Download]** 按鈕點擊並下載它為`config.json`，這檔案包含了與 security profile 相關的`clientID`與`productID`。而這個檔案將會在後續執行 AVS Device SDK 提供的 SampleApp 用到。
    ![Security Profile Download](/images/avs-device-sdk-installation-images/security-profile-download.png)
  5. 閱讀並同意 [Amazon Developer Services Agreement](https://developer.amazon.com/support/legal/da), including the [Alexa Voice Services Program Requirements](https://developer.amazon.com/public/solutions/alexa/alexa-voice-service/support/terms-and-agreements)。接著按下 **[Finish]** 按鈕。
  6. 若填寫資訊沒問題會彈出 **Your Product has been created** 的視窗。
  ![Alexa Product Created](/images/avs-device-sdk-installation-images/alexa-product-created.png)

接下來，我們要啟用剛剛的 Security Profile：
  1. 打開瀏覽器並前往 [LWA Console](https://developer.amazon.com/lwa/sp/overview.html)。
  2. 在 **[Select a Security Profile]** 的下拉式選單選擇剛剛建立的 Security Profile，並點擊 **[Confirm]** 按鈕。
    ![Select Security Profile](/images/avs-device-sdk-installation-images/select-security-profile.png)
  3. 輸入 **[privacy policy URL]**。
    ![Security Profile Privacy Policy URL](/images/avs-device-sdk-installation-images/security-profile-privacy-policy-url.png)
  4. **(Options)** 上傳圖片，而該圖片會在使用者進行 LWA 時會顯示的圖片。
  5. 若以上資訊都填寫完成後，按下 **[Save]** 按鈕。

儲存成功後，可以看到剛剛為 Alexa Product 建立的 Security Profile 已經啟用。

![Security Profile Enabled](/images/avs-device-sdk-installation-images/security-profile-enabled.png)

### 執行安裝腳本
將剛剛在 Security Profile 中下載的`config.json`放至`/home/pi`。透過腳本進行安裝：
```shell
$ cd /home/pi
$ sudo bash setup.sh config.json -s 998987
```

{% colorquote info %}
* `-s`為這台裝置的 serial number，可以把它視為這台裝置的唯一碼。
* 若不輸入這個參數預設為`123456`。
{% endcolorquote %}

當上面指令輸入後，馬上會跳出 AVS Device SDK 的服務條款，會要你輸入 **agree** 同意使用第三方的 library，再按下 **Enter** 繼續安裝。
```shell
################################################################################
################################################################################


AVS Device SDK Raspberry pi Script - Terms and Agreements


The AVS Device SDK is dependent on several third-party libraries, environments,
and/or other software packages that are installed using this script from
third-party sources ("External Dependencies"). These are terms and conditions
associated with the External Dependencies
(available at https://github.com/alexa/avs-device-sdk/wiki/Dependencies) that
you need to agree to abide by if you choose to install the External Dependencies.


If you do not agree with every term and condition associated with the External
Dependencies, enter "QUIT" in the command line when prompted by the installer.
Else enter "AGREE".


################################################################################
################################################################################
```

安裝過程中，會停止並且等待接受 Sensory Wake Word 的服務條款，這時按下 **Enter** 後在輸入 **yes** 即可。
```shell
==============> CLONING AND BUILDING SENSORY ==============

Cloning into 'alexa-rpi'...
remote: Enumerating objects: 232, done.
remote: Counting objects: 100% (232/232), done.
remote: Compressing objects: 100% (149/149), done.
remote: Total 232 (delta 73), reused 232 (delta 73), pack-reused 0
Receiving objects: 100% (232/232), 9.32 MiB | 1.95 MiB/s, done.
Resolving deltas: 100% (73/73), done.
The Sensory TrulyHandsfree binaries are not licensed.
Press RETURN to review the license agreement and update the files.
```

{% colorquote info %}
整個安裝過程大約 20 分鐘。
{% endcolorquote %}

### 執行範例程式
安裝完成後，透過以下指令執行 AVS Device SDK 的範例程式：
```shell
$ cd /home/pi
$ sudo bash startsample.sh
```

{% colorquote info %}
若之後要重新執行都是使用上面的指令。
{% endcolorquote %}

會看到以下畫面等待進行授權啟用：
```shell
######################################################
#       > > > > > NOT YET AUTHORIZED < < < < <       #
######################################################

############################################################################################
#     To authorize, browse to: 'https://amazon.com/us/code' and enter the code: {XXXX}     #
############################################################################################
```

此時，複製上面的網址並在瀏覽器打開後，輸入 Amazon 帳號密碼進行登入，在輸入 code 來完成授權與驗證。

等待驗證成功後 (可能需要等待 30 秒左右)，成功後會看到類似以下資訊：
```shell
########################################
#       Alexa is currently idle!       #
########################################
```

若看到以上訊息，AVS Device SDK 的 SampleApp 已經正常執行。而下次啟動就不需要在授權與驗證會自動授權與驗證。

{% colorquote warning %}
過程中會看到許多 log 資訊。因此這是範例程式為了方便 debug，所以才會顯示很多 log 資訊。
{% endcolorquote %}

### Talk with Alexa
此時，已經在 Raspberry Pi 上執行 Alexa 了，可以透過麥克風來體驗 Alexa 帶來的便利。
