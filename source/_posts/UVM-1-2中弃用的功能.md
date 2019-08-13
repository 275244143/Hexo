---
title: UVM-1.2中弃用的功能
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-08-13 09:18:49
---

There are many features which are deprecated in latest ***UVM 1.2 standard***. If you’re switching to use UVM 1.2 in your projects, its a MUST not to use following methods, variables, macros & parameters in your code & update your UVM 1.1/UVM 1.0 code to comply with the new UVM 1.2 standards.

In the same direction, I thought, it will be helpful to list down the primary deprecated features in UVM 1.2 to get a quick look:

#### Methods:

1. set_config_int
2. set_config_string
3. set_config_object
4. get_config_int
5. get_config_string
6. get_config_object
7. uvm_component::status
8. uvm_component::kill
9. uvm_component::do_kill_all
10. uvm_component::stop_phase
11. stop_request
12. global_stop_request
13. set_global_timeout
14. stop_timeout
15. set_global_stop_timeout
16. uvm_sequencer_base::add_sequence
17. uvm_sequencer_base::get_seq_kind
18. uvm_sequencer_base::get_sequence

#### Variables:

1. uvm_test_done
2. enable_stop_interrupt

#### Macros:

1. `uvm_sequence_utils
2. `uvm_declare_sequence_lib
3. `uvm_update_sequence_lib

#### Configurable Database Parameters:

1. default_sequence
2. count
3. max_random_count
4. max_random_depth