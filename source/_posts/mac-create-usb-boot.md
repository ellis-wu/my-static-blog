---
title: Mac OS X 製作 USB 開機碟
date: 2017-03-17
category:
  - 技術
  - Mac
tags:
  - Mac
thumbnail: /images/mac-create-usb-boot-images/usb-logo.jpg
banner: /images/mac-create-usb-boot-images/usb-logo.jpg
toc: true
---
本文將介紹如何在 Mac OS X 環境中製作用來安裝作業系統(Operating system)的 USB 隨身碟，即不需要光碟就可以直接安裝作業系統。

{% colorquote danger %}
**請勿用來製作需要授權(license)付費之作業系統，請製作開源作業系統；如：Ubuntu, CentOS 等等。**
{% endcolorquote %}

<!--more-->

在開始製作前請事先準備一個隨身碟，並確認隨身碟中的**資料是不需要的**，因為在製作成 USB 開機碟之後，原本隨身碟中的資料都會被刪除。

## 開始製作 USB 開機碟
首先，須先準備作業系統的 ISO 檔，而本文將以`Ubuntu 14.04`為例；下載的檔案名稱為`ubuntu-14.04.2-desktop-amd64`。下載好映像檔後，透過`hdiutil`指令將 ISO 檔轉換為 Max OS X 的 dmg 檔：
```shell
$ hdiutil convert -format UDRW -o ubuntu-14.04.2-desktop-amd64.dmg ubuntu-14.04.2-desktop-amd64.iso
正在讀取Driver Descriptor Map（DDM：0）⋯
正在讀取Ubuntu 14.04.2 LTS amd64        （Apple_ISO：1）⋯
正在讀取Apple（Apple_partition_map：2）⋯
正在讀取Ubuntu 14.04.2 LTS amd64        （Apple_ISO：3）⋯
.
正在讀取EFI（Apple_HFS：4）⋯
.
正在讀取Ubuntu 14.04.2 LTS amd64        （Apple_ISO：5）⋯
.............................................................................................................................
經過時間： 7.604s
速度：131.0Mbyte/秒
節省：0.0%
created: /Users/fengmingwu/Desktop/ubuntu-14.04.2-desktop-amd64.dmg
```

在 Mac 插入 USB 之前，先使用`diskutil`確認目前系統的硬碟狀態：
```shell
$ diskutil list
/dev/disk0 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *121.3 GB   disk0
   1:                        EFI EFI                     209.7 MB   disk0s1
   2:          Apple_CoreStorage Macintosh HD            120.5 GB   disk0s2
   3:                 Apple_Boot Recovery HD             650.0 MB   disk0s3

/dev/disk1 (internal, virtual):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:                            Macintosh HD           +120.1 GB   disk1
                                 Logical Volume on disk0s2
                                 4925F827-81AC-4A28-B0B1-408E6475C692
                                 Unlocked Encrypted

/dev/disk2 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *129.8 GB   disk2
   1:               Windows_NTFS jetDrive                129.8 GB   disk2s1
```

插入 USB 之後，在使用`diskutil`確認目前系統的硬碟狀態：
```shell
$ diskutil list
/dev/disk0 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *121.3 GB   disk0
   1:                        EFI EFI                     209.7 MB   disk0s1
   2:          Apple_CoreStorage Macintosh HD            120.5 GB   disk0s2
   3:                 Apple_Boot Recovery HD             650.0 MB   disk0s3

/dev/disk1 (internal, virtual):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:                            Macintosh HD           +120.1 GB   disk1
                                 Logical Volume on disk0s2
                                 4925F827-81AC-4A28-B0B1-408E6475C692
                                 Unlocked Encrypted

/dev/disk2 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *129.8 GB   disk2
   1:               Windows_NTFS jetDrive                129.8 GB   disk2s1

/dev/disk3 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     Apple_partition_scheme                        *7.9 GB     disk3
   1:        Apple_partition_map                         4.1 KB     disk3s1
   2:                  Apple_HFS                         2.2 MB     disk3s2
```

比較一下前後兩個輸出，就可以發現 USB 是`/dev/disk3`。

{% colorquote info %}
這個部分每一台電腦結果不盡相同，請依照自己的輸出來判斷哪個為 USB。
{% endcolorquote %}

確認後 USB 後，使用`diskutil`將 USB 卸載：
```shell
$ diskutil unmountDisk /dev/disk3
Unmount of all volumes on disk3 was successful
```

接者使用`dd`指令將 dmg 檔的內容寫入 USB：
```shell
$ sudo dd if=ubuntu-14.04.2-desktop-amd64.dmg of=/dev/rdisk3 bs=1m
Password:
996+0 records in
996+0 records out
1044381696 bytes transferred in 184.816731 secs (5650904 bytes/sec)
```

接著，退出 USB：
```shell
$ diskutil eject /dev/disk1
```

大功告成！

## 參考資料
  1. [在 Mac OS X 中製作用來安裝 Ubuntu Linux 的 USB 隨身碟](https://blog.gtwang.org/mac-os-x/create-a-ubuntu-linux-usb-stick-on-mac-osx/)
