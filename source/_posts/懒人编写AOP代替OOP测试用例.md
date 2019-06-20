---
title: 懒人编写AOP代替OOP测试用例
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - EDA
  - VCS
categories:
  - 验证
mathjax: false
date: 2019-06-20 17:38:55
---

####  AOP vs OOP
1. 面向对象编程(OOP)
针对业务处理过程中的实体,属性,行为进行封装,以获得更加清晰高效的逻辑单元划分。
OOP主要特点：
封装、继承性、多态性
2. 面向切面编程(AOP)
针对业务处理过程中的切面进行提取,更偏重于业务处理过程中的某个步骤或阶段,以获得逻辑处理过程中各部分之间低耦合的隔离效果,使代码具有更好的可移植性。
AOP主要的特点：
源码无关性:在不改变源码的前提下,给程序动态统一添加功能 。
隔离性、低耦合
3. OOP和AOP的区别
a. AOP是对OOP的补充。
b. OOP是将程序分解成各个层次的对象,面向业务中的名词领域,侧重点在与抽象。
c. AOP是将程序运行过程分解成各个切面,从程序运行角度考虑程序的结构,面向业务中的动词领域,侧重点在于解耦。
####  SV是不支持AOP的，e等语言才支持，必须采用EDA工具进行处理。
#### 例子
```verilog
package test;
    class pkt;

        int data;
    
        task send();
            $display("Send data:%0d",data);
        endtask
    
    endclass

    class driver;
    
        task drive(pkt p);
            $display("Drive data");
            p.send();
        endtask
    
    endclass

endpackage

program top;
    import test::*;

    initial begin
        pkt p = new();
        driver drv = new();
        drv.drive(p);
    end

endprogram

extends aop_pkt(test::pkt);

    around task send();
        $display("Around before send..");
        proceed;
        $display("Around end send..");
    endtask

    before task send();
        $display("Before send..");
    endtask

    after task send();
        $display("After send..");
    endtask

endextends

extends aop_driver(test::driver);

    around task drive(pkt p);
        $display("Around before drive..");
        p.data = 100;
        proceed;
        $display("Around end drive..");
    endtask

endextends
```
#### 运行结果
```shell
Around before drive..
Drive data
Before send..
Around before send..
Send data:100
Around end send..
After send..
Around end drive..
```
### 扩展uvm_test，uvm_driver等自然也就可以得心应手~