---
title: git clone断点续传
author: 神秘人
tags:
  - emacs
  - vim
categories:
  - Linux
mathjax: false
date: 2019-12-10 16:05:16
---

### 编译后端

打开终端(假设你已经安装好了 git 和 cmake， gcc 或者 clang）

```bash
git clone --recursive https://github.com/cquery-project/cquery.git
cd cquery
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=release -DCMAKE_EXPORT_COMPILE_COMMANDS=YES
cmake --build .
cmake --build . --target install
```

这样 cquery 就被编译好了，编译好的 cquery 会在 **cquery/build/release/bin/** 目录下生成一个名为 cquery 的 二进制文件

然后安装 lsp-mode, 可以使用 emacs 自带的包管理来安装

```shell
M-x package-install [RET] lsp-mode [RET]
```

安装好之后在你的emacs 的配置文件里写下如下配置

```commonlisp
;;; 如果 cquery 编译好之后的执行文件在 PATH 下的话，这条语句就不需要，
;;;  "/path/to/cquery/build/release/bin/cquery" 是 cquery 的位置
(setq cquery-executable "/path/to/cquery/build/release/bin/cquery")
(dolist (hook '(c-mode-hook c++-mode-hook))
  (add-hook hook
	    #'(lambda ()
		(require 'cquery)
		(lsp))))
```

还有一些其他可以方便使用的配套插件也可以安装上比如 lsp-ui 和 company-lsp

```
M-x package-install [RET] lsp-ui [RET]
M-x package-install [RET] company-lsp [RET]
```

配置 company-lsp

```commonlisp
(push 'company-lsp company-backends)
```

### git clone 断了，下载了好久，续传~~

2)进入项目根目录，继续下载
```shell
$ cd cquery
$ git submodule update --init --recursive
```

