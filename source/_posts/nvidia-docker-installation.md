---
title: NVIDIA Docker v2 安裝
date: 2018-03-02
categories:
  - 技術
  - Container
tag:
  - Docker
  - NVIDIA
thumbnail: /images/nvidia-docker-installation-images/nvidia-docker-logo.png
banner: /images/nvidia-docker-installation-images/nvidia-docker-logo.png
toc: true
---
2017 年 11 月 NVIDIA 已將 NVIDIA Docker v2 的版本合併(merged)至 [NVIDIA/nvidia-docker](https://github.com/NVIDIA/nvidia-docker) 的 repository，這意味著 v2 會逐漸取代 v1。

而根據官方的說明，v1 與 v2 差異如下：
 * 不需要封裝的 Docker CLI 以及獨立的背景程式(daemon)
 * GPU 的隔離現在透過環境變數`NVIDIA_VISIBLE_DEVICES`
 * 任何的 Docker image 都可以啟動 GPU 支援，不只是基於官方的 CUDA image
 * Ubuntu 與 CentOS 都有 Package repositories，意味著安裝更為簡單與方便
 * 基於`libnvidia-container`來重新實現

而本文將介紹如何使用 NVIDIA Docker v2 來讓容器使用 GPU。

<!--more-->

## 安裝環境
環境資訊：

| Name                  | Spec             |
| --------------------- | ---------------- |
| OS                    | Ubunut 16.04 LTS |
| CPU                   | 4 CPU            |
| RAM                   | 16 GB            |
| Disk                  | 1 TB             |

## 事情準備
安裝前需要確認以下幾點：
  * GNU/Linux x86_64 with kernel version > 3.10
  * Docker CE or EE == v17.12
  * NVIDIA GPU with Architecture > Fermi (2.1)
  * [NVIDIA drivers](http://www.nvidia.com/object/unix.html) ~= 361.93 (untested on older versions)

## 安裝 Docker CE v17.12
首先，須在環境中安裝`Docker`。若使用提供的腳本快速安裝的話，安裝的`Docker`版本為`18.02`，而目前`nvidia-docker2`貌似還不支援。因此透過以下方式安裝`Docker`並指定版本為`17.12`：
```shell
$ sudo -i
$ apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common
```

新增`Docker`的 GPG 金鑰(key)：
```shell
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
```

確認金鑰(key)，且驗證金鑰為`9DC8 5822 9FC7 DD38 854A E2D8 8D81 803C 0EBF CD88`：
```shell
$ apt-key fingerprint 0EBFCD88
pub   4096R/0EBFCD88 2017-02-22
      Key fingerprint = 9DC8 5822 9FC7 DD38 854A  E2D8 8D81 803C 0EBF CD88
uid                  Docker Release (CE deb) <docker@docker.com>
sub   4096R/F273FCD8 2017-02-22
```

設定 apt repository：
```shell
$ add-apt-repository \
    "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) \
    stable"
```

更新 apt package：
```shell
$ apt-get update
```

使用以下指令列出`docker-ce`可以使用的版本：
```shell
$ apt-cache madison docker-ce
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
$ apt-get install docker-ce=17.12.0~ce-0~ubuntu
```

安裝完成後，可以使用以下指令確認`Docker`版本：
```shell
$ docker version
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

## 安裝 nvidia-docker
Docker CE v17.12 安裝完成後，接著可以開始安裝`nvidia-docker2`：
```shell
$ apt-get install nvidia-384
$ docker volume ls -q -f driver=nvidia-docker | xargs -r -I{} -n1 docker ps -q -a -f volume={} | xargs -r docker rm -f
$ apt-get purge -y nvidia-docker
$ curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
$ curl -s -L https://nvidia.github.io/nvidia-docker/ubuntu16.04/amd64/nvidia-docker.list | \
    tee /etc/apt/sources.list.d/nvidia-docker.list
$ apt-get update
$ apt-get install -y nvidia-docker2
$ pkill -SIGHUP dockerd
```

安裝完成後，使用`nvidia-docker`指令確認是否安裝成功：
```shell
nvidia-docker version
NVIDIA Docker: 2.0.3
Client:
 Version:      18.03.1-ce
 API version:  1.37
 Go version:   go1.9.5
 Git commit:   9ee9f40
 Built:        Thu Apr 26 07:17:20 2018
 OS/Arch:      linux/amd64
 Experimental: false
 Orchestrator: swarm

Server:
 Engine:
  Version:      18.03.1-ce
  API version:  1.37 (minimum version 1.12)
  Go version:   go1.9.5
  Git commit:   9ee9f40
  Built:        Thu Apr 26 07:15:30 2018
  OS/Arch:      linux/amd64
  Experimental: false
```

## 驗證 nvidia-docker
下載官方的 Docker image，並使用`nvidia-smi`指令來驗證在 Docker Container 中有抓到 GPU 資訊：
```shell
$ nvidia-docker run --runtime=nvidia --rm nvidia/cuda nvidia-smi
Tue Mar  2 06:19:09 2018
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 384.111                Driver Version: 384.111                   |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  GeForce GTX 106...  Off  | 00000000:01:00.0 Off |                  N/A |
|  0%   35C    P0    15W / 120W |      0MiB /  3013MiB |      2%      Default |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                       GPU Memory |
|  GPU       PID   Type   Process name                             Usage      |
|=============================================================================|
|  No running processes found                                                 |
+-----------------------------------------------------------------------------+
```

## 參考資料
  1. [NVIDIA Docker Repository](https://github.com/NVIDIA/nvidia-docker#quickstart)
  2. [NVIDIA-Docker version 2 released](https://aetros.com/blog/Machine%20Learning/14-11-2017-nvidia-docker2-released)
