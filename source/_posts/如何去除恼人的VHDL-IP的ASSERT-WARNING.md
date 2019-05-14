---
title: 如何去除恼人的VHDL-IP的ASSERT/WARNING?
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - EDA
  - NCsim
categories:
  - 验证
date: 2019-05-14 11:30:13
---

#### IP采用的是VHDL代码，Verilog和VHDL混合仿真出现恼人的无关紧要的Waning

<font color=red>
	ASSERT/WARNING (time 543162800 FS) from package ieee.NUMERIC_STD, this builtin function called  from process xxx.xxx.xxx.xxx
</font>

+ 采用如下命令瞬间清净了。。。
+ NCsim命令行控制
```
	ncsim> set severity_pack_assert_off {warning}
	ncsim> set pack_assert_off { std_logic_arith numeric_std }
```

+ VCS参考handbook吧。。。