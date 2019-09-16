---
title: SystemVerilog中如何自动生成setter和getter？
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-09-12 16:30:54
password: 2101135
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

### 可以直接用宏实现，但是必须EDA工具支持<u>6.23 Type operator</u> 

* sv实现~
```verilog
`define uvm_setget_func(T) \
   `m_setter_func(T) \
   `m_getter_func(T) 

`define m_setter_func(T) \
function automatic void set_``T (type(T) t); \
       T = t; \
   endfunction 

`define m_getter_func(T) \
   function automatic type（T） get_``T (); \
       return T;\
   endfunction 

class setget;

    int mtest;

    `uvm_setget_func(mtest)

endclass
```
* 脚本实现~
![setget](SystemVerilog中如何自动生成setter和getter/setget.jpg)

