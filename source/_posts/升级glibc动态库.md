---
title: 升级glibc动态库
author: 神秘人
tags:
  - shell
  - Linux
categories:
  - Linux
mathjax: false
date: 2019-11-06 19:22:28
---

(转)

glibc是gnu发布的libc库，即c运行库，glibc是linux系统中最底层的api，几乎其它任何运行库都会依赖于glibc。glibc除了封装linux操作系统所提供的系统服务外，它本身也提供了许多其它一些必要功能服务的实现。很多linux的基本命令，比如cp, rm, ll,ln等，都得依赖于它，如果操作错误或者升级失败会导致系统命令不能使用，严重的造成系统退出后无法重新进入，所以操作时候需要慎重。

1、首先，查看系统版本和Glibc版本

```shell
[root@noi ~]# cat /etc/redhat-release
CentOS release 6.9 (Final)

[root@noi ~]# strings /lib64/libc.so.6 | grep GLIBC_
GLIBC_2.2.5
GLIBC_2.2.6
GLIBC_2.3
GLIBC_2.3.2
GLIBC_2.3.3
GLIBC_2.3.4
GLIBC_2.4
GLIBC_2.5
GLIBC_2.6
GLIBC_2.7
GLIBC_2.8
GLIBC_2.9
GLIBC_2.10
GLIBC_2.11
GLIBC_2.12
GLIBC_PRIVATE
```


由上面的信息可以看出系统是CentOS 6.9，最高支持glibc的版本为2.12，而现在都已经2.27版本了，所以需要升级。

2、下载软件并升级


```shell
wget http://ftp.gnu.org/gnu/glibc/glibc-2.27.tar.gz tar -xvf  glibc-2.27.tar.gz mkdir glibc-2.27/buildcd glibc-2.27build ../configure  --prefix=/usr --disable-profile --enable-add-ons --with-headers=/usr/include --with-binutils=/usr/binmakemake install
```