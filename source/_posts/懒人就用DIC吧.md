---
title: 懒人就用DIC吧
author: 神秘人
tags:
  - VCS
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-27 15:07:25
---

#### PLI、DPI太烦人，那就用DIC吧~
PLI 、DPI语法多，懒得看~，错误一堆堆~

#### 解决方案
直接VCS~，NCsim有点对不住~
extern "C" void func(input *, input *, output *); 
或者
extern "A" void func(vc_handle, vc_handle, vc_handle); 

####   快速导入仿真定位，后期重构兼容~

