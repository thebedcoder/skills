#  Swift Bug Patterns

## Force unwrap on optionals from external data

```swift
let value = dictionary["key"]!          // crash if key missing
let user = users.first!                  // crash if array empty
let data = try? getData()
process(data!)                           // crash if getData() threw

// Fix — safe unwrap
guard let value = dictionary["key"] else { return }
guard let user = users.first else { return }
```

## Weak reference accessed after deallocation

```swift
class ViewModel {
    func loadData() {
        api.fetch { [weak self] result in
            self?.handleResult(result)   // OK — safe optional
            self!.handleResult(result)   // FLAG — crash if self deallocated
        }
    }
}
```

## Main thread violations

```swift
// UI update from background thread — crash or visual glitch
URLSession.shared.dataTask(with: url) { data, _, _ in
    self.label.text = "Done"   // FLAG — background thread, UI must be on main
    // Fix:
    DispatchQueue.main.async {
        self.label.text = "Done"
    }
}
```
