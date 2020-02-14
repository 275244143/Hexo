title: Linux 查找指定名称的进程并显示进程详细信息
author: 神秘人
tags:
  - Linux
  - shell
categories:
  - Linux
date: 2019-04-19 11:10:00
---

### 给定一个进程名称特征串，查找所有匹配该进程名称的进程的详细信息。

<font color=blue>

(1) 先用pgrep [str] 命令进行模糊匹配，找到匹配该特征串的进程ID；

(2) 其次根据进程ID显示指定的进程信息，ps --pid [pid]；

(3) 因为查找出来的进程ID需要被作为参数传递给ps命令，故使用xargs命令，通过管道符号连接；

(4) 最后显示进程详细信息，需要加上-u参数。

最终命令形如:

pgrep ncsim | xargs ps -u --pid
</color>