---
title: SV约束中const的妙用
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2020-03-06 10:37:35
---

### const
A const form of constant differs from a localparam constant in that the localparam shall be set during elaboration, whereas a const can be set during simulation, such as in an automatic task. 

* 在约束中被用作常数，如：Constraint for 32 bit addr to be different than prev addr by 2 bits.

* 土方法:

  ```verilog
  class a;
      rand bit [31:0] addr;
      bit [31:0] prev_addr;
  
      function void pre_randomize;
          prev_addr = addr;
      endfunction
  
      constraint addr_constraint {$countones(addr ^ prev_addr) == 2;}
  endclass : a
  ```

* const方法:

  ```verilog
  class A;
      rand bit[31:0] addr;  
      constraint addr_c {
          $countones(addr ^ const'(addr)) == 2;
      }
  endclass
  ```