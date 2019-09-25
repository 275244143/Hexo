---
title: 采用策略模式进行UVM-PORT-DEBUG
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-09-25 15:45:14
password: 2102141
abstract: 欢迎光临~
message: ~友情QQ红包，发送密码~
---

####  采用策略方法进行debug

```verilog
// CLASS: uvmf_analysis_debug
// This class applies a debug policy to the component hiearchy.
//
// PARAMETERS:
//      POLICY - The standard debug policy.

class uvmf_analysis_debug #( type POLICY = uvmf_standard_port_debug_policy );

  // FUNCTION: uvmf_analysis_debug
  static function void uvmf_analysis_debug( uvm_component parent );
    uvm_component child;
    string name;
    bit ok;

    for( ok = parent.get_first_child( name ); ok; ok =  parent.get_next_child( name ) ) begin
      child = parent.get_child( name );
      POLICY::debug( child );
      uvmf_analysis_debug( child );
    end
  endfunction
endclass
```

```verilog
// CLASS: uvmf_standard_port_debug_policy
// This class defines a policy used to analyze analysis port connections
// and identify unconnected analysis ports.
class uvmf_standard_port_debug_policy;

  // FUNCTION: debug
  static function void debug( uvm_component c );
    uvm_port_component_base pc;

    assert( c != null );
    
    if( !$cast( pc , c ) ) return;
    
    assert( pc != null );
    
    if( !info_filter( pc ) ) return;
    
    generate_info( pc );
    
    if( !warning_filter( pc ) ) return;
    
    generate_warning( pc );
  endfunction

  // FUNCTION: info_filter
  static function bit info_filter( uvm_port_component_base pc );
    assert( pc != null );
    return pc.is_port();
  endfunction


  // FUNCTION: generate_info
  static function void generate_info( uvm_port_component_base pc );
    `uvm_info("POLICY" , {"Found port: ",pc.get_full_name()} , UVM_MEDIUM );
  endfunction

  // FUNCTION: warning_filter
  static function bit warning_filter( uvm_port_component_base pc );
    uvm_port_list l;

    pc.get_connected_to( l );
    
    return l.size() == 0;
  endfunction

  // FUNCTION: generate_warning
  static function void generate_warning( uvm_port_component_base pc );
    `uvm_warning( "POLICY" , {"Unconnected port: ",pc.get_full_name()} )
  endfunction

endclass : uvmf_standard_port_debug_policy
```