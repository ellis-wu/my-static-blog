---
title: 使用 HAProxy 實現負載平衡
date: 2016-04-27
category:
  - 技術
  - Linux
tags:
  - HAProxy
  - Load Balancer
thumbnail: /images/haproxy-installation-images/load-balancer-logo.png
banner: /images/haproxy-installation-images/load-balancer-logo.png
toc: true
---
隨著網路服務的用量暴增，增加伺服器硬體設備已經無法解決問題，而為了可以擴充服務，負載平衡成為主流的技術。負載平衡除了分流能力之外，有另一個很大的好處就是可以提供高可用性(High Availability)，好讓你一台提供服務的主機失效，其他提供服務的主機可以繼續提供服務，降低斷線率。目前還使有很多大型網站都是使用典型的負載平衡架構，由一台 Switch 或 Proxy 接收來自網際網路的連線請求，然後分散給後面提供服務的伺服器叢集，藉此提高服務能處理龐大的連線數與客戶端的請求。

**因此，可以透過軟體的方式來達到附載平衡的效果。因此本篇教學選用較為主流的 HAProxy 來實作負載平衡的功能。**

<!--more-->

## 什麼是 HAProxy ?
HAPorxy 為一自由、免費、開放原始碼的軟體。是一種高效能的 Load Balance/Reverse Proxy，具有多種平衡演算法，以及具有強大狀態檢查功能，能確保客戶端(client)所送出的請求(request)導向至能正常提供服務的伺服器。其運作方式同於 L4-L7 負載平衡設備。

HAPorxy 是一個基於 TCP 與 HTTP 負載平衡軟體。其特性如下：
  * 安全；
  * 易於架設；
  * 功能强大(支援 cookie track、 header rewrite 等等)；
  * 此外系統提供簡顯易懂的系統監控以及統計報表畫面，管理者可清晰了解目前系統整體服務以及運行狀況。

## HAProxy 安裝
以下將會介紹HAProxy v1.5+ 在`Ubuntu`上的安裝方式。

安裝 HAProxy 十分容易，只需要透過`apt`就可以安裝完成，但在`Ubuntu 14.04`以後，無法安裝 HAProxy v1.5+ 的版本。因此，透過`PPA`新增 HAProxy v1.5+ 至`apt` repository 之中：

```shell
$ sudo add-apt-repository ppa:vbernat/haproxy-1.5
$ sudo apt-get update
$ sudo apt-get install -y haproxy
```

{% colorquote info %}
若要裝 v1.6 版本，請自行將後方版本號做變更即可，指令如下：
```shell
$ sudo add-apt-repository ppa:vbernat/haproxy-1.6
```
{% endcolorquote %}

安裝完成後，可以使用以下指令確認版本號：
```shell
$ haproxy -v
```

## HAProxy 設定
編輯並加入以下資訊至`/etc/haproxy/haproxy.cfg`：
```crmsh
listen www-balancer
    bind 0.0.0.0:9090
    balance roundrobin
    server  web1 0.0.0.0:9000 check weight 1 maxconn -1
    server  web2 0.0.0.0:9001 check weight 1 maxconn -1

listen stats
    bind 0.0.0.0:8888
    mode http
    stats enable
    stats hide-version
    stats realm Haproxy\ Statistics
    stats uri /
    # Change your account and password
    stats auth <account>:<password>
    stats refresh 10s
```

{% colorquote info %}
HAProxy 提供網頁儀表板；可以透果此網頁儀表板查看整個負載平衡群組之狀況。因此，請將設定檔中的`<account>`與`<password>`更換為自己的帳號與密碼。
{% endcolorquote %}

## 參考資料
  1. [富人用 L4 Switch，窮人用 Linux HAProxy！](https://blog.toright.com/posts/3967/%E5%AF%8C%E4%BA%BA%E7%94%A8-l4-switch%EF%BC%8C%E7%AA%AE%E4%BA%BA%E7%94%A8-linux-haproxy%EF%BC%81.html)
