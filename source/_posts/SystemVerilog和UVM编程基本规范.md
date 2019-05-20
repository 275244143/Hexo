---
title: SystemVerilog和UVM编程基本规范
author: 神秘人
tags:
  - UVM
  - SystemVerilog
categories:
  - 验证
mathjax: false
date: 2019-05-20 09:44:52
---

## UVM-SV验证代码规范

#### 词汇指南和命名约定

+ 每行只有一个声明或定义。

+ 为 SystemVerilog 变量和类创建用户定义的名称时，请使用以下划线分隔的小写单词。

+ 为 SystemVerilog 枚举文字，常量和参数创建用户定义的名称时，请使用以下划线分隔的
  大写单词。

+ 将所有用户定义的 UVM 实例名称（即组件实例名称等字符串）限制为字符集 a-z，A-Z，0-9 和_（下划线）。

+ 对局部变量使用较短的名称，对类名和包名等全局项使用更长，更具描述性的名称。

+ 在用户定义的类成员变量的名称之前使用前缀 m_（在 SystemVerilog 中官方称为类属性）

+ 在每个 agent 中分别使用名称 m_sequencer，m_driver 和 m_monitor 作为 sequencer，driver
  和 monitor 的实例名称。

+ 分别在每个 env 和 agent 的实例名后面加上后缀_env 和_agent。

+ 使用名称 m_config 作为具有一个组件或 sequence 的配置对象的实例名称。

+ 在用户定义的配置类名后使用后缀_config。

+ 在用户定义的 port 名称后使用后缀_port。

+ 在用户定义的 export 名称后使用后缀_export。

+ 在用户定义的虚拟接口名称后使用后缀_vif。

+ 使用关键字 typedef 引入的用户定义类型定义后，使用后缀_t。

+ 在用户定义的软件包名称后使用后缀_pkg。

+ 在任何可以为源代码增加价值的地方写评论，并帮助读者理解代码的用途。

+ 在有助于使代码更具可读性的任何地方包括空格（空行，缩进）。

+ 覆盖内置 UVM 虚拟方法时，请勿在重写方法定义的开头插入 virtual 关键字。

#### 一般准则

+ 不要使用在 UVM 类参考或基类库中特别标记为已弃用的 UVM 功能。

+ 请勿使用 UVM 类参考中未记录的 UVM 基类库代码的内部功能。

#### 通用代码结构

+ 在构建和编码验证环境时，主要考虑重用。

+ 始终使用一致的文件结构和一致的文件命名约定。

+ 每个类都应该在一个包中定义（而不是在模块或文件范围内定义类）。

+ 在包中使用`include 指令允许将每个类放在一个单独的文件中。

+ 使用条件编译保护措施避免多次编译同一个包含文件。

+ 不要在编译单元范围内使用通配符导入。

+ 包含 uvm_macros.svh 并在引用 UVM 基类库的每个包或模块中导入 uvm_pkg :: *。

+ 每个接口使用一个 agent ，带有 passive monitor 和可选的 sequence 和 driver ，其存
  在性由类 uvm_agent 的 get_is_active 方法的值决定。

+ agent 不应实例化除一个 sequencer，一个 driver 和一个 monitor 的规范 agent 结构之
  外的组件。

+ 使用虚拟 sequence 协调多个并行 agent 的激励生成活动。

+ 检查和功能覆盖收集应在检查器，记分板，覆盖收集器和其他临时订户组件中执行，这些
  组件在任何 agent 外部实例化并连接到 monitor 的 analysis port。

+ 通常使用 analysis port 和 export 连接 agent，检查器，记分板和 coverage 收集器。

+ 应编写 UVM 环境，使其可用作顶级环境，或在其他较大的验证环境中作为子环境重复使
  用。

+ 使用 factory 覆盖和/或配置数据库，使重新调整的 UVM 组件的行为适应新验证环境的需
  要。

+ 顶级模块应设置由测试检索的配置参数，测试应设置 env 检索的参数，并且 env 应设置由
  较低级别的 env 或 agent 检索的参数。

+ 通过使用多个 sequencer 来表示分层协议，每个 sequencer 都有自己的 transaction 类型。

#### 时钟、定时、同步和接口

+ 在 SystemVerilog 的 module 中生成时钟和复位，而从不在基于 UVM class 的验证环境中，也从不在 SystemVerilog program 中生成。否则，SystemVerilog scheduler 可能会给出不正确的行为。

+ 优先使用 SystemVerilog module，而不是 SystemVerilog program。

+ 使用 SystemVerilog 接口内的 clocking block 来检测和驱动一个同步 DUT 接口。

+ 使用 modports 强制使用时钟块，通过 UVM 验证环境中的虚拟接口访问这些时钟块。

+ 使用将 clocking block 与异步信号组合在一起的 modports，以访问同时包含同步和异步信
  号的接口。

+ 尽可能确保 DUT 接口信号与 driver 和 monitor 的精确延时。

+ 如果一个 driver 在驱动 DUT 接口时需要在 transaction 之间或者 transaction 内插入可变
  延迟，那么这个可变延迟应当存储在 transaction 中传递给 driver。

+ driver 应使用非阻塞 try_ *方法从 sequencer 中获取 transaction，以便在作者无法知道
  sequence 是否会阻塞 driver 执行的情况下最大限度地提高可重用性。

+ driver 只应在需要时从 sequencer 中提取 transaction。

+ 使用 uvm_event 或 uvm_barrier 在 sequence 和/或 analysis 组件（如记分板）之间进行临时
  同步。

+ monitor 不应在 SystemVerilog 接口中为变量或 wire 赋值。

+ 在接口中使用并发断言和 cover property，以进行协议检查和相关的覆盖率收集。

#### Transactions

+ 通过扩展类 uvm_sequence_item 来创建用户定义的 transaction 类。

+ 尽量减少不同 transaction 类的数量。

+ 在现在或将来可能需要随机化的类成员变量前面使用 rand 限定符。

+ 在成员变量之后，定义一个构造函数，该构造函数包含一个字符串名称参数，其默认值可
  为空字符串，并调用 super.new。

+ 推荐重写 convert2string，do_copy，do_compare，do_print 和 do_record 等方法（可使
  用相关宏`uvm_record_attribute 和`uvm_record_field 等）。

+ 推荐重写 do_pack 和 do_unpack 方法（可使用相关宏`uvm_pack_int 等）。

+ 使用 factory 实例化 transaction 对象。

#### Sequence

+ 通过扩展类 uvm_sequence 来创建用户定义的 sequence 类。

+ 在现在或将来可能需要随机化的类成员变量前面使用 rand 限定符。

+ 在成员变量之后，定义一个构造函数，该构造函数包含一个字符串名称参数，其默认值可
  为空字符串，并调用 super.new。

+ 与 sequence 执行相关的任何 housekeeping 代码，例如提出和撤销 objection，都应放在
  sequence 的 pre_start 和 post_start 方法中。sequence 的 body 方法应该只执行 sequence 的原始功能行为。pre_start 和 post_start 被称为用户可定义的回调。

+ 在 body 任务中使用如下通用模板：

  ```verilog
  req = tx_type::type_id::create("req");
  start_item(req);
  assert( req.randomize() with {…;} ) else `uvm_error( ... );
  finish_item(req);
  ```

+ 不要使用`uvm_do 系列宏。

+ 推荐在 sequence 中使用内建的 transaction 变量 req 和 rsp。

+ 通过调用 start 方法在启动 sequence。

+ 仅覆盖 sequence 类的 pre_do，mid_do 和/或 post_do 回调，以修改预先存在的“不可变”
  sequence 类的行为。

  也就是说，只对那些你无权访问源代码或不希望修改源代码的 sequence 覆盖这些回调。不
  要覆盖 pre_do，mid_do 和/或 post_do 回调，来作为修改直接封闭的 sequence 类的 body 任
  务的行为的方法，而仅仅是作为修改你正在扩展的其他 sequence 类的行为的方法。 定义了
  一个或多个这些回调后，您需要使用 factory 覆盖来将原始 sequence 类替换为扩展 sequence
  类。
  例如：

  ```verilog
  // Original sequence class that we do not want to modify
  class vip_seq extends uvm_sequence #(my_tx);
      `uvm_object_utils(vip_seq)
      function new (string name = "");
          super.new(name);
      endfunction
      task body;
          req = my_tx::type_id::create("req");
          start_item(req);
          if( !req.randomize() ) 
              ...
          finish_item(req);...
  // Sequence extended for a specific test
  class alt_seq extends vip_seq;
      `uvm_object_utils(alt_seq)
      ...
      int prev_addr = 0;
      function void mid_do(uvm_sequence_item this_item);
          my_tx tx;
          $cast(tx, this_item);
          tx.m_addr = prev_addr + $urandom_range(1, 7); // Overwrite the address field
      endfunction
      function void post_do(uvm_sequence_item this_item);
          my_tx tx;
          $cast(tx, this_item);
          prev_addr = tx.m_addr; // Store the address to constrain the next transaction
      endfunction
  endclass
  
  class my_test extends existing_test;
      `uvm_component_utils(my_test);
      ...
      function void start_of_simulation_phase(uvm_phase phase);
          // Factory override to replace the original sequence
          vip_seq::type_id::set_type_override( alt_seq::get_type() );
      endfunction
  endclass
  ```

+ 在 sequence 需要访问运行它的 sequencer 的情况下，使用宏 uvm_declare_p_sequencer 声明变量 p_sequencer。

  使用 p_sequencer 变量访问运行 sequence 的 sequencer，有助于阐明 sequence 和 sequencer之间的结构关系。 可以使用方法 uvm_sequence_item :: get_sequencer（）来返回 sequencer，但返回值的 base 类型为 uvm_sequencer_base。 宏 uvm_declare_p_sequence 允许您定义特定的 sequencer 类型。 不要使用内部变量 uvm_sequence_item :: m_sequencer。

  ```verilog
  例如：
  class my_sequence extends uvm_sequence #(my_tx);
      `uvm_object_utils(my_sequence)
      `uvm_declare_p_sequencer(the_sequencer_class_name)
      ...
      task pre_start;
          // Get the configuration object associated with the sequencer component
          // on which this sequence is currently running
          uvm_config_db #(my_config)::get(p_sequencer, "", "config", m_config);endtask
      task body;
          // Set the arbitration algorithm of the current sequencer
          p_sequencer.set_arbitration(SEQ_ARB_STRICT_RANDOM);
      begin
          sequence2 seq2;
          seq2 = sequence2::type_id::create("seq2");
          if ( !seq2.randomize() )
              `uvm_error(get_type_name(), "Randomize failed")
              // Start a child sequence on the current sequencer
              seq2.start(p_sequencer, this);
          ...
      end
      endtask
  endclass
  ```

+ 如果 sequence 需要访问自身运行的 sequencer 以外的 sequencer，请在 sequence 对象中添加成员变量，并在启动 sequence 之前分配该变量以引用到其他 sequencer。
#### Stimulus和Phasing

+ 使用 virtual sequence 协调多个 agent 的行为。

+ 应在 null sequencer 上启动 virtual sequence。

+ 一个 top_level sequence 运行在每个 agent 上，在所有允许的子 sequence 中随机选择。

+ 尽可能保持 sequence 通用。 避免编写定向 sequence，除非绝对必要。

+ sequence 不应是 phase-aware 的，Sequence 应该在所有 run-time phase 中都能够被启动，
  这样有利于重用。

+ 可以重写 run-time phase 的 reset_phase，configure_phase，main_phase，shutdown_phase
  以生成激励，通常是通过启动 sequence，但绝不会在 driver，monitor，subscriber 或记分板
  等组件中生成。

+ 在引入用户自定义的 run-time phase 时，phase 名不应该与预定义的 run-time 相重合。

+ 在集成多个环境时，如果每个 env 都覆盖了预定义或用户定义的 run-time phase，请注意
  通过引入 phase 域和跨域同步 phase 来正确排序 phase。

  UVM 不会对每个内置 run-time phase 可以执行的操作施加任何明确的规则。在集成使用预定义或用户定义的 run-time phase 的组件时，可以将不同的组件放在不同的域中，并通过跨域同步 phase 明确定义不同域中的 phase 之间的关系。

  ```verilog
  class top_level_env extends uvm_env;
  	...
  	env m_env1;
  	env m_env2; // Environments to be integrated
  	function void build_phase(uvm_phase phase);
  		uvm_domain domain1, domain2;
  		m_env1 = env::type_id::create("m_env1", this);
          m_env2 = env::type_id::create("m_env2", this);
          domain1 = new("domain1");
          m_env1.set_domain(domain1);
          domain2 = new("domain2");
          m_env2.set_domain(domain2); // Two new phase domains
          // Synchronize specific run-time phases across domains
          domain1.sync(domain2, uvm_reset_phase::get(), uvm_configure_phase::get());
          ...
      endfunction
  endclass
  ```

+ 不要覆盖预定义的 pre-和 post-方法（例如 pre_reset_phase），而是保留这些 phase 以便在跨域同步 phase 时使用。

+ 如果您选择执行 phase 跳转，则必须非常小心地在 phase 中止时正确清理。不要随便使用相位跳转，因为没有内置的安全措施。向后跳转应限制为跳转到其他 run-time phase。前向跳转应限制为跳转到 run-time phase 之后的常见 phase。
#### Objections

+ 在任何 class 中都可以通过提起和撤销 objection 来控制验证平台的起始与结束。

  通常，driver 从 sequencer 中获取 transaction 时都应该提起 objection，在处理完该 transaction后撤销 objection。Monitor 在检测到新的 transaction 时应该提起 objection，在通过 analysis port发生出该 transaction 后应该撤销 objection。当 Scoreboard 需要等待多个 item 时，应该提起objection。

+ 调用每个 objection（UVM 1.2 以后）的 set_propagate_mode（0）方法来禁用该 objection的分层传播。

+ 考虑在内部循环中提起和撤销 objection 的对仿真速度影响，例如：各个 transaction。如果仿真速度损失很大，则从内部循环中删除 objection。

+ 如果 sequence 要提出和撤销 objection，则应在其 pre_start 方法中调用 raise_objection，在其 post_start 方法中调用 drop_objection。

+ 在 sequence 中调用 raise_objection 与 drop_objection 方法时，将其置于 if (starting_phase ！= null)条件中。

  在 uvm-1.2 之前，starting_phase 是类 uvm_sequence_base 的成员。从 uvm-1.2 开始，不推荐使用 starting_phase 变量，而必须使用 get_starting_phase 方法访问它。

  ```verilog
  task pre_start;
  uvm_phase starting_phase = get_starting_phase(); // uvm-1.2
  	if (starting_phase != null)
  	starting_phase.raise_objection(this, "Sequence started");
  endtask
  ```

+ 在启动 sequence 之前，如果要提起 objection，则需要先设置 starting_phase 成员变量。从uvm-1.2 开始，不推荐使用 starting_phase 变量，必须使用 set_starting_phase 方法设置：

  ```verilog
  task run_phase(uvm_phase phase);
  	my_sequence seq;
  	seq = my_sequence::type_id::create("seq");
      if ( !seq.randomize() )
  		`uvm_error( ... )
  	seq.set_starting_phase(phase); // uvm-1.2
  	seq.start( ... );
  endtask
  ```
+ 调用 raise_objection 或 drop_objection 时，总是传递一个字符串作为第二个参数来描述objection 以帮助调试。
  命令行参数+ UVM_OBJECTION_TRACE 打开 objection 跟踪，打印出每个被调用objection 的description 参数。

+ 如果调用 sequence 的 kill 方法并且 sequence 可以提出 objection，请确保覆盖 sequence 的do_kill 方法以能够撤销 objection。

  否则，objection 可能永远不会被撤销，这将阻止 phase 结束。如果 sequence 由于 phase 跳
  转而过早结束，则所有 objection 计数都会自动清除，因此不需要明确撤销 objection。在 phase
  跳转时也不会自动调用 kill。例如：

  ```verilog
  function void do_kill;
  	if (starting_phase != null)
  		starting_phase.drop_objection(this, "Sequence ended prematurely");
  endfunction
  ```

#### Components

+ 通过扩展 uvm_component 的相应子类来创建用户定义的组件类，以实现需要的功能。

+ 在类中的第一行使用宏`uvm_component_utils 在 factory 中注册组件类。

+ 在 factory 注册宏之后，使用规范命名方式的后缀声明 ports，exports 和 virtual interface。

+ 声明了 ports，exports 和 virtual interface 后，再声明类的成员变量。

+ 然后是构造函数 new，构造函数应包含 string name 和无默认值的 parent 参数，需要调用super.new。

+ 在 build_phase 中实例化组件类，而不应该在其他 phase 或者构造函数中实例化组件类。

+ 总是使用 factory 实例化组件

+ 组件的 string 名称”var_name”应与变量名称 var_name 相同，除非有特定原因使字符串名称与变量名称不同，例如在使用相同变量的循环中创建多个组件对象时。

+ 第二个参数 this 表示此组件的父类。

+ 如果用户定义的组件类扩展了另一个用户定义的组件类，则应注意在适当的位置插入super.<phase_name> _phase 形式的调用，即执行相应的基类 phase 方法。

+ 如果用户定义的组件类是直接从 UVM 基类库进行扩展得到的，则内建 phase 方法不必调用super.<phase_name> _phase，尽管这曾经在 OVM 中是一个推荐。

  ```verilog
  function void connect_phase(uvm_phase phase);
  	super.connect_phase(phase); // Not necessary when extending uvm_component
  	...
  endfunction
  ```

+ 如果用户定义的组件类是直接从 UVM 基类库扩展得到的，在覆盖内建的 build_phase 方法时，请不要调用 super.build_phase。

  相反，如果您确实需要调用 super.build_phase，则必须需要理解 uvm_component :: build_phase方法调用了 apply_config_settings，它将在组件的字段名称和层次名称恰好与配置数据库中的名称和范围匹配的情况下，使用字段宏注册的字段的值设置为从配置数据库获取的相应值。一个标准的写法如下：

  ```verilog
  class my_component extends uvm_env;
  	`uvm_component_utils(my_component)
  	// Transaction-level ports and exports
  	uvm_analysis_port #(my_tx) a_port;
  	// Virtual interfaces
  	virtual dut_if vif;
  	// Internal data members (variables)
  	my_agent m_agent;
  	// Constructor
  	function new (string name, uvm_component parent);
  		super.new(name, parent);
  	endfunction
  	// Standard phase methods
  	function void build_phase(uvm_phase phase);
  		a_port = new("a_port", this);
  		m_agent = my_agent::type_id::create("m_agent", this);
  	endfunction
  	function void connect_phase(uvm_phase phase);
  		...
  	endfunction
  	task run_phase(uvm_phase phase);
  		...
  	endfunction
  endclass
  ```

#### Connection to the DUT

+ 每个 DUT 接口使用一个 SystemVerilog 接口实例。
+ 在 UVM 验证环境使用虚拟接口访问 SystemVerilog 接口实例。
+ 在配置数据库中的 configuration object 配置对象里将虚拟接口封装。
+ 将顶层配置对象中的虚拟接口复制到顶层 env 的 build_phase 方法中的 agent 或较低级别env 相关联的配置对象。
+ agent 应检查其虚拟接口是否已被 set。

#### TLM Connections

+ 在 connect_phase 中建立 TLM port/export 连接，分配虚拟接口。
+ 使用 port 和 export 在 UVM 组件之间进行通信，包括 analysis ports 和相应的 exports。
+ 当 UVM 组件之间需要实现一对多的连接时，使用 analysis ports 和 analysis exports（或者是 uvm_subscriber 的对象）。
+ 在组件之间建立对等（peer-to-peer）连接时，将 ports（或 analysis ports）直接连接到 exports（或 analysis exports），而无需任何中间 FIFO。
+ 与 agent 进行通信的两种方式：将 agent 的 analysis ports 连接到 uvm_subscriber，或从外部的使用直接对象引用（direct object reference）来访问 agent 中的 sequencer。

#### Configurations

+ 使用配置数据库 uvm_config_db 而不是资源数据库 uvm_resource_db。

  使用 uvm_resource_db 的唯一情况是，在多次设置相同 item（即同名和相同范围）时，它们具有不同的规则。但是，不必学习两组规则，单独使用 uvm_config_db 就可以完成所需的一切。

+ 将给定组件的配置参数分组到配置对象中，并将该配置对象设置到配置数据库中。

+ 顶层配置对象应包含对所有低层配置对象的引用。

+ 通过扩展类 uvm_object 来创建用户定义的配置类。

  ```verilog
  class my_agent_config extends uvm_object;
  	virtual my_if vif;
  	uvm_active_passive_enum is_active;
  	bit coverage_enable; // From the UVM User Guide
  	bit checks_enable;
  	function new(string name = "");
  		super.new(name);
  	endfunction
  endclass
  ```

+ 将类名<component_class> _config 或<sequence_class> _config 分别用于与组件或 sequence关联的配置类，其中<component_class>是组件的类名，<sequence_class>是 sequence 的类名。

+ 在配置数据库中的配置对象使用字段名称“config”。

+ 不要使用 factory 注册用户定义的配置类。因此，配置类可以具有带有任意数量的用户自定义参数的构造函数。将配置对象视为一组参数值，而不是激励。

+ 组件在 build_phase 中 get 和 set 配置参数（通常是配置的对象）。

  例：

  ```verilog
  class my_agent_config extends uvm_object;
  	virtual my_agent_if vif;
  	uvm_active_passive_enum is_active = UVM_ACTIVE;
  	bit coverage_enable;
  	bit checks_enable;
      function new(string name = "");
          super.new(name);
      endfunction
  endclass
  
  class top_config extends uvm_object;
  	rand my_agent_config m_my_agent_config;
  	function new(string name = "");
  		super.new(name);
      endfunction : new
  endclass : top_config
  
  module top_tb;
  	...
  	top_config top_env_config;
  	initial begin
          top_env_config = new("top_env_config");
          if ( !top_env_config.randomize() )
  			`uvm_error("top_tb","Failed to randomize top-level configuration object" )
  		top_env_config.m_my_agent_config.vif = th.my_agent_if_0;
          uvm_config_db#(top_config)::set(null,"uvm_test_top", "config",top_env_config);
          uvm_config_db#(top_config)::set(null,"uvm_test_top.m_env","config",top_env_c
  onfig);
  		run_test();
  	end
  endmodule
  
  class top_env extends uvm_env;
  	`uvm_component_utils(top_env)
  	my_agent_config m_my_agent_config;
  	my_agent_agent m_my_agent_agent;
  	my_agent_coverage m_my_agent_coverage;
  	top_config m_config;
  	...
  	function void build_phase(uvm_phase phase);
  		if (!uvm_config_db #(top_config)::get(this, "", "config", m_config))
  			`uvm_error(get_type_name(), "Unable to get top_config")
  		m_my_agent_config = m_config.m_my_agent_config;
  		uvm_config_db #(my_agent_config)::set(this, "m_my_agent_agent", "config",
  											m_my_agent_config);
  		if (m_my_agent_config.is_active == UVM_ACTIVE )
  			uvm_config_db #(my_agent_config)::set(this,"m_my_agent_agent.m_sequencer", 					"config", m_my_agent_config);
  		uvm_config_db #(my_agent_config)::set(this, "m_my_agent_coverage", "config",
  			m_my_agent_config);
  		m_my_agent_agent=my_agent_agent::type_id::create("m_my_agent_agent",this);
  		m_my_agent_coverage=my_agent_coverage::type_id::create("m_my_agent_cover
  age",this);
  	endfunction : build_phase
  	...
  
  endclass 
  ```

+ 始终检查 uvm_config_db#(T):: get 的返回值（bit），以确保配置数据库中存在这个配置参数。

+ 如果 uvm_config_db#(T):: get 返回 0（即 get 失败），则应选择合理的默认值。

+ 每个组件都应该是仅仅 get 自己实例对应的配置对象，而不应该 get 到其他组件实例的配置对象。

+ 组件实例相关联的配置对象应由其 parent 组件或该组件实例的其他直接祖先进行 set，而不应由任何其他组件实例设置。

+ 避免使用绝对层次路径名作为 uvm_config_db#T(T):: set 的第二个参数，并提供尽可能短的唯一路径名。

+ 组件实例可以与一个配置对象关联，也可以不与配置对象关联，并且多个组件实例可以与同一配置对象关联。

+ 对于 agent，其配置对象的 is_active 变量决定这个 agent 是 active 或者 passive 的。覆盖 virtual get_is_active 方法以返回此值。在 agent 中创建和连接 sequencer 和 driver 之前，请检查get_is_active。

  例：

  ```verilog
  class my_agent extends uvm_agent;
  	`uvm_component_utils(my_agent)
  	uvm_analysis_port#(my_transaction) a_port;
  	my_config m_config;
  	my_sequencer m_sequencer;
  	my_driver m_driver;
  	my_monitor m_monitor;
  	function new(string name, uvm_component parent);
  		super.new(name, parent);
  	endfunction
  	function void build_phase(uvm_phase phase);
  		if (!uvm_config_db #(my_config)::get(this, "", "config", m_config))
  			`uvm_error(get_type_name(), "Agent config object is missing from
  config_db")
  		if (get_is_active() == UVM_ACTIVE) begin
  			m_sequencer = my_sequencer::type_id::create("m_sequencer", this);
  			m_driver = my_driver ::type_id::create("m_driver", this);
  		end
  		m_monitor = my_monitor::type_id::create("m_monitor", this);
  		a_port = new("a_port", this);
  	endfunction
  	function void connect_phase(uvm_phase phase);
  		if (get_is_active() == UVM_ACTIVE)
  			m_driver.seq_item_port.connect( m_sequencer.seq_item_export );
  			m_monitor.a_port.connect( a_port );
  	endfunction
  	virtual function uvm_active_passive_enum get_is_active();
  		return uvm_active_passive_enum'( m_config.is_active );
  	endfunction
  /*
  // Alternative version that includes defensive programming to check for conflicts
  // between the config object and the "is_active" field
  local int m_is_active = -1;
  	virtual function uvm_active_passive_enum get_is_active();
  		if (m_is_active == -1)begin
  		if(uvm_config_db#(uvm_bitstream_t)::get(this,"","is_active",m_is_active))begin
  			if (m_is_active != m_config.is_active)
  				`uvm_warning(get_type_name(), "is_active field in config_db conflicts with config object")
  		end
  		else
  			m_is_active = m_config.is_active;
  		end
  	return uvm_active_passive_enum'(m_is_active);
  endfunction
  */
  endclass: my_agent
  ```

+ 如果要对 sequence 进行参数化，则应将 sequence 的参数放入配置数据库中的配置对象中。配置对象应与 sequence 运行的 sequencer 相关联。

+ 与 sequence 关联的配置对象都应该从 sequence 的 start 中从配置数据库中获取，并且sequence 对象中的变量指向该配置对象。

+ 如果一个组件在其子组件中对自己的变量（包括虚拟接口）进行连接，那么应该在build_phase 中创建子组件并完成连接操作。

#### Factory

+ 总是使用 factory 实例化 transaction，sequence以及组件的对象。不要简单使用 new 函数来实例化对象。

+ 使用 factory 将 transaction，sequence，以及组件对象替换为其类的扩展类的另一个对象时，factory 覆盖应采用以下形式之一：

  ```verilog
  old_type_name::type_id::set_type_override(new_type_name::get_type());
  old_type_name::type_id::set_inst_override(new_type_name::get_type() ... );
  ```

+ 当您需要访问 factory 时，请调用静态方法 uvm_factory :: get( )。不要使用全局变量 factory 来访问某个factory（全局变量 factory 在 uvm_1.2 中被丢弃）。

#### Tests

+ 不要直接从测试中生成激励，而是使用测试来设置配置参数和 factory 覆盖。
+ 通常最好从 env 而不是从测试中启动 sequence，并将测试限制为参数化或重配置环境。环境应该知道如何激励 DUT。
+ 设置验证环境的默认配置，并在 env 类中生成默认激励，而不是测试类，以便即使使用空测试也能运行 env。
+ 在适当的情况下，使用 text_base 类来定义一组测试中常见的结构和行为，并通过扩展这些 base 类来创建各个测试。
+ 为了重复使用，请避免根据验证环境的具体细节进行测试。
+ 使用命令行参数修改测试行为，无需重新编译。
#### Messaging

+ 要报告消息，请始终使用八个标准报告宏之一`uvm_info，`uvm_info_context 等，而不是$display 及类似语句。
+ 将消息 ID 设置为静态 string 或 get_type_name( )。
+ 在整个代码中仔细，有条理地和一致地设置消息详细级别，以避免日志文件中不必要的数据，并区分在验证环境开发调试期间使用的消息和在运行 testcase 时使用的消息。
+ 默认情况下，将各个报告宏的详细级别设置为较大的数字，以便不太可能报告 message。
+ 仔细设置消息严重性级别，以区分纯信息性消息，可能代表错误的消息和肯定是错误的消息。

#### RAL

+ 如果使用生成器为寄存器模型创建 SystemVerilog 代码，请不要修改生成的代码。

+ 顶层 UVM 环境应使用 factory 实例化寄存器块，并应调用寄存器模型的 build 方法。

+ 对于子环境使用寄存器模型的层次结构 UVM 环境，应该有一个顶层寄存器块，用于实例化与子环境关联的寄存器块，依此类推。

+ 任何使用寄存器模型的 UVM env 都应该有一个名为 regmodel 的变量，该变量存储对该特定环境的寄存器块的引用。

+ 具有寄存器模型的 UVM env 应设置所有子组件的 regmodel 变量，如果子组件也使用了寄存器模型到其寄存器块的相应子块。

+ 如果 env 的 regmodel 变量的值为 null，则 UVM 环境应仅实例化一个寄存器块。

  对于顶层环境，regmodel 的值将为 null，因此 env 应实例化寄存器块并设置 regmodel 的值。对于较低层次的 env，regmodel 的值不应为 null，因为它应该由更高层次的 env 设置。此机制允许将相同的 env 实例化为顶层 env（具有寄存器模型）或作为较低层次的 env（没有自己的寄存器模型）。例：

  ```verilog
  top_reg_block regmodel;
  function void top_env::build_phase(uvm_phase phase);
  	if (regmodel == null)begin
  	// Instantiate register model for top-level env
  		regmodel = top_reg_block::type_id::create("regmodel");
  		regmodel = build();
  	end
  	// Set regmodel variable of lower-level env through config object
  	m_bus_env_cfg = new("m_bus_env_cfg");
  	m_bus_env_cfg.regmodel = regmodel.bus;
  	...
  endfunction
  ```

+ 寄存器模型中每个子寄存器块的变量名称和 UVM 实例名称应与相应 agent 的名称相对应。

+ 寄存器块应仅模拟 DUT 寄存器，这些寄存器可由与 UVM 环境相关联的 UVM sequence 访问。

+ 使用寄存器模型并实例化了 agent 的 UVM 环境应实例化并连接寄存器 adapter 和该 agent的寄存器 predictor。

+ 寄存器模型应使用显式预测，以使其镜像值与 DUT 中的寄存器值保持同步。

+ 应分配每个子寄存器块中预测器的地址映射变量.map，以引用顶层寄存器块的相应地址映射。

  这确保了使用系统地址映射中的全局地址而不是本地地址映射中的偏移来访问寄存器。例：

  ```verilog
  // To connect the register layer to an agent named bus
  bus_agent m_bus_agent;
  bus_reg_block regmodel;
  reg2bus_adapter m_reg2bus;
  uvm_reg_predictor #(bus_tx) m_bus2reg_predictor;
  function void bus_env::build_phase(uvm_phase phase);
  	...
  	m_bus_agent = bus_agent ::type_id::create("m_bus_agent", this);
  	m_reg2bus = reg2bus_adapter::type_id::create("m_reg2bus", this);
  	m_bus2reg_predictor =
  	uvm_reg_predictor #(bus_tx)::type_id::create("m_bus2reg_predictor", this);
  endfunction
  function void top_env::connect_phase(uvm_phase phase);
  	if (regmodel.get_parent() == null)
  		regmodel.default_map.set_sequence(m_bus_agent.m_sequencer, m_reg2bus);
  		m_bus2reg_predictor.map = regmodel.bus_map;
  		m_bus2reg_predictor.adapter = m_reg2bus;
  		regmodel.bus_map.set_auto_predict(0);
  		m_bus_agent.m_monitor.ap.connect( m_bus2reg_predictor.bus_in );
  endfunction
  ```
  在验证环境的开发过程中，为了调试，打印寄存器模型中的寄存器的详细信息可能会有所帮
  助。这应该在 end_of_elaboration_phase 方法中完成。例：

  ```verilog
  function void end_of_elaboration_phase(uvm_phase phase);
  	uvm_reg regs[$];
  	string name;
  	regmodel.bus_map.get_registers(regs);
  	`uvm_info(get_type_name(),
  		$sformatf("Found %d registers", regs.size()), UVM_MEDIUM)
  	for (int j = 0; j < regs.size(); j++)
  		`uvm_info(get_type_name(),$sformatf("regs[%0d]:%s",j,regs[j].get_name()),UVM_
  			HIGH)
  endfunction
  ```

+ 在寄存器模型中读取或写入寄存器的寄存器 sequence 应扩展自 uvm_sequence，并且应具有名为 regmodel 的变量，该变量存储着对相应寄存器块的指针。

+ 在启动读取或写入寄存器的 sequence 之前，请先设置该 sequence 的 regmodel 变量。

#### Functional Coverage

+ 使用 SystemVerilog covergroup 结构在 UVM 验证环境中收集功能覆盖率。

  处理或转换来自 DUT 的值以创建为实际采样覆盖点的派生值，有时这是必要的或更方便的。例如，您可以计算在总线上连续出现的两个地址之间的差异，并将结果值用作覆盖点。该技术可以克服在覆盖组实例化时就进行了定义但覆盖点的定义不能动态地改变的基本限制。例：

  ```verilog
  class my_agent_coverage extends uvm_subscriber #(bus_tx);
  	`uvm_component_utils(my_agent_coverage)
  	bus_tx m_item;
  	int m_address_delta;
  	covergroup m_cov;
  		cp_address_delta: coverpoint m_address_delta {
  			bins zero = {0};
  			bins one = {1};
  			bins negative = { [-128:-1] };
  			bins positive = { [1: 127] };
  			option.at_least = 16;
  		}
  	endgroup
  	function new(string name, uvm_component parent);
  		super.new(name, parent);
  	m_cov = new;endfunction : new
  	function void write(input bus_tx t);
  		m_item = t;
  		m_address_delta = m_item.current_address - m_item.previous_address;
  		m_cov.sample();
  	endfunction : write
  endclass : my_agent_coverage
  ```

+ 在适当的情况下，使用 cover property 在 interface 中收集功能覆盖信息。

+ 将 covergroup 作为嵌入式 covergroup 放置在类中，或者将 covergroup 放在 package 中并参数化 covergroup，以便可以从该 package 中的类进行实例化。

+ Covergroups 应该在 UVM 组件类中实例化，而不是在 sequence 或 transaction 中。

+ Covergroups 应在 UVM subscribers 或 scoreboards 中实例化，并且 scoreboard 是在 UVM env类中实例化并连接到 monitor/agent 的 analysis port。

+ 在 coverage 收集器类的构造函数中实例化 covergroup。

+ 为了收集 DUT 内部信号的功能覆盖信息，在单个 SystemVerilog module（或接口）中封装对 DUT 层次路径的引用，然后使用虚拟接口和 interface 从 UVM 环境访问该模块。可以使用层次路径或使用 bind 语句访问 DUT 中的内部信号。在单个模块（或接口）中封装所有层次路径可以使得验证环境保持干净。

+ 如果 coverage 收集跨越多个 DUT 接口，因此需要从多个 agent 接收 analysis transaction，请使用`uvm_analysis_imp_decl 宏在 coverage collector 类中提供多个 analysis exports。

  uvm_subscriber 类仅仅只有一个 analysis export，`uvm_analysis_imp_decl 宏提供了接受多个传入 transaction 流的最方便的方法，每个传入 transaction 流都有自己独立的 write 方法。例：

  ```verilog
  `uvm_analysis_imp_decl(_expected)
  `uvm_analysis_imp_decl(_actual)
  class my_cov_collector extends uvm_scoreboard;
  	`uvm_component_utils(my_cov_collector)
  	uvm_analysis_imp_expected #(tx_t, my_cov_collector) expected_export;
  	uvm_analysis_imp_actual #(tx_t, my_cov_collector) actual_export;
  	...
  	function void build_phase(uvm_phase phase);
          expected_export = new("expected_export", this);actual_export = 		                   		new("actual_export", this);
  	endfunction
  	...
  	function void write_expected(tx_t t);
  		...
  	endfunction
  	function void write_actual(tx_t t);
  		...
  	endfunction
  	...
  endclass
  ```

+ 将覆盖点分为多个覆盖组，以便将的 specification features 的 coverage 与 implementation features 的 coverage 分开。这将有助于重新使用 coverage 模型。

+ 在 coverage 收集器的配置对象中使用变量 coverage_enable 来启用或禁用 coverage 收集。

+ 通过调用 sample 方法而不是为 covergroup 指定时钟事件来对进行采样。

+ 不要频繁地过度对覆盖组进行采样。考虑对每个覆盖点使用条件表达式 iff( ...)来降低采样频率。

+ 在 DUT 端口或者 DUT 内部进行采样，不要在激励上面进行采样。在采样 DUT 的寄存器的值时，应该等到 DUT 寄存器值发生变化后才采样，而不是在激励发生变化时就进行采样。

+ 考虑将每个覆盖组和覆盖点的 option.at_least 设置为默认值 1 以外的某个值。option.at_least 的默认值仅确保每个状态被命中一次，这通常不足以测试状态是否已经锁定。

+ 不要设置覆盖组和覆盖点的 option.weight 或 option.goal。

+ 仔细设计 coverpoint bin，以确保涵盖功能重要的 case。

  由于 100％覆盖状态空间是不现实的，因此仔细设计 coverage bin 对于验证质量至关重要。一种解决方案的是为典型值，特殊值和边界条件创建单独的 bin。bin 的选择应与验证计划有关。

+ 设计覆盖点时，请指定非法值或不需要覆盖的值为 ignore_bins。不要使用 illegal_bins。

  Covergroups 应限于收集功能覆盖率信息，而不是直接与错误报告相关联。应使用断言或使用 UVM 报告处理程序来捕获非法值。

