---
title: Kubernetes on Mesos
date: 2017-11-27
categories:
  - 技術
  - Kubernetes
tag:
  - Kubernetes
  - Mesos
  - Docker
thumbnail: /images/kubernetes-on-mesos-images/kubernetes-on-mesos-logo.png
banner: /images/kubernetes-on-mesos-images/kubernetes-on-mesos-logo.png
toc: true
---
Kubernetes 是一個基於容器技術的分散式架構解決方案，並且是 Google 十幾年大規模使用容器技術的經驗累積的成果。因此，在今年七月 Mesosphere 宣布與 Google 合作，將 Kubernetes 結合 Mesos，讓使用者能夠使用 Kubernetes 與其他一流的 data center 服務(例如：Hadoop、Spark 以及 Chronos)一起使用。這允許 Kubernetes 應用程式同時與其他類型的應用程式在同一組伺服器中一起執行，而 Mesos 可以確保資源被公平的分配且隔離每個應用程式。

{% colorquote danger %}
Kubernetes-Mesos 目前屬於 alpha 階段，仍然還在開發中，並不建議使用在生產環境。請參考 [這裏](https://github.com/kubernetes-retired/kube-mesos-framework#release-status)。
{% endcolorquote %}

<!--more-->

## Kubernetes-Mesos 架構
Apache Mesos 叢集是由一個或多個 Master 與一個或多個 Slave 所組成，而 Kubernetes-Mesos(K8sm) 為一個 Mesos Framework 且執行在 Mesos 之上。K8sm 提供了兩個元件且連接了 Mesos 與 Kubernetes：
  1. __Scheduler__：整合了 Kubernetes scheduling API 以及 Mesos scheduler runtime。
  2. __Executor__：整合了 Kubernetes kubelet 服務與 Mesos executor runtime。

當一個 pod 建立透過 Kubernetes 時，K8sm scheduler 會建立一個相關的 Mesos task 並將其排入佇列並進行調度，在依照 pod/task 所需要的資源，將其分配至適合的節點之上，接著 pod/task 將會被啟動並交由 executor。當 executor 啟動 pod/task 時，會透過 kubelet 註冊 pod 並開始由 kubelet 管理 pod 的生命週期。

![Kubernetes on Mesos Architecture](/images/kubernetes-on-mesos-images/k8sm-architecture.png)

## 安裝 Kubernetes on Mesos
接下來，將介紹如何在安裝 Kubernetes on Mesos。並執行一個 nginx web server 的 pod。

### 事前準備
* 準備一個 Mesos 叢集環境
* 叢集中選擇一台作為 Kubernetes Master 節點，且需要以下套件：
    * Go (Go 語言安裝版本請參考:[Kubernetes Development Guide](https://github.com/kubernetes/community/blob/master/contributors/devel/development.md#go))
    * make (例如：build-essential)
* 每台節點都需要安裝 Docker

{% colorquote info %}
您可將 Kubernetes-Mesos 部署至與 Mesos Master 同一節點，也可以在不同節點。
{% endcolorquote %}

### 部署 Kubernetes-Mesos
首先，先選擇一台您要安裝 Kubernetes-Mesos 的節點，並且 build Kubernetes-Mesos：
```shell
$ git clone https://github.com/kubernetes-incubator/kube-mesos-framework
$ cd kube-mesos-framework
$ make
```

設定一些環境變數：
```shell
$ export KUBERNETES_MASTER_IP=172.22.132.22
$ export KUBERNETES_MASTER=http://${KUBERNETES_MASTER_IP}:8888
```

### 部署 etcd
透過 Docker 快速啟動一個 etcd 服務，並且驗證他們是否執行：
```shell
$ docker run -d --hostname $(uname -n) --name etcd \
  -p 4001:4001 -p 7001:7001 quay.io/coreos/etcd:v2.2.1 \
  --listen-client-urls http://0.0.0.0:4001 \
  --advertise-client-urls http://${KUBERNETES_MASTER_IP}:4001
```

```shell
$ docker ps
CONTAINER ID        IMAGE                        COMMAND                  CREATED             STATUS              PORTS                                                           NAMES
e2afe13e2319        quay.io/coreos/etcd:v2.2.1   "/etcd --listen-cl..."   3 days ago          Up 3 days           0.0.0.0:4001->4001/tcp, 2379-2380/tcp, 0.0.0.0:7001->7001/tcp   etcd
```

以下方法也是個不錯方法，來測試你的 etcd 是否正常運作：
```shell
$ curl -L http://${KUBERNETES_MASTER_IP}:4001/v2/keys/
```

如果連線正常，您將會看到 etcd 的輸出結果在 console 上。

### 啟動 Kubernetes-Mesos 服務
更新您的`PATH`，能更容易執行 Kubernetes-Mesos binary：
```shell
$ export PATH="$(pwd)/_output/local/go/bin:$PATH"
```

確定您的 Mesos Master。而這取決於 Mesos 的安裝方式；可能是`host:port`像是`mesos-master:5050`或者是 ZooKeeper URL 像是`zk://zookeeper:2181/mesos`：
```shell
$ epxort MESOS_MASTER=<host:port or zk://url>
```

{% colorquote info %}
而為了讓 Kubernetes 能夠在 Mesos Master 變更時還能正常運作，建議在生產環境中使用 ZooKeeper URL。
{% endcolorquote %}

建立一個 cloud config 名為`mesos-cloud.conf`在當前目錄，並輸入以下內容：
```shell
$ cat <<EOF >mesos-cloud.conf
[mesos-cloud]
        mesos-master        = ${MESOS_MASTER}
EOF
```

現在，啟動 kubernetes-mesos API server、controller manager 以及 scheduler 在 master 節點：
```shell
$ km apiserver \
  --address=${KUBERNETES_MASTER_IP} \
  --etcd-servers=http://${KUBERNETES_MASTER_IP}:4001 \
  --service-cluster-ip-range=10.10.10.0/24 \
  --port=8888 \
  --cloud-provider=mesos \
  --cloud-config=mesos-cloud.conf \
  --secure-port=0 \
  --v=1 >apiserver.log 2>&1 &

$ km controller-manager \
  --master=${KUBERNETES_MASTER} \
  --cloud-provider=mesos \
  --cloud-config=./mesos-cloud.conf  \
  --v=1 >controller.log 2>&1 &

$ km scheduler \
  --address=${KUBERNETES_MASTER_IP} \
  --mesos-master=${MESOS_MASTER} \
  --etcd-servers=http://${KUBERNETES_MASTER_IP}:4001 \
  --mesos-user=root \
  --api-servers=${KUBERNETES_MASTER} \
  --cluster-dns=10.10.10.10 \
  --cluster-domain=cluster.local \
  --v=2 >scheduler.log 2>&1 &
```

這些服務都會跑在背景，如果當 logout 時想要終止掉：
```shell
$ disown -a
```

## 驗證 KM 服務
透過`kubectl`與`kubernetes-mesos framework`互動：

```shell
$ kubectl get pods
NAME      READY     STATUS    RESTARTS   AGEs
```

```shell
$ kubectl get services
NAME             TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)     AGE
k8sm-scheduler   ClusterIP   10.10.10.158   <none>        10251/TCP   2d
kubernetes       ClusterIP   10.10.10.1     <none>        443/TCP     3d
```

![Mesos Frameworks](/images/kubernetes-on-mesos-images/k8sm-frameworks.png)

### 執行一個 POD

建立並編輯一個 pod 的 yaml 檔：
```shell
$ cat <<EOPOD >nginx.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
EOPOD
```

使用`kubectl`指令來建立 nginx pod:
```shell
$ kubectl create -f ./nginx.yaml
pod "nginx" created
```

使用`kubectl`指令觀察 pod 的是否執行：
```shell
$ kubectl get pods
NAME      READY     STATUS    RESTARTS   AGE
nginx     1/1       Running   0          8m
```

![Mesos Tasks](/images/kubernetes-on-mesos-images/k8sm-run-pod.png)

## 參考資料
  1. [Kubernetes Docs - Kubernetes on Mesos](https://kubernetes.io/docs/getting-started-guides/mesos/)
  2. [Kubernetes incubator Github](https://github.com/kubernetes-incubator/kube-mesos-framework)
  3. [Mesosphere Github](https://github.com/mesosphere/kubernetes-mesos/tree/master)
