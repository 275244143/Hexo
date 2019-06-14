---
title: If-and-only-if约束
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-06-14 13:56:45
---

```verilog 
typedef bit [7:0] ubyte; 
class Packet extends some_useful_base_class; 

  rand ubyte addr[4]; 
  rand enum {BROADCAST, LOCAL, WAN} addr_kind; 

  constraint c_address_kind { 
     (addr_kind==BROADCAST) == (addr[0] == 255); 
     (addr_kind==LOCAL) ==  
       (   addr[0]==192 && addr[1]==168 
        || addr[0]==10  && addr[1]==0 
       ); 
    } 
endclass 
```
It may be of interest that we have avoided using implication constraints, which are of the form 
expr1 -> expr2, in the c_address_kind constraint. Instead we have insisted that the 
truth  values  of  two  comparison  operations  should  be  the  same,  using  an  "if  and  only  if" 
constraint of the form expr1 == expr2. To understand why this might be valuable, consider 
the implication constraint 

  ```verilog 
(addr_kind==BROADCAST) -> (addr[0] == 255); 
  ```
This constraint specifies that if addr_kind is BROADCAST, then addr[0] must be equal to 255.  However,  it  specifies  nothing  about  the  value  of  addr[0]  when  addr_kind  is  not BROADCAST.  It  would  therefore  be  possible  to  get  a  non-broadcast  packet  having addr[0]==255, which was not our intent. By contrast, the if-and-only-if formulation insists that  addr[0]  being  equal  to  255  is  exactly the  same  condition  as  addr_kind  being BROADCAST. 