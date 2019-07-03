---
title: 不同的TBTOP如何merge底下的同一个DUT？
author: 神秘人
tags:
  - VCS
  - SystemVerilog
  - Verilog
categories:
  - 验证
mathjax: false
date: 2019-07-03 09:30:30
---

#### 经常有一些小年轻还有资深设计人员问我这个问题，那就写这篇文章给RTLer的~~

+ 设计人员通常自己写UT，也要做些基本的代码覆盖率，但是只会Verilog做仿真，肯定每次一个用例写一个TB顶层，默认EDA工具是不支持的只能用EDA自带的特殊方法进行merge。

+ 例子（摘抄VCS手册）

  The following procedure explains how to map coverage information:

1. Compile the base design for coverage and then simulate that design while monitoring for coverage. For example:

```verilog
  cd /work/design1

  vcs -cm line dut.v test1.v

  simv -cm line
```

2. Compile the mapped design for coverage and then simulate that design while monitoring for coverage. For example:

 ```verilog
  cd /work/design2

  vcs -cm line dut.v test2.v

  simv -cm line
 ```

3. Run URG specifying the name of the top-level module in the subhierarchy. Also, specify the coverage directory for the base design, then specify the mapped design. For example:

  ```verilog
  urg -dir /work/design1/simv.vdb /work/design2/simv.vdb -map dut
  ```
#### DVer肯定保证每次不能动TBTOP，而且SUB到TOP覆盖率要自动merge~