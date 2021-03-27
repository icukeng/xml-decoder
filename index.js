var ltx = require('ltx/lib/parsers/ltx');

// root element
var doc = null

var work_element = null // parsed element
var work_tag     = null // tag of element
var work_stack   = []   // stack of elements
var work_path    = []   // stack of path for full path calculation (in stack removed nodes is absent, in path they present)

var options = {}

function staсkPop() {
	work_element_empty_value_hide()
	var parent = work_stack.pop()
	
	work_element = parent.elt
	work_tag     = parent.tag
}
function stackPush(tag, elt) {
	work_stack.push({tag: tag, elt:elt})
}

function typecaster(key, value) {
	if(!options.doTypecast) return value

	// has override
	var ovrride = options.overrideTypecast[key]
	if(ovrride) {
		if(ovrride == "string") return value
		if(ovrride == "number") {
			if(value == "NaN") return NaN
			return Number(value)
		}
	}

	// for @attr is empty,
	// for @value deleted (not even gets here)
	if( value === '' ) return value

	// check for number
	if(value == "NaN") return NaN
	var num = Number(value);
	if (!isNaN(num)) {
		return num;
	}

	// check for boolean
	var bool = value.toLowerCase();
	if (bool ==  'true') return true

	if (bool == 'false') return false

	// other
	return value

}
function work_element_empty_value_hide() {
	// self closed tag
	if(work_element['@value'] === undefined)
		return delete work_element['@value']

	if( work_element['@value'] )
		work_element['@value'] = work_element['@value'].trim()

	if( work_element['@value'] === '' )
		return delete work_element['@value']
	// called after work_path.pop,
	// TODO need to guarantee somehow last tag in work_path
	work_element['@value'] = typecaster(work_path.join('/') + '/' + work_element['@tag'], work_element['@value'])
}

function onStart(tag, value) {
	// at first work_emement is parent element,
	// then  we reassign for next level of iteration
	work_path.push(tag);
	var work_path_str = work_path.join('/')
	// options.debug('start\t', tag, '\t', work_path.join('/'))
	// options.debug('current', work_element, 'stack', work_stack)

	// create new element
	var new_element = {
		'@tag': tag // @tag  remains origin (for renameTag)
	}
	if(options.mergeAttrs){
		for(var key in value) {
			new_element[key] = typecaster(work_path_str+'/@'+key, value[key])
		}
	} else{
		new_element['@attrs'] = {}
		for(var key in value) {
			new_element['@attrs'][key] = typecaster(work_path_str+'/@'+key, value[key])
		}
	}

	if( options.renameTag[work_path_str] ){
		tag = options.renameTag[work_path_str]
	}

	let toArrayMaster = options.toArray[work_path_str]
	let toArraySlave  = options.toArray[work_path.slice(0, -1).join('/')]
	if( toArrayMaster ) {
		// options.debug('--toArrayMaster set many')
		// установка строго массива
		if( !(work_element[tag] instanceof Array) ) work_element[tag] = []
		// убрать атрибуты у обьекта
		new_element = {}
	}
	if( toArraySlave ) {
		// елемент выкладывается на один уровень вверх (в onEnd комплементарно выкидываем pop)
		// options.debug('--toArraySlave pop remove')
		staсkPop()
		tag = work_tag
	}

	// add new tag to the document
	if ( !(tag in work_element) ) { // first element of that tag in parent
		// options.debug('--first')
		work_element[tag] = options.asArray[work_path_str]
		? [ new_element ]
		: new_element
	} else if ( !(work_element[tag] instanceof Array) ) { // not first, and handling is not array ( actially second)
		// options.debug('--second')
		work_element[tag] = [work_element[tag], new_element]
	} else { // actually array
		// options.debug('--many')
		if( !toArrayMaster )
			work_element[tag].push(new_element)
	}

	stackPush(tag, work_element)

	// prepare next iteration - set new work_element
	work_element = new_element
	// work_tag     = tag logicaly need to be here but actually not used
}
function onEnd(tag) {
	var work_path_str = work_path.join('/')
	work_path.pop();
	// options.debug('end\t', tag, '\t', work_path.join('/'))

	let toArraySlave  = options.toArray[work_path.join('/')]
	if(toArraySlave) {
		// options.debug('--toArraySlave')
		return
	}

	var cur = work_element
	staсkPop()

	// place simple tag-value as key-value in parent object
	if( cur['@value'] && cur['@tag'] && cur['@tag'] == tag && Object.keys(cur).length == 2) {

		if( options.renameTag[work_path_str] ){
			tag = options.renameTag[work_path_str]
		}

		if( work_element[tag] instanceof Array ) {
			work_element[tag].pop() // remove simple object
			work_element[tag].push(cur['@value'])
		} else {
			work_element[tag] = cur['@value']
		}

	} // simple tag check
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
	options.toArray    = arr2obj(_options.toArray)
	options.renameTag  = _options.renameTag || {}
	// can be false, true, hash
	options.overrideTypecast = {}
	if( _options.typecast === undefined ) {// default
		options.doTypecast = true
	} else if ( _options.typecast instanceof Object ) { // overrides
		options.doTypecast = true
		options.overrideTypecast = _options.typecast
	} else {
		options.doTypecast = false
	}

	var parser = new ltx()
	parser.on('startElement', onStart)
	parser.on('endElement', onEnd)
	parser.on('text', onText)

	// init step
	doc = {}
	work_element = doc
	work_tag = null

	parser.write(xml)
	parser.end()
	return doc
};
