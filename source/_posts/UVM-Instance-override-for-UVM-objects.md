---
title: UVM Instance override for UVM objects
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-01-25 18:45:48
---

### QA

what is the right way to override a uvm_object with instance override?

I have an extended transaction which will override the original transaction.



```verilog
  ext_trans = extended_transaction::type_id::create("ext_trans",,"hola");
```


In base test, i have this. This doesnt seem to be working. I understand object is not part of UVM TB. It would be great if some one can show me the right syntax for this. Type specific override works fine.



### ANS

When calling trans = transaction::type_id::create("trans"); with just one argument, there is no context for an instance override. You can provide a context by adding second argument **this**, which uses the current components path, or provide a third argument which defines an *absolute path* string.

In your base_test, you call set_inst_override_by_type(), which is a method of uvm_component. It is expecting to see a relative path from the current component, and the top level test is always "uvm_test_top.

So you need to coordinate your overrides by whether you want to be setting instances overrides using the existing testbench hierarchy, or some arbitrary path names

Using existing hierarchy:

```verilog
trans = transaction::type_id::create("trans",this);
...
set_inst_override_by_type ("env.trans",transaction::get_type(),extended_transaction::get_type());
```


Using absolute path strings:

```verilog
trans = transaction::type_id::create("trans",,"hola");
...
transaction::type_id::set_inst_override(extended_transaction::get_type(),"hola.trans");
```

