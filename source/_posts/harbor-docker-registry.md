---
title: 企業等級的 Docker Registry Harbor
date: 2018-05-03
categories:
  - 技術
  - Container
tag:
  - Harbor
  - Docker Registry
thumbnail: /images/harbor-docker-registry-images/harbor-logo.jpg
banner: /images/harbor-docker-registry-images/harbor-logo.jpg
toc: true
---
Harbor 是一個企業級 Registry 伺服器用於儲存和分散 Docker Image 的，透過新增一些企業常用的功能，例如：安全性、身分驗證和管理等功能擴展了開源的 [Docker Distribution](https://github.com/docker/distribution)。作為一個企業級的私有 Registry 伺服器，Harbor 提供了更好的效能與安全性。Harbor 支援安裝多個 Registry 並將 Image 在多個 Registry 做 replicated。除此之外，Harbor 亦提供了高級的安全性功能，像是用戶管理(user managment)，存取控制(access control)和活動審核(activity auditing)。

<!--more-->

## 功能特色
* **基於角色為基礎的存取控制(Role based access control)**：使用者和 Repository 透過 Project 進行組織管理，一個使用者在同一個 Project 下，對於每個 Image 可以有不同權限。
* **基於 Policy 的 Image 複製**：Image 可以在多得 Registry instance 中同步複製。適合於附載平衡、高可用性、混合雲與多雲的情境。
* **支援 LDAP/AD**：Harbor 可以整合企業已有的 LDAP/AD，來管理使用者的認證與授權。
* **使用者的圖形化介面**：使用者可以透過瀏覽器，查詢 Image 和管理 Project
* **審核管理**：所有對 Repositroy 的操作都被記錄。
* **RESTful API**：RESTful APIs 提供給管理的操作，可以輕易的整合額外的系統。
* **快速部署**：提供 Online installer 與 Offline installer。

## 安裝方式
Harbor 提供三種方法進行安裝：
  1. **Online Installer**：這種安裝方式會從 Docker hub 下載 Harbor 所需的映像檔，因此 Installer 檔案較輕量；
  2. **Offline Installer**：當無任何網際網路連接的情況下使用此種安裝方式，預先將所需的映像檔打包，因此 Installer 檔案較大；
  3. **OVA Installer**：當使用者的環境是 vCenter 時使用此安裝。OVA 部署後 Harbor 才啟動，更多詳細資訊請參考 [Harbor OVA install guide](https://github.com/vmware/harbor/blob/master/docs/install_guide_ova.md)。


## 事前準備
Harbor 會部署數個 Docker container，所以部署的主機需要能支援 Docker 的 Linux 發行版本。而部署主機需要安裝 Python、Docker 以及 Docker Compose 等軟體。

硬體需求：

| Resource | Capacity      | Description        |
| -------- | ------------- | ------------------ |
| CPU      | minimal 2 CPU | 4 CPU is prefered  |
| RAM      | minimal 4 GB  | 8 GB is prefered   |
| Disk     | minimal 40 GB | 160 GB is prefered |

軟體需求：

| Software       | Version            |
| -------------- | ------------------ |
| Python         | v2.7+              |
| Docker Engine  | v1.10+             |
| Docker Compose | v1.6.0+            |
| OpenSSL        | latest is prefered |

Network Port：

| Port | Protocol | Description                                  |
| ---- | -------- | -------------------------------------------- |
| 443  | HTTPS    | Harbor UI 與 API 會使用此 Port 進行 HTTPS 的溝通 |
| 4443 | HTTPS    | 若有使用 Notary 才會使用到此 Port                |
| 80   | HTTP     | Harbor UI 與 API 會使用此 Port 進行 HTTP 的溝通  |

{% colorquote info %}
本文安裝的 Harbor 各軟體版本資訊：
  * Harbor 版本為 v1.4.0
  * Docker 版本為 18.04.0-ce
  * docker-compose 版本為 1.21.0
  * Python 版本為 2.7.12
{% endcolorquote %}

## 安裝 Harbor
Harbor 安裝主要分為以下三個步驟：
  1. 下載 Installer；
  2. 設定 harbor.cfg；
  3. 執行 run.sh 開始安裝與啟動 Harbor。

### 下載 Installer
Installer 的 binary 檔可以從 [release page](https://github.com/vmware/harbor/releases) 下載，選擇使用的是 Online Installer 或 Offline Installer，下載完成後，使用`tar`將 package 解壓縮。

Online Installer：
```shell
$ tar xvf harbor-online-installer-<version>.tgz
```

Offline Installer：
```shell
$ tar xvf harbor-offline-installer-<version>.tgz
```

### 設定 Harbor
Harbor 所有的設定與參數都在`harbor.cfg`中。

`harbor.cfg`中的參數分為**required parameters**與**optional parameters**
  * **Required parameters**：這類的參數是必須設定的，且會影響使用者更新`harbor.cfg`後，重新執行安裝腳本來重新安裝 Harbor。
  * **Optional parameters**：這類的參數為使用者自行決定是否設定，且只會在第一次安裝時，這些參數的配置才會生效。而 Harbor 啟動後，可以透過 Web UI 進行修改。

而最基本的安裝僅需修改`harbor.cfg`中的`hostname`參數，將其更改為自己的`hostname`即可。

{% colorquote info %}
參數設定本文件不再詳述，若想要了解請參考以下網址：
  * [Required parameters](https://github.com/vmware/harbor/blob/master/docs/installation_guide.md#required-parameters)
  * [Optional parameters](https://github.com/vmware/harbor/blob/master/docs/installation_guide.md#optional-parameters)
{% endcolorquote %}

### Configuring storage backend (optional)
預設的情況下，Harbor 會將 Docker image 儲存在本機的檔案系統上，在生產環境中，您可以考慮使用其他 storage backend 而不是本機的檔案系統，像是 S3, OpenStack Swift, Ceph 等。而僅需更改`common/templates/registry/config.yml`。以下為一個接 OpenStack Swift 的範例：
```yaml
storage:
  swift:
    username: admin
    password: ADMIN_PASS
    authurl: http://keystone_addr:35357/v3/auth
    tenant: admin
    domain: default
    region: regionOne
    container: docker_images
```

{% colorquote info %}
更多 storage backend 的資訊，請參考 [Registry Configuration Reference](https://docs.docker.com/registry/configuration/)
{% endcolorquote %}

### 執行安裝腳本
一旦`harbor.cfg`設定完成後，可以透過`install.sh`腳本開始安裝 Harbor。Harbor 有整合`Notary`與`Clair`服務，但以下指令僅會安裝一個最基本的 Harbor 並不會安裝`Notary`與`Clair`服務：
```shell
$ sudo ./install.sh
```

若要安裝 Clair 與 Harbor，則在 install.sh 後面加上一個參數：
```shell
$ sudo ./install.sh --with-clair
```
{% colorquote info %}
Online Installer 會從 Docker hub 下載 Harbor 所需的映像檔，因此會花較久的時間。
{% endcolorquote %}

如果安裝過程正常，您可以打開瀏覽器並輸入在`harbor.cfg`中設定的`hostname`，來存取 Harbor 的 Web UI。
![Harbor Web UI](/images/harbor-docker-registry-images/harbor-dashboard.png)

{% colorquote success %}
預設的管理者帳號密碼為 admin/Harbor12345
{% endcolorquote %}

## 開始使用 Harbor
登入成功後，可以創建一個新的 Project，並使用 Docker command 進行登入，但在登入之前，需要對 Docker daemon 新增`--insecure-registry`參數。新增`--insecure-registry`參數至`/etc/default/docker`中：
```shell
DOCKER_OPTS="--insecure-registry <your harbor.cfg hostname>"
```

若在 _**Ubuntu 16.04**_ 版本，還需要修改`/lib/systemd/system/docker.service`檔案：
```shell
EnvironmentFile=-/etc/default/%p
ExecStart=/usr/bin/dockerd -H fd:// $DOCKER_OPTS
```

{% colorquote info %}
其他細節，請參考 [Test an insecure registry](https://docs.docker.com/registry/insecure/#deploying-a-plain-http-registry)
{% endcolorquote %}

修改完成後，重新啟動服務：
```shell
$ sudo systemctl daemon-reload
$ sudo systemctl restart docker.service
```

### 登入 Docker client
服務重啟成功後，透過 Docker command 進行 login：
```shell
$ docker login <your harbor.cfg hostname>
```

### Push Image
將映像檔上 tag 之後，上傳至 Harbor：
```shell
$ docker tag ubuntu:16.04 <your harbor.cfg hostname>/<your project>/ubuntu:16.04
$ docker push <your harbor.cfg hostname>/<your project>/ubunut:16.04
```

可以在 Harbor Web UI 上看到剛剛 push 的 docker image。

![Push Image to Harbor](/images/harbor-docker-registry-images/psuh-docker-image.png)

### Pull Image
```shell
$ docker pull <your harbor.cfg hostname>/<your project>/ubunut:16.04
```

{% colorquote info %}
更多使用者操作，請參考 [Harbor User Guide](https://github.com/vmware/harbor/blob/master/docs/user_guide.md)
{% endcolorquote %}

## 參考資料
  1. [Harbor Github](https://github.com/vmware/harbor)
