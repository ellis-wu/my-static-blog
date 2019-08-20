---
title: Alexa Skill 結合 Auth0
date: 2019-07-22
category:
  - 技術
  - AWS
tags:
  - Amazon
  - Alexa
  - Auth0
thumbnail: /images/ask-with-auth0-images/ask-with-auth0-logo.png
banner: /images/ask-with-auth0-images/ask-with-auth0-logo.png
toc: true
---
在上一篇{% post_link alexa-skills-kit Alexa Skills Kit 新手教學 %}介紹了怎麼建立一個簡單的 Alexa Skill 的範例。若有考慮到要將 Skill 產品化應該都會遇到一些問題，就是當我對 Echo 或 APP 說了一指令希望它去打開臥室的門，它要怎麼知道該使用者的臥室是哪個裝置進而讓它去執行開門的動作呢？這時候我們需要借助`Account Linking`這個功能，這是在使用者啟用這個技能時，需要使用者授權讓該技能擁有存取使用者資訊的功能。當我們能存取使用者的一些資訊後，就可以去查詢使用者的臥室是哪個裝置，進而去控制裝置的動作。而`Account Linking`是使用`OAuth 2.0`協定來進行的，你當然可以選擇自己建立 OAuth Server 或者使用其他第三方服務。而本文將使用 [Auth0](https://auth0.com/) 結合 Alexa Skill。

<!--more-->

## 使用流程與架構
使用者若要使用客製化技能，是有些前置動作要完成的。使用者在使用客製化技能前，需要在 Alexa APP 或網頁來啟用該技能，而我們的 skill 會設定必須進行 account linking。所以當使用者在 APP 或網頁點擊 **[Enable]** 後，會彈出一個登入/註冊網站，當使用者輸入資料後並點擊登入/註冊按鈕後，會將該資料儲存至 Auth0 之中。成功後，使用者就會在 APP 或網頁看到該 skill 已經成功啟用且連結了。
![Enable Skill Overview](/images/ask-with-auth0-images/enable-skill-overview.png)

前置步驟完成，我們可以來看看當使用者使用客製化技能的流程。當使用者說出客製化技能的指令，一樣會將語音串流傳送至 AVS，而 AVS 將語音轉換為文字再進行分析，分析後則觸發該技能的 Lambda 函式。而 Lambda 的 Intent Handler 觸發後，會先跟 Auth0 取得該使用者的基本資料(不包含 Device UUID)。再從取得的基本資料拿到該使用者在 Auth0 中的 ID，我們利用該 ID 從 Auth0 提供的 Management API 查詢該使用者的詳細資訊。最後再從使用者的詳細資訊取得它的 Device UUID。接著可以利用這些資訊往第三方服務(MQTT 等服務)傳送，告知該 Device UUID 該執行動作了。而使用者家中的裝置接收到後則作出對應的動作。
![ASK with Auth0 Overview](/images/ask-with-auth0-images/ask-with-auth0-overview.png)

## 設定 Auth0
要設定 Auth0 當然要先擁有 [Auth0](https://auth0.com/) 的帳號。請先自行註冊 Auth0 帳號後再進行以下步驟。

### 建立與設定 Auth0 Application
登入後，點擊 **[CREATE APPLICATION]** 先創建一個 application。
![Auth0 Dashboard](/images/ask-with-auth0-images/auth0-dashboard.png)

接著，輸入 application 的 **[Name]** 並且選擇類型為 **[Machine to Machine Applications]**。
![Auht0 Application Informations](/images/ask-with-auth0-images/auth0-app-informations.png)

輸入完成後，點擊 **[CREATE]**。

接著會要選則這個 application 他能存取與使用的 API。下拉式選單選擇 **[Auth0 Management API]** 後，再將 **scopes** 選擇 **[all]**。
![Auth0 Application Authorize](/images/ask-with-auth0-images/auth0-app-auth.png)

{% colorquote danger %}
本文是範例教學，所以將所有 API 權限打開。請依照自己的使用情境選擇要開起來些 API 權限。
{% endcolorquote %}

選擇完畢後，點擊 **[AUTHORIZE]**。完成後會看到類似以下畫面。
![Auth0 Application](/images/ask-with-auth0-images/auth0-app-created.png)

接下來，要對這個 application 設定一些配置。切換上方 tab 至 **Settings**，找到 **Token Endpoint Authentication Method** 並設定成 **[Basic]**。
![Auth0 Token Eenpoint Authentication Method](/images/ask-with-auth0-images/auth0-token-endpoint-auth-method.png)

再來，在設定頁面最下方，會看到 **[Show Advances Settings]** 點擊並將 tab 切換至 **OAuth**，再來找到 **JsonWebToken Signature Algorithm** 欄位並選擇 **[HS256]**。
![Auth0 JsonWebToken Signature Algorithm](/images/ask-with-auth0-images/auth0-jsonWebToken-signature-algorithm.png)

完成後，點擊下方 **[SAVE CHANGE]** 按鈕。

### (Options) Social Logins
這是使用者在登入時，可以選擇使用其他第三方帳號(Facebook、Google 與 Amazon 等等)的方式登入。每個第三方帳號的設定都不盡相同，這邊就看自己的需求自行設定。而本文這邊就不進行說明，若想要設定請參考[這裏](https://www.jovo.tech/tutorials/alexa-account-linking-auth0#social-logins)。

## 設定 Alexa Skill
這邊要開始 Alexa Skill 與 Auth0 之間的設定。我們先打開自己建立的 Alexa Skill 頁面，並點選左邊的 **Account Linking**。
![Alexa Skill Account Linking](/images/ask-with-auth0-images/alexa-skill-account-linking.png)

如上圖所示，將 **Do you allow users to create an account or link to an existing account with you?** 的開關打**開**。而 **Allow users to enable skill without account linking** 選項則是看個人需求，如果選擇關閉；則在啟用這個技能時就會直接請求 Account Linking。

接來來，在 **Authorization Grant Type** 選項選擇 **[Auth Code Grant]**。選擇後，會看到下方有好幾項設定，而這些設定都可以從 Auth0 那邊取得：
  * **Authorization URL**：在剛剛於 Auth0 建立的 application 中的 **[Settings]** → **[Advanced Settings]** → **[Endpoints]** → **[OAuth Authorization URL]**。
  * **Access Token URI**：在剛剛於 Auth0 建立的 application 中的 **[Settings]** → **[Advanced Settings]** → **[Endpoints]** → **[OAuth Token URL]**。
  * **Client ID**：在剛剛於 Auth0 建立的 application 中的 **[Settings]** → **[Client ID]**。
  * **Client Secret**在剛剛於 Auth0 建立的 application 中的 **[Settings]** → **[Client Secret]**。
  * **Client Authentication Scheme**：依然選擇 **[HTTP Basic]**。
  * **Scope**：分別新增並輸入`openid`、`offline_access`、`profile`與`email`。
  * **Domain List**：新增並輸入`cdn.auth0.com`。

以上資訊輸入完成後，就可以按下上方 **[Save]** 按鈕。而輸入完資訊類似下面這樣。
![Alexa Skill Account Linking Setting](/images/ask-with-auth0-images/ask-account-linking-setting.png)

接下來，請記住 Alexa Skill Account Linking 下方的 **Redirect URLs** 的三個網址。我們要將它設定至 Auth0 上。這是當 Auth0 成功授權登入後，會重新導回這個 URL。在剛剛於 Auth0 建立的 application 中的 **[Settings]** 找到 **Allowed Callback URLs** 欄位，輸入剛剛記下來的三個 **Redirect URLs** 並以**逗號**區隔。
![Auth0 Redirect](/images/ask-with-auth0-images/auth0-redirect-urls.png)

輸入完後，請得點選下方的 **[SAVE CHANGE]** 按鈕。

## 第一次測試
我們透過 [Amazon Alexa 網頁版](https://alexa.amazon.com/)進行測試，當然也可以從 Alexa APP 進行測試，但在台灣是下載不到 Alexa APP 的，所以要切換至別的國家才有辦法下載。

登入後，我們點選左邊導航列的 **Skills**，再點選右上的 **Your Skills**，可以查詢你所擁有的 Skill。這邊可以看到 **Enable Skill** 會看到自己建立的客製化技能。
![My Custom Skill](/images/ask-with-auth0-images/ask-my-skill.png)

可以看到這個 skill 是 **Enable** 的狀態且下方顯示 **Account linking required**，這代表我們 account linking 是有啟用的狀態。我們可以點選旁邊的 **SETTINGS** 按鈕。點擊後我們會看到類似以下畫面，這邊可以進行 account linking 的動作。
![Account Linking](/images/ask-with-auth0-images/account-linking.png)

{% colorquote info %}
【重要觀念】
Alexa Skill 的啟用與 account linking 是分開的，意思是可以單獨啟用該技能卻不進行 account linking。若不進行 account linking 的話，該使用者還是能使用該 skill，但在 lambda 則無法取得該使用者的`access token` 來取得該使用者的個人資料。
{% endcolorquote %}

點擊右邊小小的 **[Link Account]** 按鈕，就會轉跳至 Auth0 提供的登入畫面，如下圖所示。這時候我們先暫時不作任何動作，因為我們需要更改一下 Auth0 登入頁面讓使用者在進行 account linking 時輸入裝置的 UUID，以及修改 skill 的 Lambda 程式讓使用者使用客製化技能時，能確認是否已經進行 account linking，若已經進行 account linking 則能取得使用者的裝置 UUID。
![Account Linking Login Page](/images/ask-with-auth0-images/account-linking-login-page.png)

## 修改 Auth0 Login 畫面
真的不得不說 Auth0 整合得很完善也很方便，它提供了`Universal Login`讓開發者能夠快速建立登入授權驗證網頁。而`Universal Login`它提供了三種選擇：
  1. Lock
  2. Lock (passwordless)
  3. Custom Login Form

其中 Lock 與 Custom Login Form 之間最大的差異是 Lock 都是透過 Auth0 提供的 library 來建立登入授權驗證網頁，其它提供了登入授權驗證網頁的樣板，因此畫面較為固定，若需在網頁上新增欄位讓使用者填寫的話，則要依照它的方式來新增欄位。而 Custom Login Form 則是登入授權驗證網頁的 html 與 css 都可以自行修改，而透過`script`載入 Auth0 的函式讓開發者能進行登入與註冊的動作。

這邊我們使用 Custom Login Form 來建立自己的登入授權驗證網頁。首先，到 Auth0 Dashboard 點選左邊的 **Universal Login**，然後切換中間 tab 至 **Login**，再來將中間 **Customize Login Page** 的開關開啟，再將下方的 **DEFAULT TEMPLATES** 下拉式選單選擇至 **[Custom Login Form]**。
![Auth0 Universal Login](/images/ask-with-auth0-images/auth0-universal-login.png)

選擇完後，會看到程式碼與一開始不同，接著我們稍微來修改一下程式碼。先加入一個 Device UUID 的輸入框：
```html
...
  <div class="form-group">
    <label for="name">Password</label>
    <input
      type="password"
      class="form-control"
      id="password"
      placeholder="Enter your password">
  </div>
  <!-- 加入下面程式 -->
  <div class="form-group">
    <label for="name">Device UUID</label>
    <input
      type="deviceUUID"
      class="form-control"
      id="deviceUUID"
      placeholder="Enter your device UUID">
  </div>
...
```

再來是在註冊時，我們要將 Device UUID 儲存至 Auth0 中。而 Auth0 在註冊時，我們可以將 Device UUID 存入至使用者的`user_metadata`中，之後再透過 API 將其取出。所以，修改程式碼中`signup`函式：
```js
...
  function signup() {
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    var deviceUUID = document.getElementById('deviceUUID').value;

    webAuth.redirect.signupAndLogin({
      connection: databaseConnection,
      email: email,
      password: password,
      user_metadata: {
        deviceUUID: deviceUUID,
      }
    }, function(err) {
      if (err) displayError(err);
    });
  }
...
```

完成後，可以點擊上面的 **[Preview]** 按鈕來看一下目前的登入授權驗證網頁。
![Auth0 Login Preview](/images/ask-with-auth0-images/auth0-login-preview.png)

確認沒問題後，就可以按下方的 **[SAVE CHANGES]** 按鈕來儲存。

## 修改 Lambda 程式碼
當使用者說出「Alexa, tell myskill open the door」時，會發客製化技能的 Lambda 執行。而這時候，在 Lambda 中要去抓取該使用者的 Device UUID 並往第三方服務發送一個 action 的訊息，而客戶的裝置為該 Device UUID 則執行動作。

為了達到上述的情況，我們需要修改 Alexa Skill 上 Lambda 的程式碼。請參考下方的程式碼進行修改，其中有些參數請更改為自己的資訊。我們可以從 Lambda 觸發時的 handler 取得`access token`(只有成功 account linking 時才能取得到)，再透過該`access token`呼叫 Auth0 的 userinfo API 取得使用者的資訊，但 Response 中的使用者資訊並不包含我們儲存`device UUID`的`user_metadata`。這是因為 userinfo API 取得的資料格式必須遵照`OpenID`，而`user_metadata`並不屬於`OpenID`的 scope。

因此，我們利用剛剛從 userinfo API 取得到的 user ID，再透過 Auth0 的 Management API 來查詢該使用者的資訊，並取得`user_metadata`的 device UUID。在使用 Management API 查詢使用者之前，需要先向 Auht0 取得 token 來存取 Management，否則會無法存取。
```js
const DoorIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HelloWorldIntent';
  },
  async handle(handlerInput) {
    // Get user access token
    const { accessToken } = handlerInput.requestEnvelope.context.System.user;
    let speechText = '';

    if (!accessToken) {
      // If didn't have access token then ask user link account
      speechText = 'Please link your account';
      return handlerInput.responseBuilder.speak(speechText).getResponse();        
    } else {
      // Using userinfo API to get user informations with OpenID format
      let userInfoOptions = {
        headers: {
          authorization: 'Bearer ' + accessToken
        }
      };
      const userInfoResponse = await axios.get('https://{your auth0 application url}/userinfo', userInfoOptions);
      const userID = userInfoResponse.data.sub; // Get the user UUID
    
      // Get token for search the user informations to get user's device UUID
      let tokenPayload = {
        'client_id': '{your client ID}',
        'client_secret': '{your client secret}',
        'audience': 'https://{your auth0 application url}/api/v2/',
        'grant_type': 'client_credentials'
      };
      let tokenHeaders = { 
        headers: { 
          'content-type': 'application/json'
        }
      };
      const tokenResponse = await axios.post('https://{your auth0 application url}/oauth/token', tokenPayload, tokenHeaders);
      const token = tokenResponse.data.access_token;

      // Get device UUID in user informations via Auth0 Management API
      let deviceHeader = { 
        headers: {
          authorization: 'Bearer ' + token
        }
      };
      const deviceResponse = await axios.get(`https://{your auth0 application url}/api/v2/users/${userID}`, deviceHeader);
      const deviceID = deviceResponse.data.user_metadata.deviceUUID;
            
      // Do something in there
      // ...

      speechText = `Open ${deviceID} Door`;
      return handlerInput.responseBuilder.speak(speechText).reprompt(speechText).getResponse();
    }
  }
};
```

因為我們有用`axios`來呼叫 API，所以先在程式碼最上方加入這行：
```js
const axios = require('axios');
```

接著，在`package.json`中加入`axios`：
```json
{
  "name": "hello-world",
  "version": "1.1.0",
  "description": "alexa utility for quickly building skills",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "Amazon Alexa",
  "license": "ISC",
  "dependencies": {
    "ask-sdk-core": "^2.6.0",
    "ask-sdk-model": "^1.18.0",
    "aws-sdk": "^2.326.0",
    "axios": "^0.18.0"
  }
}
```

完成後，點擊上方 **[Save]** 並且 **[Deploy]**。

## 開始測試！
部署完成後，依樣可以切換上方的導航列至 **[Test]**。首先，我們先測試看看若未進行 account linking，是否會回覆我們 "Please link your account"。
![Test Scenario 1](/images/ask-with-auth0-images/test-for-no-account-linking.png)

接著使用 Alexa APP 或網站進行 account linking 來測試看看結果如何。點擊 **[Link Account]** 按鈕。
![Account Linking](/images/ask-with-auth0-images/account-linking.png)

點擊後，會轉跳至我們剛剛設定的登入授權驗證網頁，並輸入帳號密碼與裝置的 UUID。輸入完成後按下 **[Sign Up]** 按鈕。
![Auth0 Login Website](/images/ask-with-auth0-images/auth0-login-website.png)

完成後，若成功會看到該技能已經成功連結。
![Skill Link Success](/images/ask-with-auth0-images/skill-link-success.png)

我們可以到 Auth0 的 Dashboard 查看剛剛註冊的使用者，且可以看到`user_metadata`有儲存剛剛輸入的`deviceUUID`。
![Auth0 User Informations](/images/ask-with-auth0-images/auth0-user-info.png)

再來進行 account linking 後在測試一次看看結果。
![Test Scenario 2](/images/ask-with-auth0-images/test-account-linking.png)

這樣就大功告成拉！
