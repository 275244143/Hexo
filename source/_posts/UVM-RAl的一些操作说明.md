---
title: UVM RAl的一些操作说明
author: 神秘人
tags:
  - UVM
  - SystemVerilog
  - RAL
categories:
  - 验证
mathjax: false
date: 2021-07-29 13:58:59
---

**0.** **引言**(转载)

在UVM支持的寄存器操作中，有get、update、mirror、write等等一些方法，在这里整理一下他们的用法。

寄存器模型中的寄存器值应该与DUT保持同步，但是由于DUT的值是实时更新的，所以寄存器模型并不能实时知道这种更新，**在寄存器模型中专门有个值来尽可能与****DUT****中寄存器的值保持一致，叫镜像值（****mirrorred value****）。寄存器模型中还有一个值叫期望值（****respected value****），这个值保存我们希望写入寄存器的值。**比如希望向DUT某个寄存器写入'h1，用set函数设置期望值，然后用update任务（update会比较镜像值和期望值，如果不一样，将期望值写入DUT，并更新镜像值）。

 

**1.**  **函数**

**1.1 set** 

|      | virtual function void set ( uvm_reg_data_t  value,   string     fname    =  "",int  lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**设置模型中寄存器的期望值，不会改变****DUT****中这个寄存器的值。**

**1.2 get**

|      | virtual function uvm_reg_data_t get(    string  fname    =  "", int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**返回模型中寄存器的期望值，而不是****DUT****中的寄存器值**。

**1.3 get_mirrored_value**

|      | virtual function uvm_reg_data_t get_mirrored_value( string  fname    =  "", int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

返回模型中寄存器的镜像值。

**1.4 get_reset**

|      | virtual function uvm_reg_data_t get_reset(  string  kind     =  "HARD"  ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

返回寄存器的复位值。

**1.5 predict**

|      | virtual function bit predict (  uvm_reg_data_t  value,     uvm_reg_byte_en_t     be   =  -1,uvm_predict_e     kind     =  UVM_PREDICT_DIRECT,uvm_path_e    path     =  UVM_FRONTDOOR,uvm_reg_map   map  =  null,string    fname    =  "",int   lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**更新模型中的镜像值。**新的镜像值通过value参数传入。

**当在****DUT****中实现一个计数器的时候，模型中的计数器是静止的。如果想在模型中得到****DUT****的技术值，这就需要手动更新镜像值，又不能对****DUT****进行操作，这可以通过****predict****函数。**

第三个参数是uvm_predict_e枚举类型，他有如下三个元素：

| UVM_PREDICT_DIRECT | Predicted value is as-is                                 |
| ------------------ | -------------------------------------------------------- |
| UVM_PREDICT_READ   | Predict based on the specified value having been read    |
| UVM_PREDICT_WRITE  | Predict based on the specified value having been written |

如果想要更新镜像值又不对DUT进行操作，要用UVM_PREDICT_DIRECT。

**write****、****read****、****peek****和****poke****在完成对****DUT****的读写之后也会调用这个函数，更新镜像值。**

**1.6 randomize**

无论是uvm_reg，还是uvm_field、uvm_block，都是支持randomize（）。

|      | assert(rm.invert.reg_data.randomize());assert(rm.invert.randomize());assert(rm.randomize()): |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**当寄存器随机化后，期望值会被随机，但是镜像值不变，之后调用****update****任务，可以更新****DUT****中的寄存器值。**

但是一个field能够被随机化，需要：

\1. 在filed的configure第八个参数设为1.

\2. filed为rand类型。

\3. filed的读写类型为可写的。

 

**2.** **任务**

**2.1  update**

|      | virtual task update(    output  uvm_status_e    status,    input     uvm_path_e  path     =  UVM_DEFAULT_PATH,input     uvm_reg_map     map  =  null,input     uvm_sequence_base   parent   =  null,input     int     prior    =  -1,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**将模型中的期望值更新到****DUT****中。改变****DUT****中的寄存器。**update会检查模型中的期望值和镜像值，如果两者不相等，那么将期望值更新到DUT中，并且更新镜像值。update与mirror操作相反。

**如果镜像值和期望值相同，那么不会写****DUT****寄存器，也就不会产生总线****transaction****。**

**2.2 mirror**

|      | virtual task mirror(    output  uvm_status_e    status,    input     uvm_check_e     check    =  UVM_NO_CHECK,input     uvm_path_e  path     =  UVM_DEFAULT_PATH,input     uvm_reg_map     map  =  null,input     uvm_sequence_base   parent   =  null,input     int     prior    =  -1,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**读****DUT****中寄存器的值，与****update****操作相反。**如果第二个参数check为UVM_CHECK，那么会检查读取的值与镜像值是否一样，如果不一样报错。通过mirror读取DUT的寄存器值之后，会调用predict函数，更新镜像值。

mirror有两种应用场景：一是在仿真中不断调用，但此时是UVM_NO_CHECK，保证镜像值与DUT中的值相等；二是在仿真结束的时候调用，这时是UVM_CHECK检查模型中的镜像值与DUT中的寄存器值是否一致。

**2.3 write**

|      | virtual task write( output  uvm_status_e    status,    input     uvm_reg_data_t  value,     input     uvm_path_e  path     =  UVM_DEFAULT_PATH,input     uvm_reg_map     map  =  null,input     uvm_sequence_base   parent   =  null,input     int     prior    =  -1,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

模仿DUT的行为，通过前门或者后门方式向DUT中写入寄存器值，**会产生总线****transaction**。并且调用predict更新镜像值。

uvm_path_e定义寄存器操作类型，如下：

| UVM_FRONTDOOR    | Use the front door                                           |
| ---------------- | ------------------------------------------------------------ |
| UVM_BACKDOOR     | Use the back door                                            |
| UVM_PREDICT      | Operation derived from observations by a bus monitor via the uvm_reg_predictor class. |
| UVM_DEFAULT_PATH | Operation specified by the context                           |

我在使用中，**如果用****set_auto_predict(1)——****采取自动更行镜像值的方式，****write****之后，调用****get****和****get_mirrored_value****都能得到新写入的值。**

**如果关闭****auto_predict****，用****uvm_reg_predict****来更新镜像值，我在在使用中****write****之后，调用****get****和****get_mirrored_value****得到****0**。

如果是read任务，那么无论是auto_predict还是uvm_reg_predict都会自动更新镜像值和期望值。

链接：https://github.com/east1203/uvm_codes/tree/master/tb1_wd/a.uvm_reg_predict

**2.4 read**

|      | virtual task read(  output  uvm_status_e    status,    output    uvm_reg_data_t  value,     input     uvm_path_e  path     =  UVM_DEFAULT_PATH,input     uvm_reg_map     map  =  null,input     uvm_sequence_base   parent   =  null,input     int     prior    =  -1,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**模仿****DUT****的行为，通过前门或者后门方式读取****DUT****中寄存器的值，并更新镜像值，会产生总线****transaction**。

**2.5 peek**

|      | virtual task poke(  output  uvm_status_e    status,    input     uvm_reg_data_t  value,     input     string  kind     =  "",input     uvm_sequence_base   parent   =  null,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**通过后门访问方式读取寄存器的值，不关心****DUT****的行为，即使寄存器的读写类型是不能读，也可以将值读出来**。

 　　对于read clear类型的field，peek读操作不会clear。所以有的时候peek和read操作结果不一样

**2.6 poke**

|      | virtual task peek(  output  uvm_status_e    status,    output    uvm_reg_data_t  value,     input     string  kind     =  "",input     uvm_sequence_base   parent   =  null,input     uvm_object  extension    =  null,input     string  fname    =  "",input     int     lineno   =  0   ) |
| ---- | ------------------------------------------------------------ |
|      |                                                              |

**通过后门访问方式写入寄存器的值，不关心****DUT****的行为，即使寄存器的读写类型是不能写，也可以将值写进去**。

 　　对于write clear类型的filed，poke操作不会clear，所以有的时候poke和write操作结果不一样。