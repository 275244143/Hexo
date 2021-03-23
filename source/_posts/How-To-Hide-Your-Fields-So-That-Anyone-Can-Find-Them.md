---
title: How To Hide Your Fields So That Anyone Can Find Them
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2021-03-23 17:00:59
---

In this post I will talk about how I am using the [OOP](https://en.wikipedia.org/wiki/Object-oriented_programming) concept of [Variable Shadowing](https://en.wikipedia.org/wiki/Variable_shadowing) to make the user interaction with VIPs much easier.

Every now and then I am asked to build an agent to be used by the entire team for some communication protocol, like the interface for accessing the registers of any module in a system.

First, I start from a very generic agent which implements all the common functionality of an agent (architecture, port connectivity, reset handling etc). You can take a look at such a generic agent I’ve implemented a couple of year ago [here](https://github.com/cristian-slav/cagt).
The classes of the actual agent I need to implement will extend from the generic agent classes. This saves me time for writing common agent code over and over again.

Let’s look at two components of this generic agent: agent configuration class and agent class.

The agent configuration class has some fields which are pretty common for any agent:

```verilog 
//agent configuration class
class agt_agent_config #(type VIRTUAL_INTF_TYPE=int) extends uvm_component;
   ...
   //switch to determine the active or the passive aspect of the agent
   protected uvm_active_passive_enum active_passive;

   //switch to determine if to enable or not the coverage
   protected bit has_coverage;

   //switch to determine if to enable or not the checks
   protected bit has_checks;
   ...
   `uvm_component_param_utils(agt_agent_config#(VIRTUAL_INTF_TYPE))
   ...
   function new(string name, uvm_component parent);
      super.new(name, parent);
   endfunction
   ...
endclass
```

The agent class creates the actual instance of the agent configuration and makes use of some fields declared in the agent:

```verilog
//agent class
class agt_agent #(
      type VIRTUAL_INTF_TYPE=int,
      type MONITOR_ITEM=uvm_object,
      type DRIVER_ITEM_REQ=uvm_sequence_item,
      type DRIVER_ITEM_RSP=DRIVER_ITEM_REQ) extends uvm_agent;

   //agent configuration
   agt_agent_config#(VIRTUAL_INTF_TYPE) agent_config;

   ...
   
   virtual function void build_phase(uvm_phase phase);
      super.build_phase(phase);
      ...
      agent_config = agt_agent_config#(VIRTUAL_INTF_TYPE)::type_id::create("agent_config ", this);
      ...
      if(agent_config.get_active_passive() == UVM_ACTIVE) begin
         driver = agt_driver#(VIRTUAL_INTF_TYPE, DRIVER_ITEM_REQ, DRIVER_ITEM_RSP)::type_id::create("driver", this);
         sequencer = agt_sequencer#(DRIVER_ITEM_REQ, DRIVER_ITEM_RSP)::type_id::create("sequencer", this);
      end

      if(agent_config.get_has_coverage() == 1) begin
         coverage = agt_coverage#(VIRTUAL_INTF_TYPE, MONITOR_ITEM)::type_id::create("coverage", this);
      end
      ...
   endfunction
   ...
endclass
```

This is pretty common code for any agent so it makes sense to have it written only once and reuse it over and over again.

Now let’s take a look at how the implementation for some specific protocol looks like.
First, there is the specific agent configuration class with the fields relavant for the physical protocol:

```verilog
class cfs_ahb_agent_config extends agt_agent_config #(cfs_ahb_vif_t);
   ...
   //Data bus width
   protected int unsigned data_width;
   ...
   `uvm_component_utils(cfs_ahb_agent_config)

   function new(string name = "", uvm_component parent);
      super.new(name, parent);
      ...
      data_width = 32;
   endfunction
   ...
endclass
```

In the agent class I am making use of UVM factory override to replace the type of agent configuration class:

```verilog
class cfs_ahb_agent extends agt_agent#(
         .VIRTUAL_INTF_TYPE(cfs_ahb_vif_t),
         .MONITOR_ITEM(cfs_ahb_mon_item),
         .DRIVER_ITEM_REQ(cfs_ahb_drv_item));
   ...
   `uvm_component_utils(cfs_ahb_agent)
   
   function new(string name = "", uvm_component parent);
      super.new(name, parent);
      agt_agent_config::type_id::set_inst_override(cfs_ahb_agent_config::get_type(), "agent_config", this);
      ...
   endfunction
endclass
```

At this point I can safely deliver the agent to all the users in the team.

However, over the time I noticed a common complain from the users of my agents written in this way.

Here is a very common declaration of the agent and some configuration:

```verilog
class acme_env extends uvm_component;
   ...
   //Handler to the AHB agent
   cfs_ahb_agent ahb_agent;
   ...
   `uvm_component_utils(acme_env)

   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
      ...
      //this line works OK
      ahb_agent.agent_config.set_has_checks(1);
     
     //this line gives a compilation error
     ahb_agent.agent_config.set_data_width(16);
     ...
   endfunction
   ...
endclass
```

The problem with line 15 from above it that the declaration of **agent_config** is of type **agt_agent_config#(cfs_ahb_vif)** and only through UVM factory override it is allocated to a type of **cfs_ahb_agent_config**. This means that accessing any AHB specific configuration must be done after casting.

> It is too annoying to have to do type casting every time I want to configure something for the AHB agent!

So my initial solution was to create a reference in the AHB agent of correct type:

```verilog
class cfs_ahb_agent extends agt_agent#(
         .VIRTUAL_INTF_TYPE(cfs_ahb_vif_t),
         .MONITOR_ITEM(cfs_ahb_mon_item),
         .DRIVER_ITEM_REQ(cfs_ahb_drv_item));
   ...
   cfs_ahb_agent_config casted_agent_config;
   ...
   `uvm_component_utils(cfs_ahb_agent)
   
   function new(string name = "", uvm_component parent);
      super.new(name, parent);
      agt_agent_config::type_id::set_inst_override(cfs_ahb_agent_config::get_type(), "agent_config", this);
      ...
   endfunction
   ...
   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
      ...
      if($cast(casted_agent_config, agent_config) == 0) begin
         `uvm_fatal("ALGORITHM_ISSUE", "Could not cast")
      end
      ...
   endfunction
endclass
```

Now the user code would simply work like so:

```verilog
class acme_env extends uvm_component;
   ...
   //Handler to the AHB agent
   cfs_ahb_agent ahb_agent;
   ...
   `uvm_component_utils(acme_env)

   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
      ...
      ahb_agent.agent_config.set_has_checks(1);
     
     //AHB specific fields can be accessed through the new pointer
     ahb_agent.casted_agent_config.set_data_width(16);
     ...
   endfunction
   ...
endclass
```

That was a step forward but still, the general feedback I’ve got was that it was confusing to have **agent_config** and **casted_agent_config**. Some simulators will show in the UVM tree only the actual component name: “agent_config”. When to use **agent_config** and when to use **casted_agent_config**?

So at this point I realized that I can simply use the same name for my casted agent configuration declaration:

```verilog 
class cfs_ahb_agent extends agt_agent#(
         .VIRTUAL_INTF_TYPE(cfs_ahb_vif_t),
         .MONITOR_ITEM(cfs_ahb_mon_item),
         .DRIVER_ITEM_REQ(cfs_ahb_drv_item));
   ...
   cfs_ahb_agent_config agent_config;
   ...
   `uvm_component_utils(cfs_ahb_agent)
   
   function new(string name = "", uvm_component parent);
      super.new(name, parent);
      agt_agent_config::type_id::set_inst_override(cfs_ahb_agent_config::get_type(), "agent_config", this);
      ...
   endfunction
   ...
   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
      ...
      if($cast(agent_config, super.agent_config) == 0) begin
         `uvm_fatal("ALGORITHM_ISSUE", "Could not cast")
      end
      ...
   endfunction
endclass
```

Until now I always payed attention to not have fields with the same name in the child class as in the parent class but for this use-case this works great. The user code gets simpler:

```verilog
class acme_env extends uvm_component;
   ...
   virtual function void connect_phase(uvm_phase phase);
      super.connect_phase(phase);
      ...
      //same as before
      ahb_agent.agent_config.set_has_checks(1);
     
     //this agent config field is the one declared in the AHB agent
     //but the user should not care about this
     ahb_agent.agent_config.set_data_width(16);
     ...
   endfunction
   ...
endclass
```

This technique of declaring two fields with the same name in parent and child class is called [Variable Shadowing](https://en.wikipedia.org/wiki/Variable_shadowing). So far I tried to stay away from it but for this scenario I think it works quite well.



### ANS

<u>Better advice: avoid fields altogether.</u>

<u>Instead of a public field for the agent config, you could use a public function to return it: ‘virtual function base_config config()’. In the extended class you can use covariant return types to change the return type to ‘virtual function extended _config config()’. This avoids the data hiding issue.</u>

