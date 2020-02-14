---
title: github回退代码到历史指定版本
date: 2019-04-22 18:51:16
tags:
  - git
  - github
  - shell
categories:
  - Linux
---

+ 前提是本地已经有了git的origin master库或者克隆需要回退的代码到本地。

+ 查询历史对应不同版本的ID,用于回退使用。
```
	git log --pretty=oneline
```
+ 使用git log命令查看所有的历史版本，获取你git的某个历史版本的id。
 * 假设查到历史版本的id是fae6966548e3ae76cfa7f38a461c438cf75ba965。

+ 恢复到历史版本。
```
	git reset --hard fae6966548e3ae76cfa7f38a461c438cf75ba965
```

+ 把修改推到远程服务器。
```
	git push -f -u origin master
```

+ 重新更新本地代码。
```
	git pull
```
