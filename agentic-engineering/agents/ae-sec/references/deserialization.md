# Deserialization

## Python

```python
# Pickle — arbitrary code execution
import pickle
pickle.loads(user_data)                       # FLAG — RCE
pickle.loads(base64.b64decode(cookie))        # FLAG
cPickle.loads(data)                           # FLAG

# YAML unsafe load
import yaml
yaml.load(data)                               # FLAG — executes constructors
yaml.load(data, Loader=yaml.FullLoader)       # FLAG — still allows some
yaml.safe_load(data)                          # SAFE
yaml.load(data, Loader=yaml.SafeLoader)       # SAFE

# shelve
import shelve
db = shelve.open(user_filename)               # FLAG — uses pickle internally
```

## Java

```java
// Java deserialization — RCE with gadget chains
ObjectInputStream ois = new ObjectInputStream(inputStream);
Object obj = ois.readObject();   // FLAG if inputStream from user

// Jackson polymorphic deserialization
// enableDefaultTyping() is deprecated but watch for:
mapper.enableDefaultTyping()                     // FLAG — allows gadget chains
mapper.activateDefaultTyping(LaissezFaireSubTypeValidator.instance,  // FLAG
    ObjectMapper.DefaultTyping.EVERYTHING)

// XStream
XStream xstream = new XStream();
xstream.fromXML(userXml)        // FLAG — RCE without security setup

// Safe XStream
XStream xstream = new XStream();
xstream.addPermission(NoTypePermission.NONE);
xstream.addPermission(new WildcardTypePermission(new String[]{"com.myapp.**"}));
```

## JavaScript / Node.js

```javascript
// node-serialize
const serialize = require('node-serialize')
serialize.unserialize(userInput)    // FLAG — RCE (IIFE in serialized functions)

// eval-based deserialization
eval('(' + userInput + ')')         // FLAG
JSON.parse is SAFE — no code execution
```
