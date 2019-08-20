---
title: 更換 AVS Device SDK 的喚醒詞
date: 2019-07-17
category:
  - 技術
  - AWS
tags:
  - Amazon
  - Alexa
  - Raspberry Pi
thumbnail: /images/avs-device-sdk-wwe-images/avs-device-sdk-wwe-logo.png
banner: /images/avs-device-sdk-wwe-images/avs-device-sdk-wwe-logo.png
toc: true
---
在 AVS Device SDK 中有提供 Wake Word Engine (WWE) 方便讓開發者可以換成自己的喚醒詞，而官方提供的範例預設使用了`Sensory`所訓練出來的 Alexa 模型。但`Sensory`官方文件說明它是有 **120 天**的使用限制的，若要當作產品使用則需要與他們聯絡，且`Sensory`目前也僅提供 Alexa 這個喚醒詞，但 Alexa 這個詞因為發音不正確的關係實在有夠難喚醒的。因此，本文將`Sensory`換成`Snowboy`並且更改由`Snowboy`提供的其他喚醒詞。

<!--more-->

## 事前準備
這邊需要先執行過 AVS Device SDK 的範例才能照本文教學執行，否則會有些檔案找不到。若沒有執行過可以參考{% post_link avs-device-sdk-installation 在 Raspberry Pi 上使用 AVS Device SDK 實現智慧音箱 %}這篇文章。

## 修改檔案
因為`Snowboy`目前的教學文是透過 git patch 方式去替換一些檔案，但 AVS Device SDK 有更改檔案的路徑，因此該 patch 是無法正常使用，所以本文將一步步以手動的方式來說明該修改哪些檔案。

### 修改 pi.sh
{% colorquote info %}
若執行過 AVS Device SDK 的範例，則`pi.sh`會存放在`/home/pi/pi.sh`。
{% endcolorquote %}

首先，修改`CMAKE`相關資訊：
```sh
# 原本為：
CMAKE_PLATFORM_SPECIFIC=(-DSENSORY_KEY_WORD_DETECTOR=ON \
    -DGSTREAMER_MEDIA_PLAYER=ON -DPORTAUDIO=ON \
    -DPORTAUDIO_LIB_PATH="$THIRD_PARTY_PATH/portaudio/lib/.libs/libportaudio.$LIB_SUFFIX" \
    -DPORTAUDIO_INCLUDE_DIR="$THIRD_PARTY_PATH/portaudio/include" \
    -DSENSORY_KEY_WORD_DETECTOR_LIB_PATH=$THIRD_PARTY_PATH/alexa-rpi/lib/libsnsr.a \
    -DSENSORY_KEY_WORD_DETECTOR_INCLUDE_DIR=$THIRD_PARTY_PATH/alexa-rpi/include)

# 修改成：
CMAKE_PLATFORM_SPECIFIC=(-DKITTAI_KEY_WORD_DETECTOR=ON \
    -DGSTREAMER_MEDIA_PLAYER=ON -DPORTAUDIO=ON \
    -DPORTAUDIO_LIB_PATH="$THIRD_PARTY_PATH/portaudio/lib/.libs/libportaudio.$LIB_SUFFIX" \
    -DPORTAUDIO_INCLUDE_DIR="$THIRD_PARTY_PATH/portaudio/include" \
    -DKITTAI_KEY_WORD_DETECTOR_LIB_PATH=$THIRD_PARTY_PATH/snowboy/lib/rpi/libsnowboy-detect.a \
    -DKITTAI_KEY_WORD_DETECTOR_INCLUDE_DIR=$THIRD_PARTY_PATH/snowboy/include \
    -DCMAKE_BUILD_TYPE=MINSIZEREL)
```

修改相依性套件：
```sh
# 原本為：
sudo apt-get -y install git gcc cmake build-essential libsqlite3-dev libcurl4-openssl-dev libssl1.0-dev libfaad-dev libsoup2.4-dev libgcrypt20-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-good libasound2-dev sox gedit vim python3-pip

# 修改成：
sudo apt-get -y install git gcc cmake build-essential libsqlite3-dev libcurl4-openssl-dev libssl1.0-dev libfaad-dev libsoup2.4-dev libgcrypt20-dev libgstreamer-plugins-bad1.0-dev gstreamer1.0-plugins-good libasound2-dev sox gedit vim python3-pip libatlas-base-dev
```


**(Options)** 修改腳本輸出：
```sh
# 原本為：
echo "==============> CLONING AND BUILDING SENSORY =============="

# 修改成：
echo "==============> CLONING AND BUILDING KITTAI =============="
```

將原本從`Sensory`下載相關檔案改為`Snowboy`：
```sh
# 原本為：
git clone git://github.com/Sensory/alexa-rpi.git
bash ./alexa-rpi/bin/license.sh

# 修改成：
git clone https://github.com/Kitt-AI/snowboy.git
cp snowboy/resources/alexa/alexa-avs-sample-app/alexa.umdl snowboy/resources/alexa.umdl
```

{% colorquote info %}
這邊可以從 [Snowboy](https://github.com/Kitt-AI/snowboy/tree/master/resources/models) 的 GitHub 找到它提供的其他喚醒詞模型，但是不論使用哪個喚醒詞，都要把它命名為`alexa.umdl`。因為 AVS Device SDK 的範例程式只認得這個檔案名稱。
{% endcolorquote %}

修改執行 AVS Device SDK 範例指令：
```sh
# 原本為：
./SampleApp "$OUTPUT_CONFIG_FILE" "$THIRD_PARTY_PATH/alexa-rpi/models" DEBUG9

# 修改成：
./SampleApp "$OUTPUT_CONFIG_FILE" "$THIRD_PARTY_PATH/snowboy/resources" DEBUG9
```

修改完成後即可儲存。

### 修改 setup.sh
{% colorquote info %}
若執行過 AVS Device SDK 的範例，則`setup.sh`會存放在`/home/pi/setup.sh`。
{% endcolorquote %}

首先，新增一個變數：
```sh
LIB_SUFFIX="a"
ANDROID_CONFIG_FILE=""

# 新增下面這行
BUILDTYPE="MINSIZEREL"
```

接著，找到以下資訊並新增一行指令：
```sh
cmake "$SOURCE_PATH/avs-device-sdk" \
      -DCMAKE_BUILD_TYPE=DEBUG \
      "${CMAKE_PLATFORM_SPECIFIC[@]}"

# 新增下面這行
sed -E -i "s:CXX_PLATFORM_DEPENDENT_FLAGS_"$BUILDTYPE"\s+\"(.*)\":CXX_PLATFORM_DEPENDENT_FLAGS_"$BUILDTYPE" \"\1 -D_GLIBCXX_USE_CXX11_ABI=0 -pg\":" ../avs-device-sdk/build/cmake/BuildOptions.cmake

cd $BUILD_PATH
make SampleApp -j2
```

修改完成後即可儲存。

## 重新編譯 AVS Device SDK 與範例
重新編譯 AVS Device SDK 與範例程式之前，我們需要刪除一些檔案。因為，現在`setup.sh`會檢查一些檔案路徑來判斷是否需要重新安裝套件或編譯檔案。若不刪除，剛剛的改動有部分指令會沒有執行到：
```shell
$ cd /home/pi/
$ sudo rm -rf build/ avs-device-sdk/
```

刪除後，透過以下指令開始重新安裝套件與編譯 AVS Device SDK：
```shell
sudo bash setup.sh config.json -s 998987
```

{% colorquote info %}
因為是重新編譯 AVS Device SDK，所以整個安裝過程大約 15 至 20 分鐘。
{% endcolorquote %}

## 更換喚醒詞
安裝完成後，預設的喚醒詞依然是 Alexa，所以我們要使用`Snowboy`提供的其他喚醒詞來替換掉原本的 **"Alexa"**。
```shell
$ sudo cp /home/pi/third-party/snowboy/resources/models/jarvis.umdl /home/pi/third-party/snowboy/resources/alexa.umdl
```

{% colorquote info %}
這邊選擇 computer 這個喚醒詞，可以依照自己情況選擇其他的喚醒詞。
{% endcolorquote %}

## 開始體驗
選擇並且替換喚醒詞後，可以按照原本使用 AVS Device SDK 的範例一樣使用：
```shell
$ sudo bash startsample.sh
```

看到以下資訊後，就可以用你替換的喚醒詞叫醒它了!
```shell
########################################
#       Alexa is currently idle!       #
########################################
```
