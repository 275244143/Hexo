---
title: VCS运行错误后保持ucli进行后续诊断~
author: 神秘人
tags:
  - VCS
  - SystemVerilog
  - EDA
categories:
  - 验证
mathjax: false
date: 2019-06-19 10:41:32
---

####  VCS主要说明

VCS allows you to debug an unexpected error condition by not exiting and keeping the UCLI or DVE command prompt active for debugging commands.
DVE or UCLI command prompt remains active when there is an error condition, allowing you to examine the current simulation state (the simulation stack, variable values, and so on) so you can debug the error condition.

+  Specify the following UCLI configuration command in a Tcl file or in  $HOME/.synopsys_ucli_prefs.tcl file:
  **config onfail enable [failure_type]**
  Where failure_type is optional. It allows you to specify the failure type. 
+  错误类型表格

| 错误类型          | 描述                                                         |
| ----------------- | ------------------------------------------------------------ |
| sysfault          | Assertion or signal (including segfault)                     |
| {error regex} | Error for which the tag matches regex. The tag of an error can be seen in the error message (Error-[TAG]). |
| fatal             | Fatal error for which VCS currently dumps a stack trace.     |
| all               | All failures (default)                                       |

+ 例子
  * Tcl File (test.tcl)
  ```shell
  onfail {
  set err_msg "Stopped in"
  append err_msg [scope]
  puts $err_msg
  }
  config onfail enable {error NOA}
  run
  ```
  * 运行
  ```shell
  % simv -ucli -i test.tcl
  ```
+ **对运行时段错误进行定位是个不错的选择~**