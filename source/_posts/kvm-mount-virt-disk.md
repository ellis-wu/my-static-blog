---
title: KVM 虛擬機器掛載硬碟
date: 2016-10-16
categories:
  - 技術
  - Linux
tag:
  - KVM
  - Virtualization
thumbnail: /images/kvm-mount-virt-disk-images/kvm-mount-disk-logo.png
banner: /images/kvm-mount-virt-disk-images/kvm-mount-disk-logo.png
toc: true
---
最近在安裝 Ceph 分散式儲存時，需要多顆硬碟，而實體機並沒有這麼多硬碟時，變透過 KVM 來模擬多顆硬碟給虛擬機使用。本文將介紹如何使 KVM 所建立的虛擬機掛載新的虛擬硬碟。若不知道如何安裝 KVM，請參考 {% post_link using_kvm_on_ubuntu %}。

<!--more-->

## 新增硬碟
進入虛擬機器，使用`fdisk`指令查看目前硬碟資訊，可以看到只有掛載一顆`vda`：
```shell
$ sudo fdisk -l
Disk /dev/ram0: 64 MiB, 67108864 bytes, 131072 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes

# [omitting much detailed data here]

Disk /dev/vda: 15 GiB, 16106127360 bytes, 31457280 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x895a7464

Device     Boot   Start      End  Sectors  Size Id Type
/dev/vda1  *       2048   999423   997376  487M 83 Linux
/dev/vda2       1001470 31455231 30453762 14.5G  5 Extended
/dev/vda5       1001472 31455231 30453760 14.5G 8e Linux LVM




Disk /dev/mapper/test--vg-root: 13.5 GiB, 14516486144 bytes, 28352512 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes


Disk /dev/mapper/test--vg-swap_1: 1 GiB, 1073741824 bytes, 2097152 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
```

**【檢視】**
接下來，透過`virt-manager`可以很方便且快速的對虛擬機新增硬體。首先點選要新增硬體的虛擬機，並顯示虛擬機器的詳細規格：
 1. 點擊上方工具列的 **【檢視】**；
 2. 點選下拉式表單的 **【細節】**。

![Virt-Manager Toolbar](/images/kvm-mount-virt-disk-images/vmm-toolbar.png)

點選 **【細節】** 後，會列出此虛擬機器的詳細硬體規格及其設定：

![VM Hardware Details](/images/kvm-mount-virt-disk-images/vm-detail.png)

透過下方的 **【加入硬體】** 新增一顆虛擬硬體，並依據自己的需求進行配置：

![Add Disk](/images/kvm-mount-virt-disk-images/add-disk.png)

完成後，進入虛擬機器使用`fdisk`指令查看硬碟資訊，可以看到已經`vdb`掛載上去：

```shell
$ sudo fdisk -l
Disk /dev/ram0: 64 MiB, 67108864 bytes, 131072 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 4096 bytes
I/O size (minimum/optimal): 4096 bytes / 4096 bytes

# [omitting much detailed data here]

Disk /dev/vda: 15 GiB, 16106127360 bytes, 31457280 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0x895a7464

Device     Boot   Start      End  Sectors  Size Id Type
/dev/vda1  *       2048   999423   997376  487M 83 Linux
/dev/vda2       1001470 31455231 30453762 14.5G  5 Extended
/dev/vda5       1001472 31455231 30453760 14.5G 8e Linux LVM




Disk /dev/mapper/test--vg-root: 13.5 GiB, 14516486144 bytes, 28352512 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes


Disk /dev/mapper/test--vg-swap_1: 1 GiB, 1073741824 bytes, 2097152 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes


Disk /dev/vdb: 20 GiB, 21474836480 bytes, 41943040 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
```

## 參考資料
  1. [给KVM虚拟机增加硬盘](http://blog.chinaunix.net/uid-30272819-id-5114645.html)
