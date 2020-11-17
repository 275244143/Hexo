---
title: Slurm分布式资源管理初试用~
author: 神秘人
tags:
  - 分布式
  - LSF
categories:
  - Slurm
mathjax: false
date: 2020-11-17 14:42:07
---


## 个人PC已经开玩~只能说牛逼~

![slurm](Slurm分布式资源管理初试用/slurm.jpg)


## 编写 SLURM 脚本

你需要编写一个 SLURM 脚本来完成任务提交的设置。

SLURM 脚本可以在本地编写后上传， 也可以直接在工作站服务器上编辑。

一个 SLURM 脚本可设置很多内容，下面的模板列出了常用的选项。

run.slurm

```shell
#!/bin/bash
#SBATCH -J test                   # 作业名为 test
#SBATCH -o test.out               # 屏幕上的输出文件重定向到 test.out
#SBATCH -p gpu                    # 作业提交的分区为 cpu
#SBATCH --qos=debug               # 作业使用的 QoS 为 debug
#SBATCH -N 1                      # 作业申请 1 个节点
#SBATCH --ntasks-per-node=1       # 单节点启动的进程数为 1
#SBATCH --cpus-per-task=4         # 单任务使用的 CPU 核心数为 4
#SBATCH -t 1:00:00                # 任务运行的最长时间为 1 小时
#SBATCH --gres=gpu:1              # 单个节点使用 1 块 GPU 卡
#SBATCh -w comput6                # 指定运行作业的节点是 comput6，若不填写系统自动分配节点

# 设置运行环境
module add anaconda/3-5.0.0.1     # 添加 anaconda/3-5.0.0.1 模块

# 输入要执行的命令，例如 ./hello 或 python test.py 等
python test.py                    # 执行命令
```

其中，第一行是固定的，表示使用 `/bin/bash` 来执行脚本。其余的说明如下

- 申请时请写对分区，由于不同的分区硬件配置不同。
- QoS 的含义是 ‘‘Quality of Service’’，即服务质量。不同的 QoS 对应的优先度和 资源最大值不同。
- 申请的资源不要超过当前分区的最大值，建议使用 `scontrol` 命令查看分区的剩余 资源数。确定申请 CPU 核心数量之前，请确认你的程序是否真的需要这些计算资源。如果 程序的并行程度不高，申请过多的 CPU 核心数会造成资源的浪费（多数 CPU 占用率会较 低），并且会影响他人使用。
- 无需**显式指定申请的内存数量**，申请内存的大小和申请 CPU 核心数成正比。如果运行 程序时遇到内存不够的情况请适量增加 CPU 核心数。使用 GPU 的程序无需指定显存数量。
- 实际在每个节点上分配的 CPU 数量由 `--ntasks-per-node` 和 `--cpus-per-task` 参数共同决定。默认情况下二者都是 1。一般来讲，**多进程**的程序需要更改 `--ntasks-per-node`，**多线程**的程序需要更改 `--cpus-per-task`。各位用户请根据 自己需求进行设置。
- 任务最长时间的设置格式是 `DD-HH:MM:SS`，例如一天又 15 小时写作 `1-15:00:00`。 如果高位为 0 可省略。如果不写任务最长时间，则任务的最长时间默认为对应分区 (Partition) 的默认时间。

以上的所有 `#SBATCH` 属性均可以不设置，当缺少某属性时，系统将使用默认值。

请在使用时估计自己任务的开销，适量申请计算资源，避免造成资源的浪费。

