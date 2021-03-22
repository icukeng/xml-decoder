# Yet another xml parser (transformations included)

Project based on ktemelkov/node-xml2json, but is about only parsing.
The main feature is ability to transform target object to remove xml structures bloating.

Parsing features:

* every complex object in hierarhy has '@tag' field with tag name.
* xml tag value placed in '@value' field
* Single valued tags assigned as fileds to parent object
* attributes axis are merged or placed to '@attrs' field
* two or more sibling tags with same name treats as array of objects(with that tags data) (example in `__tests__/fixtures/simple-list`)

It does not parse the following elements:

* CDATA sections (*)
* Processing instructions
* XML declarations
* Entity declarations
* Comments

## Installation

```
$ npm install xml-decoder
```

## Usage

```javascript
var xmldecoder = require('xml-decoder');

var xml = "<foo attr=\"value\">bar</foo>";
console.log(xml)

var obj = xmldecoder(xml, {mergeAttrs: true});
console.log(JSON.stringify(obj));
```

### Options

* **mergeAttrs**, bool (default: felse) - flag to merge attrs with single valued child tags in common structure or not
* **asArray**, array of full paths in xml - force array for tag value
* **toArray**, array of full paths in xml - attributes of target tag ignored, target tag becomes array, child tags become array values
* **renameTag**, key-value of full path to new tag name - rename tag
