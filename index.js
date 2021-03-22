var ltx = require('ltx/lib/parsers/ltx');

// root element
var doc = null

var work_element = null // parsed element
var work_stack   = []   // stack of elements
var work_path    = []   // stack of path for full path calculation (in stack removed nodes is absent, in path they present)

var options = {}

function staсkPop() {
	work_element = work_stack.pop()
}
function stackPush(elt) {
	work_stack.push(elt)
}
function work_element_empty_value_hide() {
	if( work_element['@value'] )
		work_element['@value'] = work_element['@value'].trim()
	if( work_element['@value'] === '' )
		delete work_element['@value']
}

function onStart(tag, value) {
	// at first work_emement is parent element,
	// then  we reassign for next level of iteration
	work_path.push(tag);
	// options.debug('start\t', tag, '\t', work_path.join('/'))
	// options.debug('current', work_element, 'stack', work_stack)

	// create new element
	var new_element = {
		'@tag': tag
	}
	if(options.mergeAttrs){
		for(var key in value) {
			new_element[key] = value[key]
		}
	} else{
		new_element['@attrs'] = value
	}


	// add new tag to the document
	if ( !(tag in work_element) ) { // first element of that tag in parent
		// options.debug('--first')
		work_element[tag] = options.asArray[work_path.join('/')]
		? [ new_element ]
		: new_element
	} else if ( !(work_element[tag] instanceof Array) ) { // not first, and handling is not array ( actially second)
		// options.debug('--second')
		work_element[tag] = [work_element[tag], new_element]
	} else { // actually array
		// options.debug('--many')
		work_element[tag].push(new_element)
	}

	stackPush(work_element)

	// prepare next iteration - set new work_element
	work_element = new_element
}
function onEnd(tag) {
	let str_path = work_path.join('/')
	work_path.pop();
	// options.debug('end\t', tag, '\t', work_path.join('/'))

	work_element_empty_value_hide()

	var cur = work_element
	staсkPop()

	// place simple tag-value as key-value in parent object
	if( cur['@value'] && cur['@tag'] && Object.keys(cur).length == 2) {
		if( work_element[tag] instanceof Array ) {
			work_element[tag].pop() // remove simple object
			work_element[tag].push(cur['@value'])
		} else {
		work_element[tag] = cur['@value']
		}
	}
}
function onText(value) {
	work_element['@value'] = (work_element['@value'] || '') + value
}

function arr2obj(src) {
	var dst = {}
	if(src instanceof Array)
		src.forEach(function(v) {
			dst[v] = true
		})
	return dst
}

module.exports = function(xml, _options) {
	_options = _options || {}

	// options validation
	options.debug = function () {}
	options.debug = console.error
	options.mergeAttrs = _options.mergeAttrs
	options.asArray    = arr2obj(_options.asArray)

	var parser = new ltx()
	parser.on('startElement', onStart)
	parser.on('endElement', onEnd)
	parser.on('text', onText)

	// init step
	doc = {}
	work_element = doc
	stackPush(doc)

	parser.write(xml)
	parser.end()
	return doc
};
