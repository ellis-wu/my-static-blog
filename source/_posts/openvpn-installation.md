---
title: OpenVPN 手把手教學
date: 2017-03-31
categories:
  - 技術
  - Linux
tag:
  - OpenVPN
  - VPN
thumbnail: /images/openvpn-installation-images/vpn-logo.jpg
banner: /images/openvpn-installation-images/vpn-logo.jpg
toc: true
---
虛擬私人網路(Virtual Private Network, VPN)為了解決跨區域之大型企業的網路連線與安全問題而衍生，VPN 在公用的網路架構(如：網際網路)上建立私有通道，而訊息透過私有通透進行傳送。VPN 可以利用已加密的通道協議(Tunneling Protocol)來達到保密、傳送端認證、訊息準確性等私人訊息安全效果。這種技術可以用不安全的網路(如：網際網路)來傳送可靠、安全的訊息。需要注意的是，沒有加密的 VPN 訊息依然有被竊取的危險。而 OpenVPN 無疑是 Linux 下開源 VPN 的先鋒，其提供了良好的效能友善的 GUI，而本文將介紹如何在 Ubuntu 上安裝 OpenVPN，但不使用 GUI 介面。

<!--more-->

## 安裝環境
本次安裝在 Google Compute Engine(GCE) 上租用一台虛擬機並作為 VPN Server，在實體機上使用 KVM 建立一台虛擬機作為 VPN Client。硬體規格與環境資訊如下：

| ID         | VPN Server (GCE)        | VPN Client (On-premises) |
| ---------- | ----------------------- | ------------------------ |
| OS         | Ubuntu 16.04 LTS Server | Ubuntu 16.04 LTS Server  |
| vCPU       | 1 vCPU                  | 1 vCPU                   |
| RAM        | 4 GB                    | 4 GB                     |
| Disk       | 10 GB                   | 50 GB                    |
| Private IP | ens4, 10.140.0.3        | enp0s8, 172.20.3.19      |
| Public IP  | 35.194.174.185          | -                        |


{% colorquote info %}
* 以下 OpenVPN 安裝步驟僅適用於 Ubuntu，其他作業系統如何安裝 OpenVPN 請參考：
  1. [How To Set Up an OpenVPN Server on Debian 8](https://www.digitalocean.com/community/tutorials/how-to-set-up-an-openvpn-server-on-debian-8)
  2. [Hot To Setup and Configure an OpenVPN Server on CentOS 7](https://www.digitalocean.com/community/tutorials/how-to-setup-and-configure-an-openvpn-server-on-centos-7)

* 以上連結都未使用 ccd(client-config-dir)，Server 端無法連到 Client 端。因此，需要再額外設定 ccd。
{% endcolorquote %}

## 安裝 OpenVPN

### 安裝套件
首先，安裝`openvpn`與`easy-rsa`套件：
```shell
$ sudo apt-get install -y openvpn easy-rsa
```

### 建立 CA 範本與資料夾
接下來，複製`easy-rsa`的範本：
```shell
$ make-cadir ~/openvpn-ca
$ cd ~/openvpn-ca
$ ls
build-ca     build-key         build-key-server  clean-all      openssl-0.9.6.cnf  pkitool      vars
build-dh     build-key-pass    build-req         inherit-inter  openssl-0.9.8.cnf  revoke-full  whichopensslcnf
build-inter  build-key-pkcs12  build-req-pass    list-crl       openssl-1.0.0.cnf  sign-req
```

### 設定 CA 資訊
複製完成並確認檔案後，編輯`vars`，並設定 CA 資訊：
```crmsh
export KEY_COUNTRY="TW"
export KEY_PROVINCE="Taiwan"
export KEY_CITY="Taipei"
export KEY_ORG="inwinSTACK"
export KEY_EMAIL="ellis.w@inwinstack.com"
export KEY_OU="R&D"

# X509 Subject Field
export KEY_NAME="server"
```

### 建立 CA
根據剛剛設定的 CA 資訊來建立自己的憑證：
```shell
$ cd ~/openvpn-ca
$ source vars
NOTE: If you run ./clean-all, I will be doing a rm -rf on /home/ellis_w/openvpn-ca/keys
```

接下來，清除目錄中所有的金鑰(key)，確保等下產生的金鑰(key)不會重複等問題：
```shell
$ ./clean-all
```

清楚完後，使用`./build-ca`來製作 CA，接下來只要一直按 **【Enter】** 即可：
```shell
$ ./build-ca
Generating a 2048 bit RSA private key
............................+++
.......................................................................................................................................................+++
writing new private key to 'ca.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [TW]:
State or Province Name (full name) [Taiwan]:
Locality Name (eg, city) [Taipei]:
Organization Name (eg, company) [inwinSTACK]:
Organizational Unit Name (eg, section) [R&D]:
Common Name (eg, your name or your server\'s hostname) [inwinSTACK CA]:
Name [server]:
Email Address [ellis.w@inwinstack.com]:
```

### 建立 Server 端相關檔案
接下來，接下來製作 Server 的 CA 與金鑰(key)：
```shell
$ ./build-key-server server
Generating a 2048 bit RSA private key
............................+++
...........................................+++
writing new private key to 'server.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [TW]:
State or Province Name (full name) [Taiwan]:
Locality Name (eg, city) [Taipei]:
Organization Name (eg, company) [inwinSTACK]:
Organizational Unit Name (eg, section) [R&D]:
Common Name (eg, your name or your server\'s hostname) [server]:
Name [server]:
Email Address [ellis.w@inwinstack.com]:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
Using configuration from /home/ellis_w/openvpn-ca/openssl-1.0.0.cnf
Check that the request matches the signature
Signature ok
The Subject\'s Distinguished Name is as follows
countryName           :PRINTABLE:'TW'
stateOrProvinceName   :PRINTABLE:'Taiwan'
localityName          :PRINTABLE:'Taipei'
organizationName      :PRINTABLE:'inwinSTACK'
organizationalUnitName:T61STRING:'R&D'
commonName            :PRINTABLE:'server'
name                  :PRINTABLE:'server'
emailAddress          :IA5STRING:'ellis.w@inwinstack.com'
Certificate is to be certified .until Mar 29 06:28:48 2027 GMT (3650 days)
Sign the certificate? [y/n]:y


1 out of 1 certificate requests certified, commit? [y/n]y
Write out database with 1 new entries
Data Base Updated
```

接著，為了增加 OpenVPN 的安全性，製作`diffie hellman`。此步驟會需要一些時間：
```shell
$ ./build-dh
Generating DH parameters, 2048 bit long safe prime, generator 2
This is going to take a long .time
# ...(以下省略)
```

### 建立 Client 端的密鑰(key)
Server 端所需要的 CA 與密鑰(key)都已經準備完成後。再來就是建立 Client 端的密鑰(key)。可以在 Client 端產生 Client 的密鑰(key)。但為了方便，直接在 Server 端建立 Client 端的密鑰(key)：
```shell
$ ./build-key client1
Generating a 2048 bit RSA private key
................+++
...............................................................................................+++
writing new private key to 'client1.key'
-----
You are about to be asked to enter information that will be incorporated
into your certificate request.
What you are about to enter is what is called a Distinguished Name or a DN.
There are quite a few fields but you can leave some blank
For some fields there will be a default value,
If you enter '.', the field will be left blank.
-----
Country Name (2 letter code) [TW]:
State or Province Name (full name) [Taiwan]:
Locality Name (eg, city) [Taipei]:
Organization Name (eg, company) [inwinSTACK]:
Organizational Unit Name (eg, section) [R&D]:
Common Name (eg, your name or your server\'s hostname) [client1]:
Name [server]:
Email Address [ellis.w@inwinstack.com]:

Please enter the following 'extra' attributes
to be sent with your certificate request
A challenge password []:
An optional company name []:
Using configuration from /home/ellis_w/openvpn-ca/openssl-1.0.0.cnf
Check that the request matches the signature
Signature ok
The Subject\'s Distinguished Name is as follows
countryName           :PRINTABLE:'TW'
stateOrProvinceName   :PRINTABLE:'Taiwan'
localityName          :PRINTABLE:'Taipei'
organizationName      :PRINTABLE:'inwinSTACK'
organizationalUnitName:T61STRING:'R&D'
commonName            :PRINTABLE:'client1'
name                  :PRINTABLE:'server'
emailAddress          :IA5STRING:'ellis.w@inwinstack.com'
Certificate is to be certified .until Mar 29 06:59:08 2027 GMT (3650 days)
Sign the certificate? [y/n]:y


1 out of 1 certificate requests certified, commit? [y/n]y
Write out database with 1 new entries
Data Base Updated
```

### 設定 OpenVPN Server
當 Server 與 Client 的 CA 與密鑰(key)都產生完成後，可以開始設定 OpenVPN Server。

複製 Server 需要的 CA 與密鑰(key)至`/etc/openvpn/`目錄底下：
```shell
$ cd ~/openvpn-ca/keys
$ sudo cp ca.crt ca.key server.crt server.key dh2048.pem /etc/openvpn
```

接下來，需要準備 OpenVPN 的設定檔。因此解壓縮 OpenVPN 的 sample configuration 檔案，並複製到`/etc/openvpn/`目錄底下：
```shell
$ gunzip -c /usr/share/doc/openvpn/examples/sample-config-files/server.conf.gz | sudo tee /etc/openvpn/server.conf
```

完成後，開始設定 OpenVPN Server 的設定檔，主要修改`server.conf`中的以下部分，而其他設定資訊請依據各自情況進行設定：
```crmsh
# 設定 VPN 透過 8081 Port
port 8081

# 更改為 tcp 並將 udp 註解起來
proto tcp
;proto udp

# 取消註解並且修改網段
push "route 10.140.0.0 255.255.255.0"
push "route 172.20.3.0 255.255.255.0"

# 取消註解並寫修改
client-config-dir ccd
route 172.20.3.0 255.255.255.0
```

當`server.conf`設定好後，新增`ccd`目錄，並產生`client`檔案並加入`iroute`：
```shell
$ mkdir -p /etc/openvpn/ccd
$ echo "iroute 172.20.3.0 255.255.255.0" > /etc/openvpn/ccd/client1
```

### 調整 OpenVPN Serve 網路設定
{% colorquote info %}
* 此步驟可以依照自己的情況進行更改。
* 正常情況下會設定防火牆是因為考慮到安全性，倘若有些應用需關閉防火牆，請自行關閉防火牆。
{% endcolorquote %}

當`server.conf`都設定完成後，再來要設定網路部分。首先要設定允許 IP forwarding，編輯`/etc/sysctl.conf`檔案，找到`net.ipv4.ip_forward`參數，將其**取消註解**：
```crmsh
net.ipv4.ip_forward=1
```

完成後，退出並存檔。並輸入以下指令，使其重新讀取設定：
```shell
$ sudo sysctl -p
```

接下來設定防火牆，而在設定防火牆前，先找到自己主機的 public network interface：
```shell
$ ip route | grep default
default via 10.140.0.1 dev ens4
```

這代表我的 public network interface 的名稱為`ens4`。知道 public network interface 名稱後，編輯`/etc/ufw/before.rules`，並增加以下設定：
```crmsh
# START OPENVPN RULES
# NAT table rules
*nat
:POSTROUTING ACCEPT [0:0]
# Allow traffic from OpenVPN client to wlp11s0 (change to the interface you discovered!)
-A POSTROUTING -s 10.8.0.0/8 -o ens4 -j MASQUERADE
COMMIT
# END OPENVPN RULES
```

再來編輯`/etc/default/ufw`，將`DEFAULT_FORWARD_POLICY`的參數設定為`ACCEPT`：
```crmsh
DEFAULT_FORWARD_POLICY="ACCEPT"
```

接下來，打開 OpenVPN 設定的 Port 與 Protocol，並重新啟動防火牆並啟動設定：
```shell
$ sudo ufw allow 8081/tcp
Rules updated
Rules updated (v6)

$ sudo ufw allow OpenSSH
Rules updated
Rules updated (v6)

$ sudo ufw disable
Firewall stopped and disabled on system startup

$ sudo ufw enable
Command may disrupt existing ssh connections. Proceed with operation (y|n)? y
Firewall is active and enabled on system startup
```

### 啟動 OpenVPN 服務
以上設定完成後，可以啟動 OpenVPN Server，並設定為開機時會自動啟動 OpenVPN Server 服務：
```shell
$ sudo systemctl start openvpn@server
$ sudo systemctl enable openvpn@server
```

可以使用以下指令查看，是否有成功啟動 OpenVPN Server：
```shell
$ sudo systemctl status openvpn@server
● openvpn@server.service - OpenVPN connection to server
   Loaded: loaded (/lib/systemd/system/openvpn@.service; enabled; vendor preset: enabled)
   Active: active (running) since Tue 2018-03-27 08:18:33 UTC; 1h 0min ago
     Docs: man:openvpn(8)
           https://community.openvpn.net/openvpn/wiki/Openvpn23ManPage
           https://community.openvpn.net/openvpn/wiki/HOWTO
  Process: 30905 ExecStart=/usr/sbin/openvpn --daemon ovpn-%i --status /run/openvpn/%i.status 10 --cd /etc/openvpn --script-security 2 --config /etc/openvpn/%i.conf --writepid /run/openvpn/%i
 Main PID: 30907 (openvpn)
   CGroup: /system.slice/system-openvpn.slice/openvpn@server.service
           └─30907 /usr/sbin/openvpn --daemon ovpn-server --status /run/openvpn/server.status 10 --cd /etc/openvpn --script-security 2 --config /etc/openvpn/server.conf --writepid /run/openvp

Mar 27 08:27:03 instance-3 ovpn-server[30907]: MULTI: Learn: 172.20.3.19 -> client1/122.146.93.152:26820
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 VERIFY OK: depth=1, C=TW, ST=Taiwan, L=Taipei, O=inwinSTACK, OU=R&D, CN=inwinSTACK CA, name=server, emailAddress=el
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 VERIFY OK: depth=0, C=TW, ST=Taiwan, L=Taipei, O=inwinSTACK, OU=R&D, CN=client1, name=server, emailAddress=ellis.w@
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 Data Channel Encrypt: Cipher 'BF-CBC' initialized with 128 bit key
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 WARNING: this cipher\'s block size is less than 128 bit (64 bit).  Consider using a --cipher with a larger block siz
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 Data Channel Encrypt: Using 160 bit message hash 'SHA1' for HMAC authentication
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 Data Channel Decrypt: Cipher 'BF-CBC' initialized with 128 bit key
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 WARNING: this cipher\'s block size is less than 128 bit (64 bit).  Consider using a --cipher with a larger block siz
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 Data Channel Decrypt: Using 160 bit message hash 'SHA1' for HMAC authentication
Mar 27 09:18:39 instance-3 ovpn-server[30907]: client1/122.146.93.152:26820 Control Channel: TLSv1.2, cipher TLSv1/SSLv3 DHE-RSA-AES256-GCM-SHA384, 2048 bit RSA
```

可以透過以下指令查看 OpenVPN 建立了一張虛擬網卡`tun0`：
```shell
$ ip addr show tun0
3: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UNKNOWN group default qlen 100
    link/none
    inet 10.8.0.1 peer 10.8.0.2/32 scope global tun0
       valid_lft forever preferred_lft forever
    inet6 fe80::7187:f47e:c174:728f/64 scope link flags 800
       valid_lft forever preferred_lft forever
```

## OpenVPN Client 測試

### 安裝 OpenVPN Client
{% colorquote info %}
使用 Linux 做為 Client 端，若其他裝置(如：Windows, Mac OS X, Android, iOS)，請參考 [How To Set Up an OpenVPN Server on Ubunut 16.04 #Step 12:Install the Client Configuration ](https://www.digitalocean.com/community/tutorials/how-to-set-up-an-openvpn-server-on-ubuntu-16-04#step-12-install-the-client-configuration)
{% endcolorquote %}

當 OpenVPN Server 執行後，再來到 Client 端中安裝 OpenVPN：
```shell
$ sudo apt-get install -y openvpn
```

### 設定 OpenVPN Client
首先，Client 會需要用到剛剛在 Server 端建立的`ca.crt`與 client 密鑰(key)與 CA。因此，我們必須先將這三份文件給複製至 Client 端：
```shell
$ for file in ca.crt client1.crt client1.key; do
    sudo scp <username>@<server ip>:/home/<username>/openvpn-ca/keys/${file} /etc/openvpn/
  done
```

Client 所需的密鑰(key)與 CA 複製完成後，接下來複製 Client 的範例文件：
```shell
$ sudo cp /usr/share/doc/openvpn/examples/sample-config-files/client.conf /etc/openvpn/
```

接著開始配置`client.conf`，主要修改以下部分：
```crmsh
# 將 udp 換成 tcp
proto tcp
;proto udp

# 設定 OpenVPN Server IP 與 Port
remote 35.194.174.185 8081
;remote my-server-2 1194

# 找到 ca, cert, key 設定，並修改檔案名稱
ca ca.crt
cert client1.crt
key client1.key
```

### 啟動 OpenVPN Client
以上設定完成後，可以啟動 OpenVPN Client，並設定為開機時會自動啟動 OpenVPN Client 服務：
```shell
$ sudo systemctl start openvpn@client
$ sudo systemctl enable openvpn@client
```

若 OpenVPN Client 成功啟動，則會自動建立一張 tun0 網卡與 Server 連接：
```shell
$ ip addr show tun0
4: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UNKNOWN group default qlen 100
    link/none
    inet 10.8.0.6 peer 10.8.0.5/32 scope global tun0
       valid_lft forever preferred_lft forever
```

亦可以使用以下指令查看，OpenVPN Client 是否有任何錯誤資訊：
```shell
$ sudo systemctl status openvpn@client
● openvpn@client.service - OpenVPN connection to client
   Loaded: loaded (/lib/systemd/system/openvpn@.service; enabled; vendor preset: enabled)
   Active: active (running) since Tue 2018-03-27 06:30:55 UTC; 2h 50min ago
     Docs: man:openvpn(8)
           https://community.openvpn.net/openvpn/wiki/Openvpn23ManPage
           https://community.openvpn.net/openvpn/wiki/HOWTO
 Main PID: 21276 (openvpn)
   CGroup: /system.slice/system-openvpn.slice/openvpn@client.service
           └─21276 /usr/sbin/openvpn --daemon ovpn-client --status /run/openvpn/client.status 10 --cd /etc/openvpn --script-security 2 --config /etc/openvpn/client.conf --writepid /run/openvp

Mar 27 09:18:39 single-node1 ovpn-client[21276]: ++ Certificate has EKU (str) TLS Web Server Authentication, expects TLS Web Server Authentication
Mar 27 09:18:39 single-node1 ovpn-client[21276]: VERIFY EKU OK
Mar 27 09:18:39 single-node1 ovpn-client[21276]: VERIFY OK: depth=0, C=TW, ST=Taiwan, L=Taipei, O=inwinSTACK, OU=R&D, CN=server, name=server, emailAddress=ellis.w@inwinstack.com
Mar 27 09:18:39 single-node1 ovpn-client[21276]: Data Channel Encrypt: Cipher 'BF-CBC' initialized with 128 bit key
Mar 27 09:18:39 single-node1 ovpn-client[21276]: WARNING: this cipher\'s block size is less than 128 bit (64 bit).  Consider using a --cipher with a larger block size.
Mar 27 09:18:39 single-node1 ovpn-client[21276]: Data Channel Encrypt: Using 160 bit message hash 'SHA1' for HMAC authentication
Mar 27 09:18:39 single-node1 ovpn-client[21276]: Data Channel Decrypt: Cipher 'BF-CBC' initialized with 128 bit key
Mar 27 09:18:39 single-node1 ovpn-client[21276]: WARNING: this cipher\'s block size is less than 128 bit (64 bit).  Consider using a --cipher with a larger block size.
Mar 27 09:18:39 single-node1 ovpn-client[21276]: Data Channel Decrypt: Using 160 bit message hash 'SHA1' for HMAC authentication
Mar 27 09:18:39 single-node1 ovpn-client[21276]: Control Channel: TLSv1.2, cipher TLSv1/SSLv3 DHE-RSA-AES256-GCM-SHA384, 2048 bit RSA
```

### 測試連線
以上都沒有錯誤，就代表 VPN 以連線成功。可以透過`icmp`驗證是否有成功連線：

在 Client 端，`icmp` 至 Server IP Address：
```shell
$ ping 10.140.0.3 -c 4
PING 10.140.0.3 (10.140.0.3) 56(84) bytes of data.
64 bytes from 10.140.0.3: icmp_seq=1 ttl=64 time=5.68 ms
64 bytes from 10.140.0.3: icmp_seq=2 ttl=64 time=6.14 ms
64 bytes from 10.140.0.3: icmp_seq=3 ttl=64 time=5.89 ms
64 bytes from 10.140.0.3: icmp_seq=4 ttl=64 time=5.93 ms

--- 10.140.0.3 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3007ms
rtt min/avg/max/mdev = 5.681/5.914/6.143/0.172 ms
```

在 Server 端，`icmp` 至 Client IP Address：
```shell
$ ping 172.20.3.19 -c 4
PING 172.20.3.19 (172.20.3.19) 56(84) bytes of data.
64 bytes from 172.20.3.19: icmp_seq=1 ttl=64 time=5.50 ms
64 bytes from 172.20.3.19: icmp_seq=2 ttl=64 time=5.62 ms
64 bytes from 172.20.3.19: icmp_seq=3 ttl=64 time=6.00 ms
64 bytes from 172.20.3.19: icmp_seq=4 ttl=64 time=5.57 ms

--- 172.20.3.19 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3003ms
rtt min/avg/max/mdev = 5.507/5.678/6.005/0.213 ms
```

若以上`icmp`都能通代表，VPN tunnel 已經成功建立，大功告成！!!
