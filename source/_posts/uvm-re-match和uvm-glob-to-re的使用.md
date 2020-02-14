---
title: uvm_re_match和uvm_glob_to_re的使用
date: 2019-04-25 15:29:05
tags: [UVM,SystemVerilog]
categories: [验证]
---

### uvm_re_match和uvm_glob_to_re使用方法

首先，您必须确保将uvm与其dpi代码一起使用，也就是说，uvm_no_dpi未定义。通过将uvm_glob_to_re（“abc”）的结果打印出来，可以很容易地检查这一点。如果结果仍然是“abc”，那么您使用的是函数的systemverilog版本（只返回参数），而不是dpi-c实现。有关代码，请参阅dpi/uvm_regex.svh。
假设您使用的是dpi函数，那么您的glob表达式就出错了。“abc”的glob表达式不应该与字符串匹配。您需要使用“*abc*”（glob）来匹配它。通过查看这两个表达式的regex版本，可以看到这不起作用：
您将看到RE1包含“/^abc$/”，它只能与“abc”匹配。RE2包含/^.*abc.*$/，它匹配字符串中的任何“abc”子字符串。您可以忽略开头和结尾的/字符，因为这些字符将被剥离（不确定它们为什么存在）。
如果你试图匹配这两个表达式，你会发现第一个表达式不匹配，而第二个表达式不匹配。
另外：另一个与字符串匹配的正则表达式是“abc”，您可以看到它也适用于uvm_re_match（…）
```
module tb;

    import uvm_pkg::*;

    initial begin
        static string re1 = uvm_glob_to_re("abc");
        static string re2 = uvm_glob_to_re("*abc*");
        $display(re1);
        $display(re2);
        if (!uvm_re_match(re1, "top.mydut_abc_comp_inst"))
            $display("matches re1");

        if (!uvm_re_match(re2, "top.mydut_abc_comp_inst"))
            $display("matches re2");
        if (!uvm_re_match("abc", "top.mydut_abc_comp_inst"))
            $display("matches re3");
    end

endmodule
```
### NCsim输出
```
/^abc$/
/^.*abc.*$/
matches re2
matches re3
```