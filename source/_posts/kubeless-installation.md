---
title: 基於 Kubernetes 的 Serverless 框架 Kubeless
date: 2018-05-02
categories:
  - 技術
  - Kubernetes
tag:
  - Kubernetes
  - Serverless
thumbnail: /images/kubeless-installation-images/kubeless-logo.png
banner: /images/kubeless-installation-images/kubeless-logo.png
toc: true
---
Kubeless 是一個基於 Kubernetes 的__無伺服器(Serverless)框架__，由 Go 語言所撰寫而成。Kubeless 利用 Kubernetes 資源提供自動擴展(auto-scaling)、API 路由、監控以及故障排除等功能。

而 Kubeless 為什麼能在如此多的無伺服器(Serverless)框架中脫穎而出呢？這是因為 Kubeless 使用 Kubernetes 的 **CRD(Custom Resource Definition)** 來建立 Function，而每個 Function 建立時都會是一個 Deployment，並同時暴露(expose)出一個 Service，透過 Kubernetes 的好處省去開發者開發上的麻煩。而 Kubeless 僅需執行一個`in-cluster`的 Controller 來監控這些 CRD，並按需求啟動與執行。

<!--more-->

## 事情準備與安裝環境
本文事先準備了一個 Kubernetes 叢集，且是利用`kubeadm`所部署而成；環境並非實體機而為虛擬機機。

| IP Address  | Role    | CPU    | RAM    | Disk  |
| ----------- | ------- | ------ | ------ | ----- |
| 172.20.3.19 | Master1 | 1 vCPU | 2 GB   | 40 GB |
| 172.20.3.14 | Node1   | 1 vCPU | 2 GB   | 40 GB |
| 172.20.3.18 | Node2   | 1 vCPU | 2 GB   | 40 GB |

* Docker 版本為 1.18.02；
* Kubernetes 版本為 1.10.0；Kubernetes CNI 為`Calico`。

{% colorquote info %}
利用`kubeadm`部署 Kubernetes 叢集，可以參考 [只要用 kubeadm 小朋友都能部署 Kubernetes](https://kairen.github.io/2016/09/29/kubernetes/deploy/kubeadm/)。
{% endcolorquote %}

## 安裝 Kubeless
這裡官方為了不同的 Kubernetes 環境提供了不同的 Manifest，請依照自己的需求而選擇對應的檔案：
  * `kubeless-$RELEASE.yaml`：使用於有 RBAC 的 Kubernetes 叢集；
  * `kubeless-non-rbac-$RELEASE.yaml`：使用於沒有 RBAC 的 Kubernetes 叢集；
  * `kubeless-openshift-$RELEASE.yaml`：使用於 OpenShift (1.5+) 上。

設定 Kubeless 版本並選擇對應的檔案後，透過`kubectl`建立 Kubeless controller manager 與 CRD：
```shell
$ export RELEASE=$(curl -s https://api.github.com/repos/kubeless/kubeless/releases/latest | grep tag_name | cut -d '"' -f 4)
$ kubectl create ns kubeless
$ kubectl create -f https://github.com/kubeless/kubeless/releases/download/$RELEASE/kubeless-non-rbac-$RELEASE.yaml

$ kubectl get pods -n kubeless
NAME                                           READY     STATUS    RESTARTS   AGE
kubeless-controller-manager-6f59c58ffd-mlbpd   1/1       Running   0          6h

$ kubectl get deployment -n kubeless
NAME                          DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
kubeless-controller-manager   1         1         1            1           6h

$ kubectl get crd
NAME                          AGE
cronjobtriggers.kubeless.io   6h
functions.kubeless.io         6h
httptriggers.kubeless.io      6h
```

完成後，安裝 Kubeless 的 CLI：
```shell
$ export OS=$(uname -s| tr '[:upper:]' '[:lower:]')
$ curl -OL https://github.com/kubeless/kubeless/releases/download/$RELEASE/kubeless_$OS-amd64.zip && \
    unzip kubeless_$OS-amd64.zip && \
    sudo mv bundles/kubeless_$OS-amd64/kubeless /usr/local/bin/
```

{% colorquote info %}
若環境無法`unzip`請自行透過`apt`安裝`zip`。指令如下：
```shell
$ apt-get install -y zip
```
{% endcolorquote %}

使用`kubeless`指令檢查 Kubeless CLI 是否安裝完成：
```shell
$ kubeless
Serverless framework for Kubernetes

Usage:
  kubeless [command]

Available Commands:
  autoscale         manage autoscale to function on Kubeless
  completion        Output shell completion code for the specified shell.
  function          function specific operations
  get-server-config Print the current configuration of the controller
  help              Help about any command
  topic             manage message topics in Kubeless
  trigger           trigger specific operations
  version           Print the version of Kubeless

Flags:
  -h, --help   help for kubeless

Use "kubeless [command] --help" for more information about a command.
```

## 安裝 Kubeless UI
Kubeless 提供了 Dashboard，且由 [React](https://reactjs.org/) 所撰寫而成。而安裝方式非常簡單：
```shell
$ kubectl create -f https://raw.githubusercontent.com/kubeless/kubeless-ui/master/k8s.yaml
```

在 Dashboard 上會遇到 RBAC 的問題，因此需要建立一個 Cluster Role：
```shell
$ cat <<EOF | kubectl create -f -
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: kubeless-ui-default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: User
    name: system:serviceaccount:kubeless:ui-acct
    apiGroup: rbac.authorization.k8s.io
EOF
```

確認 Kubeless UI 的 Service：
```shell
$ kubectl -n kubeless get svc
NAME      TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
ui        NodePort   10.106.89.123   <none>        3000:30619/TCP   6h
```

若完成後，可以透過瀏覽器存取 [Kubeless UI](http://172.20.3.19:30619/)

![Kubeless UI](/images/kubeless-installation-images/kubeless-dashboard.png)

## 寫一個簡單的 Function
接下來建立一個簡單的 FUnction，以 Python 為範例。

創建一個`test.py`，並輸入以下內容：
```py
def hello(event, context):
  print event
  return event['data']
```

接下來透過 Kubeless 指令建立 Function：
```shell
$ kubeless function deploy hello --runtime python2.7 \
    --from-file test.py \
    --handler test.hello
INFO[0000] Deploying function...
INFO[0000] Function hello submitted for deployment
INFO[0000] Check the deployment status executing 'kubeless function ls hello'
```

可以透過以下指令確認 Function 是否建立：
```shell
$ kubeless function ls
NAME 	NAMESPACE	HANDLER   	RUNTIME  	DEPENDENCIES	STATUS
hello	default  	test.hello	python2.7	            	1/1 READY

$ kubectl get functions
NAME      AGE
hello     52s

$ kubectl get po
NAME                     READY     STATUS    RESTARTS   AGE
hello-56d89fcd87-4hlh5   1/1       Running   0          1m
```

完成後，可以在 Kubeless 上看到剛剛建立的 Function。

![Deploy Function](/images/kubeless-installation-images/deploy-function.png)

## 測試 Function
以下有三種方式可以測試剛剛建立的 Function 是否有作用。

### Kubeless CLI
透過 Kubeless CLI 確認 Function 是否有作用：
```shell
$ kubeless function call hello --data 'Hello world!'
Hello world!
```

### Curl
直接使用`Curl`指令 __apiserver proxy URL__：
```shell
$ kubectl proxy -p 8080 &

$ curl --data '{"hello": "world"}' \
    --header "Content-Type:application/json" \
    localhost:8080/api/v1/namespaces/default/services/hello:8080/proxy/
{"hello": "world"}
```

### Kubeless UI
Kubeless UI 在 Function 旁邊有提供測試。

![Test Function](/images/kubeless-installation-images/function-test.png)

## 參考資料
  1. [Kubeless Github](https://github.com/kubeless/kubeless)
  2. [Kubeless Docs](https://kubeless.io/docs/quick-start/)
  3. [Kubeless UI Github](https://github.com/kubeless/kubeless-ui)
