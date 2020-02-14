---
title: VCS Crash如何定位？
date: 2019-04-18 22:37:37
tags: [EDA,gdb]
categories: [验证]
password: 2101233
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---


<font color=red>
# 编译时Crash,按照如下步骤定位： #

1.vcs -gdb [options]

2.run

3.where
</font> 

<font color=blue>
# 运行Crash,按照如下步骤定位： #
1.gdb --args ./simv [options]

2.run

3.where
</font> 