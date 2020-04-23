---
title: Gnu parallel入门
author: 神秘人
tags:
  - shell
  - 并行
categories:
  - Linux
mathjax: false
date: 2020-04-23 10:26:39
---

## how

最简单的方法就是类比`xargs`。在xargs里面有一个参数 `-P`，可以利用多核。

举个例子：

```bash
$ time echo {1..5} |xargs -n 1  sleep

real    0m15.005s
user    0m0.000s
sys 0m0.000s
```

这一条xargs把每个echo的数作为参数传给sleep ，所以一共sleep了 1+2+3+4+5=15秒。

如果使用 -P 参数分给5个核，每个核各sleep 1,2,3,4,5秒，所以执行完之后总共sleep的5秒。



```bash
$ time echo {1..5} |xargs -n 1 -P 5 sleep

real    0m5.003s
user    0m0.000s
sys 0m0.000s
```

铺垫结束。一般情况下，parallel的第一种模式，就是替换掉 xargs -P.

比如压缩一下所有的html文件。



```bash
find . -name '*.html' | parallel gzip --best
```

### 传参数模式

第一种模式是利用 parallel传参数。管道前面进来的作为参数传给后面的命令，并行执行

比如



```bash
huang$ seq 5 | parallel echo pre_placehoder_{}
pre_placehoder_1
pre_placehoder_2
pre_placehoder_3
pre_placehoder_4
pre_placehoder_5
```

其中`{}`是占位符，用来占位传入参数的位置。

在云计算操作中，经常有批量操作，比如建立10个云硬盘



```undefined
seq 10 | parallel  cinder create 10 --display-name test_{}
```

建立50个云主机



```cpp
seq 50 | parallel nova boot --image    image_id  --flavor 1 --availability-zone  az_id   --nic vnetwork=private   --vnc-password 000000  vm-test_{}
```

批量删除云主机



```dart
nova list | grep some_pattern| awk '{print $2}' | parallel nova delete
```

#### 改写 for loop

可以看到，我其实是把很多需要写循环的地方用parallel替换了，顺带享受了并行带来的快捷。

这个道理是这样的，在进行for循环的时候，是最有可能并行化的，因为被放在循环中的各个对象是上下文无关的。

普世抽象，shell的循环：



```bash
  (for x in `cat list` ; do
    do_something $x
  done) | process_output
```

可以直接写成



```cpp
 cat list | parallel do_something | process_output
```

如果loop 里面内容太多了



```bash
 (for x in `cat list` ; do
    do_something $x
    [... 100 lines that do something with $x ...]
  done) | process_output
```

那么最好写成一个脚本



```bash
  doit() {
    x=$1
    do_something $x
    [... 100 lines that do something with $x ...]
  }
  export -f doit
  cat list | parallel doit
```

而且还能避免掉很多麻烦的转义。

### --pipe模式

另一种模式就是 `parallel --pipe`

这时管道前面的不是作为参数，而是标准输入传给后面的命令

例如：



```undefined
 cat my_large_log   |parallel --pipe grep pattern 
```

如果不加 `--pipe` ，相当于 mylog中的每一行都变成 `grep pattern line`的命令展开了。而加入了`--pipe`，则和 `cat mylog | grep pattern`  没有区别，只是分配到各个核上去执行了。

好了，基本概念就讲完了！其他的都只是各个参数具体使用，比如到底用几个核啊，place_holder的替换啊，各种花样传参数啊，并行执行但是保证结果顺序输出(-k)，以及神奇的跨节点并行计算啊，看看man page就知道了。

## bonus

手边有了一个转换成并行的小工具，除了让你日常执行快一点之外，还有一个好处，就是**测并发**。

很多接口在并发操作下会出现一些bug，比如有一些判断数据库里面没有加锁，是在代码层面判断的，结果并发请求下去，每个请求在到达服务器的时候是判断通过，一起写了之后就超出限制了。之前写for循环因为是串行执行的，并不会触发这些问题。但是你要真正测并发的话，又要写脚本，或者利用python的`mulitiprocessing`封装一下。但我手边有了parallel，又在bashrc里面就加了以下两个alias



```bash
alias p='parallel'
alias pp='parallel --pipe -k'   
```

这样制造并发太方便了，只需要管道后面加个p , 我就时时刻刻可以制造并发来观察响应。

举个例子



```bash
seq 50 | p -n0 -q  curl 'example.com'
```

以你核的个数并发请求。-n0的意思是seq输出不作为参数传给后面的命令。

## 详细参考手册

## [Linux下的并行神器——parallel](https://www.jianshu.com/p/cc54a72616a1)

