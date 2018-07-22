---
title: 在 Ubuntu 使用 KVM 建立虛擬機
date: 2016-10-14
categories:
  - 技術
  - Linux
tag:
  - KVM
  - Virtualization
thumbnail: /images/using-kvm-on-ubuntu-images/linux-logo.jpg
banner: /images/using-kvm-on-ubuntu-images/linux-logo.jpg
toc: true
---
Linux 核心從 2007 年的 2.6.20 版本之後開始支援一種稱為「核心基礎虛擬機器 (Kernel-based Virtual Machine, KVM)」的虛擬化技術。KVM 利用模組化的方式讓 Linux 核心具有 Hypervisor 的能力，因此可以利用 KVM 來建立虛擬機。

<!--more-->

## 安裝 KVM 與 virt-manager
本安裝教學作業系統為 Desktop 版本，所以利用 GUI 介面來操作 KVM 對虛擬機做任何操作，而透過 GUI 介面對虛擬機做操作也極為方便。若作業系統使用 Server 版本，則無法使用 GUI 介面來操作虛擬機，須透過`virsh`指令來操作虛擬機。

### 安裝環境

| ID   | Description                     |
| ---- | ------------------------------- |
| OS   | Ubuntu 16.04 LTS Desktop        |
| CPU  | Intel i3-3220 CPU @ 3.30GHz x 4 |
| RAM  | 8 GB                            |
| Disk | 500 GB                          |

### 安裝步驟
使用`apt`進行安裝相關套件：
```shell
$ sudo apt-get install -y qemu-kvm libvirt-bin ubuntu-vm-builder bridge-utils
```

KVM 相關套件：
  * **libvirt-bin**：提供 libvirtd，用來管理 qemu 與 kvm。
  * **qemu-kvm**：主要的虛擬引擎。
  * **ubuntu-vm-builder**：強大的虛擬機器製作工具。
  * **bridge-utils**：用來建立虛擬機器使用的 bridge。

安裝完畢後，可以使用`kvm-ok`來查看是否安裝成功：
```shell
$ kvm-ok
INFO: /dev/kvm exists
KVM acceleration can be used
```

安裝**虛擬機管理員**(Virtual Machine Manager, virt-manager)，利用 GUI 介面對虛擬機進行操作：
```shell
$ sudo apt-get install virt-manager python-spice-client-gtk
```

{% colorquote info %}
虛擬機管理員會需要用到`python-spice-client-gtk`
{% endcolorquote %}

安裝完畢後，即可以開始執行：
```shell
$ sudo virt-manager
```

輸入完以上指令後，會開啟虛擬機管理員，再來即可使用 GUI 對虛擬機進行操作。

![Virt-Manager GUI](/images/using-kvm-on-ubuntu-images/virt-manager.png)

## 參考文獻
  1. [在 Ubuntu Linux 中使用 KVM（使用 vmbuilder）](https://blog.gtwang.org/linux/ubuntu-linux-kvm-vmbuilder-tutorial/)
  2. [Ubuntu上装KVM：安装、初次使用](http://blog.csdn.net/c80486/article/details/42836169)
  3. [架設 Linux KVM 虛擬化主機（Set up Linux KVM virtualization host）](http://www.lijyyh.com/2015/12/linux-kvm-set-up-linux-kvm.html)
