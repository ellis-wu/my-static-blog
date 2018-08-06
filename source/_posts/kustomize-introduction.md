---
title: 使用 Kustomize 管理 Kubernetes 配置檔
date: 2018-07-26
categories:
  - 技術
  - Kubernetes
tag:
  - Kustomize
thumbnail: /images/kustomize-introduction-images/kustomize-logo.png
banner: /images/kustomize-introduction-images/kustomize-logo.png
toc: true
---
Kustomize 是 [SIG-CLI](https://github.com/kubernetes/community/tree/master/sig-cli) 的一個子項目，其目的是為 Kubernetes 提供一種可以重複使用配置檔的管理工具。舉例來說，我們今天開發了一個前端應用 v1 並且撰寫了一個 Deployment、Service 以及 ConfigMap 的 YAML，接著透過`kubectl`指令將其部署在 Kubernetes 環境之中。但之後此前端應用經過開發與升級至 v2 並需要將其部署至 Kubernetes 環境，但其中 Kubernetes 的配置檔有些參數與 v1 略有不同。此時，我們通常會將 v1 所撰寫的 YAML 複製一份並修改部分內容，再透過`kubectl`部署到 Kubernetes 環境之中。但這樣的情況下我們同時保存兩份 YAML 且其他人也無法輕易地看出兩份 YAML 之間的配置有哪些不同。而 Kustomize 就可以很好的幫我們解決這些問題。

<!--more-->

因此，本文將使用 Kustomize 官方提供的範例，帶著大家快速了解 Kustomize 的好處與便利性。

## Kustomize 安裝
首先，Kustomize 的安裝十分簡單，我們這邊使用官方提供的 binary 檔案進行安裝。而根據作業系統的不同 Kustomize 提供三種 binary 檔 (`linux`、`darwin` 以及 `windows`)，請使用者依照自己的作業系統自行將下面的`opsys`參數更換：

```shell
$ OP_SYSTEM=linux
$ curl -s https://api.github.com/repos/kubernetes-sigs/kustomize/releases/latest | \
  grep browser_download | \
  grep ${OP_SYSTEM} | \
  cut -d '"' -f 4 | \
  xargs curl -O -L
$ mv kustomize_*_${OP_SYSTEM}_amd64 /usr/local/bin/kustomize
$ chmod u+x /usr/local/bin/kustomize
```

## Kustomize 該如何使用
Kustomize 在建立一個 Kubernetes 應用程式時，它的資料夾架構類似下面這樣：
```shell
~/someApp
├── base
│   ├── deployment.yaml
│   ├── kustomization.yaml
│   └── service.yaml
└── overlays
    ├── development
    │   ├── cpu_count.yaml
    │   ├── kustomization.yaml
    │   └── replica_count.yaml
    └── production
        ├── cpu_count.yaml
        ├── kustomization.yaml
        └── replica_count.yaml
```
Kustomize 需要先針對該應用建立一個基礎的 Kubernetes 配置檔，這裡稱之為 _**Base**_。之後再以 Overlay 來區分每個不同版本的配置。而 Overlay 中的 _**deployment**_ 與 _**production**_ 僅需要撰寫與 _**Base**_ 之間有差異的設定 (例如：Image 版本不同、Replica 數量不同或資源分配不同...等差異) 以及`kustomize.yaml`描述該版本與 _**Base**_ 之間的差異。之後透過 Kustomize 就可以分別 print 出 _**development**_ 與 _**production**_ 的 Kubernetes 配置檔。

## 國際範例 Helloworld
當 Kustomize 安裝好了後，我們可以執行一個 [Helloworld 範例](https://github.com/kubernetes-sigs/kustomize/tree/master/examples/helloWorld)。此範例由 Kustomize 官方提供且是一個由 Go 語言所撰寫的 web server。這邊希望藉由此範例能帶領大家能快速體驗 Kustomize 的好處。

此 Helloworld 範例透過讀取環境變數`ALT_GREETING`的資訊來呈現在 web server 上，並在啟動 web server 時透過`enableRiskyFeature`參數來改變 web server 上呈現的字體是否為斜體。

{% colorquote info %}
若想了解 HelloWorld 範例的程式碼，請參考 [這裡](https://github.com/monopole/hello)。
{% endcolorquote %}

### 建立 Base
當我們稍微了解 Kustomize 與 HelloWorld 範例後，我們需要先建立 Base 資料夾並準備 HelloWorld 範例所需的 YAML 檔。這邊透過 Git 取得範例的 YAML 檔：
```shell
$ mkdir -p kustomize/helloworld-example && cd kustomize/
$ DEMO_HOME=$(pwd)/helloworld-example
$ BASE=$DEMO_HOME/base
$ mkdir -p $BASE
$ curl -s -o "$BASE/#1.yaml" \
  "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/examples/helloWorld/{configMap,deployment,kustomization,service}.yaml"
$ tree $DEMO_HOME
/root/kustomize/helloworld-example
└── base
    ├── configMap.yaml
    ├── deployment.yaml
    ├── kustomization.yaml
    └── service.yaml

1 directories, 4 files
```

接下來，我們可以使用`kustomize build` 指令來產生出 Base 的 Kubernetes 配置檔：
```shell
$ kustomize build $BASE
```

可以使用以下方式來將 Base 部署於 Kubernetes 之中：
```shell
$ kustomize build $BASE | kubectl apply -f -
configmap "the-map" created
service "the-service" created
deployment.apps "the-deployment" created

$ kubectl get po,svc,configmap
NAME                                 READY     STATUS    RESTARTS   AGE
pod/the-deployment-f9f46f89f-j5hcs   1/1       Running   0          17s
pod/the-deployment-f9f46f89f-q7c7w   1/1       Running   0          17s
pod/the-deployment-f9f46f89f-znjrn   1/1       Running   0          17s

NAME                         TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
service/kubernetes           ClusterIP      10.96.0.1        <none>        443/TCP          17d
service/the-service          LoadBalancer   10.105.224.225   <pending>     8666:30325/TCP   17s

NAME                DATA      AGE
configmap/the-map   2         17s
```

可以透過瀏覽器查看 Helloworld 範例的 [web server](http://172.20.3.57:30325/) 或者使用`curl`來確認：

```shell
$ curl 172.20.3.57:30325
<html><body>
Version 1 : Good Morning!
</body></html>
```

![Helloworld Base Example](/images/kustomize-introduction-images/helloworld-base.png)

可以看到`ConfigMap`中定義了兩個參數並在`Deployment`中來讀取這兩個參數。所以在 web server 上會呈現 Good Morning 字樣且字體為正常的字體。而`kustomize.yaml`中宣告此應用程式的`commonLabels`為`app: hello`。因此，kustomize 會將每個 Kubernetes 配置檔中加入一個`app: hello`的 label。再來定義此應用程式是由為`deployment.yaml`、`service.yaml`與`configMap.yaml`三個檔案所組成。

### 建立 Overlay
上面測試完成後，我們可以開始建立 Overlay 的資料夾結構，這邊為了看出 kustomize 的好處，我們將在 Overlay 底下建立`staging`與`production`兩個資料夾。Staging 將改變 configMap 中的參數；而 production 將改變 deployment 的 replicas 數量。

首先，建立 Overlay 資料夾：
```shell
$ OVERLAYS=$DEMO_HOME/overlays
$ mkdir -p $OVERLAYS/staging
$ mkdir -p $OVERLAYS/production
```

接著準備 Staging 的`kustomize.yaml`：
```shell
$ cat <<EOF > $OVERLAYS/staging/kustomization.yaml
namePrefix: staging-
commonLabels:
  variant: staging
  org: acmeCorporation
commonAnnotations:
  note: Hello, I am staging!
bases:
- ../../base
patches:
- map.yaml
EOF
```

在此範例中我們定義了幾個東西：
* **Kubernetes 應用程式的名稱**：以往我們的應用程式 v1 在跑時，想要測試 v2 版本，最簡單的方式就是複製 v1 版本的配置檔，並將其修改內容更改之後，再來去修改每個檔案中的名稱，否則重複名稱 Kubernetes 會無法建立。而 Kustomize 透過`namePrefix`參數為此應用程式在 Kubernetes 之中的名稱加個前綴字`staging-`，所以之後透過`kubectl`看到其名稱會變成`staging-xxxxxx`；
* **新增 label**：這個配置不是必須的，但可以看到 Kustomize 可以這樣為此 Staging 的應用程式新增兩個 label；
* **新增 Annotations**：這個配置也不是必須的，但可以看到 Kustomize 可以這樣為此 Staging 的應用程式新增 Annotations；
* **定義 Base**：定義此應用程式的 Base；
* **定義 Patch**：定義 Overlay 與 Base 之間需要 patches 的檔案。

接著，準備 Staging 需要 patch 的檔案：
```shell
$ cat <<EOF > $OVERLAYS/staging/map.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: the-map
data:
  altGreeting: "Have a pineapple!"
  enableRisky: "true"
EOF
```

我們再來準備 Production 應用程式的設定：
```shell
$ cat <<EOF > $OVERLAYS/production/kustomization.yaml
namePrefix: production-
commonLabels:
  variant: production
  org: acmeCorporation
commonAnnotations:
  note: Hello, I am production!
bases:
- ../../base
patches:
- deployment.yaml
EOF
```

我們改變 Deployment 的 replicas 數量：
```shell
$ cat <<EOF > $OVERLAYS/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: the-deployment
spec:
  replicas: 5
EOF
```

以上都完成後，其資料夾結構如下：
```shell
tree $DEMO_HOME
/root/kustomize/helloworld-example
├── base
│   ├── configMap.yaml
│   ├── deployment.yaml
│   ├── kustomization.yaml
│   └── service.yaml
└── overlays
    ├── production
    │   ├── deployment.yaml
    │   └── kustomization.yaml
    └── staging
        ├── kustomization.yaml
        └── map.yaml

4 directories, 8 files
```

接下來，我們可以部署 Staging 的應用程式：
```shell
$ kustomize build $OVERLAYS/staging | kubectl apply -f -
configmap "staging-the-map" created
service "staging-the-service" created
deployment.apps "staging-the-deployment" created

$ kubectl get po,svc,configmap
NAME                                             READY     STATUS    RESTARTS   AGE
pod/staging-the-deployment-64cd4f746f-5rcqf      1/1       Running   0          3m
pod/staging-the-deployment-64cd4f746f-s2b2d      1/1       Running   0          3m
pod/staging-the-deployment-64cd4f746f-wqtxh      1/1       Running   0          3m
pod/the-deployment-f9f46f89f-j5hcs               1/1       Running   0          8m
pod/the-deployment-f9f46f89f-q7c7w               1/1       Running   0          8m
pod/the-deployment-f9f46f89f-znjrn               1/1       Running   0          8m

NAME                             TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
service/kubernetes               ClusterIP      10.96.0.1        <none>        443/TCP          17d
service/staging-the-service      LoadBalancer   10.102.157.42    <pending>     8666:30630/TCP   3m
service/the-service              LoadBalancer   10.105.224.225   <pending>     8666:30325/TCP   8m

NAME                           DATA      AGE
configmap/staging-the-map      2         3m
configmap/the-map              2         8m
```

確認部署完畢後，我們一樣可以透過瀏覽器查看 Staging 的 [web server](http://172.20.3.57:30630/) 或者使用`curl`來確認 web server 上的資訊以及字體的改變：

```shell
$ curl 172.20.3.57:30630
<html><body>
Version 1 : <em>Have a pineapple!</em>
</body></html>
```

![Helloworld Staging Example](/images/kustomize-introduction-images/helloworld-staging.png)

接下來，我們再來部署 Production 來看看結果：
```shell
$ kustomize build $OVERLAYS/production | kubectl apply -f -
configmap "production-the-map" created
service "production-the-service" created
deployment.apps "production-the-deployment" created

$ kubectl get po,svc,configmap
NAME                                             READY     STATUS    RESTARTS   AGE
pod/production-the-deployment-54748f86c5-4ltf7   1/1       Running   0          1m
pod/production-the-deployment-54748f86c5-fjcfd   1/1       Running   0          1m
pod/production-the-deployment-54748f86c5-fzprs   1/1       Running   0          1m
pod/production-the-deployment-54748f86c5-jqv88   1/1       Running   0          1m
pod/production-the-deployment-54748f86c5-k4tp5   1/1       Running   0          1m
pod/staging-the-deployment-64cd4f746f-llrb7      1/1       Running   0          8m
pod/staging-the-deployment-64cd4f746f-qxt2h      1/1       Running   0          8m
pod/staging-the-deployment-64cd4f746f-v687r      1/1       Running   0          8m
pod/the-deployment-f9f46f89f-j5hcs               1/1       Running   0          13m
pod/the-deployment-f9f46f89f-q7c7w               1/1       Running   0          13m
pod/the-deployment-f9f46f89f-znjrn               1/1       Running   0          13m

NAME                             TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
service/kubernetes               ClusterIP      10.96.0.1        <none>        443/TCP          17d
service/production-the-service   LoadBalancer   10.110.250.85    <pending>     8666:30267/TCP   1m
service/staging-the-service      LoadBalancer   10.102.157.42    <pending>     8666:30630/TCP   8m
service/the-service              LoadBalancer   10.105.224.225   <pending>     8666:30325/TCP   13m

NAME                           DATA      AGE
configmap/production-the-map   2         1m
configmap/staging-the-map      2         8m
configmap/the-map              2         13m
```

因為 Production 與 Base 之間我們只改變 Deployment 的 replicas 數量，所以可以透過`kubectl`指令看到 Production 的 pod 數量為五個。

{% colorquote info %}
以上為官方提供的其中一個 Example，而其他 Example 請參考 [這裡](https://github.com/kubernetes-sigs/kustomize/tree/master/examples)。
{% endcolorquote %}

## 結論
使用 Kustomize 來作為 Kubernetes 配置檔的管理看起來不錯，但對使用者來說又要額外學習如何使用 Kustomize。但其帶來的好處在於，可以快速知道 Staging 與 Production 兩個版本上做了哪些修改，管理上帶來極大的好處。而目前 Kustomize 為 SIG 的子專案，未來的發展與後續維運方面還是個未知數，但它並不依賴於 Kubernetes 所以還是可以嘗試看看。

## 參考資料
  1. [Kustomize Github](https://github.com/kubernetes-sigs/kustomize)
  2. [Kuberentes Kustomize 初體驗](https://zhuanlan.zhihu.com/p/38424955)
