---
title: 'tclsh: Splitting Lists'
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
  - tclsh
  - tcl/tk
mathjax: false
date: 2021-03-26 14:11:46
---



### 最近使用modelsim/questasim出现一个tcl传参数展开问题？

```tc
coverage -exclude -srcfile [glob -directory ./IP *.v]
```

无法执行：

原因是：后面必须分割的args，perl默认是展开的，但是tcl不行，需要采用如下方法：

### Splitting Lists
The {*} operator will convert a list to its component parts before evaluating a command. This is com-
monly used when one procedure returns a set of values that need to be passed to another procedure as
separate values, instead of as a single list.
The set command requires two arguments to assign a value to a variable - the name of the variable
and the value. You cannot assign the variable name and value to a string and then pass that string to
the set command.

# This is an error
set nameANDvalue "a 2"
set $nameANDvalue
The {*} operator can split the string "a 2" into two components: the letter a and the number 2.

```tcl
Example 10
Script Example
# This works
set nameANDvalue "a 2"
set {*}$nameANDvalue
puts $a
Script Output
2
```

