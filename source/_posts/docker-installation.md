---
title: 在 Ubuntu 上安裝 Docker CE
date: 2018-03-01
categories:
  - 技術
  - Container
tag:
  - Docker
  - Ubuntu
thumbnail: /images/docker-installation-images/docker-logo.png
banner: /images/docker-installation-images/docker-logo.png
toc: true
---
在安裝 Docker CE 時，官方在 [get.docker.com](https://get.docker.com/) 與 [test.docker.com](https://test.docker.com/) 提供一個很方便的腳本來進行安裝。但若要在 production 環境使用此安裝腳本是不建議的，因為它具有以下風險：
  * 使用快速安裝腳本需要使用到`root`或`sudo`特權來執行，因此在執行腳本之前你需要特別檢查與確認是否使用；
  * 快速安裝腳本會自動偵測你的 Linux 發行版與版本，並為你配置 package management 系統。此外，腳本不允許設定任何安裝參數；
  * 快速安裝腳本會安裝所有的相依性與推薦的套件，且不需要經過確認；
  * 快速安裝腳本不提供選項來指定安裝 Docker 的版本，它會安裝最新的版本(非 stable release 版本)；
  * 如果主機已經安裝了 Docker 請不要使用快速安裝腳本。

因此，官方建議使用以下方式來安裝 Docker CE。

<!--more-->

## 安裝 Docker CE
首先，更新`apt` package 並安裝一些相關套件：
```shell
$ sudo apt-get update
$ sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common
```

新增`Docker`的 GPG 金鑰(key)：
```shell
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

確認金鑰(key)且驗證金鑰為`9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88`：
```shell
$ sudo apt-key fingerprint 0EBFCD88
pub   4096R/0EBFCD88 2017-02-22
      Key fingerprint = 9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88
uid                  Docker Release (CE deb) <docker@docker.com>
sub   4096R/F273FCD8 2017-02-22
```

設定 apt repository：
```shell
$ sudo add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) \
    stable"
```

更新 apt package：
```shell
$ sudo apt-get update
```

使用以下指令列出`docker-ce`可以使用的版本：
```shell
$ sudo apt-cache madison docker-ce
 docker-ce | 18.03.1~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 18.03.0~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.12.1~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.12.0~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.09.1~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.09.0~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.06.2~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.06.1~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.06.0~ce-0~ubuntu | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.03.2~ce-0~ubuntu-xenial | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.03.1~ce-0~ubuntu-xenial | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
 docker-ce | 17.03.0~ce-0~ubuntu-xenial | https://download.docker.com/linux/ubuntu xenial/stable amd64 Packages
```

選擇其中一個版本並安裝：
```shell
$ sudo apt-get install docker-ce=17.12.0~ce-0~ubuntu
```

安裝完成後，可以使用以下指令確認`Docker`版本：
```shell
$ sudo docker version
Client:
 Version:	17.12.0-ce
 API version:	1.35
 Go version:	go1.9.2
 Git commit:	c97c6d6
 Built:	Wed Dec 27 20:11:19 2017
 OS/Arch:	linux/amd64

Server:
 Engine:
  Version:	17.12.0-ce
  API version:	1.35 (minimum version 1.12)
  Go version:	go1.9.2
  Git commit:	c97c6d6
  Built:	Wed Dec 27 20:09:53 2017
  OS/Arch:	linux/amd64
  Experimental:	false
```

這時候發現下任何 Docker 指令都需要加`sudo`，這邊我們可以將使用者加入 Docker 群組：
```shell
$ sudo usermod -aG docker $USER
```

之後退出終端畫面再重新連線即可。

## 參考資料
  1. [Get Docker CE for Ubuntu](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
