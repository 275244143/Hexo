---
title: 库映射问题(续)：相同module不同映射
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - EDA
  - VCS
  - NCsim
categories:
  - 验证
date: 2019-05-09 17:50:54
---
### 上节中运用的config标准，这次采用EDA工具自带支持的uselib宏

#### 采用如下运行

```
	irun top.v
```

#### 相关代码：
![rtl](库映射问题-续-：相同module不同映射/1.png)
![compile](库映射问题-续-：相同module不同映射/2.png)
![run](库映射问题-续-：相同module不同映射/3.png)