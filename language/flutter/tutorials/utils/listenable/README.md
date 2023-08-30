```mermaid
classDiagram
  class ValueListenable["ValueListenable&lt; T&gt;"]
  class ValueNotifier["ValueNotifier&lt; T&gt;"]
  Listenable <|-- ValueListenable
  Listenable <|-- Animation
  ValueListenable <|.. Animation
  Listenable <|.. ChangeNotifier
  ChangeNotifier <|-- ValueNotifier
  ValueListenable <|.. ValueNotifier
```

---

```mermaid
classDiagram
  ListenableBuilder <|-- AnimatedBuilder
  ListenableBuilder <-- Listenable
  ValueListenableBuilder <-- ValueListenable
```
