---
title: Chisel硬件构建语言入门
author: 神秘人
tags:
  - Chisel
  - Verilog
  - RTL
categories:
  - 验证
  - 设计
mathjax: false
date: 2019-07-10 09:43:18
---

#### Scala 难度接近C艹优雅度超Python的语言我就不多说了~
#### 新建Chisel项目(转)
+ 方式一
将如下链接中的项目下载至本地。
[enter description here](https://github.com/freechipsproject/chisel-template)
更改工程名称。
删除.git，并将build.sbt中的name改成自己项目的名称。
删除source>main>scala中的文件和source>test>scala中的文件。
得到纯净版。

+ 方式二
新建scala项目，选择sbt
scala版本选择2.11.12,sbt版本随意
将下方sbt替换build.sbt

*build.sbt*
```scala
def scalacOptionsVersion(scalaVersion: String): Seq[String] = {
  Seq() ++ {
    // If we're building with Scala > 2.11, enable the compile option
    //  switch to support our anonymous Bundle definitions:
    //  https://github.com/scala/bug/issues/10047
    CrossVersion.partialVersion(scalaVersion) match {
      case Some((2, scalaMajor: Long)) if scalaMajor < 12 => Seq()
      case _ => Seq("-Xsource:2.11")
    }
  }
}

def javacOptionsVersion(scalaVersion: String): Seq[String] = {
  Seq() ++ {
    // Scala 2.12 requires Java 8. We continue to generate
    //  Java 7 compatible code for Scala 2.11
    //  for compatibility with old clients.
    CrossVersion.partialVersion(scalaVersion) match {
      case Some((2, scalaMajor: Long)) if scalaMajor < 12 =>
        Seq("-source", "1.7", "-target", "1.7")
      case _ =>
        Seq("-source", "1.8", "-target", "1.8")
    }
  }
}

name := "Module-2.1"	//项目名称
version := "0.1"			//自己给项目起的版本号
scalaVersion := "2.11.12"	//scala版本
crossScalaVersions := Seq("2.11.12", "2.12.4")		//scala版本的扩充
resolvers ++= Seq(
  Resolver.sonatypeRepo("snapshots"),
  Resolver.sonatypeRepo("releases")
)
// Provide a managed dependency on X if -DXVersion="" is supplied on the command line.
val defaultVersions = Map(
  "chisel3" -> "3.1.+",
  "chisel-iotesters" -> "1.2.5+"
)

libraryDependencies ++= Seq("chisel3","chisel-iotesters").map {
  dep: String => "edu.berkeley.cs" %% dep % sys.props.getOrElse(dep + "Version", defaultVersions(dep)) }

scalacOptions ++= scalacOptionsVersion(scalaVersion.value)
javacOptions ++= javacOptionsVersion(scalaVersion.value)
```
#### Chisel例子、测试、verilog生成
+ 样例模块
```scala
package Passthrough
import chisel3._
class MAC extends Module{
  val io = IO(new Bundle{
    val in_a = Input(UInt(4.W))
    val in_b = Input(UInt(4.W))
    val in_c = Input(UInt(4.W))
    val out = Output(UInt(8.W))
  })

  io.out := io.in_a * io.in_b + io.in_c
}
```
+ 对模块进行测试
```scala
package Passthrough
import chisel3._
import chisel3.iotesters.{Driver, PeekPokeTester}

//测试样例如下所示
class MACTester(c: MAC) extends PeekPokeTester(c) {
  val cycles = 100
  import scala.util.Random
  for (i <- 0 until cycles) {
    val in_a = Random.nextInt(16)
    val in_b = Random.nextInt(16)
    val in_c = Random.nextInt(16)
    poke(c.io.in_a, in_a)
    poke(c.io.in_b, in_b)
    poke(c.io.in_c, in_c)
    expect(c.io.out, in_a*in_b+in_c)
  }

}

//测试类如下所示
class test{
	assert(Driver(() => new MAC) {c => new MACTester(c)})
	println("SUCCESS!!")
}

//运行测试
object RunAppDemo {
  def main(args:Array[String]) {
    new test
  }
}
```
+ 转换成verilog
经过测试后，将上述模块转换生成verilog的代码如下
```scala
object Main {
  def main(args: Array[String]): Unit = {
    println("Generating the Adder hardware")
    chisel3.Driver.execute(Array("--target-dir", "generated"), () => new MAC)
  }
}
```
#### Chisel中的组合逻辑
+ Input与Output
Chisel中的所有类都要继承Module。
类中必须要定义io类型，用来表示该模块的输入输出端口。
每一个输入输出端口，需要说明是有符号数还是无符号数，以及数据位宽。

class MyOperatorsTwo extends Module {
  val io = IO(new Bundle {
    val in      = Input(UInt(4.W))
    val out_mux = Output(UInt(4.W))
    val out_cat = Output(UInt(4.W))
  })
}

class MyOperators(val length : Int) extends Module {
  val io = IO(new Bundle {
    val in      = Input(UInt(length.W))
    val out_mux = Output(UInt(length.W))
    val out_cat = Output(UInt(length.W))
  })
}
+ 数据类型与赋值
Chisel中所有的变量只能用val，不能用var。
Chisel中的数据类型有UInt,SInt,Bool，并且Chisel中的数据类型只能和Chisel中的数据类型进行运算，因此运算时如果需要操作常数，需写成2.U的形式。
```scala
class MyOperators extends Module {
  val io = IO(new Bundle {
    val in      = Input(UInt(4.W))
    val out_add = Output(UInt(4.W))
    val out_sub = Output(UInt(4.W))
    val out_mul = Output(UInt(4.W))
  })

  val s = true.B
  io.out_add := 1.U + 4.U
  io.out_sub := 2.U - 1.U
  io.out_mul := 4.U * 2.U
}
```
在变量初始化时使用等号，在赋值时使用:=，代表左侧变量由右侧表达式驱动
另外scala中提供比较常见的如多选器，连接器
```scala
  val s = true.B
  io.out_mux := Mux(s, 3.U, 0.U) 
  io.out_cat := Cat(2.U, 1.U) 
```
对于加法运算，Chisel提供了两种加法运算，+&表示会保留进位，+不保留进位

+ 控制语句
如果有多条赋值语句驱动相同左侧变量，则选择最后一个，如下:
```scala
class LastConnect extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(4.W))
    val out = Output(UInt(4.W))
  })
  io.out := 1.U
  io.out := 2.U
  io.out := 3.U
  io.out := 4.U		//编译器选择这一条
}
```
when, elsewhen, otherwise
Chisel中提供条件语句when, elsewhen和otherwise
使用方式和if-else语句一样
语法如下：

```scala
when(someBooleanCondition) {
  // things to do when true
}.elsewhen(someOtherBooleanCondition) {
  // things to do on this condition
}.otherwise {
  // things to do if none of th boolean conditions are true
}
```
示例如下：
```scala
class Max3 extends Module {
  val io = IO(new Bundle {
    val in1 = Input(UInt(16.W))
    val in2 = Input(UInt(16.W))
    val in3 = Input(UInt(16.W))
    val out = Output(UInt(16.W))
  })
    
  when(io.in1 > io.in2 && io.in1 > io.in3) {
    io.out := io.in1  
  }.elsewhen(io.in2 > io.in1 && io.in2 > io.in3) {
    io.out := io.in2 
  }.otherwise {
    io.out := io.in3
  }
}
```
需要注意的是，Chisel中的条件语句不像scala中的那样，最后一行为返回值
```scala
val result = when(squareIt) { x * x }.otherwise { x }
```

#### Chisel中的时序逻辑
+ 寄存器reg
```scala
val register = Reg(UInt(12.W))

class RegisterModule extends Module {
  val io = IO(new Bundle {
    val in  = Input(UInt(12.W))
    val out = Output(UInt(12.W))
  })
  
  val register = Reg(UInt(12.W))
  register := io.in + 1.U
  io.out := register
}
```
还可以通过RegNext来实例化出来一个寄存器
```scala
class RegNextModule extends Module {
  val io = IO(new Bundle {
    val in  = Input(UInt(12.W))
    val out = Output(UInt(12.W))
  })
  
  // register bitwidth is inferred from io.out
  io.out := RegNext(io.in + 1.U)
}
```
step(n)可以改变n次时钟，常用于测试中
```scala
class RegisterModuleTester(c: RegisterModule) extends PeekPokeTester(c) {
  for (i <- 0 until 100) {
    poke(c.io.in, i)
    step(1)
    expect(c.io.out, i+1)
  }
}
```
可以通过RegInit来让寄存器中初始附带特定值
```scala
val myReg = RegInit(UInt(12.W), 0.U)
val myReg = RegInit(0.U(12.W))
```
有如下例子
```scala
classclass  RegInitModuleRegInit  extends Module {
  val io = IO(new Bundle {
    val in  = Input(UInt(12.W))
    val out = Output(UInt(12.W))
  })
  
  val register = RegInit(0.U(12.W))
  register := io.in + 1.U
  io.out := register
}
```
必须要使用RegInit，否则寄存器里的初值未知
可以在测试时使用reset(n)来使reset信号有效n个周期

+ 精确时钟和复位
Chisel中对于寄存器有默认的同步复位reset和时钟clk，但如果想自己加入额外的复位信号和额外的时钟信号，就要用到withClock/withReset/withClockAndReset。
withClock(a){}意味着在a的上升沿会触发什么。
withReset(a){}意味着在标准时钟上升沿a有效时复位。
withClockAndReset(a,b){}意味着在a的上升沿,b有效时复位。
```scala
class ClockExamples extends Module {
  val io = IO(new Bundle {
    val in = Input(UInt(10.W))
    val alternateReset    = Input(Bool())
    val alternateClock    = Input(Clock())
    val outImplicit       = Output(UInt())
    val outAlternateReset = Output(UInt())
    val outAlternateClock = Output(UInt())
    val outAlternateBoth  = Output(UInt())
  })

  val imp = RegInit(0.U(10.W))
  imp := io.in
  io.outImplicit := imp

  withReset(io.alternateReset) {
    // everything in this scope with have alternateReset as the reset
    val altRst = RegInit(0.U(10.W))
    altRst := io.in
    io.outAlternateReset := altRst
  }

  withClock(io.alternateClock) {
    val altClk = RegInit(0.U(10.W))
    altClk := io.in
    io.outAlternateClock := altClk
  }

  withClockAndReset(io.alternateClock, io.alternateReset) {
    val alt = RegInit(0.U(10.W))
    alt := io.in
    io.outAlternateBoth := alt
  }
}

object Main {
  def main(args: Array[String]): Unit = {
    println("Generating the Adder hardware")
    chisel3.Driver.execute(Array("--target-dir", "generated"), () => new ClockExamples)
  }
}
```
生成的verilog中相关部分如下
```verilog
module ClockExamples( // @[:@3.2]
  input        clock, // @[:@4.4]
  input        reset, // @[:@5.4]
  input  [9:0] io_in, // @[:@6.4]
  input        io_alternateReset, // @[:@6.4]
  input        io_alternateClock, // @[:@6.4]
  output [9:0] io_outImplicit, // @[:@6.4]
  output [9:0] io_outAlternateReset, // @[:@6.4]
  output [9:0] io_outAlternateClock, // @[:@6.4]
  output [9:0] io_outAlternateBoth // @[:@6.4]
);
  reg [9:0] imp; // @[Passthrough.scala 137:20:@8.4]
  reg [31:0] _RAND_0;
  reg [9:0] _T_23; // @[Passthrough.scala 143:25:@11.4]
  reg [31:0] _RAND_1;
  reg [9:0] _T_26; // @[Passthrough.scala 149:25:@14.4]
  reg [31:0] _RAND_2;
  reg [9:0] _T_29; // @[Passthrough.scala 155:22:@17.4]
  reg [31:0] _RAND_3;
  assign io_outImplicit = imp; // @[Passthrough.scala 139:18:@10.4]
  assign io_outAlternateReset = _T_23; // @[Passthrough.scala 145:26:@13.4]
  assign io_outAlternateClock = _T_26; // @[Passthrough.scala 151:26:@16.4]
  assign io_outAlternateBoth = _T_29; // @[Passthrough.scala 157:25:@19.4]

  always @(posedge clock) begin
    if (reset) begin
      imp <= 10'h0;
    end else begin
      imp <= io_in;
    end
    if (io_alternateReset) begin
      _T_23 <= 10'h0;
    end else begin
      _T_23 <= io_in;
    end
  end
  always @(posedge io_alternateClock) begin
    if (reset) begin
      _T_26 <= 10'h0;
    end else begin
      _T_26 <= io_in;
    end
    if (io_alternateReset) begin
      _T_29 <= 10'h0;
    end else begin
      _T_29 <= io_in;
    end
  end
endmodule
```
#### Chisel中参数
+ 样例1
```scala
classclass  ParameterizedWidthAdderParamet (in0Width: Int, in1Width: Int, sumWidth: Int) extends Module {
  require(in0Width >= 0)
  require(in1Width >= 0)
  require(sumWidth >= 0)
  val io = IO(new Bundle {
    val in0 = Input(UInt(in0Width.W))
    val in1 = Input(UInt(in1Width.W))
    val sum = Output(UInt(sumWidth.W))
  })
  // a +& b 包括进位, a + b 则不包括
  io.sum := io.in0 +& io.in1
}
```
上述样例中的require关键字表示对参数做了一些限制，这种操作在我们只想实例化某些特定情况的参数、者要保证参数互斥或有意义时使用

+ 可选或默认的参数
可选的参数可以通过Option关键字实现，观察如下代码
```scala
class DelayBy1(resetValue: Option[UInt] = None) extends Module {
    val io = IO(new Bundle {
        val in  = Input( UInt(16.W))
        val out = Output(UInt(16.W))
    })
    val reg = if (resetValue.isDefined) { // resetValue = Some(number)
        RegInit(resetValue.get)
    } else { //resetValue = None
        Reg(UInt())
    }
    reg := io.in
    io.out := reg
}
```
利用Option类，实现可选的Chisel类生成，即当有初始设定值时,resetValue.isDefined为真，这样做可以使得代码更美观

+ match/case语句
Scala中提供了类似于C语言的case语句，且提供了更加便捷的功能，包括异种类型变量的匹配，基本语法如下，下方代码将匹配到的值返回给x。
```scala
val y = 7
/// ...
val x = y match {
  case 0 => "zero" // One common syntax, preferred if fits in one line
  case 1 =>        // Another common syntax, preferred if does not fit in one line.
      "one"        // Note the code block continues until the next case
  case 2 => {      // Another syntax, but curly braces are not required
      "two"
  }
  case _ => "many" // _ is a wildcard that matches all values
}
```
需要注意的是，case a =>后为匹配到则执行的语句，且不会像c那样一直执行到底，执行完一个case就结束match。其次，match是顺序匹配的，从上向下一次匹配。case _ 代表其他情况。并且多个变量可以同时匹配，如下。
```scala
def  animalTypeanimalT (biggerThanBreadBox: Boolean, meanAsCanBe: Boolean): String = {
  (biggerThanBreadBox, meanAsCanBe) match {
    case (true, true) => "wolverine"
    case (true, false) => "elephant"
    case (false, true) => "shrew"
    case (false, false) => "puppy"
  }
}
```
Scala中的match也提供对类型的匹配
```scala
val sequence = Seq("a", 1, 0.0)
sequence.foreach { x =>
  x match {
    case s: String => println(s"$x is a String")
    case s: Int    => println(s"$x is an Int")
    case s: Double => println(s"$x is a Double")
    case _ => println(s"$x is an unknown type!")
  }
}
```
如果想一次匹配多个类型，则需要这样写
```scala
val sequence = Seq("a", 1, 0.0)
sequence.foreach { x =>
  x match {
    case _: Int | _: Double => println(s"$x is a number!")
    case _ => println(s"$x is an unknown type!")
  }
}
```
但是对类型的匹配只能精确到最顶层，对下层类型的匹配是不允许的，比如下方代码就是不符合规则的，这叫做类型擦除。
```scala
val sequence = Seq(Seq("a"), Seq(1), Seq(0.0))
sequence.foreach { x =>
  x match {
    case s: Seq[String] => println(s"$x is a String")
    case s: Seq[Int]    => println(s"$x is an Int")
    case s: Seq[Double] => println(s"$x is a Double")
  }
}
```
+ 实例
对“可选或默认的参数”中的例子，也可以这样写。
```scala
class DelayBy1(resetValue: Option[UInt] = None) extends Module {
  val io = IO(new Bundle {
    val in  = Input( UInt(16.W))
    val out = Output(UInt(16.W))
  })
  val reg = resetValue match {
    case Some(r) => RegInit(r)
    case None    => Reg(UInt())
  }
  reg := io.in
  io.out := reg
}
```
+ 可选的IO
参数可选的情况我们在上方讨论过，下面看一下IO模块可选时的情况（使用Some关键字）
以是否包含低位进位的全加器来说，有如下两种实现方式。
```scala
class HalfFullAdder(val hasCarry: Boolean) extends Module {
  val io = IO(new Bundle {
    val a = Input(UInt(1.W))
    val b = Input(UInt(1.W))
    val carryIn = if (hasCarry) Some(Input(UInt(1.W))) else None
    val s = Output(UInt(1.W))
    val carryOut = Output(UInt(1.W))
  })
  val sum = io.a +& io.b +& io.carryIn.getOrElse(0.U)
  io.s := sum(0)
  io.carryOut := sum(1)
}

classclass  HalfFullAdderHalfFul (val hasCarry: Boolean) extends Module {
  val io = IO(new Bundle {
    val a = Input(UInt(1.W))
    val b = Input(UInt(1.W))
    val carryIn = Input(if (hasCarry) UInt(1.W) else UInt(0.W))
    val s = Output(UInt(1.W))
    val carryOut = Output(UInt(1.W))
  })
  val sum = io.a +& io.b +& io.carryIn
  io.s := sum(0)
  io.carryOut := sum(1)
}
```
第二种实现方式避免了使用getOrElse，对于Chisel，0宽度的数字是允许的，生成verilog时会被直接剪枝，任何使用0位宽的变量会被当作0

+ 隐式声明
隐式的声明可以帮助代码在不同情况下省去冗余的部分，使用implicit关键字即可做到，观察如下代码
```scala
object CatDog {
  implicit val numberOfCats: Int = 3		

  def tooManyCats(nDogs: Int)(implicit nCats: Int): Boolean = nCats > nDogs
    
  val imp = tooManyCats(2)    //隐式传参，结果为真
  val exp = tooManyCats(2)(1) // 显示传参，结果为假
}
```
这段代码在第一行隐式地说明了猫的数量，需要注意的是，在一段代码块中，对于一种类型只能有一条隐式说明，在随后定义的函数中，有两个参数列表，分别是参数列表和隐式参数列表，隐式参数列表在未显示说明时，会找到该代码段的隐式说明语句，即numberOfCats。因此，imp的值是真，exp的值是假。对于这段代码，必须有一个隐式说明的整型值，否则函数定义会因找不到隐式的值而出错

+ 隐式转换
利用定义“隐式”，我们可以将两个不相关的量做隐式转换，而不要求父子类关系，如下代码所示
```scala
class Animal(val name: String, val species: String)
class Human(val name: String)
implicit def human2animal(h: Human): Animal = new Animal(h.name, "Homo sapiens")
val me = new Human("Adam")
println(me.species)
```
通过隐式转换，使Human类有了species属性