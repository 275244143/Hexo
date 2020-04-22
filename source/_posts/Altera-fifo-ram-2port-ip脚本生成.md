---
title: Altera fifo/ram_2port ip脚本生成
author: 神秘人
tags:
  - bash
  - Altera
categories:
  - FPGA
mathjax: false
date: 2020-04-22 16:26:21
---

## fifo

```shell
#! /usr/bin/env bash
#//============================================================================
#     FileName: ipgen_fifo.sh
#         Desc: 采用GPL许可版权，请注意版权使用～
#   LastChange: 2020-04-21 16:00:47
#      History: 1. 增加双时钟以及ram类型
#//============================================================================

#set -x
read -p "Setting Quartus install path(default:/home/soft/Quartus-pro-19.3): " quartus_path
read -p "Setting Device name(default:1SG280LN2F43E1VG): " device_name
read -p "Setting Device Family name(default:Stratix 10): " device_family
read -p "Setting fifo name(default:fifo_d64_inw8_outw8): " fifo_name
read -p "Setting fifo clock_type(default:1 => 0:single,1:double): " clock_type
read -p "Setting fifo depth(default:64): " fifo_depth
read -p "Setting fifo in data width(default:8): " fifo_din_width
read -p "Setting fifo out data width(default:8): " fifo_dout_width
read -p "Setting fifo almost_full(default:0): " almost_full
read -p "Setting fifo almost_empty(default:0): " almost_empty
read -p "Setting fifo ram_block_type(default:Auto(MLAB,M20K,M144K)): " ram_block_type

echo "################################"
echo "Generate FIFOName:${fifo_name:=fifo_d64_inw8_outw8}
         ClockType:${clock_type:=1}
         Depth:${fifo_depth:=64}
         InDataWidth:${fifo_din_width:=8}
         OutDataWidth:${fifo_dout_width:=8}
         AlmostFull:${almost_full:=0}
         AlmostEmpty:${almost_empty:=0}
         ram_block_type:${ram_block_type:=Auto}
         QuartusPath:${quartus_path:=/home/soft/Quartus-pro-19.3}
         DeviceName:${device_name:=1SG280LN2F43E1VG}
         DeviceFamily:${device_family:=Stratix 10}"
echo "################################"


cat > ${fifo_name}.tcl << __EOF__
package require -exact qsys 18.0

proc do_create_${fifo_name} {} {
	# create the system
	create_system ${fifo_name}
	set_project_property DEVICE {${device_name}}
	set_project_property DEVICE_FAMILY {${device_family}}
	set_project_property HIDE_FROM_IP_CATALOG {false}
	set_use_testbench_naming_pattern 0 {}

	# add the components
	add_component fifo ip/${fifo_name}/${fifo_name}_fifo.ip fifo fifo 19.1
	load_component fifo
	set_component_parameter_value GUI_AlmostEmpty {${almost_empty}}
	set_component_parameter_value GUI_AlmostEmptyThr {1}
	set_component_parameter_value GUI_AlmostFull {${almost_full}}
	set_component_parameter_value GUI_AlmostFullThr {1}
	set_component_parameter_value GUI_CLOCKS_ARE_SYNCHRONIZED {0}
	set_component_parameter_value GUI_Clock {${clock_type}}
	set_component_parameter_value GUI_DISABLE_DCFIFO_EMBEDDED_TIMING_CONSTRAINT {1}
	set_component_parameter_value GUI_Depth {${fifo_depth}}
	set_component_parameter_value GUI_ENABLE_ECC {0}
	set_component_parameter_value GUI_Empty {1}
	set_component_parameter_value GUI_Full {1}
	set_component_parameter_value GUI_LE_BasedFIFO {0}
	set_component_parameter_value GUI_LegacyRREQ {1}
	set_component_parameter_value GUI_MAX_DEPTH {Auto}
	set_component_parameter_value GUI_MAX_DEPTH_BY_9 {0}
	set_component_parameter_value GUI_OVERFLOW_CHECKING {0}
	set_component_parameter_value GUI_Optimize {0}
	set_component_parameter_value GUI_Optimize_max {0}
	set_component_parameter_value GUI_RAM_BLOCK_TYPE {${ram_block_type}}
	set_component_parameter_value GUI_TESTBENCH {0}
	set_component_parameter_value GUI_UNDERFLOW_CHECKING {0}
	set_component_parameter_value GUI_UsedW {1}
	set_component_parameter_value GUI_Width {${fifo_din_width}}
	set_component_parameter_value GUI_dc_aclr {0}
	set_component_parameter_value GUI_delaypipe {4}
	set_component_parameter_value GUI_diff_widths {0}
	set_component_parameter_value GUI_msb_usedw {0}
	set_component_parameter_value GUI_output_width {${fifo_dout_width}}
	set_component_parameter_value GUI_read_aclr_synch {0}
	set_component_parameter_value GUI_rsEmpty {1}
	set_component_parameter_value GUI_rsFull {0}
	set_component_parameter_value GUI_rsUsedW {0}
	set_component_parameter_value GUI_sc_aclr {0}
	set_component_parameter_value GUI_sc_sclr {0}
	set_component_parameter_value GUI_synStage {3}
	set_component_parameter_value GUI_write_aclr_synch {0}
	set_component_parameter_value GUI_wsEmpty {0}
	set_component_parameter_value GUI_wsFull {1}
	set_component_parameter_value GUI_wsUsedW {0}
	set_component_project_property HIDE_FROM_IP_CATALOG {false}
	save_component
	load_instantiation fifo
	
	# set the the module properties
	set_module_property BONUS_DATA {<?xml version="1.0" encoding="UTF-8"?>
<bonusData>
 <element __value="fifo">
  <datum __value="_sortIndex" value="2" type="int" />
  <datum __value="sopceditor_expanded" value="1" type="boolean" />
 </element>
</bonusData>
}
	set_module_property FILE {${fifo_name}.qsys}
	set_module_property GENERATION_ID {0x00000000}
	set_module_property NAME {${fifo_name}}

	# save the system
	sync_sysinfo_parameters
	save_system ${fifo_name}
}

# create all the systems, from bottom up
do_create_${fifo_name}

__EOF__


if [[ -e "${fifo_name}.qpf" ]]; then
    ${quartus_path}/qsys/bin/qsys-script --script=${fifo_name}.tcl --quartus-project=${fifo_name}.qpf
else
    ${quartus_path}/qsys/bin/qsys-script --script=${fifo_name}.tcl --new-quartus-project=${fifo_name}.qpf
fi
${quartus_path}/qsys/bin/qsys-generate ${fifo_name}.qsys  --simulation --synthesis --testbench --testbench-simulation --parallel --quartus-project=${fifo_name}.qpf

rm -rf ./${fifo_name}* ./qdb
echo "##########################################################"
echo "FIFO IP Finish:${fifo_name} is in ./ip/${fifo_name}"
echo "##########################################################"
```

## ram_2port
```shell
#! /usr/bin/env bash
#//============================================================================
#     FileName: ipgen_ram_2port.sh
#         Desc: 采用GPL许可版权，请注意版权使用～
#      Version: 0.0.1
#   LastChange: 2020-04-21 16:00:47
#      History: 1. 增加双时钟以及ram类型
#//============================================================================

#set -xf
read -p "Setting Quartus install path(default:/home/soft/Quartus-pro-19.3): " quartus_path
read -p "Setting Device name(default:1SG280LN2F43E1VG): " device_name
read -p "Setting Device Family name(default:Stratix 10): " device_family
read -p "Setting ram_2port name(default:ram2p_dw8_mword32_mbit256_qab8): " ram_2port_name
read -p "Setting ram_2port CLOCK_TYPE(default:1 => 0:single,1:double): " clock_type
read -p "Setting ram_2port DATAA_WIDTH(default:8): " dataa_width
read -p "Setting ram_2port QA_WIDTH(default:8): " qa_width
read -p "Setting ram_2port MEMSIZE_WORDS(default:32): " memsize_words
read -p "Setting ram_2port MEMSIZE_BITS(default:256): " memsize_bits
read -p "Setting ram_2port RAM_BLOCK_TYPE(default:Auto(MLAB,M20K,LCs)): " ram_block_type

echo "################################"
echo "Generate RAM_2PORTName:${ram_2port_name:=ram2p_dw8_mword32_mbit256_qab8}
         CLOCK_TYPE:${clock_type:=1}
         DATAA_WIDTH:${dataa_width:=8}
         QA_WIDTH:${qa_width:=8}
         MEMSIZE_WORDS:${memsize_words:=32}
         MEMSIZE_BITS:${memsize_bits:=256}
         RAM_BLOCK_TYPE:${ram_block_type:=Auto}
         QuartusPath:${quartus_path:=/home/soft/Quartus-pro-19.3}
         DeviceName:${device_name:=1SG280LN2F43E1VG}
         DeviceFamily:${device_family:=Stratix 10}"
echo "################################"


cat > ${ram_2port_name}.tcl << __EOF__

package require -exact qsys 18.0

proc do_create_${ram_2port_name} {} {
	# create the system
	create_system ${ram_2port_name}
	set_project_property DEVICE {${device_name}}
	set_project_property DEVICE_FAMILY {${device_family}}
	set_project_property HIDE_FROM_IP_CATALOG {false}
	set_use_testbench_naming_pattern 0 {}

	# add the components
	add_component ram_2port ip/${ram_2port_name}/${ram_2port_name}_ram_2port.ip ram_2port ram_2port 19.2.0
	load_component ram_2port
	set_component_parameter_value GUI_ACLR_READ_INPUT_RDADDRESS {0}
	set_component_parameter_value GUI_ACLR_READ_OUTPUT_QA {0}
	set_component_parameter_value GUI_ACLR_READ_OUTPUT_QB {0}
	set_component_parameter_value GUI_BLANK_MEMORY {0}
	set_component_parameter_value GUI_BYTE_ENABLE_A {0}
	set_component_parameter_value GUI_BYTE_ENABLE_B {0}
	set_component_parameter_value GUI_BYTE_ENABLE_WIDTH {8}
	set_component_parameter_value GUI_CLKEN_ADDRESS_STALL_A {0}
	set_component_parameter_value GUI_CLKEN_ADDRESS_STALL_B {0}
	set_component_parameter_value GUI_CLKEN_INPUT_REG_A {0}
	set_component_parameter_value GUI_CLKEN_INPUT_REG_B {0}
	set_component_parameter_value GUI_CLKEN_OUTPUT_REG_A {0}
	set_component_parameter_value GUI_CLKEN_OUTPUT_REG_B {0}
	set_component_parameter_value GUI_CLKEN_RDADDRESSSTALL {0}
	set_component_parameter_value GUI_CLKEN_READ_INPUT_REG {0}
	set_component_parameter_value GUI_CLKEN_READ_OUTPUT_REG {0}
	set_component_parameter_value GUI_CLKEN_WRADDRESSSTALL {0}
	set_component_parameter_value GUI_CLKEN_WRITE_INPUT_REG {0}
	set_component_parameter_value GUI_CLOCK_TYPE {${clock_type}}
	set_component_parameter_value GUI_COHERENT_READ {0}
	set_component_parameter_value GUI_CONSTRAINED_DONT_CARE {1}
	set_component_parameter_value GUI_DATAA_WIDTH {${dataa_width}}
	set_component_parameter_value GUI_DIFFERENT_CLKENS {0}
	set_component_parameter_value GUI_ECCENCBYPASS {0}
	set_component_parameter_value GUI_ECC_DOUBLE {0}
	set_component_parameter_value GUI_ECC_PIPELINE {0}
	set_component_parameter_value GUI_ECC_TRIPLE {0}
	set_component_parameter_value GUI_FILE_REFERENCE {0}
	set_component_parameter_value GUI_FORCE_TO_ZERO {0}
	set_component_parameter_value GUI_INIT_FILE_LAYOUT {PORT_B}
	set_component_parameter_value GUI_INIT_SIM_TO_X {0}
	set_component_parameter_value GUI_LC_IMPLEMENTION_OPTIONS {0}
	set_component_parameter_value GUI_MAX_DEPTH {Auto}
	set_component_parameter_value GUI_MEMSIZE_BITS {${memsize_bits}}
	set_component_parameter_value GUI_MEMSIZE_WORDS {${memsize_words}}
	set_component_parameter_value GUI_MEM_IN_BITS {0}
	set_component_parameter_value GUI_MIF_FILENAME {}
	set_component_parameter_value GUI_MODE {0}
	set_component_parameter_value GUI_NBE_A {1}
	set_component_parameter_value GUI_NBE_B {1}
	set_component_parameter_value GUI_OPTIMIZATION_OPTION {0}
	set_component_parameter_value GUI_PR {0}
	set_component_parameter_value GUI_QA_WIDTH {${qa_width}}
	set_component_parameter_value GUI_QB_WIDTH {${qa_width}}
	set_component_parameter_value GUI_Q_PORT_MODE {2}
	set_component_parameter_value GUI_RAM_BLOCK_TYPE {${ram_block_type}}
	set_component_parameter_value GUI_RDEN_DOUBLE {0}
	set_component_parameter_value GUI_RDEN_SINGLE {0}
	set_component_parameter_value GUI_RDW_A_MODE {New Data}
	set_component_parameter_value GUI_RDW_B_MODE {New Data}
	set_component_parameter_value GUI_READ_INPUT_RDADDRESS {1}
	set_component_parameter_value GUI_READ_OUTPUT_QA {1}
	set_component_parameter_value GUI_READ_OUTPUT_QB {1}
	set_component_parameter_value GUI_SCLR_READ_OUTPUT_QA {0}
	set_component_parameter_value GUI_SCLR_READ_OUTPUT_QB {0}
	set_component_parameter_value GUI_TBENCH {0}
	set_component_parameter_value GUI_TDP_EMULATE {0}
	set_component_parameter_value GUI_VAR_WIDTH {0}
	set_component_parameter_value GUI_WIDTH_ECCENCPARITY {8}
	set_component_parameter_value GUI_WRITE_INPUT_PORTS {1}
	set_component_project_property HIDE_FROM_IP_CATALOG {false}
	save_component
	load_instantiation ram_2port
	
	# set the the module properties
	set_module_property BONUS_DATA {<?xml version="1.0" encoding="UTF-8"?>
<bonusData>
 <element __value="ram_2port">
  <datum __value="_sortIndex" value="2" type="int" />
 </element>
</bonusData>
}
	set_module_property FILE {${ram_2port_name}.qsys}
	set_module_property GENERATION_ID {0x00000000}
	set_module_property NAME {${ram_2port_name}}

	# save the system
	sync_sysinfo_parameters
	save_system ${ram_2port_name}
}

# create all the systems, from bottom up
do_create_${ram_2port_name}


__EOF__


if [[ -e "${ram_2port_name}.qpf" ]]; then
    ${quartus_path}/qsys/bin/qsys-script --script=${ram_2port_name}.tcl --quartus-project=${ram_2port_name}.qpf
else
    ${quartus_path}/qsys/bin/qsys-script --script=${ram_2port_name}.tcl --new-quartus-project=${ram_2port_name}.qpf
fi
${quartus_path}/qsys/bin/qsys-generate ${ram_2port_name}.qsys  --simulation --synthesis --testbench --testbench-simulation --parallel --quartus-project=${ram_2port_name}.qpf

rm -rf ./${ram_2port_name}* ./qdb
echo "##########################################################"
echo "RAM_2PORT IP Finish:${ram_2port_name} is in ./ip/${ram_2port_name}"
echo "##########################################################"
```