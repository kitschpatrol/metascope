# Java Learning Tutorial

This tutorial is designed to guide you step-by-step as you learn Java. Each topic covers key points and examples for better understanding.

---

1. Syntax.java

EN: Java syntax defines the rules for writing code in Java, including the structure and format that the compiler expects.
TR: Java sözdizimi, Java'da kod yazma kurallarını, yapı ve formatı tanımlar.

Example:
public class SyntaxExample {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}

---

2. Variables.java

EN: Variables are containers for storing data values.
TR: Değişkenler, veri değerlerini saklamak için kullanılan kaplardır.

Example:
public class VariablesExample {
    public static void main(String[] args) {
        int number = 10;
        String name = "John";
        System.out.println(number);
        System.out.println(name);
    }
}

---

3. DataTypes.java

EN: Data types specify the size and type of values that can be stored in a variable.
TR: Veri tipleri, bir değişkende saklanabilecek değerlerin boyutunu ve türünü belirtir.

Example:
public class DataTypesExample {
    public static void main(String[] args) {
        int number = 5;           // Integer
        double decimal = 5.99;     // Floating point number
        char letter = 'D';         // Character
        boolean isTrue = true;     // Boolean
        System.out.println(decimal);
    }
}

---

4. TypeCasting.java

EN: Type casting is when you assign a value of one data type to another.
TR: Tip dönüştürme, bir veri tipindeki bir değeri başka bir tipe atama işlemidir.

Example:
public class TypeCastingExample {
    public static void main(String[] args) {
        int myInt = 9;
        double myDouble = myInt;   // Automatic casting: int to double
        System.out.println(myDouble);
    }
}

---

5. Operators.java

EN: Operators are used to perform operations on variables and values.
TR: Operatörler, değişkenler ve değerler üzerinde işlemler yapmak için kullanılır.

Example:
public class OperatorsExample {
    public static void main(String[] args) {
        int x = 10 + 5;
        System.out.println(x); // 15
    }
}

---

6. Strings.java

EN: Strings are used to store sequences of characters. Java provides many built-in methods to manipulate strings.
TR: Stringler, karakter dizilerini saklamak için kullanılır. Java, stringleri manipüle etmek için birçok yerleşik yöntem sunar.

Example:
public class StringsExample {
    public static void main(String[] args) {
        String greeting = "Hello, World!";
        System.out.println(greeting);
    }
}

---

7. Math.java

EN: The Math class has many methods that can perform mathematical operations.
TR: Math sınıfı, matematiksel işlemleri gerçekleştirebilen birçok metoda sahiptir.

Example:
public class MathExample {
    public static void main(String[] args) {
        int max = Math.max(5, 10);
        System.out.println(max); // 10
    }
}

---

8. IfElse.java

EN: The if-else statement is used to specify a block of code to be executed, depending on a condition.
TR: if-else deyimi, bir koşula bağlı olarak yürütülecek bir kod bloğunu belirtmek için kullanılır.

Example:
public class IfElseExample {
    public static void main(String[] args) {
        int number = 20;
        if (number > 10) {
            System.out.println("Greater than 10");
        } else {
            System.out.println("Less than or equal to 10");
        }
    }
}

---

9. Switch.java

EN: The switch statement allows a variable to be tested for equality against a list of values.
TR: switch deyimi, bir değişkenin bir dizi değere eşit olup olmadığını test etmeye olanak tanır.

Example:
public class SwitchExample {
    public static void main(String[] args) {
        int day = 2;
        switch (day) {
            case 1:
                System.out.println("Monday");
                break;
            case 2:
                System.out.println("Tuesday");
                break;
            default:
                System.out.println("Weekend");
        }
    }
}

---

10. DoWhileLoop.java

EN: The do-while loop will execute the block of code once before checking the condition.
TR: do-while döngüsü, koşulu kontrol etmeden önce kod bloğunu bir kez çalıştırır.

Example:
public class DoWhileLoopExample {
    public static void main(String[] args) {
        int i = 0;
        do {
            System.out.println(i);
            i++;
        } while (i < 5);
    }
}

---

11. ForLoop.java

EN: The for loop is used to iterate a part of the program multiple times.
TR: for döngüsü, bir programın bir bölümünü birçok kez yinelemek için kullanılır.

Example:
public class ForLoopExample {
    public static void main(String[] args) {
        for (int i = 0; i < 5; i++) {
            System.out.println(i);
        }
    }
}

---

12. Arrays.java

EN: Arrays are used to store multiple values in a single variable, instead of declaring separate variables for each value.
TR: Diziler, birden fazla değeri tek bir değişkende saklamak için kullanılır.

Example:
public class ArraysExample {
    public static void main(String[] args) {
        int[] numbers = {1, 2, 3, 4};
        for (int number : numbers) {
            System.out.println(number);
        }
    }
}

---

13. Methods.java

EN: Methods are blocks of code that only run when they are called.
TR: Yöntemler, yalnızca çağrıldıklarında çalışan kod bloklarıdır.

Example:
public class MethodsExample {
    public static void main(String[] args) {
        sayHello();
    }

    public static void sayHello() {
        System.out.println("Hello, World!");
    }
}

---

14. OOPClass.java

EN: Classes are the blueprint for objects. They define properties and behaviors.
TR: Sınıflar, nesneler için şablondur. Özellikleri ve davranışları tanımlarlar.

Example:
public class Car {
    String model;
    int year;

    public Car(String model, int year) {
        this.model = model;
        this.year = year;
    }

    public void drive() {
        System.out.println("Driving...");
    }
}

---

15. OOPModifiers.java

EN: Access modifiers define the accessibility of classes, methods, and variables.
TR: Erişim belirleyicileri, sınıfların, yöntemlerin ve değişkenlerin erişilebilirliğini tanımlar.

Example:
public class AccessModifiers {
    private int privateVar;
    protected int protectedVar;
    public int publicVar;

    public void display() {
        System.out.println("Public Variable: " + publicVar);
    }
}

---

16. OOPEncapsulation.java

EN: Encapsulation is the mechanism of restricting access to certain components.
TR: Kapsülleme, belirli bileşenlere erişimi kısıtlama mekanizmasıdır.

Example:
public class EncapsulatedClass {
    private int secretNumber;

    public void setSecretNumber(int number) {
        this.secretNumber = number;
    }

    public int getSecretNumber() {
        return secretNumber;
    }
}

---

17. Package.java

EN: Packages are used to group related classes and interfaces together.
TR: Paketler, ilişkili sınıfları ve arayüzleri bir araya getirmek için kullanılır.

Example:
package mypackage;

public class PackageExample {
    public static void main(String[] args) {
        System.out.println("This is a package example.");
    }
}

---

18. OOPInheritance.java

EN: Inheritance allows a new class to inherit properties and methods from an existing class.
TR: Kalıtım, yeni bir sınıfın mevcut bir sınıftan özellikleri ve yöntemleri miras almasını sağlar.

Example:
public class Animal {
    void eat() {
        System.out.println("Eating...");
    }
}

public class Dog extends Animal {
    void bark() {
        System.out.println("Barking...");
    }
}

---

19. OOPPolymorphism.java

EN: Polymorphism allows methods to do different things based on the object it is acting upon.
TR: Polimorfizm, yöntemlerin, üzerinde işlem yaptığı nesneye bağlı olarak farklı şeyler yapmasına olanak tanır.

Example:
public class Animal {
    void sound() {
        System.out.println("Animal sound");
    }
}

public class Cat extends Animal {
    void sound() {
        System.out.println("Meow");
    }
}

---

20. OOPAbstract.java

EN: An abstract class is a class that cannot be instantiated and can have abstract methods.
TR: Soyut sınıf, örneklendirilemeyen ve soyut yöntemlere sahip olabilen bir sınıftır.

Example:
abstract class Shape {
    abstract void draw();
}

class Circle extends Shape {
    void draw() {
        System.out.println("Drawing Circle");
    }
}

---

21. OOPInterface.java

EN: An interface is a reference type in Java, similar to a class, that can contain only constants, method signatures, default methods, static methods, and nested types.
TR: Arayüz, Java'da yalnızca sabitler, yöntem imzaları, varsayılan yöntemler, statik yöntemler ve iç türler içerebilen bir referans türüdür.

Example:
interface Animal {
    void sound();
}

class Cat implements Animal {
    public void sound() {
        System.out.println("Meow");
    }
}

---

22. OOPENums.java

EN: Enums are special Java types used to define collections of constants.
TR: Enums, sabitler koleksiyonlarını tanımlamak için kullanılan özel Java türleridir.

Example:
enum Day {
    SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY
}

public class EnumExample {
    public static void main(String[] args) {
        Day today = Day.MONDAY;
        System.out.println("Today is: " + today);
    }
}

---

23. OOPArrayList.java

EN: ArrayList is a resizable array implementation of the List interface.
TR: ArrayList, List arayüzünün boyutlandırılabilir bir dizi uygulamasıdır.

Example:
import java.util.ArrayList;

public class ArrayListExample {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>();
        list.add("Apple");
        list.add("Banana");
        System.out.println(list);
    }
}

---

24. OOPLinkedList.java

EN: LinkedList is a doubly-linked list implementation of the List and Deque interfaces.
TR: LinkedList, List ve Deque arayüzlerinin çift yönlü bağlantılı liste uygulamasıdır.

Example:
import java.util.LinkedList;

public class LinkedListExample {
    public static void main(String[] args) {
        LinkedList<String> linkedList = new LinkedList<>();
        linkedList.add("A");
        linkedList.add("B");
        System.out.println(linkedList);
    }
}

---

25. OOPListSort.java

EN: List sorting can be done using Collections.sort() method in Java.
TR: Liste sıralaması, Java'da Collections.sort() yöntemi kullanılarak yapılabilir.

Example:
import java.util.ArrayList;
import java.util.Collections;

public class ListSortExample {
    public static void main(String[] args) {
        ArrayList<Integer> numbers = new ArrayList<>();
        numbers.add(5);
        numbers.add(3);
        numbers.add(8);
        Collections.sort(numbers);
        System.out.println(numbers);
    }
}

---

26. OOPHashMap.java

EN: HashMap is a collection that stores key-value pairs, where keys are unique.
TR: HashMap, anahtar-değer çiftlerini saklayan ve anahtarların benzersiz olduğu bir koleksiyondur.

Example:
import java.util.HashMap;

public class HashMapExample {
    public static void main(String[] args) {
        HashMap<String, Integer> map = new HashMap<>();
        map.put("Apple", 1);
        map.put("Banana", 2);
        System.out.println(map);
    }
}

---

27. OOPHashSet.java

EN: HashSet is a collection that contains no duplicate elements.
TR: HashSet, tekrar eden elemanlar içermeyen bir koleksiyondur.

Example:
import java.util.HashSet;

public class HashSetExample {
    public static void main(String[] args) {
        HashSet<String> set = new HashSet<>();
        set.add("Apple");
        set.add("Banana");
        System.out.println(set);
    }
}

---

28. OOPIterator.java

EN: An Iterator is an object that enables you to traverse through a collection.
TR: Bir Iterator, bir koleksiyon üzerinden geçmenizi sağlayan bir nesnedir.

Example:
import java.util.ArrayList;
import java.util.Iterator;

public class IteratorExample {
    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>();
        list.add("A");
        list.add("B");
        Iterator<String> iterator = list.iterator();
        while (iterator.hasNext()) {
            System.out.println(iterator.next());
        }
    }
}

---

29. OOPExceptions.java

EN: Exception handling in Java is a powerful mechanism to handle runtime errors.
TR: Java'da istisna yönetimi, çalışma zamanı hatalarını ele almak için güçlü bir mekanizmadır.

Example:
public class ExceptionExample {
    public static void main(String[] args) {
        try {
            int divideByZero = 5 / 0;
        } catch (ArithmeticException e) {
            System.out.println("Division by zero error!");
        }
    }
}

---

30. OOPThreads.java

EN: Threads allow concurrent execution of two or more parts of a program.
TR: Thread'ler, bir programın iki veya daha fazla parçasının eşzamanlı yürütülmesine olanak tanır.

Example:
public class ThreadExample extends Thread {
    public void run() {
        System.out.println("Thread is running.");
    }

    public static void main(String[] args) {
        ThreadExample thread = new ThreadExample();
        thread.start();
    }
}

---

31. OOPLambda.java

EN: Lambda expressions provide a clear and concise way to represent one method interface using an expression.
TR: Lambda ifadeleri, bir yöntem arayüzünü bir ifade kullanarak açık ve özlü bir şekilde temsil etmenin bir yolunu sağlar.

Example:
import java.util.Arrays;
import java.util.List;

public class LambdaExample {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("John", "Jane", "Jack");
        names.forEach(name -> System.out.println(name));
    }
}

---
