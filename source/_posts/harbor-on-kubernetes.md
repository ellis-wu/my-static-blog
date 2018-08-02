---
title: 使用 Helm 在 Kubernetes 上部署 Harbor
date: 2018-07-12
categories:
  - 技術
  - Kubernetes
tag:
  - Harbor
  - Docker Registry
  - Helm
thumbnail: /images/harbor-on-kubernetes-images/harbor-on-kubernetes-logo.png
banner: /images/harbor-on-kubernetes-images/harbor-on-kubernetes-logo.png
toc: true
---
在之前已經介紹過 {% post_link harbor-docker-registry Harbor %}，且是在實體機上的透過`docker-compose`簡單且快速的部署 Harbor。而本篇將介紹如何透過 Kubernetes Helm 來部署 Harbor。而官方在早期有提供 YAML 來直接部署 Harbor 在 Kubernetes 之上，且 Harbor 的版本為 v1.2。但後來官方不建議直接使用 YAML 來部署 Harbor，而是透過 Helm 來部署。因此本文將介紹如何用 Kubernetes Helm 來部署 Harbor 在 Kubernetes 上。

<!--more-->

{% colorquote danger %}
目前 Harbor 部署在 Kubernetes v1.8+ 上，會遇到一些問題 ([#5295](https://github.com/vmware/harbor/issues/5295#issuecomment-404409532))。本文操作皆使用 Harbor Master Branch，但 Master Branch 為開發 Branch 可能某些步驟或設定會與實際情況稍微不同。因此，目前不適合在 Production 環境中使用，可能要等到 Harbor 釋出 1.6 後再來測試看看。
{% endcolorquote %}

## 事前準備
目前 Harbor 官方透過 Helm 部署在 Kubernetes 上有些限制與需求，請確認以下需求：
  * Kubernetes cluster 1.8+ with Beta APIs enabled
  * Kubernetes Ingress Controller is enabled
  * kubectl CLI 1.8+
  * Helm CLI 2.8.0+

而本文事先準備了一個 Kubernetes 叢集，且是利用`kubeadm`所部署而成；環境並非實體機而為虛擬機機。再準備一台機器並安裝 NFS Server，此 NFS Server 將儲存 Harbor 一些資訊以及 Docker Images 的儲存。

| IP Address   | Role       | CPU    | RAM    | Disk   |
| ------------ | ---------- | ------ | ------ | ------ |
| 172.20.3.57  | Master1    | 2 vCPU | 2 GB   | 40 GB  |
| 172.20.3.50  | Node1      | 2 vCPU | 2 GB   | 40 GB  |
| 172.20.3.55  | Node2      | 2 vCPU | 2 GB   | 40 GB  |
| 172.16.35.50 | NFS Server | 1 vCPU | 2 GB   | 200 GB |

* 作業系統皆為 Ubuntu 16.04；
* Docker 版本為 1.18.03；
* Kubernetes 版本為 1.10.3；Kubernetes CNI 為`Calico`。

{% colorquote info %}
利用`kubeadm`部署 Kubernetes 叢集，可以參考 [只要用 kubeadm 小朋友都能部署 Kubernetes](https://kairen.github.io/2016/09/29/kubernetes/deploy/kubeadm/)。
{% endcolorquote %}

## 安裝 Kubernetes Nginx Ingress
使用 Helm 部署 Harbor 時，會使用到 Kubernetes Ingress 將 Harbor 的各個服務 expose 出來。而本文選擇使用 [Nginx Ingress](https://github.com/kubernetes/ingress-nginx) 作為 Ingress Controller。以下為使用官方檔案快速部署 ingress-nginx controller：
```shell
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/master/deploy/mandatory.yaml
```

因為我們是虛擬機上部署 ingress-nginx。因此，透過`NodePort`將 ingress-nginx 的服務 expose 出來：
```shell
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/master/deploy/provider/baremetal/service-nodeport.yaml
```

{% colorquote info %}
* 其他平台要啟用 ingress-nginx 或者將 Ingress 服務 expose，請參考 [這裡](https://github.com/kubernetes/ingress-nginx/blob/master/docs/deploy/index.md#provider-specific-steps)；
* Ingress 不一定要依照以上方法透過`NodePort`將服務 expose，可依照自己的需求替換。
{% endcolorquote %}

完成後，透過`kubectl`查看：
```shell
$ kubectl -n ingress-nginx get po,svc
NAME                                           READY     STATUS    RESTARTS   AGE
pod/default-http-backend-5c6d95c48-bb89j       1/1       Running   0          2m
pod/nginx-ingress-controller-c6d66b4fb-7s2bh   1/1       Running   0          2m

NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
service/default-http-backend   ClusterIP   10.105.57.243   <none>        80/TCP                       2m
service/ingress-nginx          NodePort    10.108.5.125    <none>        80:31940/TCP,443:31164/TCP   2m
```

這邊可以看到 ingress-nginx 透過`NodePort`將服務 expose 出來。若應用程式為 HTTP 協定則由 31940 port 將應用程式 expose；若為 HTTPS 協定則由 31164 port 將應用程式 expose。

## 安裝 Kubernetes Helm
因為要使用 Helm 來部署 Harbor，所以我們需要先安裝 Helm。而 Helm 的安裝方式有很多，這邊使用 binary 的方式進行安裝：
```shell
$ wget -qO- https://kubernetes-helm.storage.googleapis.com/helm-v2.9.1-linux-amd64.tar.gz | tar -zx
$ mv linux-amd64/helm /usr/local/bin
```

接著為 Helm 設定 RBAC 並初始化 Helm：
```shell
$ kubectl -n kube-system create sa tiller
$ kubectl create clusterrolebinding tiller --clusterrole cluster-admin --serviceaccount=kube-system:tiller
$ helm init --service-account tiller
```

完成後，就可以透過`kubectl`來查看 Tiller Server 是否被建立：
```shell
$ kubectl get po,svc -n kube-system -l app=helm
NAME                                 READY     STATUS    RESTARTS   AGE
pod/tiller-deploy-5c688d5f9b-s67d7   1/1       Running   0          3m

NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)     AGE
service/tiller-deploy   ClusterIP   10.106.146.158   <none>        44134/TCP   3m
```

## 使用 Helm 部署 Harbor
在使用 Helm 部署 Harbor 之前，我們需要先準備四個 Persistent Volumes 提供給 Harbor 的服務。而這邊使用 NFS 來提供四個 Persistent Volumes。

先到 NFS Server 上建立四個資料夾：
```shell
$ mkdir -p /var/nfsshare/nfs{1..4}
```

接著回到 Kubernetes Master 上，透過以下指令來建立四個 Persistent Volume：
```shell
$ for i in {1..4}; do
cat <<EOF | kubectl create -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv00${i}
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Recycle
  nfs:
    path: /var/nfsshare/nfs${i}
    server: 172.16.35.50
EOF
done
```

{% colorquote info %}
以上步驟若有其他後端儲存系統，請依照自己的需求替換。
{% endcolorquote %}

再來，使用`kubectl`指令確認 Persistent Volume 是否建立起來：
```shell
$ kubectl get pv
NAME      CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM     STORAGECLASS   REASON    AGE
pv001     50Gi       RWO            Recycle          Available                                      3s
pv002     50Gi       RWO            Recycle          Available                                      3s
pv003     50Gi       RWO            Recycle          Available                                      2s
pv004     50Gi       RWO            Recycle          Available                                      2s
```

當 Persistent Volume 準備完成後，透過 Git 取得 [Harbor](https://github.com/vmware/harbor) 官方提供的 Helm Chart ：
```shell
$ git clone https://github.com/vmware/harbor.git
$ cd harbor/contrib/helm/harbor/
$ helm dependency update
```

在預設的情況下，Helm 部署的 Harbor 會是走 HTTPS 協定。因此需要修改`values.yaml`中的`externalPort`，將`externalPort`設定為 ingress-nginx HTTPS Port：
```yaml
# The Port for Harbor service, leave empty if the service
# is to be bound to port 80/443
externalPort: 31164
```

{% colorquote info %}
若要設定 Harbor 的其他資訊，請修改`values.yaml`的設定，而每個設定資訊請參考 [這裡](https://github.com/vmware/harbor/tree/master/contrib/helm/harbor#configuration)
{% endcolorquote %}

以上設定完成後，使用 Helm 指令部署 Harbor：
```shell
$ helm install . --debug --name my-harbor --set externalDomain=harbor.my.domain
...
NOTES:
Please wait for several minutes for Harbor deployment to complete.
Then you should be able to visit the UI portal at https://harbor.my.domain:31164.
For more details, please visit https://github.com/vmware/harbor.
```

透過`kubectl`查看 Harbor 是否部署成功：
```shell
$ kubectl get po
NAME                                              READY     STATUS    RESTARTS   AGE
my-harbor-harbor-adminserver-0                    1/1       Running   1          7m
my-harbor-harbor-clair-5f7547dc95-mwkjg           1/1       Running   1          7m
my-harbor-harbor-database-0                       1/1       Running   0          7m
my-harbor-harbor-jobservice-6764bf89b6-b898c      1/1       Running   1          7m
my-harbor-harbor-notary-server-64fcd84cf5-79sfj   1/1       Running   0          7m
my-harbor-harbor-notary-signer-7d6c45fc8f-54xnf   1/1       Running   0          7m
my-harbor-harbor-registry-0                       1/1       Running   0          7m
my-harbor-harbor-ui-848d95d674-rq9hv              1/1       Running   2          7m
my-harbor-postgresql-558fc8ddd6-4rl69             1/1       Running   0          7m
my-harbor-redis-master-0                          1/1       Running   0          7m
```

若部署完成後，將`harbor.my.domain`加入至`/etc/hosts`：
```crmsh
127.0.0.1     docker-node1    single-node1
127.0.0.1     localhost
127.0.1.1     vagrant.vm      vagrant
172.20.3.57   harbor.my.domain
```

接著可以透過瀏覽器查看 [Harbor Web UI](https://harbor.my.domain:31164)。
![Harbor Web UI](/images/harbor-on-kubernetes-images/harbor-ui.png)

{% colorquote success %}
預設的管理者帳號密碼為 admin/Harbor12345
{% endcolorquote %}

## 開始使用 Harbor
確認 Helm 部署的 Harbor 沒問題後，可以開始使用 Harbor。以下將說明如何讓 Docker Client 如何存取私有的 Registry 以及一些基本操作。

### 設定 Docker 存取私有 Registry
首先，要讓 Docker 能存取私有的 Registry 需要對 Docker 做一些小小的設定，而設定方式有以下兩種方式：
  1. **使用自帶的憑證(CA)**：為了安全性考量，私有的 Registry 自帶憑證。當 Docker Client 與私有的 Registry 進行溝通時都需要使用此憑證，而這也是目前 Docker 官方推薦的做法；
  2. **設定 Insecure Registry**：直接設定為 Insecure Registry，因為安全性的考量目前此方法官方並不推薦。

而兩種方法選擇其中一種設定即可。

#### 設定憑證(CA)
因為我們部署的 Harbor 是有自帶憑證(CA)，所以需要再 Docker Client 加入憑證，這樣 Docker Client 才有辦法存取到私有的 Registry。

首先，在 Kubernetes Master 使用以下指令取得憑證資訊：
```shell
$ kubectl get secrets/my-harbor-harbor-ingress -o jsonpath="{.data.ca\.crt}" | base64 --decode
-----BEGIN CERTIFICATE-----
MIIC5TCCAc2gAwIBAgIBATANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDEwloYXJi
b3ItY2EwHhcNMTgwNzE4MDIwOTQzWhcNMjgwNzE1MDIwOTQzWjAUMRIwEAYDVQQD
EwloYXJib3ItY2EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDg8W4q
uGb3TmdbBt419EG6FXtM+RZhdBiz+h0DR7/C9kU5LzjONuJCxyXn/8TDqeD6Mdxf
HeakWMxTclbpmmBkeu0FIErl0xA9dFBYl6hpLwcka9U9Lo0gKeVHRGqS0PXnFP6X
mUSyrq24NKceBan2vx1VAqG+2m+zEGzpKjL06aXkVHtY01NbL75Xc+l9a28i46Wq
UHAc29XjaJDIU9pf+E2RV3IQWe9Klbf9hIOs8mtYN373bM73ma0oLRK3/4U/6SMz
UHGoRSIT59LKSB9cE/qB5A7HvBJLeIMQa8se3xdfmMqEARNhz+cRtRFN2MMbbmFq
y2TMANpGs+aVfMmdAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwICpDAdBgNVHSUEFjAU
BggrBgEFBQcDAQYIKwYBBQUHAwIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0B
AQsFAAOCAQEAZnmk90vWl+uRJJO51ZQTHjmDjTA246nJ9upyXlf2S3t4TOySeXup
ji6O1Sj4Xf4Dcqx/4Cb+Yzz0nw7bnxnbsNUo3fIcT7FRlYPlmKyUzf6WrcgvMFSf
rgTfAR0upEWDArkndN3zNESU/Kq8veJwX3AnQfabMHVU6XDQIL3jRqVlObqTVCrN
14eVcJDhBu6waiaPOxduh8Jfvu0YEc3ZdmP1ZyUjFUCTjVEOl+vg3uIjWouzanZw
aLutMQCtDsEH5VgLku4ir5FkCG8riyZCCqKZtbMmpJaJGJQqAiJ4+RPrdNY9eTMO
4KcVrC6715h3S44aylrvleJlU2S6UHRDLg==
-----END CERTIFICATE-----
```

取得憑證後，在每一台 Docker Client 加入以下憑證：
```shell
$ mkdir /etc/docker/certs.d/harbor.my.domain:31164
$ cat <<EOF > /etc/docker/certs.d/harbor.my.domain:31164/ca.crt
-----BEGIN CERTIFICATE-----
MIIC5TCCAc2gAwIBAgIBATANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDEwloYXJi
b3ItY2EwHhcNMTgwNzE4MDIwOTQzWhcNMjgwNzE1MDIwOTQzWjAUMRIwEAYDVQQD
EwloYXJib3ItY2EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDg8W4q
uGb3TmdbBt419EG6FXtM+RZhdBiz+h0DR7/C9kU5LzjONuJCxyXn/8TDqeD6Mdxf
HeakWMxTclbpmmBkeu0FIErl0xA9dFBYl6hpLwcka9U9Lo0gKeVHRGqS0PXnFP6X
mUSyrq24NKceBan2vx1VAqG+2m+zEGzpKjL06aXkVHtY01NbL75Xc+l9a28i46Wq
UHAc29XjaJDIU9pf+E2RV3IQWe9Klbf9hIOs8mtYN373bM73ma0oLRK3/4U/6SMz
UHGoRSIT59LKSB9cE/qB5A7HvBJLeIMQa8se3xdfmMqEARNhz+cRtRFN2MMbbmFq
y2TMANpGs+aVfMmdAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwICpDAdBgNVHSUEFjAU
BggrBgEFBQcDAQYIKwYBBQUHAwIwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0B
AQsFAAOCAQEAZnmk90vWl+uRJJO51ZQTHjmDjTA246nJ9upyXlf2S3t4TOySeXup
ji6O1Sj4Xf4Dcqx/4Cb+Yzz0nw7bnxnbsNUo3fIcT7FRlYPlmKyUzf6WrcgvMFSf
rgTfAR0upEWDArkndN3zNESU/Kq8veJwX3AnQfabMHVU6XDQIL3jRqVlObqTVCrN
14eVcJDhBu6waiaPOxduh8Jfvu0YEc3ZdmP1ZyUjFUCTjVEOl+vg3uIjWouzanZw
aLutMQCtDsEH5VgLku4ir5FkCG8riyZCCqKZtbMmpJaJGJQqAiJ4+RPrdNY9eTMO
4KcVrC6715h3S44aylrvleJlU2S6UHRDLg==
-----END CERTIFICATE-----
EOF
```

#### 設定 Insecure Registry
{% colorquote danger %}
以上使用憑證的方式是因為安全性的考量，但也可以修改 Docker 設定來使用 Insecure Registry。但這樣並不安全所以**不建議使用**。
{% endcolorquote %}

新增`--insecure-registry`參數至`/etc/default/docker`中：
```shell
DOCKER_OPTS="--insecure-registry harbor.my.domain:31164"
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
以上設定完成後，可以透過 Docker 指令進行 login：
```shell
$ docker login harbor.my.domain:31164
```

### Push Image
將映像檔上 tag 之後，上傳至 Harbor：
```shell
$ docker tag ubuntu:16.04 harbor.my.domain:31164/<your project>/ubuntu:16.04
$ docker push harbor.my.domain:31164/<your project>/ubunut:16.04
```

可以在 Harbor Web UI 上看到剛剛 push 的 docker image。

![Push Image to Harbor](/images/harbor-on-kubernetes-images/harbor-push.png)

### Pull Image
```shell
$ docker pull <your harbor.cfg hostname>/<your project>/ubunut:16.04
```

{% colorquote info %}
更多使用者操作，請參考 [Harbor User Guide](https://github.com/vmware/harbor/blob/master/docs/user_guide.md)
{% endcolorquote %}

## 參考資料
 1. [Harbor Github](https://github.com/vmware/harbor)
 2. [Kuberentes Helm 介紹](https://kairen.github.io/2017/03/25/kubernetes/helm-quickstart/)
 3. [ingress-nginx Github](https://github.com/kubernetes/ingress-nginx)
